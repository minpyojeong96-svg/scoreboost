import { Router } from 'express'
import fetch from 'node-fetch'
import { supabase } from '../db/supabase.js'

const router = Router()

const SYSTEM_PROMPT = `너는 영어 문법 문제 출제 전문가야.
주어진 문장 정보를 바탕으로 빈칸 채우기 문제 1개를 만들어.
아래 JSON 형식으로만 응답해. 설명 없이 JSON만 출력.

{
  "question": "빈칸이 포함된 문장 (빈칸은 ___로 표시)",
  "answer": "정답 단어/어구",
  "explanation": "왜 이 답이 맞는지 한국어로 간결하게 설명 (2문장 이내)"
}`

router.post('/', async (req, res, next) => {
  try {
    const { sentence_id, sentence, grammar_tags } = req.body
    if (!sentence_id || !sentence) {
      return res.status(400).json({ error: 'sentence_id, sentence 필드가 필요합니다' })
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        max_tokens: 400,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          {
            role: 'user',
            content: `문장: ${sentence}\n문법 포인트: ${(grammar_tags || []).join(', ')}`
          }
        ]
      })
    })

    if (!response.ok) {
      const err = await response.json()
      throw Object.assign(new Error(err.error?.message || 'OpenAI 오류'), { status: 502 })
    }

    const data = await response.json()
    const result = JSON.parse(data.choices[0].message.content)

    const { data: saved, error } = await supabase
      .from('problems')
      .insert({ sentence_id, ...result })
      .select()
      .single()

    if (error) throw Object.assign(new Error(error.message), { status: 500 })

    res.json({ id: saved.id, ...result })
  } catch (err) {
    next(err)
  }
})

export default router
