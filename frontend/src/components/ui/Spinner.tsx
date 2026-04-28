import { clsx } from 'clsx'
import React from 'react'

interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export const Spinner: React.FC<SpinnerProps> = ({
  size = 'md',
  className,
}) => {
  const sizes: Record<string, string> = {
    sm: 'w-4 h-4 border-2',
    md: 'w-6 h-6 border-2',
    lg: 'w-10 h-10 border-3',
  }

  return (
    <span
      className={clsx(
        'inline-block rounded-full border-current border-t-transparent animate-spin',
        sizes[size],
        className,
      )}
      role="status"
      aria-label="Loading"
    />
  )
}
