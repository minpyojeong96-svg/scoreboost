import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Component } from 'react'
import { AuthProvider, useAuth } from './contexts/AuthContext.jsx'

class ErrorBoundary extends Component {
  state = { error: null }
  static getDerivedStateFromError(e) { return { error: e } }
  render() {
    if (this.state.error) return (
      <div className="flex flex-col items-center justify-center h-full px-6 gap-4 text-center">
        <span className="text-5xl">⚠️</span>
        <p className="text-gray-700 font-medium">화면 오류가 발생했어요</p>
        <p className="text-xs text-gray-400 break-all">{this.state.error?.message}</p>
        <button onClick={() => window.location.href = '/'} className="py-3 px-6 bg-indigo-600 text-white rounded-xl font-bold">
          홈으로 돌아가기
        </button>
      </div>
    )
    return this.props.children
  }
}
import Home from './pages/Home.jsx'
import Login from './pages/Login.jsx'
import Camera from './pages/Camera.jsx'
import Result from './pages/Result.jsx'
import WrongNote from './pages/WrongNote.jsx'
import Profile from './pages/Profile.jsx'
import Curriculum from './pages/Curriculum.jsx'
import Admin from './pages/Admin.jsx'
import BottomNav from './components/BottomNav.jsx'

function ProtectedRoute({ children }) {
  const { user } = useAuth()
  if (user === undefined) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }
  if (!user) return <Navigate to="/login" replace />
  return children
}

function AppRoutes() {
  const { user } = useAuth()

  return (
    <div className="flex flex-col h-screen max-w-md mx-auto bg-white shadow-lg overflow-hidden">
      <main className="flex-1 overflow-y-auto">
        <ErrorBoundary>
        <Routes>
          <Route path="/login" element={user ? <Navigate to="/" replace /> : <Login />} />
          <Route path="/" element={<ProtectedRoute><Home /></ProtectedRoute>} />
          <Route path="/camera" element={<ProtectedRoute><Camera /></ProtectedRoute>} />
          <Route path="/result" element={<ProtectedRoute><Result /></ProtectedRoute>} />
          <Route path="/wrong" element={<ProtectedRoute><WrongNote /></ProtectedRoute>} />
          <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
          <Route path="/curriculum" element={<ProtectedRoute><Curriculum /></ProtectedRoute>} />
          <Route path="/admin" element={<ProtectedRoute><Admin /></ProtectedRoute>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        </ErrorBoundary>
      </main>
      {user && <BottomNav />}
    </div>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  )
}
