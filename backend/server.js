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

const app = express()
const PORT = process.env.PORT || 3000

const ALLOWED_ORIGINS = [
  'http://localhost:5173',
  process.env.FRONTEND_URL  // Vercel URL (예: https://scoreboost.vercel.app)
].filter(Boolean)

app.use(cors({
  origin: (origin, cb) => {
    if (!origin || ALLOWED_ORIGINS.includes(origin)) return cb(null, true)
    cb(new Error('CORS 차단'))
  },
  credentials: true
}))

app.use(express.json({ limit: '10mb' }))
app.use(rateLimit)

app.get('/ping', (_req, res) => res.json({ ok: true, ts: Date.now() }))

app.use('/api/ocr', requireAuth, ocrRouter)
app.use('/api/analyze', requireAuth, analyzeRouter)
app.use('/api/problem', problemRouter)
app.use('/api/telegram', telegramRouter)
app.use('/api/chat', requireAuth, chatRouter)
app.use('/api/review', reviewRouter)

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
