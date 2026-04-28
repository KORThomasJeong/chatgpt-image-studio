import { motion } from 'framer-motion'
import React from 'react'
import { Outlet } from 'react-router-dom'
import { ThemeToggle } from './ThemeToggle'
import { Sidebar } from './Sidebar'

export const AppShell: React.FC = () => {
  return (
    <div className="flex h-screen overflow-hidden bg-[var(--bg-primary)]">
      {/* Sidebar */}
      <Sidebar />

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header */}
        <header className="shrink-0 flex items-center justify-end px-6 py-3 border-b border-[var(--border)] bg-[var(--bg-card)]">
          <ThemeToggle />
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto">
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            className="h-full"
          >
            <Outlet />
          </motion.div>
        </main>
      </div>
    </div>
  )
}
