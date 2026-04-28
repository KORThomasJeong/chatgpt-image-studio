import { clsx } from 'clsx'
import React from 'react'
import { Spinner } from './Spinner'

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'destructive'
  size?: 'sm' | 'md' | 'lg'
  isLoading?: boolean
  leftIcon?: React.ReactNode
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      isLoading = false,
      leftIcon,
      children,
      className,
      disabled,
      ...props
    },
    ref,
  ) => {
    const base =
      'inline-flex items-center justify-center gap-2 font-medium rounded-lg transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed select-none'

    const variants: Record<string, string> = {
      primary:
        'bg-gradient-to-br from-primary-600 to-primary-700 text-white shadow-sm hover:from-primary-700 hover:to-primary-800 active:scale-[0.98]',
      secondary:
        'bg-[var(--bg-card)] border border-[var(--border)] text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] active:scale-[0.98]',
      ghost:
        'text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] hover:text-[var(--text-primary)] active:scale-[0.98]',
      destructive:
        'bg-red-600 text-white hover:bg-red-700 shadow-sm active:scale-[0.98]',
    }

    const sizes: Record<string, string> = {
      sm: 'px-3 py-1.5 text-sm h-8',
      md: 'px-4 py-2 text-sm h-10',
      lg: 'px-6 py-3 text-base h-12',
    }

    return (
      <button
        ref={ref}
        className={clsx(base, variants[variant], sizes[size], className)}
        disabled={disabled ?? isLoading}
        {...props}
      >
        {isLoading ? (
          <Spinner size="sm" className="text-current opacity-80" />
        ) : (
          leftIcon && <span className="shrink-0">{leftIcon}</span>
        )}
        {children}
      </button>
    )
  },
)

Button.displayName = 'Button'
