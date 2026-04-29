import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  getOpenAIKeyStatusApi,
  setOpenAIKeyApi,
  deleteOpenAIKeyApi,
  changePasswordApi,
} from '../lib/api'
import { useTheme } from '../lib/theme'
import { Button, Card, Input, Badge, useToast } from '../components/ui'

const pageVariants = {
  initial: { opacity: 0, y: 24 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.35, ease: 'easeOut' } },
}

const sectionVariants = {
  initial: { opacity: 0, y: 16 },
  animate: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.1, duration: 0.3, ease: 'easeOut' },
  }),
}

export default function SettingsPage() {
  return (
    <motion.div
      variants={pageVariants}
      initial="initial"
      animate="animate"
      style={{ minHeight: '100%', padding: '24px' }}
    >
      <div style={{ maxWidth: '680px', margin: '0 auto' }}>
        <div style={{ marginBottom: '28px' }}>
          <h1
            style={{
              fontSize: '28px',
              fontWeight: 700,
              color: 'var(--color-text-primary)',
              marginBottom: '6px',
            }}
          >
            설정
          </h1>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: '15px' }}>
            계정 환경설정 및 API 구성을 관리하세요.
          </p>
        </div>

        <div className="flex flex-col gap-6">
          <motion.div custom={0} variants={sectionVariants} initial="initial" animate="animate">
            <APIKeySection />
          </motion.div>

          <motion.div custom={1} variants={sectionVariants} initial="initial" animate="animate">
            <ChangePasswordSection />
          </motion.div>

          <motion.div custom={2} variants={sectionVariants} initial="initial" animate="animate">
            <ThemeSection />
          </motion.div>
        </div>
      </div>
    </motion.div>
  )
}

/* ─── API Key Section ─────────────────────────────────────────────────── */

function APIKeySection() {
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const [keyInput, setKeyInput] = useState('')
  const [showKey, setShowKey] = useState(false)

  const { data: keyStatus, isLoading } = useQuery({
    queryKey: ['openai-key-status'],
    queryFn: getOpenAIKeyStatusApi,
    staleTime: 60_000,
  })

  const setKeyMutation = useMutation({
    mutationFn: () => setOpenAIKeyApi(keyInput.trim()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['openai-key-status'] })
      setKeyInput('')
      toast({ title: 'API 키가 저장되었습니다', variant: 'success' })
    },
    onError: (err: Error) => {
      toast({ title: '키 저장 실패', description: err.message, variant: 'error' })
    },
  })

  const deleteKeyMutation = useMutation({
    mutationFn: deleteOpenAIKeyApi,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['openai-key-status'] })
      toast({ title: 'API 키가 삭제되었습니다', variant: 'default' })
    },
    onError: (err: Error) => {
      toast({ title: '키 삭제 실패', description: err.message, variant: 'error' })
    },
  })

  const hasKey = keyStatus?.has_key ?? false
  const keyPreview = keyStatus?.key_preview ?? null

  return (
    <Card glass>
      <div className="flex flex-col gap-5 p-2">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2
              style={{
                fontSize: '17px',
                fontWeight: 600,
                color: 'var(--color-text-primary)',
                marginBottom: '4px',
              }}
            >
              OpenAI API 키
            </h2>
            <p style={{ fontSize: '13px', color: 'var(--color-text-tertiary)' }}>
              서버 기본 키 대신 개인 키를 사용하세요
            </p>
          </div>
          {!isLoading && (
            <Badge variant={hasKey ? 'success' : 'default'}>
              {hasKey ? '개인 키 사용 중' : '서버 키'}
            </Badge>
          )}
        </div>

        {hasKey && keyPreview && (
          <div
            style={{
              padding: '12px 16px',
              borderRadius: '10px',
              background: 'var(--color-surface-raised)',
              border: '1px solid var(--color-border)',
              fontSize: '14px',
              color: 'var(--color-text-secondary)',
              fontFamily: 'monospace',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <span style={{ color: 'var(--color-success, #22c55e)' }}>●</span>
            현재 키: <strong>{keyPreview}</strong>
          </div>
        )}

        {/* Info box */}
        <div
          style={{
            padding: '12px 16px',
            borderRadius: '10px',
            background: 'var(--color-info-surface, rgba(99,102,241,0.06))',
            border: '1px solid var(--color-info-border, rgba(99,102,241,0.2))',
            fontSize: '13px',
            color: 'var(--color-text-secondary)',
            lineHeight: '1.5',
          }}
        >
          🔐 키는 암호화되어 안전하게 저장됩니다. 모든 요청에서 서버 기본 키 대신 사용됩니다.
        </div>

        <div className="flex gap-3 items-end">
          <div style={{ flex: 1 }}>
            <Input
              label="새 API 키"
              type={showKey ? 'text' : 'password'}
              value={keyInput}
              onChange={(e) => setKeyInput(e.target.value)}
              placeholder="sk-proj-..."
              leftIcon={<span style={{ fontSize: '14px' }}>🔑</span>}
            />
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowKey((v) => !v)}
            style={{ marginBottom: '1px', flexShrink: 0 }}
          >
            {showKey ? '숨기기' : '보기'}
          </Button>
        </div>

        <div className="flex gap-3">
          <Button
            variant="primary"
            size="md"
            onClick={() => setKeyMutation.mutate()}
            isLoading={setKeyMutation.isPending}
            disabled={!keyInput.trim()}
          >
            키 저장
          </Button>
          {hasKey && (
            <Button
              variant="destructive"
              size="md"
              onClick={() => deleteKeyMutation.mutate()}
              isLoading={deleteKeyMutation.isPending}
            >
              키 삭제
            </Button>
          )}
        </div>
      </div>
    </Card>
  )
}

/* ─── Change Password Section ─────────────────────────────────────────── */

function ChangePasswordSection() {
  const { toast } = useToast()
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [confirmError, setConfirmError] = useState('')

  const mutation = useMutation({
    mutationFn: () => changePasswordApi(currentPassword, newPassword),
    onSuccess: () => {
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      toast({ title: '비밀번호가 성공적으로 변경되었습니다', variant: 'success' })
    },
    onError: (err: Error) => {
      toast({ title: '비밀번호 변경 실패', description: err.message, variant: 'error' })
    },
  })

  const handleSubmit = () => {
    setConfirmError('')
    if (newPassword !== confirmPassword) {
      setConfirmError('비밀번호가 일치하지 않습니다')
      return
    }
    if (newPassword.length < 8) {
      setConfirmError('새 비밀번호는 최소 8자 이상이어야 합니다')
      return
    }
    mutation.mutate()
  }

  const canSubmit =
    currentPassword.length > 0 &&
    newPassword.length > 0 &&
    confirmPassword.length > 0 &&
    !mutation.isPending

  return (
    <Card glass>
      <div className="flex flex-col gap-5 p-2">
        <div>
          <h2
            style={{
              fontSize: '17px',
              fontWeight: 600,
              color: 'var(--color-text-primary)',
              marginBottom: '4px',
            }}
          >
            비밀번호 변경
          </h2>
          <p style={{ fontSize: '13px', color: 'var(--color-text-tertiary)' }}>
            계정 비밀번호를 업데이트하세요
          </p>
        </div>

        <Input
          label="현재 비밀번호"
          type="password"
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
          placeholder="현재 비밀번호를 입력하세요"
        />

        <Input
          label="새 비밀번호"
          type="password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          placeholder="최소 8자 이상"
        />

        <Input
          label="새 비밀번호 확인"
          type="password"
          value={confirmPassword}
          onChange={(e) => {
            setConfirmPassword(e.target.value)
            if (confirmError) setConfirmError('')
          }}
          placeholder="새 비밀번호를 다시 입력하세요"
          error={confirmError}
        />

        <Button
          variant="primary"
          size="md"
          onClick={handleSubmit}
          isLoading={mutation.isPending}
          disabled={!canSubmit}
        >
          비밀번호 변경
        </Button>
      </div>
    </Card>
  )
}

/* ─── Theme Section ───────────────────────────────────────────────────── */

function ThemeSection() {
  const { theme, setTheme } = useTheme()

  const options: { value: 'light' | 'dark' | 'system'; label: string; icon: string }[] = [
    { value: 'light', label: '라이트', icon: '☀️' },
    { value: 'dark', label: '다크', icon: '🌙' },
    { value: 'system', label: '시스템', icon: '💻' },
  ]

  return (
    <Card glass>
      <div className="flex flex-col gap-5 p-2">
        <div>
          <h2
            style={{
              fontSize: '17px',
              fontWeight: 600,
              color: 'var(--color-text-primary)',
              marginBottom: '4px',
            }}
          >
            테마
          </h2>
          <p style={{ fontSize: '13px', color: 'var(--color-text-tertiary)' }}>
            원하는 색상 테마를 선택하세요
          </p>
        </div>

        <div className="flex gap-3">
          {options.map((opt) => (
            <motion.button
              key={opt.value}
              onClick={() => setTheme(opt.value)}
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.96 }}
              style={{
                flex: 1,
                padding: '16px 12px',
                borderRadius: '12px',
                border: '2px solid',
                borderColor:
                  theme === opt.value ? 'var(--color-primary)' : 'var(--color-border)',
                background:
                  theme === opt.value
                    ? 'var(--color-primary-subtle, rgba(99,102,241,0.08))'
                    : 'var(--color-surface-raised)',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '8px',
                transition: 'all 0.18s',
              }}
            >
              <span style={{ fontSize: '24px' }}>{opt.icon}</span>
              <span
                style={{
                  fontSize: '13px',
                  fontWeight: theme === opt.value ? 600 : 400,
                  color:
                    theme === opt.value
                      ? 'var(--color-primary)'
                      : 'var(--color-text-secondary)',
                  transition: 'color 0.18s',
                }}
              >
                {opt.label}
              </span>
            </motion.button>
          ))}
        </div>
      </div>
    </Card>
  )
}
