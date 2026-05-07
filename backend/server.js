import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import { rateLimit } from './middleware/rateLimit.js'
import { requireAuth } from './middleware/auth.js'
import ocrRouter from './routes/ocr.js'
import analyzeRouter from './routes/analyze.js'
import problemRouter from './routes/problem.js'
import telegramRouter from './routes/telegram.js'
import chatRouter from './routes/chat.js'
import reviewRouter from './routes/review.js'
import adminRouter from './routes/admin.js'

const app = express()
const PORT = process.env.PORT || 3000

const ALLOWED_ORIGINS = [
  'http://localhost:5173',
  'http://localhost:3000',
  process.env.FRONTEND_URL,
].filter(Boolean)

app.use(cors({
  origin: (origin, cb) => {
    if (!origin) return cb(null, true)
    if (ALLOWED_ORIGINS.includes(origin)) return cb(null, true)
    // vercel.app 서브도메인은 모두 허용 (배포 preview URL 포함)
    if (/^https:\/\/[a-z0-9-]+\.vercel\.app$/.test(origin)) return cb(null, true)
    cb(new Error(`CORS 차단: ${origin}`))
  },
  credentials: true
}))

app.use(express.json({ limit: '10mb' }))
app.use(rateLimit)

app.get('/ping', (_req, res) => res.json({ ok: true, ts: Date.now() }))

app.get('/api/health', async (_req, res) => {
  const key = process.env.OPENAI_API_KEY || ''
  let openai = 'key_missing'
  if (key) {
    try {
      const r = await fetch('https://api.openai.com/v1/models', {
        headers: { Authorization: `Bearer ${key}` }
      })
      openai = r.ok ? 'ok' : `error_${r.status}`
    } catch { openai = 'network_error' }
  }
  res.json({
    openai,
    key_hint: key ? `${key.slice(0, 12)}...${key.slice(-4)}` : '(없음)',
    supabase_url: process.env.SUPABASE_URL ? '설정됨' : '없음',
    frontend_url: process.env.FRONTEND_URL || '없음'
  })
})

app.use('/api/ocr', requireAuth, ocrRouter)
app.use('/api/analyze', requireAuth, analyzeRouter)
app.use('/api/problem', problemRouter)
app.use('/api/telegram', telegramRouter)
app.use('/api/chat', chatRouter)
app.use('/api/review', reviewRouter)
app.use('/api/admin', requireAuth, adminRouter)

app.use((err, _req, res, _next) => {
  const status = err.status || 500
  const message = err.message || '서버 오류'
  console.error(`[${status}] ${message}`)
  res.status(status).json({ error: message })
})

app.listen(PORT, () => console.log(`ScoreBoost backend :${PORT}`))

// Render 무료 플랜 슬립 방지 (14분마다 자기 자신에게 핑)
if (process.env.NODE_ENV === 'production' && process.env.RENDER_EXTERNAL_URL) {
  setInterval(() => {
    fetch(`${process.env.RENDER_EXTERNAL_URL}/ping`).catch(() => {})
  }, 14 * 60 * 1000)
}
