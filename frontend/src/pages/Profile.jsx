import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase.js'
import { useAuth } from '../contexts/AuthContext.jsx'

const GRADES = ['중1', '중2', '중3', '고1', '고2', '고3']

export default function Profile() {
  const { user } = useAuth()
  const [telegramId, setTelegramId]     = useState('')
  const [schoolLevel, setSchoolLevel]   = useState('')
  const [saving, setSaving]             = useState(false)
  const [saved, setSaved]               = useState(false)

  useEffect(() => {
    if (!user) return
    supabase
      .from('users')
      .select('telegram_id, school_level')
      .eq('id', user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data?.telegram_id)  setTelegramId(data.telegram_id)
        if (data?.school_level) setSchoolLevel(data.school_level)
      })
  }, [user])

  const save = async () => {
    setSaving(true)
    await supabase
      .from('users')
      .upsert({
        id:           user.id,
        name:         user.user_metadata?.full_name || '',
        email:        user.email,
        telegram_id:  telegramId.trim(),
        school_level: schoolLevel || null
      })
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const logout = async () => {
    await supabase.auth.signOut()
  }

  const initial = user?.user_metadata?.full_name?.[0]?.toUpperCase() || '?'

  return (
    <div className="flex flex-col h-full px-4 pt-6 pb-4 gap-6">
      <h1 className="text-lg font-bold text-gray-800">내 프로필</h1>

      {/* 사용자 정보 */}
      <div className="bg-gray-50 rounded-xl p-4 flex items-center gap-3">
        <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center text-xl font-bold text-indigo-600">
          {initial}
        </div>
        <div>
          <p className="font-medium text-gray-800">{user?.user_metadata?.full_name || '사용자'}</p>
          <p className="text-xs text-gray-400">{user?.email}</p>
        </div>
      </div>

      {/* 학년 설정 */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-gray-700">학년</label>
        <div className="grid grid-cols-3 gap-2">
          {GRADES.map(g => (
            <button
              key={g}
              onClick={() => setSchoolLevel(g)}
              className={`py-2 rounded-lg text-sm font-medium border transition-colors
                ${schoolLevel === g
                  ? 'bg-indigo-600 text-white border-indigo-600'
                  : 'bg-white text-gray-600 border-gray-200'}`}
            >
              {g}
            </button>
          ))}
        </div>
      </div>

      {/* 텔레그램 설정 */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-gray-700">텔레그램 Chat ID</label>
        <p className="text-xs text-gray-400">
          봇에서 <span className="font-mono bg-gray-100 px-1 rounded">/start</span> 입력 후 표시되는 숫자
        </p>
        <input
          type="text"
          value={telegramId}
          onChange={e => setTelegramId(e.target.value)}
          placeholder="예: 123456789"
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-400"
        />
      </div>

      {/* 저장 버튼 */}
      <button
        onClick={save}
        disabled={saving}
        className="w-full py-3 bg-indigo-600 text-white rounded-xl font-bold disabled:opacity-60"
      >
        {saved ? '✓ 저장됐습니다' : saving ? '저장 중...' : '저장하기'}
      </button>

      {/* 로그아웃 */}
      <div className="mt-auto">
        <button
          onClick={logout}
          className="w-full py-3 border border-red-200 text-red-500 rounded-xl font-medium text-sm"
        >
          로그아웃
        </button>
      </div>
    </div>
  )
}
