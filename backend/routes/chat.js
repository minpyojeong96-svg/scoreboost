import { Router } from 'express'
import fetch from 'node-fetch'

const router = Router()

function buildSystemPrompt(sentence, blocks) {
  const blockText = Object.entries(blocks || {})
    .map(([k, v]) => `[${k}블록] ${v}`)
    .join('\n')

  return `너는 친절한 영어 문법 과외 선생님이야. 중학생 눈높이로 한국어로만 답해.
핵심만 짧게 (최대 4문장). 어려운 문법 용어는 쉬운 말로 풀어서 설명해.

지금 학생이 공부 중인 문장:
"${sentence}"

이 문장의 분석:
${blockText}`
}

router.post('/', async (req, res, next) => {
  try {
    const { messages, context } = req.body
    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: 'messages가 필요합니다' })
    }

    const systemPrompt = buildSystemPrompt(context?.sentence, context?.blocks)

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        max_tokens: 500,
        messages: [
          { role: 'system', content: systemPrompt },
          ...messages.map(m => ({ role: m.role, content: m.content }))
        ]
      })
    })

    if (!response.ok) {
      const err = await response.json()
      throw Object.assign(new Error(err.error?.message || 'OpenAI 오류'), { status: 502 })
    }

    const data = await response.json()
    res.json({ reply: data.choices[0].message.content })
  } catch (err) {
    next(err)
  }
})

export default router
