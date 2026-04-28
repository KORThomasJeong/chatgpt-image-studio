import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { fetchImageBlob, deleteImageApi } from '../lib/api'
import { Badge, Spinner } from './ui'

interface ImageRecord {
  id: string
  kind: string
  prompt: string
  model: string
  size: string
  quality: string
  status: string
  error_message: string | null
  created_at: string
}

interface ImageCardProps {
  image: ImageRecord
  onDelete?: (id: string) => void
  onCopyPrompt?: (prompt: string) => void
  className?: string
}

function useImageBlob(imageId: string, status: string) {
  const [blobUrl, setBlobUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(false)

  useEffect(() => {
    if (status !== 'completed') return
    let cancelled = false
    setLoading(true)
    setError(false)
    fetchImageBlob(imageId)
      .then((url) => {
        if (!cancelled) {
          setBlobUrl(url)
          setLoading(false)
        }
      })
      .catch(() => {
        if (!cancelled) {
          setError(true)
          setLoading(false)
        }
      })
    return () => {
      cancelled = true
    }
  }, [imageId, status])

  return { blobUrl, loading, error }
}

export default function ImageCard({ image, onDelete, onCopyPrompt, className = '' }: ImageCardProps) {
  const { blobUrl, loading, error } = useImageBlob(image.id, image.status)
  const [hovered, setHovered] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const handleDownload = async (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!blobUrl) return
    const a = document.createElement('a')
    a.href = blobUrl
    a.download = `image-${image.id}.png`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
  }

  const handleCopyPrompt = (e: React.MouseEvent) => {
    e.stopPropagation()
    onCopyPrompt?.(image.prompt)
  }

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!onDelete) return
    setDeleting(true)
    try {
      await deleteImageApi(image.id)
      onDelete(image.id)
    } catch {
      setDeleting(false)
    }
  }

  const isFailed = image.status === 'failed'
  const isPending = image.status === 'pending' || image.status === 'processing'

  return (
    <motion.div
      className={`relative rounded-xl overflow-hidden group ${className}`}
      style={{
        background: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
        boxShadow: hovered
          ? '0 8px 30px rgba(0,0,0,0.15)'
          : '0 1px 4px rgba(0,0,0,0.08)',
        transition: 'box-shadow 0.25s',
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      whileHover={{ y: -2 }}
      layout
    >
      {/* Image area */}
      <div
        style={{
          position: 'relative',
          aspectRatio: '1 / 1',
          background: 'var(--color-surface-raised)',
          overflow: 'hidden',
        }}
      >
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center">
            <Spinner size="md" />
          </div>
        )}

        {error && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
            <span style={{ fontSize: '32px' }}>⚠️</span>
            <p style={{ fontSize: '12px', color: 'var(--color-text-tertiary)' }}>Failed to load</p>
          </div>
        )}

        {isPending && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
            <Spinner size="md" />
            <p style={{ fontSize: '12px', color: 'var(--color-text-tertiary)' }}>Processing…</p>
          </div>
        )}

        {isFailed && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 p-4">
            <span style={{ fontSize: '32px' }}>❌</span>
            <p style={{ fontSize: '12px', color: 'var(--color-error, #ef4444)', textAlign: 'center' }}>
              {image.error_message ?? 'Generation failed'}
            </p>
          </div>
        )}

        {blobUrl && !isFailed && (
          <img
            src={blobUrl}
            alt={image.prompt}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              display: 'block',
              transition: 'transform 0.3s',
              transform: hovered ? 'scale(1.04)' : 'scale(1)',
            }}
            draggable={false}
          />
        )}

        {/* Hover overlay */}
        <AnimatePresence>
          {hovered && blobUrl && !isFailed && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
              style={{
                position: 'absolute',
                inset: 0,
                background: 'rgba(0,0,0,0.48)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '10px',
              }}
            >
              <ActionButton onClick={handleDownload} title="Download" icon="⬇️" />
              {onCopyPrompt && (
                <ActionButton onClick={handleCopyPrompt} title="Copy Prompt" icon="📋" />
              )}
              {onDelete && (
                <ActionButton
                  onClick={handleDelete}
                  title="Delete"
                  icon={deleting ? '⏳' : '🗑️'}
                  danger
                  disabled={deleting}
                />
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Status badge */}
        {isFailed && (
          <div style={{ position: 'absolute', top: '8px', right: '8px' }}>
            <Badge variant="error">Failed</Badge>
          </div>
        )}
        {isPending && (
          <div style={{ position: 'absolute', top: '8px', right: '8px' }}>
            <Badge variant="warning">Processing</Badge>
          </div>
        )}
      </div>

      {/* Footer */}
      <div style={{ padding: '10px 12px 12px' }}>
        <p
          style={{
            fontSize: '13px',
            color: 'var(--color-text-secondary)',
            lineHeight: '1.4',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
            marginBottom: '6px',
          }}
          title={image.prompt}
        >
          {image.prompt || 'No prompt'}
        </p>
        <div className="flex items-center justify-between gap-2">
          <span
            style={{
              fontSize: '11px',
              color: 'var(--color-text-tertiary)',
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
            }}
          >
            {image.kind === 'edit' ? 'Edit' : 'Generated'} · {image.size}
          </span>
          <span style={{ fontSize: '11px', color: 'var(--color-text-tertiary)' }}>
            {new Date(image.created_at).toLocaleDateString()}
          </span>
        </div>
      </div>
    </motion.div>
  )
}

function ActionButton({
  onClick,
  title,
  icon,
  danger = false,
  disabled = false,
}: {
  onClick: (e: React.MouseEvent) => void
  title: string
  icon: string
  danger?: boolean
  disabled?: boolean
}) {
  return (
    <motion.button
      onClick={onClick}
      disabled={disabled}
      whileHover={{ scale: disabled ? 1 : 1.1 }}
      whileTap={{ scale: disabled ? 1 : 0.9 }}
      title={title}
      style={{
        width: '40px',
        height: '40px',
        borderRadius: '50%',
        border: 'none',
        background: danger ? 'rgba(239,68,68,0.85)' : 'rgba(255,255,255,0.18)',
        color: '#fff',
        fontSize: '18px',
        cursor: disabled ? 'not-allowed' : 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backdropFilter: 'blur(4px)',
        transition: 'background 0.15s',
        opacity: disabled ? 0.6 : 1,
      }}
    >
      {icon}
    </motion.button>
  )
}
