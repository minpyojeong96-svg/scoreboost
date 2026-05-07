import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase.js'
import { useAuth } from '../contexts/AuthContext.jsx'

const BLOCK_LABELS = { A: '해석', B: '단어', C: '구조', D: '문법', E: '이유', F: '비교', G: '문제' }
const BLOCK_COLORS = {
  A: 'bg-blue-50 border-blue-200',
  B: 'bg-purple-50 border-purple-200',
  C: 'bg-green-50 border-green-200',
  D: 'bg-orange-50 border-orange-200',
  E: 'bg-pink-50 border-pink-200',
  F: 'bg-red-50 border-red-200',
  G: 'bg-indigo-50 border-indigo-200'
}

function parseG(text = '') {
  const m = text.match(/\(([^)]+)\)\s*$/)
  if (!m) return { question: text, answer: null }
  return { question: text.slice(0, text.lastIndexOf(`(${m[1]}`)).trim(), answer: m[1] }
}

const normalize = (s) => s.toLowerCase().trim().replace(/[.,!?;:]+$/, '')

const REVIEW_INTERVALS = [1, 3, 7, 14, 30]

const ALL = '전체'
const TODAY = '🔔 오늘 복습'

// ─── 해설 모달 ─────────────────────────────────────────────────────────────────

function DetailModal({ note, onClose }) {
  const [tab, setTab] = useState('A')
  const blocks = note.blocks || {}
  const keys = Object.keys(blocks)

  useEffect(() => {
    if (!keys.includes(tab)) setTab(keys[0] || 'A')
  }, [note.id])

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-end" onClick={onClose}>
      <div
        className="w-full max-w-md mx-auto bg-white rounded-t-2xl max-h-[80vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 pt-4 pb-2">
          <div className="flex-1">
            <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">
              {note.grammar_tag}
            </span>
            <p className="text-sm font-medium text-gray-800 mt-1 leading-snug">{note.sentence}</p>
            <p className="text-xs text-gray-400">{note.translation}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 text-xl ml-2 p-1">✕</button>
        </div>

        <div className="flex gap-1 px-4 overflow-x-auto pb-1">
          {keys.map(k => (
            <button
              key={k}
              onClick={() => setTab(k)}
              className={`flex-shrink-0 px-3 py-1 rounded-full text-xs font-semibold transition-colors
                ${tab === k ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-500'}`}
            >
              {k} {BLOCK_LABELS[k]}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-3">
          <div className={`rounded-xl border-2 p-4 ${BLOCK_COLORS[tab] || 'bg-gray-50 border-gray-200'}`}>
            <p className="text-xs font-bold text-gray-400 mb-1">{BLOCK_LABELS[tab]}</p>
            <p className="text-sm text-gray-800 leading-relaxed whitespace-pre-wrap">{blocks[tab]}</p>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── 다시 풀기 모달 (망각곡선 스케줄 업데이트) ───────────────────────────────

function RetryModal({ note, onClose, onCorrect }) {
  const { question, answer } = parseG(note.blocks?.G || '')
  const [input, setInput] = useState('')
  const [status, setStatus] = useState(null)

  const nextCount = (note.review_count || 0) + 1
  const nextDays = REVIEW_INTERVALS[Math.min(nextCount, REVIEW_INTERVALS.length - 1)]

  // 힌트: 첫 글자 + 나머지 언더스코어
  const hint = answer
    ? answer[0] + '_'.repeat(Math.max(0, answer.length - 1)) + ` (${answer.length}글자)`
    : null

  const submit = () => {
    if (!input.trim() || !answer) return
    const isCorrect = normalize(input) === normalize(answer)
    setStatus(isCorrect ? 'correct' : 'wrong')
    if (isCorrect) onCorrect(note.id, note.review_count || 0)
  }

  const reset = () => { setInput(''); setStatus(null) }

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-end" onClick={onClose}>
      <div
        className="w-full max-w-md mx-auto bg-white rounded-t-2xl p-5 flex flex-col gap-4"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-start justify-between">
          <div>
            <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">
              {note.grammar_tag} 다시 풀기
            </span>
            <p className="text-xs text-gray-400 mt-1">{note.sentence}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 text-xl p-1">✕</button>
        </div>

        {note.translation && (
          <div className="bg-blue-50 border border-blue-200 rounded-xl px-3 py-2">
            <p className="text-xs text-blue-500 font-bold mb-0.5">한글 해석</p>
            <p className="text-sm text-blue-800">{note.translation}</p>
          </div>
        )}

        <p className="text-sm text-gray-800 leading-relaxed whitespace-pre-wrap">{question}</p>

        {hint && !status && (
          <p className="text-xs text-gray-400">
            힌트: <span className="font-mono text-indigo-500">{hint}</span>
          </p>
        )}

        {!status && answer && (
          <div className="flex gap-2">
            <input
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && submit()}
              placeholder="정답을 입력하세요"
              className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-400"
            />
            <button
              onClick={submit}
              disabled={!input.trim()}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium disabled:opacity-40"
            >
              확인
            </button>
          </div>
        )}

        {status === 'correct' && (
          <div className="bg-green-50 border border-green-200 rounded-xl p-3">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-2xl">✅</span>
              <p className="font-bold text-green-700">정답!</p>
            </div>
            <p className="text-xs text-green-600 font-mono ml-8">{answer}</p>
            <p className="text-xs text-gray-400 mt-2 ml-8">다음 복습: {nextDays}일 후 📅</p>
          </div>
        )}

        {status === 'wrong' && (
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl p-3">
              <span className="text-2xl">❌</span>
              <div>
                <p className="font-medium text-red-700">틀렸어요</p>
                <p className="text-xs text-red-600">정답: <span className="font-bold font-mono">{answer}</span></p>
              </div>
            </div>
            <button onClick={reset} className="text-sm text-indigo-600 underline self-center">
              다시 시도
            </button>
          </div>
        )}

        {!answer && (
          <p className="text-sm text-gray-600 whitespace-pre-wrap bg-indigo-50 rounded-xl p-3">
            {note.blocks?.G}
          </p>
        )}
      </div>
    </div>
  )
}

// ─── 메인 컴포넌트 ────────────────────────────────────────────────────────────

export default function WrongNote() {
  const { user } = useAuth()
  const [notes, setNotes] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState(ALL)
  const [detail, setDetail] = useState(null)
  const [retry, setRetry] = useState(null)

  useEffect(() => {
    if (!user) return
    supabase
      .from('wrong_notes')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        setNotes(data || [])
        setLoading(false)
      })
  }, [user])

  const now = new Date().toISOString()
  const todayNotes = notes.filter(n => n.next_review && n.next_review <= now)
  const allTags = [ALL, TODAY, ...new Set(notes.map(n => n.grammar_tag).filter(Boolean))]

  const filtered =
    filter === ALL   ? notes :
    filter === TODAY ? todayNotes :
    notes.filter(n => n.grammar_tag === filter)

  const deleteNote = async (id) => {
    await supabase.from('wrong_notes').delete().eq('id', id).eq('user_id', user.id)
    setNotes(prev => prev.filter(n => n.id !== id))
    setDetail(null)
  }

  // 복습 완료 → 망각곡선 스케줄 업데이트
  const handleReviewCorrect = async (noteId, currentCount) => {
    const nextCount = currentCount + 1
    const days = REVIEW_INTERVALS[Math.min(nextCount, REVIEW_INTERVALS.length - 1)]
    const nextReview = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString()

    await supabase
      .from('wrong_notes')
      .update({ review_count: nextCount, next_review: nextReview })
      .eq('id', noteId)
      .eq('user_id', user.id)

    setNotes(prev => prev.map(n =>
      n.id === noteId ? { ...n, review_count: nextCount, next_review: nextReview } : n
    ))
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (notes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3">
        <span className="text-5xl">📭</span>
        <p className="text-gray-500 text-sm text-center">
          아직 오답이 없어요!<br />문제를 풀면 자동으로 저장됩니다
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 pt-4 pb-2">
        <h1 className="text-lg font-bold text-gray-800">오답노트</h1>
        <p className="text-xs text-gray-400">{notes.length}개 저장됨</p>
      </div>

      {/* 태그 필터 */}
      <div className="flex gap-2 px-4 pb-2 overflow-x-auto">
        {allTags.map(tag => (
          <button
            key={tag}
            onClick={() => setFilter(tag)}
            className={`flex-shrink-0 px-3 py-1 rounded-full text-xs font-medium border transition-colors flex items-center gap-1
              ${filter === tag
                ? 'bg-indigo-600 text-white border-indigo-600'
                : 'bg-white text-gray-500 border-gray-200'}`}
          >
            {tag}
            {tag === TODAY && todayNotes.length > 0 && (
              <span className={`text-xs rounded-full px-1 font-bold
                ${filter === TODAY ? 'bg-white text-indigo-600' : 'bg-red-500 text-white'}`}>
                {todayNotes.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* 목록 */}
      <div className="flex-1 overflow-y-auto px-4 pb-4 flex flex-col gap-3">
        {filtered.length === 0 ? (
          <p className="text-center text-gray-400 text-sm mt-8">
            {filter === TODAY ? '오늘 복습할 문제가 없어요 🎉' : `${filter} 오답이 없습니다`}
          </p>
        ) : (
          filtered.map(note => (
            <div key={note.id} className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
              <div className="flex items-start justify-between gap-2 mb-2">
                <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full flex-shrink-0">
                  {note.grammar_tag}
                </span>
                <span className="text-xs text-gray-400">
                  {new Date(note.created_at).toLocaleDateString('ko-KR')}
                </span>
              </div>

              <p className="text-sm font-medium text-gray-800 leading-snug mb-0.5">{note.sentence}</p>
              <p className="text-xs text-gray-500 mb-1">{note.translation}</p>

              {note.review_count > 0 && (
                <p className="text-xs text-indigo-400 mb-2">복습 {note.review_count}회 완료</p>
              )}

              <div className="flex gap-2">
                <button
                  onClick={() => setDetail(note)}
                  className="flex-1 py-2 border border-indigo-200 text-indigo-600 rounded-lg text-xs font-medium"
                >
                  해설 보기
                </button>
                {note.blocks?.G && (
                  <button
                    onClick={() => setRetry(note)}
                    className="flex-1 py-2 bg-indigo-600 text-white rounded-lg text-xs font-medium"
                  >
                    다시 풀기
                  </button>
                )}
                <button
                  onClick={() => deleteNote(note.id)}
                  className="py-2 px-3 border border-red-200 text-red-400 rounded-lg text-xs"
                >
                  삭제
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {detail && <DetailModal note={detail} onClose={() => setDetail(null)} />}
      {retry && (
        <RetryModal
          note={retry}
          onClose={() => setRetry(null)}
          onCorrect={handleReviewCorrect}
        />
      )}
    </div>
  )
}
