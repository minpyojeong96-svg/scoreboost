import { useState, useEffect, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { ocrImage, analyzeSentences, sendToTelegram } from '../api/client.js'
import { supabase } from '../lib/supabase.js'
import { useAuth } from '../contexts/AuthContext.jsx'
import ChatPanel from '../components/ChatPanel.jsx'

// ─── TTS 훅 ──────────────────────────────────────────────────────────────────
function useTTS() {
  const [speaking, setSpeaking] = useState(false)

  const speak = (text, lang = 'en-US', rate = 0.85) => {
    if (!window.speechSynthesis) return
    window.speechSynthesis.cancel()
    const u = new SpeechSynthesisUtterance(text)
    u.lang = lang
    u.rate = rate
    u.onstart = () => setSpeaking(true)
    u.onend = () => setSpeaking(false)
    u.onerror = () => setSpeaking(false)
    window.speechSynthesis.speak(u)
  }

  const stop = () => {
    window.speechSynthesis?.cancel()
    setSpeaking(false)
  }

  return { speaking, speak, stop }
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

// ─── 정답 교정 TTS (천천히 → 정상) ──────────────────────────────────────────
function speakCorrection(word) {
  if (!window.speechSynthesis || !word) return
  window.speechSynthesis.cancel()
  const slow = new SpeechSynthesisUtterance(word)
  slow.lang = 'en-US'; slow.rate = 0.5
  const normal = new SpeechSynthesisUtterance(word)
  normal.lang = 'en-US'; normal.rate = 1.0
  slow.onend = () => setTimeout(() => window.speechSynthesis?.speak(normal), 700)
  window.speechSynthesis.speak(slow)
}

// ─── 음성 인식 퀴즈 ───────────────────────────────────────────────────────────
function VoiceQuiz({ text, quizStatus, onResult }) {
  const { question, answer } = parseG(text)
  const hasSR = !!(window.SpeechRecognition || window.webkitSpeechRecognition)
  const [mode, setMode] = useState(hasSR ? 'voice' : 'text')
  const [listening, setListening] = useState(false)
  const [voiceAttempts, setVoiceAttempts] = useState(0)
  const [textAttempts, setTextAttempts] = useState(0)
  const [lastHeard, setLastHeard] = useState('')
  const [textInput, setTextInput] = useState('')
  const [wrongFeedback, setWrongFeedback] = useState(false)
  const recRef = useRef(null)
  const MAX_VOICE = 5

  const handleAnswer = (heard, isVoice) => {
    if (normalize(heard) === normalize(answer)) {
      setWrongFeedback(false)
      onResult('correct', answer, heard)
    } else {
      setWrongFeedback(true)
      setLastHeard(heard)
      speakCorrection(answer)
      if (isVoice) {
        const next = voiceAttempts + 1
        setVoiceAttempts(next)
        if (next >= MAX_VOICE) setTimeout(() => setMode('text'), 1800)
      } else {
        // 텍스트 오답 → 오답 처리 후 다음으로 이동 가능
        setTextInput('')
        onResult('wrong', answer, heard)
      }
    }
  }

  const startListening = () => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SR) { setMode('text'); return }
    setWrongFeedback(false)
    const r = new SR()
    r.lang = 'en-US'; r.continuous = false; r.interimResults = false
    recRef.current = r
    r.onstart = () => setListening(true)
    r.onend   = () => setListening(false)
    r.onerror = () => setListening(false)
    r.onresult = e => handleAnswer(e.results[0][0].transcript.trim(), true)
    r.start()
  }

  const stopListening = () => { recRef.current?.stop(); setListening(false) }

  const submitText = () => {
    if (!textInput.trim()) return
    handleAnswer(textInput.trim(), false)
  }

  const reveal = () => {
    speakCorrection(answer)
    onResult('revealed', answer, '')
  }

  if (quizStatus === 'correct') return (
    <div className="rounded-2xl border-2 border-green-300 bg-green-50 p-4 text-center">
      <p className="text-3xl mb-1">✅</p>
      <p className="font-bold text-green-700 text-lg font-mono">{answer}</p>
      <p className="text-xs text-green-600 mt-1">정답! 다음 문장으로 이동하세요</p>
    </div>
  )

  if (quizStatus === 'revealed') return (
    <div className="rounded-2xl border-2 border-orange-200 bg-orange-50 p-4 text-center">
      <p className="text-3xl mb-1">📖</p>
      <p className="font-bold text-orange-700 text-lg font-mono">{answer}</p>
      <p className="text-xs text-orange-600 mt-1">오답노트에 저장됐어요. 다음에 다시 도전!</p>
    </div>
  )

  return (
    <div className="rounded-2xl border-2 border-indigo-200 bg-indigo-50 p-4">
      <p className="text-xs font-bold text-indigo-500 mb-2">✏️ 퀴즈 — 빈칸을 채워보세요!</p>
      <p className="text-sm text-gray-700 mb-4 whitespace-pre-wrap">{question}</p>

      {wrongFeedback && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-3 py-2 mb-3 text-xs text-red-600">
          ❌ 틀렸어요! 정답 발음을 들어보세요 🔊
          {lastHeard && <span className="block text-gray-400 mt-0.5">들린 말: "{lastHeard}"</span>}
        </div>
      )}

      {mode === 'voice' ? (
        <div className="flex flex-col items-center gap-3">
          <button
            onClick={listening ? stopListening : startListening}
            className={`w-24 h-24 rounded-full flex flex-col items-center justify-center gap-1 text-white shadow-lg transition-all
              ${listening ? 'bg-red-500 animate-pulse scale-105' : 'bg-indigo-600 active:scale-95'}`}
          >
            <span className="text-3xl">{listening ? '🔴' : '🎤'}</span>
            <span className="text-xs font-bold">{listening ? '듣는 중...' : '눌러서 말하기'}</span>
          </button>

          {voiceAttempts > 0 && voiceAttempts < MAX_VOICE && (
            <p className="text-xs text-orange-500 text-center">
              음성 시도 {voiceAttempts}/{MAX_VOICE} — {MAX_VOICE - voiceAttempts}번 남음
            </p>
          )}

          <div className="flex gap-4 text-xs text-gray-400">
            <button onClick={() => setMode('text')} className="underline">텍스트로 입력</button>
            <button onClick={reveal} className="underline">정답 보기</button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {voiceAttempts >= MAX_VOICE && (
            <p className="text-xs text-orange-500 mb-1">음성 인식 5회 초과 → 직접 입력해주세요</p>
          )}
          <div className="flex gap-2">
            <input
              type="text"
              value={textInput}
              onChange={e => setTextInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && submitText()}
              placeholder="정답을 입력하세요"
              className="flex-1 border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-indigo-400 bg-white"
              autoFocus
            />
            <button
              onClick={submitText}
              disabled={!textInput.trim()}
              className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-bold disabled:opacity-40"
            >
              확인
            </button>
          </div>
          <div className="flex gap-4 text-xs text-gray-400">
            {hasSR && (
              <button onClick={() => { setMode('voice'); setWrongFeedback(false) }} className="underline">
                음성으로 다시 시도
              </button>
            )}
            <button onClick={reveal} className="underline">정답 보기</button>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── 한 문장 카드 (모든 블록 펼쳐서 보여줌) ──────────────────────────────────
function SentenceCard({ item, quizStatus, onQuizResult }) {
  const b = item.blocks || {}
  const { speaking, speak, stop } = useTTS()

  return (
    <div className="flex flex-col gap-3">
      {/* 원문 + TTS 버튼 */}
      <div className="bg-white rounded-2xl border-2 border-gray-200 p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1">
            <p className="text-xs font-bold text-gray-400 mb-1">영어 문장</p>
            <p className="text-base font-bold text-gray-900 leading-relaxed">{item.sentence}</p>
          </div>
          <button
            onClick={() => speaking ? stop() : speak(item.sentence)}
            className={`shrink-0 w-11 h-11 rounded-full flex items-center justify-center text-xl shadow-sm transition-colors
              ${speaking
                ? 'bg-indigo-600 text-white animate-pulse'
                : 'bg-indigo-50 text-indigo-600 active:bg-indigo-100'}`}
          >
            {speaking ? '⏹' : '🔊'}
          </button>
        </div>
        {item.grammar_tags?.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {item.grammar_tags.map(t => (
              <span key={t} className="text-xs bg-indigo-100 text-indigo-600 px-2 py-0.5 rounded-full font-medium">{t}</span>
            ))}
          </div>
        )}
      </div>

      {/* A: 해석 */}
      {b.A && (
        <div className="bg-blue-50 rounded-2xl border-2 border-blue-200 p-4">
          <p className="text-xs font-bold text-blue-500 mb-2">🗣️ 우리말 해석</p>
          <p className="text-sm text-gray-800 leading-relaxed whitespace-pre-wrap">{b.A}</p>
        </div>
      )}

      {/* B: 단어 */}
      {b.B && (
        <div className="bg-purple-50 rounded-2xl border-2 border-purple-200 p-4">
          <p className="text-xs font-bold text-purple-500 mb-2">📖 단어 하나씩 뜯어보기</p>
          <p className="text-sm text-gray-800 leading-relaxed whitespace-pre-wrap">{b.B}</p>
        </div>
      )}

      {/* C: 구조 */}
      {b.C && (
        <div className="bg-green-50 rounded-2xl border-2 border-green-200 p-4">
          <p className="text-xs font-bold text-green-600 mb-2">🔍 문장 구조 (주어/동사/목적어)</p>
          <p className="text-sm text-gray-800 leading-relaxed whitespace-pre-wrap">{b.C}</p>
        </div>
      )}

      {/* D: 문법 */}
      {b.D?.trim() && (
        <div className="bg-orange-50 rounded-2xl border-2 border-orange-200 p-4">
          <p className="text-xs font-bold text-orange-500 mb-2">📚 문법 설명</p>
          <p className="text-sm text-gray-800 leading-relaxed whitespace-pre-wrap">{b.D.trim()}</p>
        </div>
      )}

      {/* E: 이유 */}
      {b.E?.trim() && (
        <div className="bg-pink-50 rounded-2xl border-2 border-pink-200 p-4">
          <p className="text-xs font-bold text-pink-500 mb-2">💡 왜 이렇게 쓸까요?</p>
          <p className="text-sm text-gray-800 leading-relaxed whitespace-pre-wrap">{b.E.trim()}</p>
        </div>
      )}

      {/* F: 비교 */}
      {b.F?.trim() && (
        <div className="bg-red-50 rounded-2xl border-2 border-red-200 p-4">
          <p className="text-xs font-bold text-red-500 mb-2">⚠️ 이렇게 쓰면 틀려요!</p>
          <p className="text-sm text-gray-800 leading-relaxed whitespace-pre-wrap">{b.F.trim()}</p>
        </div>
      )}

      {/* G: 퀴즈 */}
      {b.G && (
        <VoiceQuiz
          text={b.G}
          quizStatus={quizStatus}
          onResult={onQuizResult}
        />
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
  const scrollRef = useRef(null)

  const [phase, setPhase] = useState('loading')
  const [loadingMsg, setLoadingMsg] = useState('문장 분석 중...')
  const [elapsed, setElapsed] = useState(0)
  const [errMsg, setErrMsg] = useState('')
  const [results, setResults] = useState([])
  const [sidx, setSidx] = useState(0)
  const [quizMap, setQuizMap] = useState({})
  const [autoExplain, setAutoExplain] = useState(null)
  const [name, setName] = useState('')
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)

  const fromCurriculum = !state?.image && !!state?.sentences

  useEffect(() => {
    if (phase !== 'loading') { setElapsed(0); return }
    setElapsed(0)
    const t = setInterval(() => setElapsed(s => s + 1), 1000)
    return () => clearInterval(t)
  }, [phase])

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
          setPhase('ready')
          return
        } catch (e) {
          lastErr = e
          if (e.message === 'Failed to fetch' && attempt < MAX_RETRIES - 1) {
            setLoadingMsg(`서버 연결 중... (${attempt + 1}/${MAX_RETRIES}회 시도, 잠시만 기다려 주세요)`)
            await new Promise(r => setTimeout(r, 8000))
          } else {
            throw e
          }
        }
      }
      throw lastErr
    } catch (e) {
      const msg = e.message === 'Failed to fetch'
        ? '서버에 연결할 수 없습니다.\n잠시 후 다시 시도해주세요.'
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
    window.speechSynthesis?.cancel()
    setSidx(idx)
    setAutoExplain(null)
    if (scrollRef.current) scrollRef.current.scrollTop = 0
  }

  const handleQuizResult = async (status, correctAnswer, userInput) => {
    setQuizMap(prev => ({ ...prev, [cur.id]: status }))

    if (status !== 'correct') {
      setAutoExplain({ userInput, correctAnswer })
      if (user) {
        const grammarTag = cur.grammar_tags?.[0] || '기타'
        const { data: existing } = await supabase
          .from('wrong_notes')
          .select('id')
          .eq('user_id', user.id)
          .eq('sentence_id', cur.id)
          .eq('grammar_tag', grammarTag)
          .maybeSingle()

        if (!existing) {
          await supabase.from('wrong_notes').insert({
            user_id: user.id,
            sentence_id: cur.id,
            sentence: cur.sentence,
            translation: cur.translation,
            grammar_tag: grammarTag,
            blocks: cur.blocks,
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
        .sort((a, b) => b[1] - a[1]).slice(0, 3).map(([tag]) => tag)

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

  // ─── 로딩 화면 ───────────────────────────────────────────────────────────────
  if (phase === 'loading') {
    const steps = [
      { until: 5,        icon: '🔍', msg: 'GPT가 문장을 읽고 있어요...' },
      { until: 12,       icon: '✍️', msg: '문법을 분석하고 해석을 만드는 중이에요' },
      { until: 20,       icon: '📝', msg: '퀴즈와 설명을 정리하고 있어요' },
      { until: 30,       icon: '⏳', msg: '거의 다 됐어요! 조금만 기다려 주세요' },
      { until: Infinity, icon: '🐢', msg: '시간이 좀 걸리네요... 서버가 열심히 일하는 중이에요' },
    ]
    const step = steps.find(s => elapsed < s.until)

    return (
      <div className="flex flex-col items-center justify-center h-full gap-5 px-6">
        <div className="relative">
          <div className="w-16 h-16 border-4 border-indigo-100 rounded-full" />
          <div className="w-16 h-16 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin absolute inset-0" />
          <span className="absolute inset-0 flex items-center justify-center text-2xl">{step.icon}</span>
        </div>
        <div className="text-center">
          <p className="text-indigo-600 font-bold text-lg">{elapsed}초</p>
          <p className="text-gray-500 text-sm mt-1">{step.msg}</p>
          {loadingMsg !== '문장 분석 중...' && (
            <p className="text-orange-500 text-xs mt-2">{loadingMsg}</p>
          )}
        </div>
        <div className="bg-indigo-50 rounded-xl px-4 py-3 text-center max-w-xs">
          <p className="text-xs text-indigo-600">
            💡 처음 분석은 <strong>20~30초</strong> 걸려요<br />
            같은 문장은 다음부터 <strong>바로</strong> 나와요
          </p>
        </div>
      </div>
    )
  }

  // ─── 에러 화면 ───────────────────────────────────────────────────────────────
  if (phase === 'error') {
    return (
      <div className="flex flex-col items-center justify-center h-full px-6 gap-4">
        <span className="text-5xl">😅</span>
        <p className="text-gray-700 text-center font-medium whitespace-pre-wrap text-sm">{errMsg}</p>
        <button onClick={runAnalysis} className="w-full py-3 bg-indigo-600 text-white rounded-xl font-bold">
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

  // ─── 결과 화면 ───────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-full">
      {/* 문장 선택 탭 */}
      {results.length > 1 && (
        <div className="flex gap-2 px-4 pt-3 pb-2 overflow-x-auto shrink-0">
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

      {/* 스크롤 영역 — 모든 블록 펼쳐서 보여줌 */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3 min-h-0 flex flex-col gap-4">
        {cur && (
          <SentenceCard
            item={cur}
            quizStatus={quizMap[cur.id]}
            onQuizResult={(status, correctAnswer, userInput) =>
              handleQuizResult(status, correctAnswer, userInput)
            }
          />
        )}

        {/* 텔레그램 전송 */}
        {allAttempted && !sent && (
          <div className="p-4 bg-gray-50 rounded-2xl border border-gray-200">
            <p className="text-sm font-bold text-gray-700 mb-3">
              🎯 최종 점수: {score}점 ({correctCount}/{quizSentences.length})
            </p>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="이름 입력 (선택)"
              className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm mb-2 focus:outline-none focus:border-indigo-400"
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
          <div className="p-4 bg-green-50 rounded-2xl border border-green-200 text-center">
            <p className="text-green-700 font-bold">✅ 텔레그램으로 전송됐습니다!</p>
            <button onClick={() => navigate('/')} className="mt-2 text-sm text-indigo-600 underline">
              홈으로 돌아가기
            </button>
          </div>
        )}

        <div className="h-2" />
      </div>

      {/* 채팅 패널 */}
      <ChatPanel
        key={cur?.id}
        sentence={cur?.sentence}
        blocks={cur?.blocks}
        autoExplain={autoExplain}
      />

      {/* 이전/다음 네비 */}
      {results.length > 1 && (
        <div className="flex items-center justify-between px-4 py-2 border-t border-gray-100 shrink-0">
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
