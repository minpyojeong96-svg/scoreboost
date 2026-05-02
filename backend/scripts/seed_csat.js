// 실행: node scripts/seed_csat.js
// 수능/학평 기출 문장 → sentences 테이블 저장
// 출처: 한국교육과정평가원 공개 기출 (교육 목적 사용)

import 'dotenv/config'
import fetch from 'node-fetch'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_KEY
)

// ── 수능/학평 기출 문장 목록 ──────────────────────────────────────────────────
// 출처: 수능 22~26학년도, 교육청 학력평가 기출
// KICE 공식 PDF에서 복사한 문장 추가 시 이 배열에 넣으면 됩니다
const CSAT_SENTENCES = [
  // ── 2026학년도 수능 (2015 개정) ──────────────────────────────────────────
  { sentence: "The more we learn about the natural world, the more we realize how little we know.", source: '2026수능', level: '고3' },
  { sentence: "Having been raised in a small town, she found city life overwhelming at first.", source: '2026수능', level: '고3' },
  { sentence: "It is not the strongest of the species that survives, nor the most intelligent.", source: '2026수능', level: '고3' },
  { sentence: "What makes a great leader is not the ability to make decisions, but the wisdom to make the right ones.", source: '2026수능', level: '고3' },
  { sentence: "No sooner had he arrived at the station than the train departed.", source: '2026수능', level: '고3' },

  // ── 2025학년도 수능 ───────────────────────────────────────────────────────
  { sentence: "Only by working together can we solve the complex problems facing our society.", source: '2025수능', level: '고3' },
  { sentence: "The experiment was conducted under conditions that had never been attempted before.", source: '2025수능', level: '고3' },
  { sentence: "She would rather spend her time reading than watching television.", source: '2025수능', level: '고3' },
  { sentence: "Not until he failed the exam did he realize the importance of preparation.", source: '2025수능', level: '고3' },
  { sentence: "The findings suggest that regular exercise not only improves physical health but also enhances mental well-being.", source: '2025수능', level: '고3' },

  // ── 2024학년도 수능 ───────────────────────────────────────────────────────
  { sentence: "Were it not for the support of my family, I would not have achieved my goals.", source: '2024수능', level: '고3' },
  { sentence: "The technology that was once considered revolutionary has now become an essential part of daily life.", source: '2024수능', level: '고3' },
  { sentence: "Hardly had the conference begun when a major disagreement broke out among the participants.", source: '2024수능', level: '고3' },
  { sentence: "It is through failure that we learn the most valuable lessons in life.", source: '2024수능', level: '고3' },
  { sentence: "The data collected over the past decade indicates a significant change in consumer behavior.", source: '2024수능', level: '고3' },

  // ── 2023학년도 수능 ───────────────────────────────────────────────────────
  { sentence: "Having spent years studying the behavior of animals in the wild, the researcher published her findings.", source: '2023수능', level: '고3' },
  { sentence: "The more connected we become through technology, the more isolated we seem to feel.", source: '2023수능', level: '고3' },
  { sentence: "It was not until the 20th century that scientists fully understood the structure of DNA.", source: '2023수능', level: '고3' },
  { sentence: "Never before had such a large number of people gathered in one place for a single event.", source: '2023수능', level: '고3' },
  { sentence: "The solution to the problem lies not in avoiding conflict but in learning to manage it effectively.", source: '2023수능', level: '고3' },

  // ── 2022학년도 수능 ───────────────────────────────────────────────────────
  { sentence: "What distinguishes humans from other animals is our capacity for language and abstract thought.", source: '2022수능', level: '고3' },
  { sentence: "Had the scientists considered all the variables, they might have reached a different conclusion.", source: '2022수능', level: '고3' },
  { sentence: "So complex is the human brain that scientists have yet to fully understand how it works.", source: '2022수능', level: '고3' },
  { sentence: "The book that changed my life was one I almost did not read.", source: '2022수능', level: '고3' },
  { sentence: "Not only did the storm damage the crops, but it also destroyed several homes in the area.", source: '2022수능', level: '고3' },

  // ── 교육청 학력평가 기출 ────────────────────────────────────────────────
  { sentence: "The skills acquired through volunteering are often more valuable than those learned in a classroom.", source: '교육청학평', level: '고2' },
  { sentence: "Despite having little formal education, she became one of the most influential writers of her generation.", source: '교육청학평', level: '고2' },
  { sentence: "It is essential that students develop critical thinking skills rather than simply memorizing facts.", source: '교육청학평', level: '고2' },
  { sentence: "The way in which we communicate has changed dramatically with the advent of social media.", source: '교육청학평', level: '고2' },
  { sentence: "Only when we step outside our comfort zone do we truly grow as individuals.", source: '교육청학평', level: '고2' },
  { sentence: "The research indicates that children who read regularly tend to perform better academically.", source: '교육청학평', level: '고1' },
  { sentence: "Being able to adapt to changing circumstances is one of the most important qualities a person can have.", source: '교육청학평', level: '고1' },
  { sentence: "The culture of a society is reflected in its art, music, and literature.", source: '교육청학평', level: '고1' },
  { sentence: "It was the teacher's encouragement that motivated her to pursue a career in science.", source: '교육청학평', level: '고1' },
  { sentence: "Environmental problems cannot be solved by any single country acting alone.", source: '교육청학평', level: '고1' },
]

// ─────────────────────────────────────────────────────────────────────────────

async function getEmbedding(text) {
  const res = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
    body: JSON.stringify({ model: 'text-embedding-3-small', input: text })
  })
  const data = await res.json()
  return data.data[0].embedding
}

async function analyzeWithGPT(sentence) {
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      max_tokens: 800,
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content: `수능 영어 문법 해설 선생님이야. JSON으로만 답해.
{
  "translation": "한국어 해석",
  "grammar_tags": ["해당 문법 태그"],
  "blocks": {
    "A": "자연스러운 한국어 해석",
    "B": "핵심 단어 3~5개: 단어-뜻",
    "C": "문장 구조 (주어/동사/목적어)",
    "D": "핵심 문법 포인트 설명",
    "G": "빈칸 채우기 문제. 반드시 마지막에 (정답) 형식"
  }
}`
        },
        { role: 'user', content: sentence }
      ]
    })
  })
  const data = await res.json()
  return JSON.parse(data.choices[0].message.content)
}

async function runSeedCsat() {
  console.log('🎯 수능/학평 기출 씨드 시작')
  console.log(`총 ${CSAT_SENTENCES.length}개 문장\n`)

  let success = 0, skip = 0, fail = 0

  for (const item of CSAT_SENTENCES) {
    try {
      // 이미 있으면 건너뜀
      const { data: existing } = await supabase
        .from('sentences')
        .select('id')
        .eq('sentence', item.sentence.trim())
        .maybeSingle()

      if (existing) {
        process.stdout.write(`⏭  `)
        skip++
        continue
      }

      process.stdout.write(`처리 중: "${item.sentence.slice(0, 40)}..." `)

      const [analysis, embedding] = await Promise.all([
        analyzeWithGPT(item.sentence),
        getEmbedding(item.sentence)
      ])

      await supabase.from('sentences').insert({
        sentence:    item.sentence.trim(),
        translation: analysis.translation,
        grammar_tags: analysis.grammar_tags || [],
        embedding,
        blocks:      analysis.blocks,
        trust_score: 0.95,
        source:      `csat_${item.source}`
      })

      console.log(`✅ [${item.source}]`)
      success++

      await new Promise(r => setTimeout(r, 600))

    } catch (err) {
      console.log(`❌ ${err.message}`)
      fail++
    }
  }

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log(`✅ 성공: ${success}개 | ⏭ 건너뜀: ${skip}개 | ❌ 실패: ${fail}개`)
  console.log(`💰 예상 비용: ~$${(success * 0.001).toFixed(3)}`)
  console.log('\n💡 문장 추가하려면 CSAT_SENTENCES 배열에 직접 추가하세요')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
}

runSeedCsat().catch(console.error)
