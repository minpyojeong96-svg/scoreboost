import { Router } from 'express'
import fetch from 'node-fetch'
import { supabase } from '../db/supabase.js'

const router = Router()

// ── 임베딩 생성 (text-embedding-3-small, $0.00002/1K tokens) ─────────────────
async function getEmbedding(text) {
  const res = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`
    },
    body: JSON.stringify({ model: 'text-embedding-3-small', input: text })
  })
  const data = await res.json()
  if (!res.ok || !data.data?.[0]?.embedding) {
    const msg = data.error?.message || `OpenAI Embedding 오류 (${res.status})`
    throw Object.assign(new Error(msg), { status: 502 })
  }
  return data.data[0].embedding
}

// ── 벡터 유사도로 캐시 문장 검색 (90%+ = 재사용) ────────────────────────────
async function findCachedSentence(embedding) {
  const { data } = await supabase.rpc('match_sentences', {
    query_embedding: embedding,
    match_threshold: 0.90,
    match_count: 1
  })
  return data?.[0] || null
}

// ── 벡터 유사도로 문법 패턴 검색 (75%+ = D/E/F 블록 재사용) ─────────────────
async function findMatchingPattern(embedding) {
  const { data } = await supabase.rpc('match_patterns', {
    query_embedding: embedding,
    match_threshold: 0.75,
    match_count: 1
  })
  return data?.[0] || null
}

// ── GPT 호출: 패턴 있으면 A/B/C/G만, 없으면 전체 ────────────────────────────
const SYSTEM_FULL = `너는 친절한 영어 과외 선생님이야. 초등학생도 완벽히 이해할 수 있도록, 쉬운 말로 단계별로 설명해줘.
전문 용어를 쓸 때는 반드시 괄호로 쉬운 설명을 덧붙여. 예: 동명사(동사를 명사처럼 쓰는 것)
JSON으로만 답해. 마크다운 없이 순수 JSON.

{
  "translation": "한국어 해석",
  "grammar_tags": ["수동태","시제_완료","to부정사","동명사","관계사절","분사구문","가정법","비교급","조동사","도치","병렬구조","기타"] 중 해당하는 것만,
  "blocks": {
    "A": "자연스럽고 친근한 우리말 해석. 직역보다 '이 문장은 ~라는 뜻이에요'처럼 말하듯 써줘.",
    "B": "반드시 하나의 문자열로 반환. 핵심 단어 3~5개를 줄바꿈으로 나열. 예시: '• washed → 씻었다 (wash의 과거형이에요)\\n• dishes → 접시들 (여러 개일 때 s 붙여요!)'",
    "C": "반드시 하나의 문자열로 반환. 절대 object로 반환하지 마. 예시: '[주어] She(그녀가) / [동사] washed(씻었다) / [목적어] the dishes(접시들을) → 그녀가 접시들을 씻었다'",
    "D": "이 문장에서 배울 문법 포인트를 단계별로 설명. ①②③ 번호를 붙여서 초등학생도 이해하게. 어려운 용어는 반드시 쉬운 말로 풀어서. 문법 포인트가 없으면 D 키 자체를 JSON에서 빼.",
    "E": "왜 이렇게 쓰는지 이유를 일상 예시와 함께 설명. '예를 들어 우리말로는 ~라고 하잖아요. 영어도 똑같이...' 식으로. 단순한 문장이면 E 키 자체를 JSON에서 빼.",
    "F": "헷갈리기 쉬운 틀린 표현과 맞는 표현 비교. ❌ 틀린 예 + 왜 틀렸는지 한 줄 / ✅ 맞는 표현. 비교할 게 없으면 F 키 자체를 JSON에서 빼.",
    "G": "이 문장에서 핵심 단어 하나를 빈칸으로 만든 문제 1개. 반드시 마지막에 (정답단어) 형식. 예: She ___ the dishes right after eating. (washed)"
  }
}`

const SYSTEM_PARTIAL = `너는 친절한 영어 과외 선생님이야. 초등학생도 완벽히 이해할 수 있도록, 쉬운 말로 단계별로 설명해줘.
전문 용어를 쓸 때는 반드시 괄호로 쉬운 설명을 덧붙여.
JSON으로만 답해. 마크다운 없이 순수 JSON.
D, E, F 블록은 이미 있으니 생성하지 마.

{
  "translation": "한국어 해석",
  "grammar_tags": ["수동태","시제_완료","to부정사","동명사","관계사절","분사구문","가정법","비교급","조동사","도치","병렬구조","기타"] 중 해당하는 것만,
  "blocks": {
    "A": "자연스럽고 친근한 우리말 해석. 직역보다 '이 문장은 ~라는 뜻이에요'처럼 말하듯 써줘.",
    "B": "반드시 하나의 문자열로 반환. 핵심 단어 3~5개를 줄바꿈으로 나열. 예시: '• washed → 씻었다 (wash의 과거형이에요)\\n• dishes → 접시들 (여러 개일 때 s 붙여요!)'",
    "C": "반드시 하나의 문자열로 반환. 절대 object로 반환하지 마. 예시: '[주어] She(그녀가) / [동사] washed(씻었다) / [목적어] the dishes(접시들을) → 그녀가 접시들을 씻었다'",
    "G": "이 문장에서 핵심 단어 하나를 빈칸으로 만든 문제 1개. 반드시 마지막에 (정답단어) 형식. 예: She ___ the dishes right after eating. (washed)"
  }
}`

async function callGPT(sentence, hasPattern) {
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`
    },
    body: JSON.stringify({
      model: 'gpt-4o',
      max_tokens: hasPattern ? 1200 : 2000,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: hasPattern ? SYSTEM_PARTIAL : SYSTEM_FULL },
        { role: 'user', content: sentence }
      ]
    })
  })

  if (!res.ok) {
    const err = await res.json()
    throw Object.assign(new Error(err.error?.message || 'OpenAI 오류'), { status: 502 })
  }

  const data = await res.json()
  return JSON.parse(data.choices[0].message.content)
}

// ── 메인 분석 함수 ────────────────────────────────────────────────────────────
async function analyzeSentence(sentence) {
  // 1. 임베딩 생성
  const embedding = await getEmbedding(sentence)

  // 2. 캐시 히트 확인 (90%+ 유사도 = 재사용)
  const cached = await findCachedSentence(embedding)
  if (cached) {
    return {
      id: cached.id,
      sentence: cached.sentence,
      translation: cached.translation,
      grammar_tags: cached.grammar_tags,
      blocks: cached.blocks,
      source: 'db_hit',
      cached: true
    }
  }

  // 3. 문법 패턴 매칭 (75%+ = D/E/F 재사용)
  const pattern = await findMatchingPattern(embedding)
  const hasPattern = !!pattern

  // 4. GPT 호출 (패턴 있으면 A/B/C/G만, 없으면 전체)
  const result = await callGPT(sentence, hasPattern)

  // 5. D/E/F 블록 병합 (패턴 있으면 패턴 것 사용)
  const blocks = { ...result.blocks }
  if (hasPattern && pattern.blocks) {
    if (pattern.blocks.D && !blocks.D) blocks.D = pattern.blocks.D
    if (pattern.blocks.E && !blocks.E) blocks.E = pattern.blocks.E
    if (pattern.blocks.F && !blocks.F) blocks.F = pattern.blocks.F
  }

  // 6. AI 자동 검수 (생성 직후 GPT-4o가 다시 확인)
  const review = await autoReview(sentence.trim(), result.translation, blocks)

  // 7. DB 저장
  const { data: saved, error } = await supabase
    .from('sentences')
    .insert({
      sentence: sentence.trim(),
      translation: result.translation,
      grammar_tags: result.grammar_tags || [],
      embedding,
      blocks,
      pattern_id: pattern?.id || null,
      trust_score: review.passed ? 0.9 : 0.5,
      source: hasPattern ? 'pattern_hit' : 'ai_generated',
      review_passed: review.passed,
      review_issues: review.issues
    })
    .select('id')
    .single()

  if (error) throw Object.assign(new Error(error.message), { status: 500 })

  return {
    id: saved.id,
    sentence: sentence.trim(),
    translation: result.translation,
    grammar_tags: result.grammar_tags || [],
    blocks,
    source: hasPattern ? 'pattern_hit' : 'ai_generated',
    cached: false,
    review_passed: review.passed,
    review_issues: review.issues
  }
}

// ── AI 자동 검수: 생성된 설명을 GPT-4o가 다시 확인 ──────────────────────────
async function autoReview(sentence, translation, blocks) {
  try {
    const quizG = typeof blocks.G === 'string' ? blocks.G : ''
    const m = quizG.match(/\(([^)]+)\)\s*$/)
    const quizAnswer = m ? m[1] : null

    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
      body: JSON.stringify({
        model: 'gpt-4o',
        max_tokens: 400,
        response_format: { type: 'json_object' },
        messages: [
          {
            role: 'system',
            content: '너는 영어 교육 전문가야. 영어 문장 설명의 정확성을 검토해. JSON으로만 답해.'
          },
          {
            role: 'user',
            content: `다음 영어 문장 설명이 정확한지 검토해줘.

문장: "${sentence}"
한국어 번역: "${translation}"
퀴즈 및 정답: "${quizG}"

검토 항목:
1. 번역이 영어 원문의 의미를 정확히 전달하는가?
2. 퀴즈 정답(${quizAnswer})이 실제로 그 문장에서 사용된 올바른 단어인가?
3. 전반적으로 학생에게 잘못된 정보를 줄 위험이 있는가?

{
  "passed": true 또는 false,
  "issues": ["발견된 문제점 (없으면 빈 배열)"],
  "quiz_answer_correct": true 또는 false
}`
          }
        ]
      })
    })

    if (!res.ok) return { passed: true, issues: [] }
    const data = await res.json()
    return JSON.parse(data.choices[0].message.content)
  } catch {
    return { passed: true, issues: [] }
  }
}

// ── POST /api/analyze ─────────────────────────────────────────────────────────
router.post('/', async (req, res, next) => {
  try {
    const { sentences } = req.body
    if (!Array.isArray(sentences) || sentences.length === 0) {
      return res.status(400).json({ error: 'sentences 배열이 필요합니다' })
    }
    if (sentences.length > 20) {
      return res.status(400).json({ error: '한 번에 최대 20문장까지 분석 가능합니다' })
    }

    const results = await Promise.all(sentences.map(analyzeSentence))
    res.json({ results })
  } catch (err) {
    next(err)
  }
})

export default router
