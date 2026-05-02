import { Router } from 'express'
import { supabase } from '../db/supabase.js'

const router = Router()

// 관리자 이메일 체크 미들웨어
router.use((req, res, next) => {
  const adminEmail = process.env.ADMIN_EMAIL
  if (!adminEmail) return res.status(403).json({ error: '관리자 설정 없음' })
  const userEmail = req.user?.email
  if (userEmail !== adminEmail) return res.status(403).json({ error: '관리자 권한 없음' })
  next()
})

// GET /api/admin/sentences?page=0&reviewed=false
router.get('/sentences', async (req, res, next) => {
  try {
    const page  = parseInt(req.query.page) || 0
    const size  = 20
    const reviewedFilter = req.query.reviewed

    let query = supabase
      .from('sentences')
      .select('id, sentence, translation, grammar_tags, blocks, reviewed, source, created_at', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(page * size, (page + 1) * size - 1)

    if (reviewedFilter === 'false') query = query.eq('reviewed', false)
    if (reviewedFilter === 'true')  query = query.eq('reviewed', true)

    const { data, error, count } = await query
    if (error) throw error
    res.json({ data, total: count, page, size })
  } catch (err) { next(err) }
})

// PUT /api/admin/sentences/:id — 블록 수정 + 검토 완료 표시
router.put('/sentences/:id', async (req, res, next) => {
  try {
    const { blocks, translation, reviewed } = req.body
    const update = {}
    if (blocks !== undefined)      update.blocks = blocks
    if (translation !== undefined) update.translation = translation
    if (reviewed !== undefined)    update.reviewed = reviewed
    if (reviewed === true)         update.reviewed_at = new Date().toISOString()

    const { error } = await supabase.from('sentences').update(update).eq('id', req.params.id)
    if (error) throw error
    res.json({ ok: true })
  } catch (err) { next(err) }
})

// DELETE /api/admin/sentences/:id — 캐시 삭제 (다음 접근 시 재생성)
router.delete('/sentences/:id', async (req, res, next) => {
  try {
    const { error } = await supabase.from('sentences').delete().eq('id', req.params.id)
    if (error) throw error
    res.json({ ok: true })
  } catch (err) { next(err) }
})

// GET /api/admin/stats
router.get('/stats', async (req, res, next) => {
  try {
    const { count: total }    = await supabase.from('sentences').select('*', { count: 'exact', head: true })
    const { count: reviewed } = await supabase.from('sentences').select('*', { count: 'exact', head: true }).eq('reviewed', true)
    res.json({ total, reviewed, unreviewed: (total || 0) - (reviewed || 0) })
  } catch (err) { next(err) }
})

export default router
