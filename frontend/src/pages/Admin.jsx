import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext.jsx'

const API = import.meta.env.VITE_API_URL || 'http://localhost:3000'

const BLOCK_LABELS = { A: '우리말 해석', B: '단어 뜯어보기', C: '문장 구조', D: '문법 설명', E: '왜 이렇게 쓸까요', F: '틀린 예 비교', G: '퀴즈' }
const BLOCK_COLORS = { A: 'border-blue-200 bg-blue-50', B: 'border-purple-200 bg-purple-50', C: 'border-green-200 bg-green-50', D: 'border-orange-200 bg-orange-50', E: 'border-pink-200 bg-pink-50', F: 'border-red-200 bg-red-50', G: 'border-indigo-200 bg-indigo-50' }

async function apiFetch(path, opts = {}) {
  const { data: { session } } = await import('../lib/supabase.js').then(m => m.supabase.auth.getSession())
  const token = session?.access_token
  const res = await fetch(`${API}${path}`, {
    ...opts,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, ...opts.headers }
  })
  if (!res.ok) throw new Error((await res.json()).error || res.statusText)
  return res.json()
}

function SentenceRow({ item, onUpdated, onDeleted }) {
  const [expanded, setExpanded] = useState(false)
  const [editing, setEditing]   = useState(false)
  const [blocks, setBlocks]     = useState(item.blocks || {})
  const [saving, setSaving]     = useState(false)

  const save = async () => {
    setSaving(true)
    try {
      await apiFetch(`/api/admin/sentences/${item.id}`, {
        method: 'PUT',
        body: JSON.stringify({ blocks, reviewed: true })
      })
      onUpdated({ ...item, blocks, reviewed: true })
      setEditing(false)
    } catch (e) { alert(e.message) }
    setSaving(false)
  }

  const markOk = async () => {
    setSaving(true)
    try {
      await apiFetch(`/api/admin/sentences/${item.id}`, {
        method: 'PUT',
        body: JSON.stringify({ reviewed: true })
      })
      onUpdated({ ...item, reviewed: true })
    } catch (e) { alert(e.message) }
    setSaving(false)
  }

  const deleteItem = async () => {
    if (!confirm('캐시를 삭제하면 다음 접근 시 GPT-4o로 재생성됩니다. 삭제할까요?')) return
    try {
      await apiFetch(`/api/admin/sentences/${item.id}`, { method: 'DELETE' })
      onDeleted(item.id)
    } catch (e) { alert(e.message) }
  }

  const quizAnswer = (() => {
    const g = typeof blocks.G === 'string' ? blocks.G : ''
    const m = g.match(/\(([^)]+)\)\s*$/)
    return m ? m[1] : null
  })()

  return (
    <div className={`border-2 rounded-2xl overflow-hidden ${item.reviewed ? 'border-green-200' : 'border-gray-200'}`}>
      {/* 헤더 */}
      <div
        className={`flex items-start gap-3 p-3 cursor-pointer ${item.reviewed ? 'bg-green-50' : 'bg-white'}`}
        onClick={() => setExpanded(v => !v)}
      >
        <span className="text-lg mt-0.5">{item.reviewed ? '✅' : '⬜'}</span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-gray-900 leading-snug">{item.sentence}</p>
          <div className="flex flex-wrap gap-1 mt-1">
            {(item.grammar_tags || []).map(t => (
              <span key={t} className="text-xs bg-indigo-100 text-indigo-600 px-1.5 py-0.5 rounded-full">{t}</span>
            ))}
            {quizAnswer && (
              <span className="text-xs bg-yellow-100 text-yellow-700 px-1.5 py-0.5 rounded-full font-mono">정답: {quizAnswer}</span>
            )}
          </div>
        </div>
        <span className="text-gray-400 text-sm">{expanded ? '▲' : '▼'}</span>
      </div>

      {/* 상세 내용 */}
      {expanded && (
        <div className="border-t border-gray-100 p-3 flex flex-col gap-3 bg-gray-50">
          {editing ? (
            <>
              {Object.keys(BLOCK_LABELS).map(k => (
                <div key={k}>
                  <p className="text-xs font-bold text-gray-500 mb-1">{k} {BLOCK_LABELS[k]}</p>
                  <textarea
                    value={typeof blocks[k] === 'string' ? blocks[k] : JSON.stringify(blocks[k] || '')}
                    onChange={e => setBlocks(prev => ({ ...prev, [k]: e.target.value }))}
                    rows={k === 'G' ? 2 : 3}
                    className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-indigo-400 resize-none"
                  />
                </div>
              ))}
              <div className="flex gap-2">
                <button onClick={save} disabled={saving} className="flex-1 py-2 bg-indigo-600 text-white rounded-xl text-sm font-bold disabled:opacity-50">
                  {saving ? '저장 중...' : '💾 저장 + 검토완료'}
                </button>
                <button onClick={() => { setEditing(false); setBlocks(item.blocks || {}) }} className="px-4 py-2 bg-gray-200 text-gray-600 rounded-xl text-sm">
                  취소
                </button>
              </div>
            </>
          ) : (
            <>
              {Object.entries(BLOCK_LABELS).map(([k, label]) => {
                const val = blocks[k]
                if (!val) return null
                const text = typeof val === 'string' ? val : JSON.stringify(val)
                return (
                  <div key={k} className={`rounded-xl border-2 p-3 ${BLOCK_COLORS[k]}`}>
                    <p className="text-xs font-bold text-gray-500 mb-1">{k} {label}</p>
                    <p className="text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">{text}</p>
                  </div>
                )
              })}
              <div className="flex gap-2 pt-1">
                {!item.reviewed && (
                  <button onClick={markOk} disabled={saving} className="flex-1 py-2.5 bg-green-600 text-white rounded-xl text-sm font-bold disabled:opacity-50">
                    {saving ? '...' : '✅ 내용 맞음 — 검토완료'}
                  </button>
                )}
                <button onClick={() => setEditing(true)} className="flex-1 py-2.5 bg-orange-500 text-white rounded-xl text-sm font-bold">
                  ✏️ 수정하기
                </button>
                <button onClick={deleteItem} className="px-3 py-2.5 bg-red-100 text-red-600 rounded-xl text-sm font-bold">
                  🗑️
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}

export default function Admin() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [stats, setStats]       = useState(null)
  const [items, setItems]       = useState([])
  const [page, setPage]         = useState(0)
  const [total, setTotal]       = useState(0)
  const [filter, setFilter]     = useState('false') // 'false'=미검토, 'true'=검토완료, ''=전체
  const [loading, setLoading]   = useState(false)
  const [forbidden, setForbidden] = useState(false)

  const load = async (p = 0, f = filter) => {
    setLoading(true)
    try {
      const [statsRes, listRes] = await Promise.all([
        apiFetch('/api/admin/stats'),
        apiFetch(`/api/admin/sentences?page=${p}&reviewed=${f}`)
      ])
      setStats(statsRes)
      setItems(listRes.data || [])
      setTotal(listRes.total || 0)
      setPage(p)
    } catch (e) {
      if (e.message.includes('권한')) setForbidden(true)
      else alert(e.message)
    }
    setLoading(false)
  }

  useEffect(() => { load(0, filter) }, [])

  const changeFilter = (f) => { setFilter(f); load(0, f) }

  const onUpdated = (updated) => setItems(prev => prev.map(i => i.id === updated.id ? updated : i))
  const onDeleted = (id) => { setItems(prev => prev.filter(i => i.id !== id)); setTotal(t => t - 1) }

  if (forbidden) return (
    <div className="flex flex-col items-center justify-center h-full gap-4 px-6 text-center">
      <span className="text-5xl">🔒</span>
      <p className="text-gray-700 font-bold">관리자만 접근 가능합니다</p>
      <p className="text-xs text-gray-400">Render 환경변수에 ADMIN_EMAIL을 설정해주세요</p>
      <button onClick={() => navigate('/')} className="py-3 px-6 bg-indigo-600 text-white rounded-xl font-bold">홈으로</button>
    </div>
  )

  return (
    <div className="flex flex-col h-full">
      {/* 헤더 */}
      <div className="px-4 pt-4 pb-3 border-b border-gray-100 shrink-0">
        <div className="flex items-center gap-2 mb-3">
          <button onClick={() => navigate('/')} className="text-sm text-gray-400">← 홈</button>
          <h1 className="text-lg font-bold text-gray-800 flex-1">🔍 내용 검토</h1>
        </div>
        {stats && (
          <div className="grid grid-cols-3 gap-2 mb-3">
            <div className="bg-gray-50 rounded-xl p-2 text-center">
              <p className="text-xs text-gray-400">전체</p>
              <p className="text-lg font-bold text-gray-800">{stats.total}</p>
            </div>
            <div className="bg-green-50 rounded-xl p-2 text-center">
              <p className="text-xs text-green-500">검토완료</p>
              <p className="text-lg font-bold text-green-700">{stats.reviewed}</p>
            </div>
            <div className="bg-orange-50 rounded-xl p-2 text-center">
              <p className="text-xs text-orange-500">미검토</p>
              <p className="text-lg font-bold text-orange-700">{stats.unreviewed}</p>
            </div>
          </div>
        )}
        <div className="flex gap-1">
          {[['false','미검토만'],['true','검토완료'],['','전체']].map(([v,l]) => (
            <button key={v} onClick={() => changeFilter(v)}
              className={`flex-1 py-1.5 rounded-lg text-xs font-bold ${filter === v ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-500'}`}>
              {l}
            </button>
          ))}
        </div>
      </div>

      {/* 목록 */}
      <div className="flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-3">
        {loading && <div className="flex justify-center py-8"><div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"/></div>}
        {!loading && items.length === 0 && (
          <div className="text-center py-10 text-gray-400">
            <p className="text-3xl mb-2">📭</p>
            <p className="text-sm">아직 생성된 문장이 없어요</p>
            <p className="text-xs mt-1">교과서 학습을 시작하면 여기에 쌓여요</p>
          </div>
        )}
        {items.map(item => (
          <SentenceRow key={item.id} item={item} onUpdated={onUpdated} onDeleted={onDeleted} />
        ))}

        {/* 페이지네이션 */}
        {total > 20 && (
          <div className="flex justify-center gap-2 py-3">
            <button onClick={() => load(page - 1)} disabled={page === 0} className="px-4 py-2 bg-gray-100 rounded-xl text-sm disabled:opacity-30">← 이전</button>
            <span className="px-4 py-2 text-sm text-gray-500">{page + 1} / {Math.ceil(total / 20)}</span>
            <button onClick={() => load(page + 1)} disabled={(page + 1) * 20 >= total} className="px-4 py-2 bg-gray-100 rounded-xl text-sm disabled:opacity-30">다음 →</button>
          </div>
        )}
        <div className="h-4" />
      </div>
    </div>
  )
}
