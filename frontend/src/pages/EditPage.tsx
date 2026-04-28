import React, { useState, useRef, useCallback, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { editImageApi } from '../lib/api'
import { Button, Card, Select, useToast } from '../components/ui'
import PromptComposer from '../components/PromptComposer'
import MaskCanvas from '../components/MaskCanvas'
import ImageCard from '../components/ImageCard'

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

const SIZE_OPTIONS = [
  { label: '1024 × 1024 (Square)', value: '1024x1024' },
  { label: '1536 × 1024 (Landscape)', value: '1536x1024' },
  { label: '1024 × 1536 (Portrait)', value: '1024x1536' },
  { label: '2048 × 2048 (Large Square)', value: '2048x2048' },
  { label: '2048 × 1152 (Wide 16:9)', value: '2048x1152' },
  { label: '1152 × 2048 (Tall 9:16)', value: '1152x2048' },
  { label: '3840 × 2160 (4K Landscape)', value: '3840x2160' },
  { label: '2160 × 3840 (4K Portrait)', value: '2160x3840' },
]

const pageVariants = {
  initial: { opacity: 0, y: 24 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.35, ease: 'easeOut' } },
}

function dataURLtoBlob(dataUrl: string): Blob {
  const [header, data] = dataUrl.split(',')
  const mime = header.match(/:(.*?);/)?.[1] ?? 'image/png'
  const binary = atob(data)
  const arr = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) arr[i] = binary.charCodeAt(i)
  return new Blob([arr], { type: mime })
}

export default function EditPage() {
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null)
  const [imageDimensions, setImageDimensions] = useState({ width: 1024, height: 1024 })
  const [maskDataUrl, setMaskDataUrl] = useState<string | null>(null)
  const [prompt, setPrompt] = useState('')
  const [size, setSize] = useState('1024x1024')
  const [resultImage, setResultImage] = useState<ImageRecord | null>(null)
  const [isDragOver, setIsDragOver] = useState(false)

  const loadFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      toast({ title: 'Please upload an image file', variant: 'error' })
      return
    }
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      setImageDimensions({ width: img.naturalWidth, height: img.naturalHeight })
    }
    img.src = url
    setImageFile(file)
    setImagePreviewUrl(url)
    setMaskDataUrl(null)
    setResultImage(null)
  }

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) loadFile(file)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
    const file = e.dataTransfer.files?.[0]
    if (file) loadFile(file)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(true)
  }

  const handleDragLeave = () => setIsDragOver(false)

  const handleClear = () => {
    if (imagePreviewUrl) URL.revokeObjectURL(imagePreviewUrl)
    setImageFile(null)
    setImagePreviewUrl(null)
    setMaskDataUrl(null)
    setResultImage(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleMaskChange = useCallback((dataUrl: string | null) => {
    setMaskDataUrl(dataUrl)
  }, [])

  // Clipboard paste — Ctrl+V / Cmd+V anywhere on the page
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items
      if (!items) return
      for (const item of Array.from(items)) {
        if (item.type.startsWith('image/')) {
          const file = item.getAsFile()
          if (file) {
            loadFile(file)
            toast({ title: '클립보드 이미지가 붙여넣어졌습니다', variant: 'success' })
          }
          break
        }
      }
    }
    window.addEventListener('paste', handlePaste)
    return () => window.removeEventListener('paste', handlePaste)
  }, [])

  const mutation = useMutation({
    mutationFn: () => {
      if (!imageFile) throw new Error('No image file')
      const formData = new FormData()
      formData.append('image', imageFile)
      if (maskDataUrl) {
        const maskBlob = dataURLtoBlob(maskDataUrl)
        formData.append('mask', maskBlob, 'mask.png')
      }
      formData.append('prompt', prompt.trim())
      formData.append('model', '')
      formData.append('size', size)
      return editImageApi(formData)
    },
    onSuccess: (data) => {
      setResultImage(data)
      queryClient.invalidateQueries({ queryKey: ['images'] })
      toast({ title: 'Image edited successfully!', variant: 'success' })
    },
    onError: (err: Error) => {
      toast({
        title: 'Edit failed',
        description: err.message ?? 'Something went wrong.',
        variant: 'error',
      })
    },
  })

  const canSubmit = !!imageFile && prompt.trim().length > 0 && !mutation.isPending

  return (
    <motion.div
      variants={pageVariants}
      initial="initial"
      animate="animate"
      style={{ minHeight: '100%', padding: '24px' }}
    >
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{ marginBottom: '28px' }}>
          <h1
            style={{
              fontSize: '28px',
              fontWeight: 700,
              color: 'var(--color-text-primary)',
              marginBottom: '6px',
            }}
          >
            Edit Image
          </h1>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: '15px' }}>
            Upload an image, paint the areas to edit, and describe the changes.
          </p>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'minmax(0, 1.1fr) minmax(0, 1fr)',
            gap: '24px',
            alignItems: 'start',
          }}
        >
          {/* LEFT: Upload + Mask */}
          <div className="flex flex-col gap-5">
            <Card glass>
              <div className="flex flex-col gap-4 p-1">
                <div className="flex items-center justify-between">
                  <h2
                    style={{
                      fontSize: '16px',
                      fontWeight: 600,
                      color: 'var(--color-text-primary)',
                    }}
                  >
                    Source Image
                  </h2>
                  {imageFile && (
                    <button
                      onClick={handleClear}
                      style={{
                        fontSize: '13px',
                        color: 'var(--color-error, #ef4444)',
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        fontWeight: 500,
                      }}
                    >
                      Clear ✕
                    </button>
                  )}
                </div>

                {!imageFile ? (
                  <div
                    onDrop={handleDrop}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onClick={() => fileInputRef.current?.click()}
                    style={{
                      border: `2px dashed ${isDragOver ? 'var(--color-primary)' : 'var(--color-border)'}`,
                      borderRadius: '14px',
                      padding: '48px 24px',
                      textAlign: 'center',
                      cursor: 'pointer',
                      background: isDragOver
                        ? 'var(--color-primary-subtle, rgba(99,102,241,0.06))'
                        : 'var(--color-surface-raised)',
                      transition: 'all 0.2s',
                    }}
                  >
                    <div style={{ fontSize: '48px', marginBottom: '12px' }}>📁</div>
                    <p
                      style={{
                        fontSize: '15px',
                        fontWeight: 600,
                        color: 'var(--color-text-primary)',
                        marginBottom: '6px',
                      }}
                    >
                      Drop an image here
                    </p>
                    <p style={{ fontSize: '13px', color: 'var(--color-text-tertiary)', marginBottom: '16px' }}>
                      클릭하거나 드래그, 또는 <kbd style={{ padding: '1px 5px', borderRadius: '4px', border: '1px solid var(--color-border)', background: 'var(--color-surface-raised)', fontSize: '12px' }}>Ctrl+V</kbd> 로 붙여넣기
                    </p>
                    <Button variant="secondary" size="sm">
                      Choose File
                    </Button>
                  </div>
                ) : (
                  <MaskCanvas
                    imageUrl={imagePreviewUrl!}
                    width={imageDimensions.width}
                    height={imageDimensions.height}
                    onMaskChange={handleMaskChange}
                  />
                )}

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  style={{ display: 'none' }}
                  onChange={handleFileInput}
                />

                {imageFile && (
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '10px 14px',
                      borderRadius: '10px',
                      background: 'var(--color-surface-raised)',
                      border: '1px solid var(--color-border)',
                    }}
                  >
                    <span style={{ fontSize: '16px' }}>ℹ️</span>
                    <p style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>
                      <strong>Tip:</strong> Paint over areas you want to edit. Unpainted regions stay unchanged.
                    </p>
                  </div>
                )}
              </div>
            </Card>
          </div>

          {/* RIGHT: Settings + Result */}
          <div className="flex flex-col gap-5">
            <Card glass>
              <div className="flex flex-col gap-5 p-1">
                <h2
                  style={{
                    fontSize: '16px',
                    fontWeight: 600,
                    color: 'var(--color-text-primary)',
                  }}
                >
                  Edit Instructions
                </h2>

                <PromptComposer
                  value={prompt}
                  onChange={setPrompt}
                  placeholder="Replace the sky with a dramatic sunset, add northern lights..."
                  maxLength={4000}
                />

                <Select
                  label="Output Size"
                  value={size}
                  onChange={setSize}
                  options={SIZE_OPTIONS}
                />

                <Button
                  variant="primary"
                  size="lg"
                  onClick={() => mutation.mutate()}
                  isLoading={mutation.isPending}
                  disabled={!canSubmit}
                  leftIcon={mutation.isPending ? undefined : <span>✏️</span>}
                  className="w-full"
                >
                  {mutation.isPending ? 'Editing…' : 'Edit Image'}
                </Button>

                {!imageFile && (
                  <p
                    style={{
                      fontSize: '12px',
                      color: 'var(--color-text-tertiary)',
                      textAlign: 'center',
                    }}
                  >
                    Upload an image first to enable editing
                  </p>
                )}
              </div>
            </Card>

            {/* Result */}
            {mutation.isPending && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                style={{
                  borderRadius: '14px',
                  overflow: 'hidden',
                  border: '1px solid var(--color-border)',
                  background: 'var(--color-surface)',
                }}
              >
                <div
                  style={{
                    aspectRatio: '1/1',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '12px',
                    background: 'var(--color-surface-raised)',
                  }}
                >
                  <div className="relative">
                    <div
                      style={{
                        width: '56px',
                        height: '56px',
                        borderRadius: '50%',
                        border: '3px solid var(--color-primary)',
                        borderTopColor: 'transparent',
                        animation: 'spin 1s linear infinite',
                      }}
                    />
                  </div>
                  <p style={{ fontSize: '14px', color: 'var(--color-text-secondary)', fontWeight: 500 }}>
                    Editing your image…
                  </p>
                  <p style={{ fontSize: '12px', color: 'var(--color-text-tertiary)' }}>
                    This may take 15–60 seconds
                  </p>
                </div>
              </motion.div>
            )}

            {resultImage && !mutation.isPending && (
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <p
                  style={{
                    fontSize: '14px',
                    fontWeight: 600,
                    color: 'var(--color-text-primary)',
                    marginBottom: '10px',
                  }}
                >
                  Result
                </p>
                <ImageCard
                  image={resultImage}
                  onCopyPrompt={(p) => setPrompt(p)}
                />
              </motion.div>
            )}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </motion.div>
  )
}
