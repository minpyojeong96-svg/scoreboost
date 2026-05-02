import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase.js'

const BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000'

export default function ChatPanel({ sentence, blocks, autoExplain }) {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef(null)
  const sentRef = useRef(null) // 자동 설명 중복 방지

  // 오답 자동 설명 트리거
  useEffect(() => {
    if (!autoExplain) return
    const key = `${autoExplain.userInput}|${autoExplain.correctAnswer}`
    if (sentRef.current === key) return
    sentRef.current = key

    setOpen(true)
    const text = autoExplain.userInput
      ? `학생이 "${autoExplain.userInput}"라고 답했는데 틀렸어요. 왜 정답이 "${autoExplain.correctAnswer}"인지 딱 2문장으로 핵심만 설명해줘.`
      : `이 문제의 정답 "${autoExplain.correctAnswer}"에 대해 왜 이렇게 쓰는지 딱 2문장으로 설명해줘.`

    sendChat(text, [])
  }, [autoExplain])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  const sendChat = async (text, prevMessages) => {
    const userMsg = { role: 'user', content: text }
    const newMessages = [...prevMessages, userMsg]
    setMessages(newMessages)
    setLoading(true)

    try {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch(`${BASE}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`
        },
        body: JSON.stringify({
          messages: newMessages,
          context: { sentence, blocks }
        })
      })
      const data = await res.json()
      setMessages(prev => [...prev, { role: 'assistant', content: data.reply }])
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: '죄송해요, 잠시 후 다시 시도해주세요.' }])
    } finally {
      setLoading(false)
    }
  }

  const handleSend = () => {
    if (!input.trim() || loading) return
    const text = input.trim()
    setInput('')
    sendChat(text, messages)
  }

  return (
    <div className="border-t border-gray-100 bg-gray-50 flex-shrink-0">
      {/* 토글 헤더 */}
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-4 py-2.5 text-sm font-medium text-gray-600"
      >
        <span className="flex items-center gap-1.5">
          💬 선생님에게 질문하기
          {messages.length > 0 && (
            <span className="w-2 h-2 bg-indigo-500 rounded-full" />
          )}
        </span>
        <span className="text-gray-400 text-xs">{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div className="flex flex-col" style={{ maxHeight: '260px' }}>
          {/* 메시지 목록 */}
          <div className="flex-1 overflow-y-auto px-4 pb-2 flex flex-col gap-2 min-h-0" style={{ maxHeight: '200px' }}>
            {messages.length === 0 && (
              <p className="text-xs text-gray-400 text-center py-3">
                이 문장에 대해 무엇이든 질문하세요
              </p>
            )}
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] px-3 py-2 rounded-2xl text-sm leading-relaxed
                  ${m.role === 'user'
                    ? 'bg-indigo-600 text-white rounded-br-sm'
                    : 'bg-white text-gray-800 border border-gray-200 rounded-bl-sm'}`}
                >
                  {m.content}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-white border border-gray-200 rounded-2xl rounded-bl-sm px-4 py-2.5">
                  <div className="flex gap-1 items-center">
                    {[0, 1, 2].map(i => (
                      <div
                        key={i}
                        className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce"
                        style={{ animationDelay: `${i * 0.15}s` }}
                      />
                    ))}
                  </div>
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* 입력창 */}
          <div className="flex gap-2 px-3 py-2 border-t border-gray-100 bg-white">
            <input
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSend()}
              placeholder="질문을 입력하세요..."
              className="flex-1 border border-gray-200 rounded-full px-3 py-1.5 text-sm focus:outline-none focus:border-indigo-400"
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || loading}
              className="w-8 h-8 bg-indigo-600 text-white rounded-full flex items-center justify-center disabled:opacity-40 flex-shrink-0 text-sm"
            >
              ↑
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
