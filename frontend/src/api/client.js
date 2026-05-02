import { supabase } from '../lib/supabase.js'

const BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000'

async function post(path, body) {
  const { data: { session } } = await supabase.auth.getSession()
  const headers = { 'Content-Type': 'application/json' }
  if (session?.access_token) headers['Authorization'] = `Bearer ${session.access_token}`

  const res = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body)
  })
  const text = await res.text()
  let data
  try { data = JSON.parse(text) } catch { data = { error: `서버 오류 ${res.status}` } }
  if (!res.ok) throw Object.assign(new Error(data.error || `오류 ${res.status}`), { retake: data.retake })
  return data
}

export const ocrImage = (image) => post('/api/ocr', { image })
export const analyzeSentences = (sentences) => post('/api/analyze', { sentences })
export const sendToTelegram = (payload) => post('/api/telegram/send', payload)
