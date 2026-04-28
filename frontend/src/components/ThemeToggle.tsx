import { motion } from 'framer-motion'
import React from 'react'
import { useTheme, type Theme } from '../lib/theme'

const SunIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    className="w-4 h-4"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={2}
  >
    <circle cx="12" cy="12" r="5" />
    <path
      strokeLinecap="round"
      d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"
    />
  </svg>
)

const MoonIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    className="w-4 h-4"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={2}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"
    />
  </svg>
)

const MonitorIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    className="w-4 h-4"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={2}
  >
    <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
    <path strokeLinecap="round" d="M8 21h8M12 17v4" />
  </svg>
)

const CYCLE: Theme[] = ['light', 'dark', 'system']

const ICONS: Record<Theme, React.ReactNode> = {
  light: <SunIcon />,
  dark: <MoonIcon />,
  system: <MonitorIcon />,
}

const LABELS: Record<Theme, string> = {
  light: 'Switch to dark mode',
  dark: 'Switch to system mode',
  system: 'Switch to light mode',
}

export const ThemeToggle: React.FC<{ className?: string }> = ({
  className,
}) => {
  const { theme, setTheme } = useTheme()

  const handleClick = () => {
    const idx = CYCLE.indexOf(theme)
    const next = CYCLE[(idx + 1) % CYCLE.length]
    setTheme(next)
  }

  return (
    <motion.button
      whileTap={{ scale: 0.9 }}
      whileHover={{ scale: 1.05 }}
      onClick={handleClick}
      aria-label={LABELS[theme]}
      title={LABELS[theme]}
      className={`p-2 rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] transition-colors ${className ?? ''}`}
    >
      <motion.span
        key={theme}
        initial={{ rotate: -30, opacity: 0 }}
        animate={{ rotate: 0, opacity: 1 }}
        exit={{ rotate: 30, opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="block"
      >
        {ICONS[theme]}
      </motion.span>
    </motion.button>
  )
}
