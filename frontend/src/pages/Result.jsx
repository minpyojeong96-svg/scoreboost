import { useState, useEffect, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { ocrImage, analyzeSentences, sendToTelegram } from '../api/client.js'
import { supabase } from '../lib/supabase.js'
import { useAuth } from '../contexts/AuthContext.jsx'
import ChatPanel from '../components/ChatPanel.jsx'

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
  return {
    question: text.slice(0, text.lastIndexOf(`(${m[1]}`)).trim(),
    answer: m[1]
  }
}

const normalize = (s) => s.toLowerCase().trim().replace(/[.,!?;:]+$/, '')

// ─── 블록 탭 ──────────────────────────────────────────────────────────────────

function BlockTabs({ blocks, active, onChange }) {
  return (
    <div className="flex gap-1 px-4 overflow-x-auto pb-1">
      {Object.keys(blocks).map(k => (
        <button
          key={k}
          onClick={() => onChange(k)}
          className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors
            ${active === k ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-500'}`}
        >
          {k} {BLOCK_LABELS[k]}
        </button>
      ))}
    </div>
  )
}

// ─── G블록 퀴즈 (userInput도 onResult에 전달) ─────────────────────────────────

function GQuiz({ text, quizStatus, onResult }) {
  const { question, answer } = parseG(text)
  const [input, setInput] = useState('')

  const submit = () => {
    if (!input.trim()) return
    const correct = answer && normalize(input) === normalize(answer)
    onResult(correct ? 'correct' : 'wrong', answer, input)
  }

  const reveal = () => onResult('revealed', answer, '')

  if (quizStatus === 'correct') {
    return (
      <div className="rounded-xl border-2 border-green-300 bg-green-50 p-4">
        <p className="text-sm text-gray-700 mb-3">{question}</p>
        <div className="flex items-center gap-2">
          <span className="text-2xl">✅</span>
          <span className="font-bold text-green-700">정답! <span className="font-mono">{answer}</span></span>
        </div>
      </div>
    )
  }

  if (quizStatus === 'wrong' || quizStatus === 'revealed') {
    return (
      <div className="rounded-xl border-2 border-red-200 bg-red-50 p-4">
        <p className="text-sm text-gray-700 mb-3">{question}</p>
        <div className="flex items-center gap-2">
          <span className="text-2xl">{quizStatus === 'wrong' ? '❌' : '👀'}</span>
          <span className="text-red-700 font-medium">
            정답: <span className="font-bold font-mono">{answer}</span>
          </span>
        </div>
        <p className="text-xs text-indigo-500 mt-2">💬 아래 선생님 채팅에서 이유를 확인하세요</p>
      </div>
    )
  }

  return (
    <div className={`rounded-xl border-2 p-4 ${BLOCK_COLORS.G}`}>
      <p className="text-sm text-gray-700 mb-3 whitespace-pre-wrap">{question}</p>
      {answer ? (
        <div className="flex flex-col gap-2">
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
          <button onClick={reveal} className="text-xs text-gray-400 underline self-start">
            정답 보기
          </button>
        </div>
      ) : (
        <p className="text-sm text-gray-600 whitespace-pre-wrap">{text}</p>
      )}
    </div>
  )
}

// ─── 메인 컴포넌트 ────────────────────────────────────────────────────────────

export default function Result() {
  const navigate = useNavigate()
  const { state } = useLocation()
  const { user } = useAuth()
  const startTime = useRef(Date.now())

  const [phase, setPhase] = useState('loading')
  const [loadingMsg, setLoadingMsg] = useState('문장 분석 중...')
  const [errMsg, setErrMsg] = useState('')
  const [results, setResults] = useState([])
  const [sidx, setSidx] = useState(0)
  const [tab, setTab] = useState('A')
  const [quizMap, setQuizMap] = useState({})
  const [autoExplain, setAutoExplain] = useState(null)
  const [name, setName] = useState('')
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)

  const fromCurriculum = !state?.image && !!state?.sentences

  const runAnalysis = async () => {
    setPhase('loading')
    setLoadingMsg('문장 분석 중...')
    try {
      let sentences
      if (state.sentences) {
        sentences = state.sentences
      } else {
        const ocr = await ocrImage(state.image)
        if (ocr.retake) throw Object.assign(new Error(ocr.error), { retake: true })
        sentences = ocr.sentences
      }

      // 커리큘럼 경로는 최대 10문장 (비용·속도 제한)
      const toAnalyze = fromCurriculum && sentences.length > 10
        ? [...sentences].sort(() => Math.random() - 0.5).slice(0, 10)
        : sentences

      const MAX_RETRIES = 3
      let lastErr
      for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
        try {
          const { results: res } = await analyzeSentences(toAnalyze)
          if (!Array.isArray(res) || res.length === 0) throw new Error('서버에서 분석 결과를 받지 못했습니다')
          setResults(res)
          if (res[0]?.blocks) setTab(Object.keys(res[0].blocks)[0] || 'A')
          setPhase('ready')
          return
        } catch (e) {
          lastErr = e
          if (e.message === 'Failed to fetch' && attempt < MAX_RETRIES - 1) {
            setLoadingMsg(`서버 연결 중... Render 서버가 깨어나는 중입니다 (${attempt + 1}/${MAX_RETRIES}회 시도, 잠시만 기다려 주세요)`)
            await new Promise(r => setTimeout(r, 8000))
          } else {
            throw e
          }
        }
      }
      throw lastErr
    } catch (e) {
      const msg = e.message === 'Failed to fetch'
        ? '서버에 연결할 수 없습니다.\n\n① Render 백엔드가 완전히 잠든 경우 30초 후 다시 시도하세요.\n② Render 환경변수 FRONTEND_URL이 https://scoreboost-rust.vercel.app 인지 확인하세요.'
        : (e.message || '분석 중 오류가 발생했습니다')
      setErrMsg(msg)
      setPhase('error')
    }
  }

  useEffect(() => {
    if (!state?.image && !state?.sentences) { navigate('/camera', { replace: true }); return }
    runAnalysis()
  }, [])

  const cur = results[sidx]

  const handleSentenceChange = (idx) => {
    setSidx(idx)
    setAutoExplain(null)
    const blocks = results[idx]?.blocks || {}
    const keys = Object.keys(blocks)
    if (!keys.includes(tab)) setTab(keys[0] || 'A')
  }

  const handleQuizResult = async (resultItem, status, correctAnswer, userInput) => {
    setQuizMap(prev => ({ ...prev, [resultItem.id]: status }))

    if (status !== 'correct') {
      // 오답 자동 설명 트리거
      setAutoExplain({ userInput, correctAnswer })

      // Supabase에 오답 저장
      if (user) {
        const grammarTag = resultItem.grammar_tags?.[0] || '기타'
        const { data: existing } = await supabase
          .from('wrong_notes')
          .select('id')
          .eq('user_id', user.id)
          .eq('sentence_id', resultItem.id)
          .eq('grammar_tag', grammarTag)
          .maybeSingle()

        if (!existing) {
          await supabase.from('wrong_notes').insert({
            user_id: user.id,
            sentence_id: resultItem.id,
            sentence: resultItem.sentence,
            translation: resultItem.translation,
            grammar_tag: grammarTag,
            blocks: resultItem.blocks,
          })
        }
      }
    }
  }

  const quizSentences = results.filter(r => r.blocks?.G !== undefined)
  const allAttempted = quizSentences.length > 0 &&
    quizSentences.every(r => quizMap[r.id] !== undefined)

  const correctCount = Object.values(quizMap).filter(v => v === 'correct').length
  const score = quizSentences.length > 0
    ? Math.round((correctCount / quizSentences.length) * 100)
    : 0

  const handleSend = async () => {
    setSending(true)
    try {
      const { data: profile } = await supabase
        .from('users')
        .select('telegram_id')
        .eq('id', user.id)
        .maybeSingle()

      if (!profile?.telegram_id) {
        alert('프로필에서 텔레그램 Chat ID를 먼저 설정해주세요')
        navigate('/profile')
        return
      }

      const minutes = Math.round((Date.now() - startTime.current) / 60000)
      const wrongItems = results
        .filter(r => quizMap[r.id] === 'wrong' || quizMap[r.id] === 'revealed')
        .map(r => ({ grammar_tag: r.grammar_tags?.[0] || '기타', sentence: r.sentence }))

      const tagCount = {}
      wrongItems.forEach(w => { tagCount[w.grammar_tag] = (tagCount[w.grammar_tag] || 0) + 1 })
      const recommendedTags = Object.entries(tagCount)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([tag]) => tag)

      await sendToTelegram({
        chat_id: profile.telegram_id,
        name: name || user?.user_metadata?.full_name || '학습자',
        study_minutes: minutes,
        score,
        wrong_items: wrongItems,
        recommended_tags: recommendedTags
      })
      setSent(true)
    } catch {
      alert('전송에 실패했습니다. 다시 시도해주세요.')
    } finally {
      setSending(false)
    }
  }

  if (phase === 'loading') {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 px-6">
        <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-gray-500 text-sm text-center whitespace-pre-wrap">{loadingMsg}</p>
      </div>
    )
  }

  if (phase === 'error') {
    return (
      <div className="flex flex-col items-center justify-center h-full px-6 gap-4">
        <span className="text-5xl">😅</span>
        <p className="text-gray-700 text-center font-medium whitespace-pre-wrap text-sm">{errMsg}</p>
        <button
          onClick={runAnalysis}
          className="w-full py-3 bg-indigo-600 text-white rounded-xl font-bold"
        >
          🔄 다시 시도하기
        </button>
        <button
          onClick={() => navigate(fromCurriculum ? '/curriculum' : '/camera')}
          className="w-full py-3 bg-gray-100 text-gray-600 rounded-xl font-medium"
        >
          {fromCurriculum ? '← 교과서로 돌아가기' : '다시 촬영하기'}
        </button>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* 문장 선택 */}
      {results.length > 1 && (
        <div className="flex gap-2 px-4 pt-3 pb-1 overflow-x-auto">
          {results.map((r, i) => (
            <button
              key={r.id}
              onClick={() => handleSentenceChange(i)}
              className={`flex-shrink-0 px-3 py-1 rounded-full text-xs font-medium border transition-colors
                ${sidx === i
                  ? 'bg-indigo-600 text-white border-indigo-600'
                  : 'bg-white text-gray-500 border-gray-200'}`}
            >
              {quizMap[r.id] === 'correct' ? '✅' : quizMap[r.id] ? '❌' : '○'} {i + 1}번
            </button>
          ))}
        </div>
      )}

      {/* 원문 */}
      <div className="px-4 pt-2 pb-1">
        <p className="text-xs text-gray-400 mb-0.5">원문</p>
        <p className="text-sm font-medium text-gray-800 leading-relaxed">{cur?.sentence}</p>
      </div>

      {/* 블록 탭 */}
      {cur?.blocks && <BlockTabs blocks={cur.blocks} active={tab} onChange={setTab} />}

      {/* 블록 내용 (스크롤) */}
      <div className="flex-1 overflow-y-auto px-4 py-3 min-h-0">
        {cur?.blocks && (
          tab === 'G' ? (
            <GQuiz
              text={cur.blocks.G}
              quizStatus={quizMap[cur.id]}
              onResult={(status, correctAnswer, userInput) =>
                handleQuizResult(cur, status, correctAnswer, userInput)
              }
            />
          ) : (
            <div className={`rounded-xl border-2 p-4 ${BLOCK_COLORS[tab] || 'bg-gray-50 border-gray-200'}`}>
              <p className="text-xs font-bold text-gray-400 mb-1">{BLOCK_LABELS[tab]}</p>
              <p className="text-sm text-gray-800 leading-relaxed whitespace-pre-wrap">
                {cur.blocks[tab]}
              </p>
            </div>
          )
        )}

        {/* 텔레그램 전송 */}
        {allAttempted && !sent && (
          <div className="mt-4 p-4 bg-gray-50 rounded-xl border border-gray-200">
            <p className="text-sm font-bold text-gray-700 mb-3">
              🎯 최종 점수: {score}점 ({correctCount}/{results.length})
            </p>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="이름 입력 (선택)"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm mb-2 focus:outline-none focus:border-indigo-400"
            />
            <button
              onClick={handleSend}
              disabled={sending}
              className="w-full py-3 bg-indigo-600 text-white rounded-xl font-bold disabled:opacity-60"
            >
              {sending ? '전송 중...' : '📲 텔레그램으로 전송'}
            </button>
          </div>
        )}

        {sent && (
          <div className="mt-4 p-4 bg-green-50 rounded-xl border border-green-200 text-center">
            <p className="text-green-700 font-bold">✅ 텔레그램으로 전송됐습니다!</p>
            <button onClick={() => navigate('/')} className="mt-2 text-sm text-indigo-600 underline">
              홈으로 돌아가기
            </button>
          </div>
        )}
      </div>

      {/* 채팅 패널 (Phase 2+4) */}
      <ChatPanel
        key={cur?.id}
        sentence={cur?.sentence}
        blocks={cur?.blocks}
        autoExplain={autoExplain}
      />

      {/* 이전/다음 네비 */}
      {results.length > 1 && (
        <div className="flex items-center justify-between px-4 py-2 border-t border-gray-100">
          <button
            onClick={() => handleSentenceChange(Math.max(0, sidx - 1))}
            disabled={sidx === 0}
            className="px-4 py-2 text-sm text-gray-500 disabled:opacity-30"
          >
            ← 이전
          </button>
          <span className="text-xs text-gray-400">{sidx + 1} / {results.length}</span>
          <button
            onClick={() => handleSentenceChange(Math.min(results.length - 1, sidx + 1))}
            disabled={sidx === results.length - 1}
            className="px-4 py-2 text-sm text-indigo-600 font-medium disabled:opacity-30"
          >
            다음 →
          </button>
        </div>
      )}
    </div>
  )
}
