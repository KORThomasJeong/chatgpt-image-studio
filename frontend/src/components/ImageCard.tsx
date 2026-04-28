import React, { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
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
        if (!cancelled) { setBlobUrl(url); setLoading(false) }
      })
      .catch(() => {
        if (!cancelled) { setError(true); setLoading(false) }
      })
    return () => { cancelled = true }
  }, [imageId, status])

  return { blobUrl, loading, error }
}

// ─── Lightbox ────────────────────────────────────────────────────────────────

function Lightbox({
  blobUrl,
  image,
  onClose,
  onDownload,
  onShowPrompt,
  onDelete,
}: {
  blobUrl: string
  image: ImageRecord
  onClose: () => void
  onDownload: () => void
  onShowPrompt: () => void
  onDelete?: () => void
}) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  return createPortal(
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 1000,
          background: 'rgba(0,0,0,0.88)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px',
        }}
      >
        {/* Toolbar */}
        <div
          onClick={(e) => e.stopPropagation()}
          style={{
            display: 'flex',
            gap: '10px',
            marginBottom: '16px',
            alignItems: 'center',
          }}
        >
          <LightboxBtn onClick={onDownload} title="다운로드" icon="⬇️" label="Download" />
          <LightboxBtn onClick={onShowPrompt} title="프롬프트 보기" icon="📝" label="Prompt" />
          {onDelete && (
            <LightboxBtn onClick={onDelete} title="삭제" icon="🗑️" label="Delete" danger />
          )}
          <LightboxBtn onClick={onClose} title="닫기" icon="✕" label="Close" />
        </div>

        {/* Image */}
        <motion.img
          initial={{ scale: 0.92, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', damping: 22, stiffness: 280 }}
          src={blobUrl}
          alt={image.prompt}
          onClick={(e) => e.stopPropagation()}
          style={{
            maxWidth: '90vw',
            maxHeight: '80vh',
            objectFit: 'contain',
            borderRadius: '12px',
            boxShadow: '0 24px 80px rgba(0,0,0,0.6)',
          }}
          draggable={false}
        />

        {/* Meta */}
        <div
          onClick={(e) => e.stopPropagation()}
          style={{
            marginTop: '14px',
            fontSize: '12px',
            color: 'rgba(255,255,255,0.5)',
            letterSpacing: '0.04em',
          }}
        >
          {image.model} · {image.size} · {image.quality} · {new Date(image.created_at).toLocaleString()}
        </div>
      </motion.div>
    </AnimatePresence>,
    document.body,
  )
}

function LightboxBtn({
  onClick, title, icon, label, danger = false,
}: {
  onClick: () => void; title: string; icon: string; label: string; danger?: boolean
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        padding: '8px 14px',
        borderRadius: '8px',
        border: 'none',
        background: danger ? 'rgba(239,68,68,0.8)' : 'rgba(255,255,255,0.12)',
        color: '#fff',
        fontSize: '13px',
        fontWeight: 500,
        cursor: 'pointer',
        backdropFilter: 'blur(8px)',
        transition: 'background 0.15s',
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLButtonElement).style.background = danger
          ? 'rgba(239,68,68,1)' : 'rgba(255,255,255,0.22)'
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLButtonElement).style.background = danger
          ? 'rgba(239,68,68,0.8)' : 'rgba(255,255,255,0.12)'
      }}
    >
      <span>{icon}</span>
      <span>{label}</span>
    </button>
  )
}

// ─── Prompt Modal ─────────────────────────────────────────────────────────────

function PromptModal({
  prompt,
  onClose,
  onUse,
}: {
  prompt: string
  onClose: () => void
  onUse?: (p: string) => void
}) {
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  const handleCopy = () => {
    navigator.clipboard.writeText(prompt)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return createPortal(
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1100,
        background: 'rgba(0,0,0,0.6)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
      }}
    >
      <motion.div
        initial={{ scale: 0.93, opacity: 0, y: 16 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        transition={{ type: 'spring', damping: 24, stiffness: 300 }}
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: '16px',
          padding: '24px',
          maxWidth: '560px',
          width: '100%',
          boxShadow: '0 24px 60px rgba(0,0,0,0.35)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
          <h3 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--color-text-primary)' }}>
            📝 Prompt
          </h3>
          <button
            onClick={onClose}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              fontSize: '18px', color: 'var(--color-text-tertiary)', lineHeight: 1,
            }}
          >
            ✕
          </button>
        </div>

        <p
          style={{
            fontSize: '14px',
            lineHeight: '1.7',
            color: 'var(--color-text-primary)',
            background: 'var(--color-surface-raised)',
            border: '1px solid var(--color-border)',
            borderRadius: '10px',
            padding: '14px',
            marginBottom: '16px',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
            userSelect: 'text',
          }}
        >
          {prompt}
        </p>

        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
          <button
            onClick={handleCopy}
            style={{
              padding: '8px 16px',
              borderRadius: '8px',
              border: '1.5px solid var(--color-border)',
              background: 'var(--color-surface-raised)',
              color: 'var(--color-text-primary)',
              fontSize: '13px',
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            {copied ? '✓ Copied!' : '📋 Copy'}
          </button>
          {onUse && (
            <button
              onClick={() => { onUse(prompt); onClose() }}
              style={{
                padding: '8px 16px',
                borderRadius: '8px',
                border: 'none',
                background: 'var(--color-primary)',
                color: '#fff',
                fontSize: '13px',
                fontWeight: 500,
                cursor: 'pointer',
              }}
            >
              ✨ Use this prompt
            </button>
          )}
        </div>
      </motion.div>
    </motion.div>,
    document.body,
  )
}

// ─── ImageCard ────────────────────────────────────────────────────────────────

export default function ImageCard({ image, onDelete, onCopyPrompt, className = '' }: ImageCardProps) {
  const { blobUrl, loading, error } = useImageBlob(image.id, image.status)
  const [hovered, setHovered] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [showLightbox, setShowLightbox] = useState(false)
  const [showPrompt, setShowPrompt] = useState(false)

  const handleDownload = () => {
    if (!blobUrl) return
    const a = document.createElement('a')
    a.href = blobUrl
    a.download = `image-${image.id}.png`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
  }

  const handleDelete = async () => {
    if (!onDelete) return
    setDeleting(true)
    try {
      await deleteImageApi(image.id)
      onDelete(image.id)
      setShowLightbox(false)
    } catch {
      setDeleting(false)
    }
  }

  const isFailed = image.status === 'failed'
  const isPending = image.status === 'pending' || image.status === 'processing'
  const isClickable = !!blobUrl && !isFailed

  return (
    <>
      <motion.div
        className={`relative rounded-xl overflow-hidden group ${className}`}
        style={{
          background: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          boxShadow: hovered ? '0 8px 30px rgba(0,0,0,0.15)' : '0 1px 4px rgba(0,0,0,0.08)',
          transition: 'box-shadow 0.25s',
          cursor: isClickable ? 'pointer' : 'default',
        }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        whileHover={{ y: -2 }}
        layout
      >
        {/* Image area */}
        <div
          style={{ position: 'relative', aspectRatio: '1 / 1', background: 'var(--color-surface-raised)', overflow: 'hidden' }}
          onClick={() => { if (isClickable) setShowLightbox(true) }}
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
                width: '100%', height: '100%', objectFit: 'cover', display: 'block',
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
                  position: 'absolute', inset: 0,
                  background: 'rgba(0,0,0,0.45)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
                }}
              >
                <ActionButton
                  onClick={(e) => { e.stopPropagation(); setShowLightbox(true) }}
                  title="미리보기" icon="🔍"
                />
                <ActionButton
                  onClick={(e) => { e.stopPropagation(); setShowPrompt(true) }}
                  title="프롬프트 보기" icon="📝"
                />
                <ActionButton
                  onClick={(e) => { e.stopPropagation(); handleDownload() }}
                  title="다운로드" icon="⬇️"
                />
                {onDelete && (
                  <ActionButton
                    onClick={(e) => { e.stopPropagation(); handleDelete() }}
                    title="삭제" icon={deleting ? '⏳' : '🗑️'}
                    danger disabled={deleting}
                  />
                )}
              </motion.div>
            )}
          </AnimatePresence>

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
              fontSize: '13px', color: 'var(--color-text-secondary)', lineHeight: '1.4',
              display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
              overflow: 'hidden', marginBottom: '6px',
            }}
            title={image.prompt}
          >
            {image.prompt || 'No prompt'}
          </p>
          <div className="flex items-center justify-between gap-2">
            <span style={{ fontSize: '11px', color: 'var(--color-text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              {image.kind === 'edit' ? 'Edit' : 'Generated'} · {image.size}
            </span>
            <span style={{ fontSize: '11px', color: 'var(--color-text-tertiary)' }}>
              {new Date(image.created_at).toLocaleDateString()}
            </span>
          </div>
        </div>
      </motion.div>

      {/* Lightbox */}
      {showLightbox && blobUrl && (
        <Lightbox
          blobUrl={blobUrl}
          image={image}
          onClose={() => setShowLightbox(false)}
          onDownload={handleDownload}
          onShowPrompt={() => { setShowLightbox(false); setShowPrompt(true) }}
          onDelete={onDelete ? handleDelete : undefined}
        />
      )}

      {/* Prompt modal */}
      {showPrompt && (
        <PromptModal
          prompt={image.prompt}
          onClose={() => setShowPrompt(false)}
          onUse={onCopyPrompt}
        />
      )}
    </>
  )
}

function ActionButton({
  onClick, title, icon, danger = false, disabled = false,
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
      whileHover={{ scale: disabled ? 1 : 1.12 }}
      whileTap={{ scale: disabled ? 1 : 0.9 }}
      title={title}
      style={{
        width: '40px', height: '40px', borderRadius: '50%', border: 'none',
        background: danger ? 'rgba(239,68,68,0.85)' : 'rgba(255,255,255,0.18)',
        color: '#fff', fontSize: '18px',
        cursor: disabled ? 'not-allowed' : 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        backdropFilter: 'blur(4px)',
        transition: 'background 0.15s',
        opacity: disabled ? 0.6 : 1,
      }}
    >
      {icon}
    </motion.button>
  )
}
