import { NavLink } from 'react-router-dom'
import { type ReactNode } from 'react'

const navItems = [
  { to: '/', label: 'Overview', icon: '📊' },
  { to: '/activity', label: 'Activity', icon: '📈' },
  { to: '/network', label: 'Network', icon: '🔗' },
  { to: '/gamification', label: 'Gamification', icon: '🏆' },
  { to: '/live', label: 'Live', icon: '⚡' },
]

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar */}
      <nav className="w-64 glass border-r border-white/5 flex flex-col p-4 shrink-0">
        <div className="mb-8 px-2">
          <h1 className="text-xl font-bold neon-text">⚡ vibe-logger</h1>
          <p className="text-xs text-gray-500 mt-1">Mistral Vibe Analytics</p>
        </div>

        <div className="flex flex-col gap-1">
          {navItems.map(({ to, label, icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 ${
                  isActive
                    ? 'bg-white/10 text-white neon-glow'
                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                }`
              }
            >
              <span className="text-lg">{icon}</span>
              <span className="text-sm font-medium">{label}</span>
            </NavLink>
          ))}
        </div>

        <div className="mt-auto pt-4 border-t border-white/5">
          <p className="text-xs text-gray-600 px-2">v0.1.0</p>
        </div>
      </nav>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto p-6">
        {children}
      </main>
    </div>
  )
}
