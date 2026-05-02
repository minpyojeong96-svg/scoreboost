import { Router } from 'express'
import fetch from 'node-fetch'
import { supabase } from '../db/supabase.js'

const router = Router()

// ─── POST /api/review/notify ──────────────────────────────────────────────────
// 복습 알림 텔레그램 전송 (크론 전용)
// 호출 방법: curl -X POST https://your-app.onrender.com/api/review/notify \
//            -H "x-cron-secret: {CRON_SECRET}"
// Render 크론 또는 cron-job.org (무료)에서 매일 오전 9시 실행 권장

router.post('/notify', async (req, res, next) => {
  try {
    const secret = req.headers['x-cron-secret']
    if (!secret || secret !== process.env.CRON_SECRET) {
      return res.status(403).json({ error: '접근 거부' })
    }

    const now = new Date().toISOString()

    // 오늘 복습 예정인 오답 + 유저 텔레그램 ID 조회
    const { data: pending, error } = await supabase
      .from('wrong_notes')
      .select('user_id, users(telegram_id)')
      .lte('next_review', now)

    if (error) throw error
    if (!pending?.length) return res.json({ ok: true, sent: 0 })

    // 유저별 복습 개수 집계
    const byUser = {}
    pending.forEach(row => {
      const tid = row.users?.telegram_id
      if (!tid) return
      byUser[tid] = (byUser[tid] || 0) + 1
    })

    const botUrl = `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`
    let sent = 0

    await Promise.all(
      Object.entries(byUser).map(async ([chatId, count]) => {
        try {
          await fetch(botUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: chatId,
              text: `📚 오늘 복습할 문제가 <b>${count}개</b> 있어요!\nScoreBoost 앱을 열어서 복습해보세요 💪`,
              parse_mode: 'HTML'
            })
          })
          sent++
        } catch {
          // 개별 전송 실패는 무시 (다른 유저 전송 계속)
        }
      })
    )

    res.json({ ok: true, sent })
  } catch (err) {
    next(err)
  }
})

export default router
