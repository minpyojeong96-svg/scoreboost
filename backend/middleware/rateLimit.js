import { rateLimit as _rateLimit } from 'express-rate-limit'

export const rateLimit = _rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.path === '/ping',
  handler: (_req, res) => {
    res.status(429).json({ error: '요청이 너무 많습니다. 잠시 후 다시 시도해주세요.' })
  }
})
