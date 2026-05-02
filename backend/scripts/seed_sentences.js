// 실행: node scripts/seed_sentences.js
// 문법 패턴당 예문 20개 자동 생성 → sentences 테이블에 저장
// 총 90패턴 × 20개 = 1,800개 예문, 예상 비용 ~$2

import 'dotenv/config'
import fetch from 'node-fetch'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_KEY
)

const SENTENCES_PER_PATTERN = 20

async function getEmbedding(text) {
  const res = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
    body: JSON.stringify({ model: 'text-embedding-3-small', input: text })
  })
  const data = await res.json()
  return data.data[0].embedding
}

async function generateSentences(pattern) {
  const isMiddle = pattern.school_level === '중학교'
  const vocabNote = isMiddle ? '중학생 수준 (1,500단어 이내)' : `고등학생 수준 (${pattern.vocab_level}단어 이내)`

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      max_tokens: 3000,
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content: `2022 개정 교육과정 기준 영어 교과서 예문 작성 전문가야. JSON으로만 답해.`
        },
        {
          role: 'user',
          content: `문법 패턴: "${pattern.pattern_name}" (${pattern.grammar_category}, ${pattern.school_level})
어휘 수준: ${vocabNote}

이 패턴을 활용한 교과서 스타일 예문 ${SENTENCES_PER_PATTERN}개를 생성해.
실생활/학교생활/환경/디지털/진로 등 2022 개정 소재를 반영해.
각 예문은 서로 다른 소재와 맥락을 사용해.

JSON 형식:
{
  "sentences": [
    {
      "sentence": "영어 예문 (완전한 문장)",
      "translation": "자연스러운 한국어 해석",
      "grammar_tags": ["${pattern.grammar_category}"],
      "blocks": {
        "A": "전체 해석",
        "B": "핵심 단어 3~4개: 단어-뜻 형식",
        "C": "주어/동사/목적어 구조 표시",
        "G": "빈칸 채우기 문제. 반드시 마지막에 (정답) 형식. 예: She ___ to school. (goes)"
      }
    }
  ]
}`
        }
      ]
    })
  })

  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.error?.message || 'OpenAI 오류')
  }

  const data = await res.json()
  return JSON.parse(data.choices[0].message.content).sentences || []
}

async function runSeedSentences() {
  console.log('📚 예문 씨드 시작')

  // 모든 패턴 조회
  const { data: patterns, error } = await supabase
    .from('grammar_patterns')
    .select('id, pattern_name, grammar_category, school_level, vocab_level, blocks')
    .order('school_level')

  if (error || !patterns?.length) {
    console.error('패턴 조회 실패. 먼저 npm run seed 실행하세요.')
    process.exit(1)
  }

  console.log(`총 ${patterns.length}개 패턴 → 패턴당 ${SENTENCES_PER_PATTERN}개 = 최대 ${patterns.length * SENTENCES_PER_PATTERN}개 예문\n`)

  let success = 0, skip = 0, fail = 0

  for (const pattern of patterns) {
    try {
      // 이미 이 패턴으로 생성된 예문 수 확인
      const { count } = await supabase
        .from('sentences')
        .select('id', { count: 'exact', head: true })
        .eq('pattern_id', pattern.id)

      if (count >= SENTENCES_PER_PATTERN) {
        console.log(`⏭  건너뜀 (이미 ${count}개): ${pattern.pattern_name}`)
        skip += count
        continue
      }

      const needed = SENTENCES_PER_PATTERN - (count || 0)
      process.stdout.write(`처리 중 [${pattern.school_level}] ${pattern.pattern_name} (${needed}개) ... `)

      const generated = await generateSentences(pattern)
      const toInsert  = generated.slice(0, needed)

      // 각 예문 임베딩 + DB 저장
      for (const s of toInsert) {
        const embedding = await getEmbedding(s.sentence)

        // D/E/F 블록은 패턴에서 병합
        const blocks = { ...s.blocks }
        if (pattern.blocks?.D) blocks.D = pattern.blocks.D
        if (pattern.blocks?.E) blocks.E = pattern.blocks.E
        if (pattern.blocks?.F) blocks.F = pattern.blocks.F

        await supabase.from('sentences').upsert({
          sentence:    s.sentence.trim(),
          translation: s.translation,
          grammar_tags: s.grammar_tags || [pattern.grammar_category],
          embedding,
          blocks,
          pattern_id:  pattern.id,
          trust_score: 0.85,
          source:      'seed_generated'
        }, { onConflict: 'sentence' })

        success++
        // 임베딩 API 레이트 리밋 방지
        await new Promise(r => setTimeout(r, 100))
      }

      console.log(`✅ ${toInsert.length}개`)

      // GPT API 레이트 리밋 방지
      await new Promise(r => setTimeout(r, 500))

    } catch (err) {
      console.log(`❌ ${err.message}`)
      fail++
    }
  }

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log(`✅ 성공: ${success}개 | ⏭ 건너뜀: ${skip}개 | ❌ 실패: ${fail}개`)
  console.log(`💰 예상 비용: ~$${(success * 0.00012).toFixed(3)} (GPT) + ~$${(success * 0.00002).toFixed(4)} (임베딩)`)
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
}

runSeedSentences().catch(console.error)
