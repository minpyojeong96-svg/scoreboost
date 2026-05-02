import { Router } from 'express'
import fetch from 'node-fetch'

const router = Router()

const SYSTEM_PROMPT = `너는 영어 교과서 OCR 전문가야.
이미지에서 영어 교과서 본문만 추출해야 해.

반드시 아래 JSON 형식으로만 응답해. 설명이나 마크다운 없이 JSON만 출력.

{
  "sentences": ["완성된 영어 문장1", "완성된 영어 문장2"],
  "confidence": 0.95,
  "layout_type": "본문"
}

추출 규칙:
- 본문 영어 문장만 포함 (마침표/물음표/느낌표로 끝나는 완성 문장)
- 제외: 문제번호(①②③), 단어장, 주석, 페이지번호, 한글, 제목/소제목
- 여러 줄에 걸친 문장은 하나로 합쳐서 포함
- confidence: 이미지 품질 및 텍스트 명확도 (0.0~1.0)
- layout_type: "본문" | "문제" | "혼합" 중 하나

영어 본문이 전혀 없으면: { "sentences": [], "confidence": 0, "layout_type": "본문" }`

async function callOpenAI(base64) {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`
    },
    body: JSON.stringify({
      model: 'gpt-4o',
      max_tokens: 1500,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        {
          role: 'user',
          content: [
            { type: 'text', text: '이 이미지의 영어 교과서 본문을 추출해줘.' },
            {
              type: 'image_url',
              image_url: { url: `data:image/jpeg;base64,${base64}`, detail: 'high' }
            }
          ]
        }
      ]
    })
  })

  if (!response.ok) {
    const err = await response.json()
    const apiError = Object.assign(
      new Error(err.error?.message || 'OpenAI API 오류'),
      { status: 502 }
    )
    throw apiError
  }

  return response.json()
}

async function callWithRetry(base64, maxRetries = 2) {
  let lastErr
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await callOpenAI(base64)
    } catch (err) {
      lastErr = err
      if (attempt < maxRetries) {
        await new Promise(r => setTimeout(r, 1000 * (attempt + 1)))
      }
    }
  }
  throw lastErr
}

router.post('/', async (req, res, next) => {
  let base64 = null
  try {
    const { image } = req.body
    if (!image) return res.status(400).json({ error: 'image 필드가 필요합니다' })

    base64 = image.replace(/^data:image\/\w+;base64,/, '')

    const data = await callWithRetry(base64)
    base64 = null // 메모리에서 즉시 해제

    const result = JSON.parse(data.choices[0].message.content)
    const { sentences = [], confidence = 0, layout_type = '본문' } = result

    // 영어 텍스트 없음
    if (sentences.length === 0) {
      return res.status(422).json({
        error: '교과서 본문이 보이게 찍어주세요',
        retake: true
      })
    }

    // 신뢰도 낮음
    if (confidence < 0.8) {
      return res.status(422).json({
        error: '이미지가 불선명합니다. 다시 촬영해주세요.',
        retake: true,
        confidence
      })
    }

    // 너무 짧음 (전체 텍스트 합산 20자 미만)
    const totalLength = sentences.join('').length
    if (totalLength < 20) {
      return res.status(422).json({
        error: '텍스트가 너무 짧습니다. 더 가까이 찍어주세요.',
        retake: true
      })
    }

    res.json({ sentences, confidence, layout_type })
  } catch (err) {
    base64 = null
    next(err)
  }
})

export default router
