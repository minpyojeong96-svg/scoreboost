import { useNavigate, useLocation } from 'react-router-dom'

const tabs = [
  { path: '/',        label: '홈',      icon: '🏠' },
  { path: '/camera',  label: '촬영',    icon: '📷' },
  { path: '/wrong',   label: '오답노트', icon: '📝' },
  { path: '/profile', label: '프로필',  icon: '👤' },
]

export default function BottomNav() {
  const navigate = useNavigate()
  const { pathname } = useLocation()

  return (
    <nav className="flex border-t border-gray-200 bg-white safe-area-inset-bottom">
      {tabs.map(({ path, label, icon }) => {
        const active = pathname === path
        return (
          <button
            key={path}
            onClick={() => navigate(path)}
            className={`flex-1 flex flex-col items-center py-3 gap-1 text-xs font-medium transition-colors
              ${active ? 'text-indigo-600' : 'text-gray-400'}`}
          >
            <span className="text-xl">{icon}</span>
            <span>{label}</span>
            {active && <span className="w-1 h-1 rounded-full bg-indigo-600" />}
          </button>
        )
      })}
    </nav>
  )
}
