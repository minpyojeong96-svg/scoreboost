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
const SYSTEM_FULL = `너는 영어 교과서 문법 해설 선생님이야. 초등학생도 이해할 수 있게 설명해.
JSON으로만 답해. 마크다운 없이 순수 JSON.

{
  "translation": "한국어 해석",
  "grammar_tags": ["수동태","시제_완료","to부정사","동명사","관계사절","분사구문","가정법","비교급","조동사","도치","병렬구조","기타"] 중 해당하는 것만,
  "blocks": {
    "A": "전체 해석 (자연스러운 한국어)",
    "B": "단어 분해 (단어: 뜻 형식으로 핵심 단어 3~5개)",
    "C": "문장 구조 (주어/동사/목적어 표시)",
    "D": "문법 설명 (해당 문법 포인트, 없으면 제외)",
    "E": "왜 이렇게 쓰는지 (어려운 구조일 때만, 없으면 제외)",
    "F": "틀린 예 비교 (❌틀린 표현 vs ✅맞는 표현, 없으면 제외)",
    "G": "빈칸 채우기 문제 1개. 반드시 마지막에 (정답단어) 형식으로 정답을 괄호 안에 넣어라. 예: She ___ to school every day. (goes)"
  }
}`

const SYSTEM_PARTIAL = `너는 영어 교과서 문법 해설 선생님이야. 초등학생도 이해할 수 있게 설명해.
JSON으로만 답해. 마크다운 없이 순수 JSON.
D, E, F 블록은 이미 있으니 생성하지 마.

{
  "translation": "한국어 해석",
  "grammar_tags": ["수동태","시제_완료","to부정사","동명사","관계사절","분사구문","가정법","비교급","조동사","도치","병렬구조","기타"] 중 해당하는 것만,
  "blocks": {
    "A": "전체 해석 (자연스러운 한국어)",
    "B": "단어 분해 (단어: 뜻 형식으로 핵심 단어 3~5개)",
    "C": "문장 구조 (주어/동사/목적어 표시)",
    "G": "빈칸 채우기 문제 1개. 반드시 마지막에 (정답단어) 형식으로 정답을 괄호 안에 넣어라. 예: She ___ to school every day. (goes)"
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
      model: 'gpt-4o-mini',
      max_tokens: hasPattern ? 600 : 1000,
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

  // 6. DB 저장 (임베딩 포함)
  const { data: saved, error } = await supabase
    .from('sentences')
    .insert({
      sentence: sentence.trim(),
      translation: result.translation,
      grammar_tags: result.grammar_tags || [],
      embedding,
      blocks,
      pattern_id: pattern?.id || null,
      trust_score: 0.7,
      source: hasPattern ? 'pattern_hit' : 'ai_generated'
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
    cached: false
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
