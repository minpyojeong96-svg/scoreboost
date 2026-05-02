import { Router } from 'express'
import fetch from 'node-fetch'
import { supabase } from '../db/supabase.js'

const router = Router()

const botUrl = (method) =>
  `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/${method}`

// ─── Telegram 메시지 전송 헬퍼 ────────────────────────────────────────────────

async function sendMessage(chatId, text) {
  const res = await fetch(botUrl('sendMessage'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML' })
  })
  if (!res.ok) {
    const err = await res.json()
    throw Object.assign(new Error(err.description || 'Telegram 전송 실패'), { status: 502 })
  }
  return res.json()
}

function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString('ko-KR', {
    year: 'numeric', month: 'long', day: 'numeric'
  })
}

// ─── POST /api/telegram/send ──────────────────────────────────────────────────
// body: { chat_id, name, study_minutes, score, wrong_items, recommended_tags }
// wrong_items: [{ grammar_tag, sentence }]
// recommended_tags: ["태그1", "태그2"]

router.post('/send', async (req, res, next) => {
  try {
    const {
      chat_id,
      name,
      study_minutes = 0,
      score = 0,
      wrong_items = [],
      recommended_tags = []
    } = req.body

    if (!chat_id) return res.status(400).json({ error: 'chat_id가 필요합니다' })

    const today = formatDate(new Date().toISOString())

    const wrongList = wrong_items.length > 0
      ? wrong_items.map(w => `• <b>${w.grammar_tag}</b>: ${w.sentence}`).join('\n')
      : '• 오답 없음 🎉'

    const tagList = recommended_tags.length > 0
      ? recommended_tags.join(', ')
      : '없음'

    const text = [
      '📊 <b>오늘 학습 결과</b>',
      '━━━━━━━━━━━━━━',
      `👤 ${name}`,
      `📅 ${today}`,
      `⏱ 학습시간: ${study_minutes}분`,
      `✅ 점수: ${score}점`,
      '',
      '❌ <b>오답 목록</b>',
      wrongList,
      '',
      `📌 추천 복습: <b>${tagList}</b>`
    ].join('\n')

    await sendMessage(chat_id, text)
    res.json({ ok: true })
  } catch (err) {
    next(err)
  }
})

// ─── 웹훅 커맨드 핸들러 ────────────────────────────────────────────────────────

async function handleStart(chatId) {
  const { data: existing } = await supabase
    .from('users')
    .select('id')
    .eq('telegram_id', String(chatId))
    .maybeSingle()

  if (existing) {
    await sendMessage(
      chatId,
      '👋 <b>ScoreBoost에 오신 걸 환영합니다!</b>\n\n' +
      '사용 가능한 명령어:\n' +
      '• /오답 — 오답 목록 보기\n' +
      '• /복습 — 오늘 복습 문제 받기'
    )
  } else {
    await sendMessage(
      chatId,
      '⚠️ <b>연결된 계정이 없습니다.</b>\n\n' +
      'ScoreBoost 앱에서 Google 로그인 후\n' +
      `프로필 → 텔레그램 Chat ID에\n<code>${chatId}</code>\n를 입력해주세요.`
    )
  }
}

async function handleWrongList(chatId) {
  const { data: user } = await supabase
    .from('users')
    .select('id')
    .eq('telegram_id', String(chatId))
    .maybeSingle()

  if (!user) {
    return sendMessage(chatId, '먼저 앱에서 Google 로그인 후 텔레그램 Chat ID를 프로필에 등록해주세요.')
  }

  const { data: notes } = await supabase
    .from('wrong_notes')
    .select('grammar_tag, created_at, sentences(sentence)')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(10)

  if (!notes || notes.length === 0) {
    return sendMessage(chatId, '📭 오답 목록이 없습니다. 문제를 먼저 풀어보세요!')
  }

  const lines = notes.map(n =>
    `• <b>${n.grammar_tag}</b>\n  ${n.sentences?.sentence || ''}`
  )

  await sendMessage(
    chatId,
    `❌ <b>최근 오답 목록</b> (${notes.length}개)\n━━━━━━━━━━━━━━\n` + lines.join('\n\n')
  )
}

async function handleReview(chatId) {
  const { data: user } = await supabase
    .from('users')
    .select('id')
    .eq('telegram_id', String(chatId))
    .maybeSingle()

  if (!user) {
    return sendMessage(chatId, '먼저 앱에서 Google 로그인 후 텔레그램 Chat ID를 프로필에 등록해주세요.')
  }

  const { data: notes } = await supabase
    .from('wrong_notes')
    .select('sentence_id, grammar_tag')
    .eq('user_id', user.id)
    .limit(20)

  if (!notes || notes.length === 0) {
    return sendMessage(chatId, '📭 복습할 오답이 없습니다!')
  }

  const pick = notes[Math.floor(Math.random() * notes.length)]

  const { data: sentence } = await supabase
    .from('sentences')
    .select('sentence, blocks')
    .eq('id', pick.sentence_id)
    .maybeSingle()

  const gBlock = sentence?.blocks?.G
  if (!gBlock) {
    return sendMessage(chatId, '⚠️ 해당 문장의 복습 문제가 아직 없습니다.')
  }

  // G블록 형식: "문제 문장 ___ (정답)" — 마지막 괄호에서 정답 추출
  const m = gBlock.match(/\(([^)]+)\)\s*$/)
  const question = m ? gBlock.slice(0, gBlock.lastIndexOf(`(${m[1]}`)).trim() : gBlock
  const answer   = m ? m[1] : '?'

  await sendMessage(
    chatId,
    `📝 <b>복습 문제</b> [${pick.grammar_tag}]\n━━━━━━━━━━━━━━\n` +
    `${question}\n\n` +
    `<tg-spoiler>✅ 정답: ${answer}</tg-spoiler>`
  )
}

// ─── POST /api/telegram/webhook ───────────────────────────────────────────────
// Telegram은 항상 POST로 웹훅을 전송함

router.post('/webhook', async (req, res) => {
  res.sendStatus(200) // Telegram에 즉시 200 응답 (타임아웃 방지)

  try {
    const { message } = req.body
    if (!message?.text) return

    const chatId = message.chat.id
    const text = message.text.trim()
    const from = message.from || {}

    if (text === '/start' || text.startsWith('/start ')) {
      await handleStart(chatId)
    } else if (text === '/오답') {
      await handleWrongList(chatId)
    } else if (text === '/복습') {
      await handleReview(chatId)
    }
  } catch (err) {
    console.error('[webhook error]', err.message)
  }
})

// ─── GET /api/telegram/register-webhook ──────────────────────────────────────
// 배포 후 1회 실행: GET https://your-app.onrender.com/api/telegram/register-webhook

router.get('/register-webhook', async (req, res, next) => {
  try {
    const base = process.env.RENDER_EXTERNAL_URL
    if (!base) return res.status(400).json({ error: 'RENDER_EXTERNAL_URL 환경변수가 없습니다' })

    const webhookUrl = `${base}/api/telegram/webhook`
    const response = await fetch(
      `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/setWebhook?url=${encodeURIComponent(webhookUrl)}`
    )
    const data = await response.json()
    res.json({ ok: data.ok, description: data.description, webhookUrl })
  } catch (err) {
    next(err)
  }
})

export default router
