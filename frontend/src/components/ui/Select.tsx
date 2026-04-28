import { clsx } from 'clsx'
import React from 'react'

interface SelectProps {
  label?: string
  value: string
  onChange: (v: string) => void
  options: { label: string; value: string }[]
  className?: string
  disabled?: boolean
}

export const Select: React.FC<SelectProps> = ({
  label,
  value,
  onChange,
  options,
  className,
  disabled,
}) => {
  const id = label ? `select-${label.toLowerCase().replace(/\s+/g, '-')}` : undefined

  return (
    <div className={clsx('flex flex-col gap-1.5 w-full', className)}>
      {label && (
        <label
          htmlFor={id}
          className="text-sm font-medium text-[var(--text-secondary)]"
        >
          {label}
        </label>
      )}
      <div className="relative">
        <select
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          className={clsx(
            'w-full appearance-none rounded-lg border border-[var(--border)]',
            'bg-[var(--bg-card)] text-[var(--text-primary)]',
            'px-3 py-2 pr-8 text-sm h-10',
            'focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent',
            'transition-colors duration-150 cursor-pointer',
            'disabled:opacity-50 disabled:cursor-not-allowed',
          )}
        >
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)]">
          <svg
            className="w-4 h-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </span>
      </div>
    </div>
  )
}
