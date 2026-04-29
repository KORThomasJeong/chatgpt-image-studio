import React, { useState, useEffect, useRef, useCallback } from 'react'
import { motion } from 'framer-motion'
import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query'
import { listImagesApi } from '../lib/api'
import { Tabs, SkeletonCard, useToast } from '../components/ui'
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

const FILTER_TABS = [
  { label: '전체', value: 'all' },
  { label: '생성됨', value: 'generate' },
  { label: '편집됨', value: 'edit' },
]

const PAGE_SIZE = 20

const pageVariants = {
  initial: { opacity: 0, y: 24 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.35, ease: 'easeOut' } },
}

export default function GalleryPage() {
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const [filter, setFilter] = useState('all')
  const sentinelRef = useRef<HTMLDivElement>(null)

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isError,
  } = useInfiniteQuery({
    queryKey: ['images', 'gallery', filter],
    queryFn: ({ pageParam }) =>
      listImagesApi({
        limit: PAGE_SIZE,
        cursor: pageParam as string | undefined,
      }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.next_cursor ?? undefined,
    staleTime: 30_000,
  })

  // Flatten and filter
  const allImages: ImageRecord[] = (data?.pages ?? []).flatMap((p) => p.items)
  const filteredImages =
    filter === 'all' ? allImages : allImages.filter((img) => img.kind === filter)

  const totalCount = filteredImages.length

  // Infinite scroll via IntersectionObserver
  useEffect(() => {
    const sentinel = sentinelRef.current
    if (!sentinel) return

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
          fetchNextPage()
        }
      },
      { rootMargin: '200px' }
    )
    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [hasNextPage, isFetchingNextPage, fetchNextPage])

  const handleDelete = useCallback(
    (id: string) => {
      queryClient.setQueriesData(
        { queryKey: ['images', 'gallery', filter] },
        (old: typeof data) => {
          if (!old) return old
          return {
            ...old,
            pages: old.pages.map((page) => ({
              ...page,
              items: page.items.filter((img: ImageRecord) => img.id !== id),
            })),
          }
        }
      )
      queryClient.invalidateQueries({ queryKey: ['images', 'recent'] })
      toast({ title: '이미지가 삭제되었습니다', variant: 'success' })
    },
    [queryClient, filter, toast]
  )

  const handleCopyPrompt = (prompt: string) => {
    navigator.clipboard.writeText(prompt).catch(() => {})
    toast({ title: '프롬프트가 클립보드에 복사되었습니다', variant: 'success' })
  }

  return (
    <motion.div
      variants={pageVariants}
      initial="initial"
      animate="animate"
      style={{ minHeight: '100%', padding: '24px' }}
    >
      <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
        {/* Header */}
        <div
          className="flex items-start justify-between"
          style={{ marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}
        >
          <div>
            <h1
              style={{
                fontSize: '28px',
                fontWeight: 700,
                color: 'var(--color-text-primary)',
                marginBottom: '6px',
              }}
            >
              갤러리
            </h1>
            <p style={{ color: 'var(--color-text-secondary)', fontSize: '15px' }}>
              {isLoading
                ? '이미지를 불러오는 중…'
                : `총 ${totalCount}${hasNextPage ? '+' : ''}개의 이미지`}
            </p>
          </div>

          <Tabs
            tabs={FILTER_TABS}
            value={filter}
            onChange={setFilter}
          />
        </div>

        {/* Loading skeleton */}
        {isLoading && (
          <div
            style={{
              columns: '5 200px',
              gap: '16px',
            }}
          >
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} style={{ breakInside: 'avoid', marginBottom: '16px' }}>
                <SkeletonCard />
              </div>
            ))}
          </div>
        )}

        {/* Error */}
        {isError && (
          <div
            style={{
              textAlign: 'center',
              padding: '64px 24px',
              color: 'var(--color-text-secondary)',
            }}
          >
            <div style={{ fontSize: '48px', marginBottom: '12px' }}>⚠️</div>
            <p style={{ fontSize: '16px', fontWeight: 600, marginBottom: '6px' }}>
              이미지를 불러오지 못했습니다
            </p>
            <p style={{ fontSize: '14px', color: 'var(--color-text-tertiary)' }}>
              페이지를 새로고침해 주세요.
            </p>
          </div>
        )}

        {/* Empty state */}
        {!isLoading && !isError && filteredImages.length === 0 && (
          <EmptyState filter={filter} />
        )}

        {/* Masonry grid */}
        {!isLoading && filteredImages.length > 0 && (
          <div
            style={{
              columns: '5 180px',
              gap: '16px',
            }}
          >
            {filteredImages.map((image, idx) => (
              <motion.div
                key={image.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(idx * 0.03, 0.4), duration: 0.3 }}
                style={{ breakInside: 'avoid', marginBottom: '16px' }}
              >
                <ImageCard
                  image={image}
                  onDelete={handleDelete}
                  onCopyPrompt={handleCopyPrompt}
                />
              </motion.div>
            ))}
          </div>
        )}

        {/* Infinite scroll sentinel */}
        <div ref={sentinelRef} style={{ height: '1px' }} />

        {/* Loading more indicator */}
        {isFetchingNextPage && (
          <div
            style={{
              display: 'flex',
              justifyContent: 'center',
              padding: '32px',
              gap: '12px',
            }}
          >
            <div
              style={{
                width: '28px',
                height: '28px',
                borderRadius: '50%',
                border: '3px solid var(--color-primary)',
                borderTopColor: 'transparent',
                animation: 'spin 0.8s linear infinite',
              }}
            />
            <span style={{ color: 'var(--color-text-secondary)', fontSize: '14px', alignSelf: 'center' }}>
              더 불러오는 중…
            </span>
          </div>
        )}

        {/* End of results */}
        {!hasNextPage && !isLoading && filteredImages.length > 0 && (
          <p
            style={{
              textAlign: 'center',
              color: 'var(--color-text-tertiary)',
              fontSize: '13px',
              padding: '24px',
            }}
          >
            총 {totalCount}개의 이미지를 모두 확인했습니다
          </p>
        )}
      </div>

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </motion.div>
  )
}

function EmptyState({ filter }: { filter: string }) {
  const messages: Record<string, { icon: string; title: string; desc: string }> = {
    all: {
      icon: '🖼️',
      title: '아직 이미지가 없습니다',
      desc: '첫 번째 이미지를 생성하면 여기에 표시됩니다.',
    },
    generate: {
      icon: '✨',
      title: '생성된 이미지가 없습니다',
      desc: '생성 페이지로 이동해서 첫 번째 AI 이미지를 만들어 보세요.',
    },
    edit: {
      icon: '✏️',
      title: '편집된 이미지가 없습니다',
      desc: '편집 페이지에서 AI로 기존 이미지를 수정해 보세요.',
    },
  }

  const { icon, title, desc } = messages[filter] ?? messages.all

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '80px 24px',
        textAlign: 'center',
        gap: '16px',
      }}
    >
      <div style={{ fontSize: '72px', lineHeight: 1 }}>{icon}</div>
      <div>
        <p
          style={{
            fontSize: '20px',
            fontWeight: 700,
            color: 'var(--color-text-primary)',
            marginBottom: '8px',
          }}
        >
          {title}
        </p>
        <p style={{ fontSize: '15px', color: 'var(--color-text-tertiary)', maxWidth: '320px' }}>
          {desc}
        </p>
      </div>
    </motion.div>
  )
}
