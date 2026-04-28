import { clsx } from 'clsx'
import React from 'react'

interface CardProps {
  children: React.ReactNode
  className?: string
  glass?: boolean
}

export const Card: React.FC<CardProps> = ({ children, className, glass }) => {
  return (
    <div
      className={clsx(
        'rounded-xl border',
        glass
          ? 'bg-white/10 dark:bg-white/5 backdrop-blur-md border-white/20 dark:border-white/10'
          : 'bg-[var(--bg-card)] border-[var(--border)]',
        'shadow-sm',
        className,
      )}
    >
      {children}
    </div>
  )
}
