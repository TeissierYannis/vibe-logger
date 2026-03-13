import { NavLink, useLocation } from 'react-router-dom'
import { type ReactNode } from 'react'
import { motion } from 'framer-motion'

const navItems = [
  { to: '/', label: 'Dashboard', icon: DashboardIcon },
  { to: '/explorer', label: 'Explorer', icon: ExplorerIcon },
  { to: '/profile', label: 'Profile', icon: ProfileIcon },
  { to: '/arena', label: 'Arena', icon: ArenaIcon },
]

function DashboardIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="7" height="7" rx="1" />
    </svg>
  )
}

function ExplorerIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="2" />
      <circle cx="4" cy="6" r="2" />
      <circle cx="20" cy="6" r="2" />
      <circle cx="4" cy="18" r="2" />
      <circle cx="20" cy="18" r="2" />
      <path d="M6 7l4 4M14 13l4 4M6 17l4-4M14 11l4-4" />
    </svg>
  )
}

function ProfileIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
    </svg>
  )
}

function ArenaIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
    </svg>
  )
}

export default function Layout({ children }: { children: ReactNode }) {
  const location = useLocation()

  return (
    <div className="flex h-screen w-screen overflow-hidden">
      {/* Sidebar */}
      <nav className="w-[72px] hover:w-56 transition-all duration-300 ease-out glass-strong flex flex-col items-center py-5 shrink-0 overflow-hidden group z-50">
        {/* Logo */}
        <div className="mb-8 flex items-center gap-3 px-4 w-full">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-purple-600 flex items-center justify-center shrink-0 neon-glow">
            <span className="text-lg font-bold text-white">V</span>
          </div>
          <span className="text-sm font-bold neon-text whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-200">
            vibe-logger
          </span>
        </div>

        {/* Nav Items */}
        <div className="flex flex-col gap-1.5 w-full px-3">
          {navItems.map(({ to, label, icon: Icon }) => {
            const isActive = to === '/' ? location.pathname === '/' : location.pathname.startsWith(to)
            return (
              <NavLink key={to} to={to}>
                <motion.div
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className={`relative flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 ${
                    isActive
                      ? 'bg-white/10 text-cyan-400 neon-glow'
                      : 'text-gray-500 hover:text-gray-300 hover:bg-white/5'
                  }`}
                >
                  {isActive && (
                    <motion.div
                      layoutId="activeBar"
                      className="absolute -left-3 top-1/2 -translate-y-1/2 w-1 h-5 rounded-r-full bg-cyan-400"
                      style={{ boxShadow: '0 0 8px rgba(6, 182, 212, 0.6)' }}
                    />
                  )}
                  <div className="shrink-0">
                    <Icon />
                  </div>
                  <span className="text-sm font-medium whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                    {label}
                  </span>
                </motion.div>
              </NavLink>
            )
          })}
        </div>

        {/* Footer */}
        <div className="mt-auto px-4 w-full">
          <div className="border-t border-white/5 pt-3 flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse-glow shrink-0" />
            <span className="text-[10px] text-gray-600 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-200">
              v0.1.0
            </span>
          </div>
        </div>
      </nav>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto overflow-x-hidden">
        <div className="p-6 min-h-full">
          {children}
        </div>
      </main>
    </div>
  )
}
