import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase.js'
import { useAuth } from '../contexts/AuthContext.jsx'

const LEVEL_LABEL = {
  중1: '중학교 1학년', 중2: '중학교 2학년', 중3: '중학교 3학년',
  고1: '고등학교 1학년', 고2: '고등학교 2학년', 고3: '고등학교 3학년'
}

const LEVEL_COLOR = {
  중1: 'bg-green-100 text-green-700',
  중2: 'bg-green-100 text-green-700',
  중3: 'bg-green-100 text-green-700',
  고1: 'bg-blue-100 text-blue-700',
  고2: 'bg-blue-100 text-blue-700',
  고3: 'bg-purple-100 text-purple-700'
}

export default function Home() {
  const navigate  = useNavigate()
  const { user }  = useAuth()
  const [stats, setStats]           = useState(null)
  const [schoolLevel, setSchoolLevel] = useState(null)

  useEffect(() => {
    if (!user) return
    loadAll()
  }, [user])

  const loadAll = async () => {
    const [{ data: profile }, { data: notes }] = await Promise.all([
      supabase.from('users').select('school_level').eq('id', user.id).maybeSingle(),
      supabase.from('wrong_notes')
        .select('grammar_tag, next_review, review_count, created_at')
        .eq('user_id', user.id)
    ])

    if (profile?.school_level) setSchoolLevel(profile.school_level)
    if (!notes) return

    const now       = new Date().toISOString()
    const todayCount = notes.filter(n => n.next_review && n.next_review <= now).length

    // 취약 문법 Top 3
    const tagCounts = {}
    notes.forEach(n => {
      if (n.grammar_tag) tagCounts[n.grammar_tag] = (tagCounts[n.grammar_tag] || 0) + 1
    })
    const weakTags = Object.entries(tagCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)

    // 이번 주 학습일 수
    const weekAgo   = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
    const recentDays = new Set(
      notes.filter(n => n.created_at >= weekAgo).map(n => n.created_at.slice(0, 10))
    ).size

    setStats({ total: notes.length, todayCount, weakTags, recentDays })
  }

  const name = user?.user_metadata?.full_name?.split(' ')[0] || '학습자'

  return (
    <div className="flex flex-col h-full px-4 pt-5 pb-4 gap-4 overflow-y-auto">
      {/* 인사 + 학년 뱃지 */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-800">안녕하세요, {name}님 👋</h1>
          <p className="text-sm text-gray-400">오늘도 영어 공부 화이팅!</p>
        </div>
        {schoolLevel ? (
          <span className={`text-xs font-bold px-3 py-1 rounded-full ${LEVEL_COLOR[schoolLevel]}`}>
            {schoolLevel}
          </span>
        ) : (
          <button
            onClick={() => navigate('/profile')}
            className="text-xs text-indigo-500 underline"
          >
            학년 설정
          </button>
        )}
      </div>

      {/* 복습 알림 카드 */}
      {stats && stats.todayCount > 0 && (
        <button
          onClick={() => navigate('/wrong')}
          className="w-full bg-indigo-600 text-white rounded-2xl p-4 text-left shadow-md active:scale-95 transition-transform"
        >
          <p className="text-xs font-medium opacity-80 mb-1">🔔 오늘 복습 예정</p>
          <p className="text-2xl font-bold">{stats.todayCount}개</p>
          <p className="text-xs opacity-70 mt-1">탭해서 복습하기 →</p>
        </button>
      )}

      {/* 통계 카드 */}
      {stats && (
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white border border-gray-100 rounded-xl p-3 shadow-sm">
            <p className="text-xs text-gray-400 mb-1">총 오답</p>
            <p className="text-2xl font-bold text-gray-800">
              {stats.total}<span className="text-sm font-normal text-gray-400 ml-1">개</span>
            </p>
          </div>
          <div className="bg-white border border-gray-100 rounded-xl p-3 shadow-sm">
            <p className="text-xs text-gray-400 mb-1">이번 주 학습</p>
            <p className="text-2xl font-bold text-gray-800">
              {stats.recentDays}<span className="text-sm font-normal text-gray-400 ml-1">일</span>
            </p>
          </div>
        </div>
      )}

      {/* 취약 문법 */}
      {stats && stats.weakTags.length > 0 && (
        <div className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm">
          <p className="text-xs font-bold text-gray-500 mb-3">
            📉 취약 문법 Top {stats.weakTags.length}
            {schoolLevel && <span className="text-gray-400 font-normal ml-1">({schoolLevel} 기준)</span>}
          </p>
          <div className="flex flex-col gap-2">
            {stats.weakTags.map(([tag, count], i) => (
              <div key={tag} className="flex items-center gap-3">
                <span className={`text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center
                  ${i === 0 ? 'bg-red-100 text-red-600' :
                    i === 1 ? 'bg-orange-100 text-orange-600' :
                    'bg-yellow-100 text-yellow-600'}`}>
                  {i + 1}
                </span>
                <span className="flex-1 text-sm text-gray-700">{tag}</span>
                <span className="text-xs text-gray-400">{count}개 오답</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 학년 미설정 안내 */}
      {stats && stats.total > 0 && !schoolLevel && (
        <button
          onClick={() => navigate('/profile')}
          className="bg-indigo-50 border border-indigo-100 rounded-xl p-3 text-left"
        >
          <p className="text-xs font-bold text-indigo-600">💡 학년을 설정하면 맞춤 분석이 가능해요</p>
          <p className="text-xs text-indigo-400 mt-0.5">프로필 → 학년 설정하기 →</p>
        </button>
      )}

      {/* 통계 없을 때 빈 상태 */}
      {stats && stats.total === 0 && (
        <div className="bg-gray-50 rounded-xl p-4 text-center">
          <p className="text-3xl mb-2">📚</p>
          <p className="text-sm text-gray-500">아직 학습 기록이 없어요<br />문제를 촬영해서 시작해보세요!</p>
        </div>
      )}

      {/* 로딩 */}
      {!stats && (
        <div className="flex items-center justify-center py-8">
          <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {/* 액션 버튼 */}
      <div className="flex flex-col gap-3 mt-auto">
        <button
          onClick={() => navigate('/camera')}
          className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-bold text-base shadow-md active:scale-95 transition-transform"
        >
          📷 문제 촬영하기
        </button>
        <button
          onClick={() => navigate('/wrong')}
          className="w-full py-3 bg-white border-2 border-indigo-200 text-indigo-600 rounded-2xl font-bold text-base active:scale-95 transition-transform"
        >
          📝 오답노트 보기
        </button>
      </div>
    </div>
  )
}
