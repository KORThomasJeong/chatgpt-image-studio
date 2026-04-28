import { clsx } from 'clsx'
import React from 'react'

interface SkeletonProps {
  className?: string
  style?: React.CSSProperties
}

export const Skeleton: React.FC<SkeletonProps> = ({ className, style }) => {
  return (
    <div
      style={style}
      className={clsx(
        'relative overflow-hidden rounded-md bg-[var(--bg-secondary)]',
        'before:absolute before:inset-0',
        'before:bg-gradient-to-r before:from-transparent before:via-white/20 before:to-transparent',
        'before:animate-[shimmer_1.5s_infinite]',
        className,
      )}
      aria-hidden="true"
    />
  )
}

export const SkeletonCard: React.FC = () => {
  return (
    <div className="flex flex-col gap-3 p-3 rounded-xl border border-[var(--border)] bg-[var(--bg-card)]">
      <Skeleton className="w-full aspect-square rounded-lg" />
      <div className="flex flex-col gap-2 px-1 pb-1">
        <Skeleton className="h-3 w-3/4 rounded" />
        <Skeleton className="h-3 w-1/2 rounded" />
      </div>
    </div>
  )
}
