import { useState } from 'react'
import { supabase } from '../lib/supabase.js'

export default function Login() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const loginWithGoogle = async () => {
    setLoading(true)
    setError(null)
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/` }
    })
    if (error) {
      setError(error.message)
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col items-center justify-center h-full px-6 gap-8">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-indigo-600 mb-2">ScoreBoost</h1>
        <p className="text-gray-500 text-sm">영어 문법 과외 앱</p>
      </div>

      <div className="w-full space-y-3">
        <button
          onClick={loginWithGoogle}
          disabled={loading}
          className="w-full py-4 bg-white border-2 border-gray-200 rounded-2xl font-bold text-gray-700 shadow-sm flex items-center justify-center gap-3 active:scale-95 transition-transform disabled:opacity-60"
        >
          {loading ? (
            <div className="w-5 h-5 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
          ) : (
            <svg width="20" height="20" viewBox="0 0 48 48">
              <path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z"/>
              <path fill="#FF3D00" d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z"/>
              <path fill="#4CAF50" d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238A11.91 11.91 0 0 1 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z"/>
              <path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303a12.04 12.04 0 0 1-4.087 5.571l.003-.002 6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z"/>
            </svg>
          )}
          Google로 로그인
        </button>
      </div>

      {error && <p className="text-red-500 text-sm text-center">{error}</p>}

      <p className="text-xs text-gray-400 text-center">
        로그인하면 오답노트가 자동으로<br />클라우드에 저장됩니다
      </p>
    </div>
  )
}
