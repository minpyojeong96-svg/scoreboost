import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext.jsx'
import { CURRICULUM, GRADE_ORDER } from '../data/curriculum.js'

export default function Curriculum() {
  const navigate = useNavigate()
  const { user } = useAuth()

  const [selectedGrade, setSelectedGrade] = useState(null)
  const [selectedTopic, setSelectedTopic] = useState(null)

  const gradeData = selectedGrade ? CURRICULUM[selectedGrade] : null
  const topicData = selectedTopic !== null && gradeData
    ? gradeData.topics[selectedTopic]
    : null

  const handleStartAll = () => {
    const sentences = gradeData.topics.flatMap(t => t.sentences)
    navigate('/result', { state: { image: null, sentences } })
  }

  const handleStartTopic = () => {
    navigate('/result', { state: { image: null, sentences: topicData.sentences } })
  }

  // 학년 선택 화면
  if (!selectedGrade) {
    return (
      <div className="flex flex-col h-full px-4 pt-5 pb-4 overflow-y-auto">
        <h1 className="text-xl font-bold text-gray-800 mb-1">교과서 학습</h1>
        <p className="text-sm text-gray-400 mb-5">학년을 선택하면 기본 문법 문제를 바로 풀 수 있어요</p>

        <div className="flex flex-col gap-3">
          {GRADE_ORDER.map(grade => {
            const g = CURRICULUM[grade]
            return (
              <button
                key={grade}
                onClick={() => setSelectedGrade(grade)}
                className={`w-full text-left p-4 rounded-2xl border-2 ${g.color} active:scale-95 transition-transform`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-bold text-base">{g.label}</p>
                    <p className="text-xs mt-1 opacity-70">
                      {g.topics.map(t => t.title).join(' · ')}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs opacity-60">{g.topics.reduce((s, t) => s + t.sentences.length, 0)}문장</p>
                    <span className="text-lg">→</span>
                  </div>
                </div>
              </button>
            )
          })}
        </div>
      </div>
    )
  }

  // 단원 선택 화면
  if (selectedTopic === null) {
    return (
      <div className="flex flex-col h-full px-4 pt-5 pb-4 overflow-y-auto">
        <button
          onClick={() => setSelectedGrade(null)}
          className="flex items-center gap-1 text-sm text-gray-400 mb-4"
        >
          ← 학년 선택
        </button>

        <div className="flex items-center gap-2 mb-5">
          <span className={`px-3 py-1 rounded-full text-xs font-bold ${gradeData.badge}`}>
            {gradeData.label}
          </span>
        </div>

        {/* 전체 학습 버튼 */}
        <button
          onClick={handleStartAll}
          className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-bold text-base shadow-md active:scale-95 transition-transform mb-4"
        >
          📚 전체 문장 학습하기 ({gradeData.topics.reduce((s, t) => s + t.sentences.length, 0)}문장)
        </button>

        <p className="text-xs font-bold text-gray-400 mb-3">단원별 학습</p>
        <div className="flex flex-col gap-3">
          {gradeData.topics.map((topic, idx) => (
            <button
              key={idx}
              onClick={() => setSelectedTopic(idx)}
              className={`w-full text-left p-4 rounded-2xl border-2 ${gradeData.color} active:scale-95 transition-transform`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-bold">{topic.title}</p>
                  <p className="text-xs mt-1 opacity-70 line-clamp-1">
                    {topic.sentences[0]}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs opacity-60">{topic.sentences.length}문장</p>
                  <span className="text-lg">→</span>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>
    )
  }

  // 문장 목록 + 학습 시작
  return (
    <div className="flex flex-col h-full px-4 pt-5 pb-4 overflow-y-auto">
      <button
        onClick={() => setSelectedTopic(null)}
        className="flex items-center gap-1 text-sm text-gray-400 mb-4"
      >
        ← {gradeData.label}
      </button>

      <div className="flex items-center gap-2 mb-1">
        <span className={`px-3 py-1 rounded-full text-xs font-bold ${gradeData.badge}`}>
          {gradeData.label}
        </span>
        <span className="text-base font-bold text-gray-800">{topicData.title}</span>
      </div>
      <p className="text-xs text-gray-400 mb-4">{topicData.sentences.length}개 문장 · GPT 문법 해설 + 퀴즈 제공</p>

      <div className="flex flex-col gap-2 mb-6">
        {topicData.sentences.map((s, i) => (
          <div key={i} className={`p-3 rounded-xl border ${gradeData.color}`}>
            <p className="text-xs text-gray-400 mb-0.5">{i + 1}번</p>
            <p className="text-sm font-medium text-gray-800">{s}</p>
          </div>
        ))}
      </div>

      <button
        onClick={handleStartTopic}
        className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-bold text-base shadow-md active:scale-95 transition-transform"
      >
        🚀 학습 시작하기
      </button>
    </div>
  )
}
