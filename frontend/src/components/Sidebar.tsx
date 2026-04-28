import { clsx } from 'clsx'
import { AnimatePresence, motion } from 'framer-motion'
import React, { useState } from 'react'
import { NavLink } from 'react-router-dom'
import { useAuth } from '../lib/auth'

interface NavItem {
  label: string
  to: string
  icon: React.ReactNode
  adminOnly?: boolean
}

const SparklesIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m-8-9H3m18 0h-1M5.636 5.636l.707.707m11.314 11.314.707.707M5.636 18.364l.707-.707m11.314-11.314.707-.707" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 8a4 4 0 110 8 4 4 0 010-8z" />
  </svg>
)

const WandIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 3l6 6-9.5 9.5-6-6L15 3zM3 21l4-4" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l1-4-4 1M7 20l-4 1 1-4" />
  </svg>
)

const GridIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
    <rect x="3" y="3" width="7" height="7" rx="1" />
    <rect x="14" y="3" width="7" height="7" rx="1" />
    <rect x="3" y="14" width="7" height="7" rx="1" />
    <rect x="14" y="14" width="7" height="7" rx="1" />
  </svg>
)

const GearIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
)

const AdminIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
  </svg>
)

const LogoutIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
  </svg>
)

const HamburgerIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
  </svg>
)

const CloseIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
  </svg>
)

const NAV_ITEMS: NavItem[] = [
  { label: 'Generate', to: '/generate', icon: <SparklesIcon /> },
  { label: 'Edit', to: '/edit', icon: <WandIcon /> },
  { label: 'Gallery', to: '/gallery', icon: <GridIcon /> },
  { label: 'Settings', to: '/settings', icon: <GearIcon /> },
  { label: 'Admin', to: '/admin', icon: <AdminIcon />, adminOnly: true },
]

const SidebarContent: React.FC<{ onNavClick?: () => void }> = ({
  onNavClick,
}) => {
  const { user, logout } = useAuth()

  return (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="px-4 py-5 border-b border-[var(--border)]">
        <span className="text-lg font-bold bg-gradient-to-r from-primary-500 to-accent-500 bg-clip-text text-transparent">
          ✨ Image Studio
        </span>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-4 px-2 overflow-y-auto">
        <ul className="flex flex-col gap-1">
          {NAV_ITEMS.filter(
            (item) => !item.adminOnly || user?.is_admin,
          ).map((item) => (
            <li key={item.to}>
              <NavLink
                to={item.to}
                onClick={onNavClick}
                className={({ isActive }) =>
                  clsx(
                    'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150',
                    isActive
                      ? 'bg-primary-600/10 dark:bg-primary-500/15 text-primary-600 dark:text-primary-400'
                      : 'text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] hover:text-[var(--text-primary)]',
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    <span
                      className={
                        isActive
                          ? 'text-primary-600 dark:text-primary-400'
                          : 'text-[var(--text-muted)]'
                      }
                    >
                      {item.icon}
                    </span>
                    {item.label}
                  </>
                )}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      {/* User section */}
      <div className="p-3 border-t border-[var(--border)]">
        <div className="flex items-center gap-3 px-2 py-2 rounded-lg">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center text-white text-sm font-bold shrink-0">
            {user?.username?.[0]?.toUpperCase() ?? 'U'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-[var(--text-primary)] truncate">
              {user?.username ?? 'User'}
            </p>
            {user?.is_admin && (
              <p className="text-xs text-primary-500">Admin</p>
            )}
          </div>
          <button
            onClick={logout}
            title="Logout"
            aria-label="Logout"
            className="shrink-0 p-1.5 rounded-md text-[var(--text-muted)] hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
          >
            <LogoutIcon />
          </button>
        </div>
      </div>
    </div>
  )
}

export const Sidebar: React.FC = () => {
  const [mobileOpen, setMobileOpen] = useState(false)

  const sidebarClasses =
    'w-60 h-full bg-[var(--bg-card)] border-r border-[var(--border)] flex flex-col'

  return (
    <>
      {/* Desktop sidebar */}
      <aside className={clsx(sidebarClasses, 'hidden md:flex shrink-0')}>
        <SidebarContent />
      </aside>

      {/* Mobile hamburger button */}
      <button
        className="md:hidden fixed top-4 left-4 z-40 p-2 rounded-lg bg-[var(--bg-card)] border border-[var(--border)] text-[var(--text-secondary)] shadow-sm"
        onClick={() => setMobileOpen(true)}
        aria-label="Open menu"
      >
        <HamburgerIcon />
      </button>

      {/* Mobile drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="md:hidden fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
              onClick={() => setMobileOpen(false)}
            />
            <motion.aside
              initial={{ x: -240 }}
              animate={{ x: 0 }}
              exit={{ x: -240 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className={clsx(
                sidebarClasses,
                'md:hidden fixed left-0 top-0 z-50 shadow-2xl',
              )}
            >
              <div className="flex justify-end p-2 absolute top-2 right-2">
                <button
                  onClick={() => setMobileOpen(false)}
                  aria-label="Close menu"
                  className="p-1.5 rounded-md text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] transition-colors"
                >
                  <CloseIcon />
                </button>
              </div>
              <SidebarContent onNavClick={() => setMobileOpen(false)} />
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  )
}
