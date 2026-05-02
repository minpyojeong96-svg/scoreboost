// 실행: node scripts/seed.js
// 중학교 25개 + 고등학교 공통 11개 + 심화 7개 = 총 43개 문법 패턴

import 'dotenv/config'
import fetch from 'node-fetch'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_KEY
)

// ── 43개 문법 패턴 목록 ───────────────────────────────────────────────────────
const PATTERNS = [
  // ── 중학교 필수 25개 ──────────────────────────────────────────────────────
  { name: '수동태_기본_be_pp',         category: '수동태',    level: '중학교',         vocab: 1500 },
  { name: '수동태_by_행위자',           category: '수동태',    level: '중학교',         vocab: 1500 },
  { name: '수동태_4형식_이중목적어',    category: '수동태',    level: '중학교',         vocab: 1500 },
  { name: '현재완료_경험_ever_never',   category: '시제_완료', level: '중학교',         vocab: 1500 },
  { name: '현재완료_계속_since_for',    category: '시제_완료', level: '중학교',         vocab: 1500 },
  { name: '현재완료_결과_just_already', category: '시제_완료', level: '중학교',         vocab: 1500 },
  { name: 'to부정사_명사적_주어목적어', category: 'to부정사',  level: '중학교',         vocab: 1500 },
  { name: 'to부정사_형용사적_명사수식', category: 'to부정사',  level: '중학교',         vocab: 1500 },
  { name: 'to부정사_부사적_목적',       category: 'to부정사',  level: '중학교',         vocab: 1500 },
  { name: 'to부정사_부사적_결과감정',   category: 'to부정사',  level: '중학교',         vocab: 1500 },
  { name: '동명사_주어_is',             category: '동명사',    level: '중학교',         vocab: 1500 },
  { name: '동명사_목적어_enjoy_mind',   category: '동명사',    level: '중학교',         vocab: 1500 },
  { name: '관계대명사_who_주격',        category: '관계사절',  level: '중학교',         vocab: 1500 },
  { name: '관계대명사_which_주격목적격',category: '관계사절',  level: '중학교',         vocab: 1500 },
  { name: '관계대명사_that_선행사제한', category: '관계사절',  level: '중학교',         vocab: 1500 },
  { name: '관계대명사_what_선행사포함', category: '관계사절',  level: '중학교',         vocab: 1500 },
  { name: '관계부사_where_장소',        category: '관계사절',  level: '중학교',         vocab: 1500 },
  { name: '관계부사_when_시간',         category: '관계사절',  level: '중학교',         vocab: 1500 },
  { name: '비교급_than_형용사부사',     category: '비교급',    level: '중학교',         vocab: 1500 },
  { name: '최상급_the_est_in_of',       category: '비교급',    level: '중학교',         vocab: 1500 },
  { name: '조건절_if_현재미래',         category: '조동사',    level: '중학교',         vocab: 1500 },
  { name: '접속사_although_even_though',category: '접속사',    level: '중학교',         vocab: 1500 },
  { name: '접속사_because_since',       category: '접속사',    level: '중학교',         vocab: 1500 },
  { name: '지각동사_see_hear_목적격보어',category: '조동사',   level: '중학교',         vocab: 1500 },
  { name: '사역동사_make_let_have',     category: '조동사',    level: '중학교',         vocab: 1500 },

  // ── 고등학교 공통 11개 ────────────────────────────────────────────────────
  { name: '분사구문_현재분사_동시동작', category: '분사구문',  level: '고등학교_공통',  vocab: 2500 },
  { name: '분사구문_과거분사_수동의미', category: '분사구문',  level: '고등학교_공통',  vocab: 2500 },
  { name: '분사구문_with_부대상황',     category: '분사구문',  level: '고등학교_공통',  vocab: 2500 },
  { name: '가정법_과거_if_were_would',  category: '가정법',    level: '고등학교_공통',  vocab: 2500 },
  { name: '가정법_과거완료_had_pp',     category: '가정법',    level: '고등학교_공통',  vocab: 2500 },
  { name: '도치_부정어구_never_not',    category: '도치',      level: '고등학교_공통',  vocab: 2500 },
  { name: '도치_so_neither_동의표현',   category: '도치',      level: '고등학교_공통',  vocab: 2500 },
  { name: '강조구문_it_is_that',        category: '도치',      level: '고등학교_공통',  vocab: 2500 },
  { name: '병렬구조_and_but_or',        category: '병렬구조',  level: '고등학교_공통',  vocab: 2500 },
  { name: '관계대명사_계속적용법_콤마', category: '관계사절',  level: '고등학교_공통',  vocab: 2500 },
  { name: '추측조동사_must_cannot_과거',category: '조동사',    level: '고등학교_공통',  vocab: 2500 },

  // ── 고등학교 심화 7개 ─────────────────────────────────────────────────────
  { name: '복합관계사_whoever_whatever',          category: '관계사절',  level: '고등학교_심화',  vocab: 3000 },
  { name: '복합관계사_however_wherever',          category: '관계사절',  level: '고등학교_심화',  vocab: 3000 },
  { name: '분사구문_독립분사구문',                category: '분사구문',  level: '고등학교_심화',  vocab: 3000 },
  { name: '가정법_혼합가정법',                    category: '가정법',    level: '고등학교_심화',  vocab: 3000 },
  { name: '명사절_that_동사목적어',               category: '접속사',    level: '고등학교_심화',  vocab: 3000 },
  { name: '명사절_whether_if_간접의문',           category: '접속사',    level: '고등학교_심화',  vocab: 3000 },
  { name: '이중부정_도치강조_복합',               category: '도치',      level: '고등학교_심화',  vocab: 3000 },

  // ── 중학교 추가 20개 (총 45개) ───────────────────────────────────────────
  { name: '5형식_want_tell_ask_to',               category: '5형식',     level: '중학교',         vocab: 1500 },
  { name: '존재구문_there_is_are',                category: '구문',      level: '중학교',         vocab: 1500 },
  { name: '가주어_it_to부정사_진주어',            category: 'to부정사',  level: '중학교',         vocab: 1500 },
  { name: '가주어_it_that절_진주어',              category: '접속사',    level: '중학교',         vocab: 1500 },
  { name: 'so_형용사_that_결과절',                category: '접속사',    level: '중학교',         vocab: 1500 },
  { name: 'too_형용사_to_부정의미',               category: 'to부정사',  level: '중학교',         vocab: 1500 },
  { name: '형용사_enough_to_충분',                category: 'to부정사',  level: '중학교',         vocab: 1500 },
  { name: '조동사_should_must_have_to_의무',      category: '조동사',    level: '중학교',         vocab: 1500 },
  { name: '조동사_may_might_추측허가',            category: '조동사',    level: '중학교',         vocab: 1500 },
  { name: '원급비교_as_형용사부사_as',            category: '비교급',    level: '중학교',         vocab: 1500 },
  { name: '시간부사절_when_while_before_after',   category: '접속사',    level: '중학교',         vocab: 1500 },
  { name: '간접의문문_wh절_whether절',            category: '접속사',    level: '중학교',         vocab: 1500 },
  { name: '부정대명사_something_anything_nothing', category: '대명사',   level: '중학교',         vocab: 1500 },
  { name: '진행시제_현재진행_과거진행',           category: '시제',      level: '중학교',         vocab: 1500 },
  { name: '과거완료_had_pp_기준시점이전',         category: '시제_완료', level: '중학교',         vocab: 1500 },
  { name: '미래시제_will_be_going_to',            category: '시제',      level: '중학교',         vocab: 1500 },
  { name: 'to부정사_의미상주어_for_목적어',       category: 'to부정사',  level: '중학교',         vocab: 1500 },
  { name: '동명사_to부정사_의미차이_remember_stop', category: '동명사',  level: '중학교',         vocab: 1500 },
  { name: '명사절_that_think_know_believe',       category: '접속사',    level: '중학교',         vocab: 1500 },
  { name: '결과접속사_so_따라서_인과',            category: '접속사',    level: '중학교',         vocab: 1500 },

  // ── 고등학교 추가 27개 (총 45개) ─────────────────────────────────────────
  { name: '현재분사_형용사수식_능동진행',         category: '분사',      level: '고등학교_공통',  vocab: 2500 },
  { name: '과거분사_형용사수식_수동완료',         category: '분사',      level: '고등학교_공통',  vocab: 2500 },
  { name: '관계대명사_whose_소유격',              category: '관계사절',  level: '고등학교_공통',  vocab: 2500 },
  { name: '전치사_관계대명사_in_which_for_whom',  category: '관계사절',  level: '고등학교_공통',  vocab: 2500 },
  { name: 'to부정사_완료형_to_have_pp',           category: 'to부정사',  level: '고등학교_공통',  vocab: 2500 },
  { name: '수동_부정사_to_be_pp',                 category: '수동태',    level: '고등학교_공통',  vocab: 2500 },
  { name: '수동_동명사_being_pp',                 category: '수동태',    level: '고등학교_공통',  vocab: 2500 },
  { name: '가정법_미래_were_to_should',           category: '가정법',    level: '고등학교_공통',  vocab: 2500 },
  { name: '가정법_as_if_as_though',               category: '가정법',    level: '고등학교_공통',  vocab: 2500 },
  { name: 'wish_가정법_과거_현재불가능',          category: '가정법',    level: '고등학교_공통',  vocab: 2500 },
  { name: 'wish_가정법_과거완료_과거후회',        category: '가정법',    level: '고등학교_심화',  vocab: 3000 },
  { name: 'so_형용사_that_such_a_명사_that',      category: '접속사',    level: '고등학교_공통',  vocab: 2500 },
  { name: 'not_only_but_also_상관접속사',         category: '병렬구조',  level: '고등학교_공통',  vocab: 2500 },
  { name: 'either_A_or_B_neither_A_nor_B',        category: '병렬구조',  level: '고등학교_공통',  vocab: 2500 },
  { name: 'both_A_and_B_둘다',                    category: '병렬구조',  level: '고등학교_공통',  vocab: 2500 },
  { name: '부정구문_not_until_비로소',            category: '도치',      level: '고등학교_공통',  vocab: 2500 },
  { name: '부정구문_no_sooner_than_hardly_when',  category: '도치',      level: '고등학교_심화',  vocab: 3000 },
  { name: '원급_최상급표현_no_other_as_as',       category: '비교급',    level: '고등학교_공통',  vocab: 2500 },
  { name: '비례표현_the_비교급_the_비교급',       category: '비교급',    level: '고등학교_공통',  vocab: 2500 },
  { name: '추상명사패턴_have_difficulty_ing',     category: '동명사',    level: '고등학교_심화',  vocab: 3000 },
  { name: '무생물주어_cause_enable_prevent',      category: '구문',      level: '고등학교_공통',  vocab: 2500 },
  { name: '접속부사_however_therefore_moreover',  category: '접속사',    level: '고등학교_공통',  vocab: 2500 },
  { name: '강조_do_does_did_동사원형강조',        category: '도치',      level: '고등학교_공통',  vocab: 2500 },
  { name: '재귀대명사_강조용법_oneself',          category: '대명사',    level: '고등학교_공통',  vocab: 2500 },
  { name: '수량형용사_few_little_many_much',      category: '형용사',    level: '고등학교_공통',  vocab: 2500 },
  { name: 'whether_or_not_양보조건',              category: '접속사',    level: '고등학교_공통',  vocab: 2500 },
  { name: '분사구문_의미접속사_생략강화',         category: '분사구문',  level: '고등학교_심화',  vocab: 3000 },
]

// ── GPT-4o-mini로 D/E/F 블록 생성 ────────────────────────────────────────────
async function generateBlocks(pattern) {
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      max_tokens: 1000,
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content: `2022 개정 교육과정 기준 영어 문법 해설을 작성해. 초등학생도 이해할 수 있게 쉽고 친근하게.
JSON으로만 답해.`
        },
        {
          role: 'user',
          content: `"${pattern.name}" 문법 패턴 (${pattern.category}, ${pattern.level})에 대해 작성해:

{
  "D": "문법 설명 (핵심 규칙을 쉽게, 구체적 예문 포함, 200자 이내)",
  "E": "왜 이 문법을 쓰는지 (실생활 상황 예시로, 150자 이내)",
  "F": "자주 틀리는 실수 vs 올바른 표현 (❌틀린 예 → ✅맞는 예 형식, 200자 이내)",
  "example_sentences": [
    { "en": "교과서 수준 예문1", "ko": "한국어 해석1" },
    { "en": "교과서 수준 예문2", "ko": "한국어 해석2" },
    { "en": "교과서 수준 예문3", "ko": "한국어 해석3" }
  ],
  "common_mistakes": ["자주하는실수1", "자주하는실수2"]
}`
        }
      ]
    })
  })

  const data = await res.json()
  return JSON.parse(data.choices[0].message.content)
}

// ── text-embedding-3-small 임베딩 생성 ───────────────────────────────────────
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
  return data.data[0].embedding
}

// ── 메인 실행 ─────────────────────────────────────────────────────────────────
async function runSeed() {
  console.log('🌱 ScoreBoost 문법 패턴 씨드 시작')
  console.log(`총 ${PATTERNS.length}개 패턴 생성 예정\n`)

  let success = 0
  let skip = 0
  let fail = 0

  for (const p of PATTERNS) {
    try {
      // 이미 있으면 건너뜀
      const { data: existing } = await supabase
        .from('grammar_patterns')
        .select('id')
        .eq('pattern_name', p.name)
        .maybeSingle()

      if (existing) {
        console.log(`⏭  건너뜀 (이미 있음): ${p.name}`)
        skip++
        continue
      }

      process.stdout.write(`처리 중: ${p.name} ... `)

      // D/E/F 블록 생성
      const blocks = await generateBlocks(p)

      // 임베딩 생성 (패턴명 + 카테고리 + D블록으로)
      const embeddingText = `${p.category} ${p.name} ${blocks.D}`
      const embedding = await getEmbedding(embeddingText)

      // DB 저장
      const { error } = await supabase.from('grammar_patterns').insert({
        pattern_name:      p.name,
        grammar_category:  p.category,
        school_level:      p.level,
        curriculum:        '2022',
        embedding,
        blocks:            { D: blocks.D, E: blocks.E, F: blocks.F },
        example_sentences: blocks.example_sentences || [],
        common_mistakes:   blocks.common_mistakes || [],
        vocab_level:       p.vocab
      })

      if (error) throw error

      console.log('✅')
      success++

      // 레이트 리밋 방지 (700ms 대기)
      await new Promise(r => setTimeout(r, 700))

    } catch (err) {
      console.log(`❌ ${err.message}`)
      fail++
    }
  }

  const total = success + skip
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log(`✅ 성공: ${success}개 | ⏭ 건너뜀: ${skip}개 | ❌ 실패: ${fail}개`)
  console.log(`📊 DB 총 패턴: ${total}개`)
  console.log(`💰 예상 비용: ~$${(success * 0.0004).toFixed(4)} (GPT) + ~$0.001 (임베딩)`)
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
}

runSeed().catch(console.error)
