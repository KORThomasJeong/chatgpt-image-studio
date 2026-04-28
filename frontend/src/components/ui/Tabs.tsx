import { clsx } from 'clsx'
import { motion } from 'framer-motion'
import React from 'react'

interface TabsProps {
  tabs: { label: string; value: string }[]
  value: string
  onChange: (v: string) => void
  className?: string
}

export const Tabs: React.FC<TabsProps> = ({
  tabs,
  value,
  onChange,
  className,
}) => {
  return (
    <div
      className={clsx(
        'relative flex gap-1 p-1 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border)]',
        className,
      )}
      role="tablist"
    >
      {tabs.map((tab) => {
        const isActive = tab.value === value
        return (
          <button
            key={tab.value}
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(tab.value)}
            className={clsx(
              'relative flex-1 px-4 py-1.5 text-sm font-medium rounded-md transition-colors duration-150 z-10',
              isActive
                ? 'text-[var(--text-primary)]'
                : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]',
            )}
          >
            {isActive && (
              <motion.span
                layoutId="tab-bg"
                className="absolute inset-0 bg-[var(--bg-card)] border border-[var(--border)] rounded-md shadow-sm"
                transition={{ type: 'spring', duration: 0.3, bounce: 0.2 }}
              />
            )}
            <span className="relative z-10">{tab.label}</span>
          </button>
        )
      })}
    </div>
  )
}
