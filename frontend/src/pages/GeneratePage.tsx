import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { generateImageApi, listImagesApi, getServerConfigApi } from '../lib/api'
import { Button, Card, Select, Spinner, Skeleton, useToast } from '../components/ui'
import PromptComposer from '../components/PromptComposer'
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
]

const QUALITY_OPTIONS = [
  { label: 'Standard', value: 'standard' },
  { label: 'HD', value: 'hd' },
]

const COUNT_OPTIONS = [1, 2, 3, 4]

const pageVariants = {
  initial: { opacity: 0, y: 24 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.35, ease: 'easeOut' } },
}

export default function GeneratePage() {
  const { toast } = useToast()
  const queryClient = useQueryClient()

  const [prompt, setPrompt] = useState('')
  const [size, setSize] = useState('1024x1024')
  const [quality, setQuality] = useState('standard')
  const [count, setCount] = useState(1)
  const [currentResults, setCurrentResults] = useState<ImageRecord[]>([])

  const { data: serverConfig } = useQuery({
    queryKey: ['server-config'],
    queryFn: getServerConfigApi,
    staleTime: Infinity,
  })

  const effectiveModel = serverConfig?.default_model ?? 'gpt-image-2'

  const { data: recentData } = useQuery({
    queryKey: ['images', 'recent'],
    queryFn: () => listImagesApi({ limit: 5 }),
    staleTime: 30_000,
  })

  const mutation = useMutation({
    mutationFn: () =>
      generateImageApi({ prompt: prompt.trim(), model: effectiveModel, size, quality, n: count }),
    onSuccess: (data) => {
      setCurrentResults(data)
      queryClient.invalidateQueries({ queryKey: ['images'] })
      toast({ title: 'Images generated!', variant: 'success' })
    },
    onError: (err: Error) => {
      toast({
        title: 'Generation failed',
        description: err.message ?? 'Something went wrong.',
        variant: 'error',
      })
    },
  })

  const handleGenerate = () => {
    if (!prompt.trim()) {
      toast({ title: 'Please enter a prompt', variant: 'error' })
      return
    }
    mutation.mutate()
  }

  const handleDeleteResult = (id: string) => {
    setCurrentResults((prev) => prev.filter((img) => img.id !== id))
    queryClient.invalidateQueries({ queryKey: ['images'] })
  }

  const handleCopyPrompt = (p: string) => {
    setPrompt(p)
    toast({ title: 'Prompt copied!', variant: 'success' })
  }

  const recentImages = recentData?.items ?? []

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
            Generate Images
          </h1>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: '15px' }}>
            Describe your vision and let AI bring it to life.
          </p>
        </div>

        {/* Two-column layout */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1.3fr)',
            gap: '24px',
            alignItems: 'start',
          }}
          className="lg:grid-cols-2 sm:grid-cols-1"
        >
          {/* LEFT: Controls */}
          <div className="flex flex-col gap-5">
            <Card glass>
              <div className="flex flex-col gap-5 p-1">
                <PromptComposer
                  value={prompt}
                  onChange={setPrompt}
                  placeholder="A majestic dragon soaring over misty mountains at sunset..."
                />

                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: '14px',
                  }}
                >
                  <div>
                    <p
                      style={{
                        fontSize: '13px',
                        fontWeight: 500,
                        color: 'var(--color-text-secondary)',
                        marginBottom: '8px',
                      }}
                    >
                      Model
                    </p>
                    <div
                      style={{
                        height: '42px',
                        padding: '0 12px',
                        borderRadius: '10px',
                        border: '1.5px solid var(--color-border)',
                        background: 'var(--color-surface-raised)',
                        display: 'flex',
                        alignItems: 'center',
                        fontSize: '14px',
                        color: 'var(--color-text-primary)',
                        fontWeight: 500,
                      }}
                    >
                      {effectiveModel}
                    </div>
                  </div>
                  <Select
                    label="Quality"
                    value={quality}
                    onChange={setQuality}
                    options={QUALITY_OPTIONS}
                  />
                </div>

                <Select
                  label="Size"
                  value={size}
                  onChange={setSize}
                  options={SIZE_OPTIONS}
                />

                {/* Count */}
                <div>
                  <p
                    style={{
                      fontSize: '13px',
                      fontWeight: 500,
                      color: 'var(--color-text-secondary)',
                      marginBottom: '8px',
                    }}
                  >
                    Number of images
                  </p>
                  <div className="flex gap-2">
                    {COUNT_OPTIONS.map((n) => (
                      <button
                        key={n}
                        onClick={() => setCount(n)}
                        style={{
                          width: '44px',
                          height: '44px',
                          borderRadius: '10px',
                          border: '2px solid',
                          borderColor:
                            count === n ? 'var(--color-primary)' : 'var(--color-border)',
                          background:
                            count === n
                              ? 'var(--color-primary)'
                              : 'var(--color-surface-raised)',
                          color: count === n ? '#fff' : 'var(--color-text-secondary)',
                          fontSize: '16px',
                          fontWeight: 600,
                          cursor: 'pointer',
                          transition: 'all 0.15s',
                        }}
                      >
                        {n}
                      </button>
                    ))}
                  </div>
                </div>

                <Button
                  variant="primary"
                  size="lg"
                  onClick={handleGenerate}
                  isLoading={mutation.isPending}
                  leftIcon={mutation.isPending ? undefined : <span>✨</span>}
                  className="w-full"
                >
                  {mutation.isPending ? 'Generating…' : 'Generate Images'}
                </Button>

                <p
                  style={{
                    fontSize: '12px',
                    color: 'var(--color-text-tertiary)',
                    textAlign: 'center',
                  }}
                >
                  Image generation may take 15–60 seconds
                </p>
              </div>
            </Card>
          </div>

          {/* RIGHT: Results */}
          <div className="flex flex-col gap-6">
            {/* Current results */}
            <div>
              {mutation.isPending && (
                <div>
                  <p
                    style={{
                      fontSize: '14px',
                      color: 'var(--color-text-secondary)',
                      marginBottom: '14px',
                      fontWeight: 500,
                    }}
                  >
                    Generating {count} image{count > 1 ? 's' : ''}…
                  </p>
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: count === 1 ? '1fr' : 'repeat(2, 1fr)',
                      gap: '14px',
                    }}
                  >
                    {Array.from({ length: count }).map((_, i) => (
                      <SkeletonImageCard key={i} />
                    ))}
                  </div>
                </div>
              )}

              {!mutation.isPending && currentResults.length > 0 && (
                <div>
                  <p
                    style={{
                      fontSize: '14px',
                      color: 'var(--color-text-secondary)',
                      marginBottom: '14px',
                      fontWeight: 500,
                    }}
                  >
                    Generated {currentResults.length} image{currentResults.length > 1 ? 's' : ''}
                  </p>
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns:
                        currentResults.length === 1 ? '1fr' : 'repeat(2, 1fr)',
                      gap: '14px',
                    }}
                  >
                    {currentResults.map((img) => (
                      <ImageCard
                        key={img.id}
                        image={img}
                        onDelete={handleDeleteResult}
                        onCopyPrompt={handleCopyPrompt}
                      />
                    ))}
                  </div>
                </div>
              )}

              {!mutation.isPending && currentResults.length === 0 && (
                <EmptyState />
              )}
            </div>

            {/* Recent images */}
            {recentImages.length > 0 && (
              <div>
                <div
                  className="flex items-center justify-between"
                  style={{ marginBottom: '12px' }}
                >
                  <p
                    style={{
                      fontSize: '14px',
                      fontWeight: 600,
                      color: 'var(--color-text-primary)',
                    }}
                  >
                    Recent Images
                  </p>
                  <Link
                    to="/gallery"
                    style={{
                      fontSize: '13px',
                      color: 'var(--color-primary)',
                      textDecoration: 'none',
                      fontWeight: 500,
                    }}
                  >
                    View All →
                  </Link>
                </div>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(5, 1fr)',
                    gap: '8px',
                  }}
                >
                  {recentImages.map((img) => (
                    <ImageCard
                      key={img.id}
                      image={img}
                      onCopyPrompt={handleCopyPrompt}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  )
}

function EmptyState() {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '64px 32px',
        border: '2px dashed var(--color-border)',
        borderRadius: '16px',
        textAlign: 'center',
        gap: '16px',
        background: 'var(--color-surface)',
      }}
    >
      <div style={{ fontSize: '64px', lineHeight: 1 }}>🎨</div>
      <div>
        <p
          style={{
            fontSize: '18px',
            fontWeight: 600,
            color: 'var(--color-text-primary)',
            marginBottom: '6px',
          }}
        >
          Your canvas awaits
        </p>
        <p style={{ fontSize: '14px', color: 'var(--color-text-tertiary)', maxWidth: '280px' }}>
          Enter a prompt on the left and click <strong>Generate Images</strong> to see your
          creations appear here.
        </p>
      </div>
    </motion.div>
  )
}

function SkeletonImageCard() {
  return (
    <div
      style={{
        borderRadius: '12px',
        overflow: 'hidden',
        border: '1px solid var(--color-border)',
        background: 'var(--color-surface)',
      }}
    >
      <Skeleton style={{ aspectRatio: '1/1', width: '100%', borderRadius: 0 }} />
      <div style={{ padding: '10px 12px 12px' }}>
        <Skeleton style={{ height: '14px', width: '80%', marginBottom: '8px' }} />
        <Skeleton style={{ height: '12px', width: '50%' }} />
      </div>
    </div>
  )
}
