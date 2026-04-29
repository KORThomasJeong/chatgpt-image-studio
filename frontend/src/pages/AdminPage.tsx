import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { listUsersApi, createUserApi, deleteUserApi } from '../lib/api'
import { useAuth } from '../lib/auth'
import { Button, Card, Input, Dialog, Badge, Spinner, useToast } from '../components/ui'

interface UserRecord {
  id: number
  username: string
  is_admin: boolean
  has_custom_key: boolean
  created_at: string
}

const pageVariants = {
  initial: { opacity: 0, y: 24 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.35, ease: 'easeOut' } },
}

export default function AdminPage() {
  const { user } = useAuth()
  const navigate = useNavigate()

  // Extra admin guard
  React.useEffect(() => {
    if (user && !user.is_admin) {
      navigate('/', { replace: true })
    }
  }, [user, navigate])

  if (!user?.is_admin) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '60vh',
          flexDirection: 'column',
          gap: '12px',
        }}
      >
        <Spinner size="lg" />
        <p style={{ color: 'var(--color-text-secondary)' }}>권한을 확인하는 중…</p>
      </div>
    )
  }

  return (
    <motion.div
      variants={pageVariants}
      initial="initial"
      animate="animate"
      style={{ minHeight: '100%', padding: '24px' }}
    >
      <div style={{ maxWidth: '960px', margin: '0 auto' }}>
        <div style={{ marginBottom: '28px' }}>
          <div className="flex items-center gap-3" style={{ marginBottom: '6px' }}>
            <h1
              style={{
                fontSize: '28px',
                fontWeight: 700,
                color: 'var(--color-text-primary)',
              }}
            >
              관리자 패널
            </h1>
            <Badge variant="warning">관리자 전용</Badge>
          </div>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: '15px' }}>
            사용자 및 시스템 설정을 관리하세요.
          </p>
        </div>

        <div className="flex flex-col gap-8">
          <UserTable currentUser={user} />
          <AddUserPanel />
        </div>
      </div>
    </motion.div>
  )
}

/* ─── User Table ──────────────────────────────────────────────────────── */

function UserTable({
  currentUser,
}: {
  currentUser: { id: number; username: string; is_admin: boolean; has_custom_key: boolean }
}) {
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const [deleteTarget, setDeleteTarget] = useState<UserRecord | null>(null)

  const { data: users, isLoading, isError } = useQuery({
    queryKey: ['users'],
    queryFn: listUsersApi,
    staleTime: 30_000,
  })

  const deleteMutation = useMutation({
    mutationFn: (userId: number) => deleteUserApi(userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
      toast({ title: '사용자가 삭제되었습니다', variant: 'success' })
      setDeleteTarget(null)
    },
    onError: (err: Error) => {
      toast({ title: '사용자 삭제 실패', description: err.message, variant: 'error' })
      setDeleteTarget(null)
    },
  })

  const adminCount = (users ?? []).filter((u) => u.is_admin).length

  const canDelete = (u: UserRecord) => {
    if (u.id === currentUser.id) return false
    if (u.is_admin && adminCount <= 1) return false
    return true
  }

  return (
    <Card glass>
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2
            style={{
              fontSize: '17px',
              fontWeight: 600,
              color: 'var(--color-text-primary)',
            }}
          >
            사용자
          </h2>
          {!isLoading && users && (
            <span
              style={{
                fontSize: '13px',
                color: 'var(--color-text-tertiary)',
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              총 {users.length}명
            </span>
          )}
        </div>

        {isLoading && (
          <div className="flex items-center justify-center" style={{ padding: '40px' }}>
            <Spinner size="md" />
          </div>
        )}

        {isError && (
          <p style={{ color: 'var(--color-error, #ef4444)', fontSize: '14px', padding: '16px 0' }}>
            사용자 목록을 불러오지 못했습니다.
          </p>
        )}

        {!isLoading && !isError && users && (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
              <thead>
                <tr>
                  {['아이디', '역할', 'API 키', '생성일', '작업'].map((col) => (
                    <th
                      key={col}
                      style={{
                        textAlign: 'left',
                        padding: '10px 14px',
                        color: 'var(--color-text-tertiary)',
                        fontWeight: 600,
                        fontSize: '12px',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                        borderBottom: '1px solid var(--color-border)',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {users.map((u, idx) => (
                  <motion.tr
                    key={u.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.04 }}
                    style={{
                      borderBottom: '1px solid var(--color-border)',
                      background:
                        u.id === currentUser.id
                          ? 'var(--color-primary-subtle, rgba(99,102,241,0.04))'
                          : 'transparent',
                    }}
                  >
                    <td style={{ padding: '12px 14px' }}>
                      <div className="flex items-center gap-2">
                        <div
                          style={{
                            width: '32px',
                            height: '32px',
                            borderRadius: '50%',
                            background: 'var(--color-primary)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#fff',
                            fontSize: '13px',
                            fontWeight: 700,
                            flexShrink: 0,
                          }}
                        >
                          {u.username[0].toUpperCase()}
                        </div>
                        <div>
                          <span
                            style={{
                              fontWeight: 500,
                              color: 'var(--color-text-primary)',
                            }}
                          >
                            {u.username}
                          </span>
                          {u.id === currentUser.id && (
                            <span
                              style={{
                                marginLeft: '6px',
                                fontSize: '11px',
                                color: 'var(--color-text-tertiary)',
                              }}
                            >
                              (나)
                            </span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '12px 14px' }}>
                      <Badge variant={u.is_admin ? 'warning' : 'default'}>
                        {u.is_admin ? '관리자' : '사용자'}
                      </Badge>
                    </td>
                    <td style={{ padding: '12px 14px' }}>
                      <Badge variant={u.has_custom_key ? 'success' : 'default'}>
                        {u.has_custom_key ? '개인 키' : '서버 키'}
                      </Badge>
                    </td>
                    <td
                      style={{
                        padding: '12px 14px',
                        color: 'var(--color-text-tertiary)',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {new Date(u.created_at).toLocaleDateString()}
                    </td>
                    <td style={{ padding: '12px 14px' }}>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => setDeleteTarget(u)}
                          disabled={!canDelete(u)}
                        >
                          삭제
                        </Button>
                        {!canDelete(u) && (
                          <span
                            style={{
                              fontSize: '11px',
                              color: 'var(--color-text-tertiary)',
                            }}
                          >
                            {u.id === currentUser.id ? '본인 삭제 불가' : '마지막 관리자'}
                          </span>
                        )}
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Delete confirmation dialog */}
      <Dialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="사용자 삭제"
      >
        <div className="flex flex-col gap-5">
          <p style={{ color: 'var(--color-text-secondary)', fontSize: '15px', lineHeight: '1.5' }}>
            정말로{' '}
            <strong style={{ color: 'var(--color-text-primary)' }}>
              {deleteTarget?.username}
            </strong>
            님을 삭제하시겠습니까? 이 작업은 되돌릴 수 없으며, 해당 사용자의 모든 이미지가 삭제됩니다.
          </p>
          <div className="flex gap-3 justify-end">
            <Button variant="secondary" size="md" onClick={() => setDeleteTarget(null)}>
              취소
            </Button>
            <Button
              variant="destructive"
              size="md"
              isLoading={deleteMutation.isPending}
              onClick={() => {
                if (deleteTarget) deleteMutation.mutate(deleteTarget.id)
              }}
            >
              사용자 삭제
            </Button>
          </div>
        </div>
      </Dialog>
    </Card>
  )
}

/* ─── Add User Panel ──────────────────────────────────────────────────── */

function AddUserPanel() {
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [isAdmin, setIsAdmin] = useState(false)
  const [formError, setFormError] = useState('')

  const mutation = useMutation({
    mutationFn: () =>
      createUserApi({ username: username.trim(), password, is_admin: isAdmin }),
    onSuccess: (newUser) => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
      setUsername('')
      setPassword('')
      setIsAdmin(false)
      setFormError('')
      toast({
        title: `"${newUser.username}" 사용자가 생성되었습니다`,
        variant: 'success',
      })
    },
    onError: (err: Error) => {
      const msg = err.message ?? '사용자 생성에 실패했습니다'
      setFormError(
        msg.toLowerCase().includes('exist') || msg.toLowerCase().includes('taken')
          ? '이미 사용 중인 아이디입니다'
          : msg
      )
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setFormError('')
    if (!username.trim()) {
      setFormError('아이디를 입력해 주세요')
      return
    }
    if (password.length < 8) {
      setFormError('비밀번호는 최소 8자 이상이어야 합니다')
      return
    }
    mutation.mutate()
  }

  return (
    <Card glass>
      <form onSubmit={handleSubmit}>
        <div className="flex flex-col gap-5">
          <div>
            <h2
              style={{
                fontSize: '17px',
                fontWeight: 600,
                color: 'var(--color-text-primary)',
                marginBottom: '4px',
              }}
            >
              새 사용자 추가
            </h2>
            <p style={{ fontSize: '13px', color: 'var(--color-text-tertiary)' }}>
              새 사용자 계정을 생성하세요
            </p>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '16px',
            }}
          >
            <Input
              label="아이디"
              value={username}
              onChange={(e) => {
                setUsername(e.target.value)
                setFormError('')
              }}
              placeholder="johndoe"
              leftIcon={<span style={{ fontSize: '14px' }}>👤</span>}
            />
            <Input
              label="비밀번호"
              type="password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value)
                setFormError('')
              }}
              placeholder="최소 8자 이상"
            />
          </div>

          {/* Admin toggle */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setIsAdmin((v) => !v)}
              role="switch"
              aria-checked={isAdmin}
              style={{
                width: '44px',
                height: '24px',
                borderRadius: '12px',
                border: 'none',
                background: isAdmin ? 'var(--color-primary)' : 'var(--color-border)',
                cursor: 'pointer',
                position: 'relative',
                transition: 'background 0.2s',
                flexShrink: 0,
              }}
            >
              <span
                style={{
                  position: 'absolute',
                  top: '2px',
                  left: isAdmin ? '22px' : '2px',
                  width: '20px',
                  height: '20px',
                  borderRadius: '50%',
                  background: '#fff',
                  transition: 'left 0.2s',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                }}
              />
            </button>
            <div>
              <p
                style={{
                  fontSize: '14px',
                  fontWeight: 500,
                  color: 'var(--color-text-primary)',
                }}
              >
                관리자
              </p>
              <p style={{ fontSize: '12px', color: 'var(--color-text-tertiary)' }}>
                관리자 패널 접근 및 사용자 관리 권한을 부여합니다
              </p>
            </div>
          </div>

          {formError && (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              style={{
                padding: '10px 14px',
                borderRadius: '8px',
                background: 'var(--color-error-surface, #fee2e2)',
                border: '1px solid var(--color-error-border, #fca5a5)',
                fontSize: '13px',
                color: 'var(--color-error, #ef4444)',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <span>⚠️</span> {formError}
            </motion.div>
          )}

          <Button
            variant="primary"
            size="md"
            isLoading={mutation.isPending}
            disabled={!username.trim() || !password || mutation.isPending}
            leftIcon={<span>➕</span>}
          >
            사용자 생성
          </Button>
        </div>
      </form>
    </Card>
  )
}
