import { motion } from 'framer-motion'
import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ThemeToggle } from '../components/ThemeToggle'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { useAuth } from '../lib/auth'

const UserIcon = () => (
  <svg
    className="w-4 h-4"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={2}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
    />
  </svg>
)

const LockIcon = () => (
  <svg
    className="w-4 h-4"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={2}
  >
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M7 11V7a5 5 0 0110 0v4" />
  </svg>
)

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      when: 'beforeChildren',
      staggerChildren: 0.08,
    },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease: 'easeOut' } },
}

const LoginPage: React.FC = () => {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!username.trim() || !password) return

    setError(null)
    setIsLoading(true)
    try {
      await login(username.trim(), password)
      navigate('/generate', { replace: true })
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : 'Invalid username or password'
      setError(msg)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden bg-[var(--bg-primary)]">
      {/* Animated gradient background */}
      <div
        className="absolute inset-0 opacity-30 dark:opacity-20"
        style={{
          background:
            'radial-gradient(ellipse 80% 60% at 50% 0%, #9333ea 0%, transparent 70%)',
          animation: 'pulse 8s ease-in-out infinite',
        }}
      />
      <div
        className="absolute inset-0 opacity-20 dark:opacity-15"
        style={{
          background:
            'radial-gradient(ellipse 60% 50% at 80% 80%, #14b8a6 0%, transparent 70%)',
          animation: 'pulse 10s ease-in-out infinite reverse',
        }}
      />
      <div
        className="absolute inset-0 opacity-15 dark:opacity-10"
        style={{
          background:
            'radial-gradient(ellipse 50% 40% at 20% 60%, #a855f7 0%, transparent 70%)',
          animation: 'pulse 12s ease-in-out infinite 2s',
        }}
      />

      {/* Theme toggle */}
      <div className="absolute top-4 right-4 z-10">
        <ThemeToggle />
      </div>

      {/* Login card */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="relative z-10 w-full max-w-sm mx-4"
      >
        {/* Glass card */}
        <div
          className="rounded-2xl border p-8 shadow-2xl"
          style={{
            background: 'var(--bg-card)',
            borderColor: 'var(--border)',
            backdropFilter: 'blur(20px)',
          }}
        >
          {/* Logo / Title */}
          <motion.div
            variants={itemVariants}
            className="text-center mb-8"
          >
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-primary-500 to-accent-500 shadow-lg mb-4">
              <svg
                className="w-7 h-7 text-white"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.8}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
            </div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-primary-600 to-accent-500 bg-clip-text text-transparent">
              Image Studio
            </h1>
            <p className="text-sm text-[var(--text-muted)] mt-1">
              Sign in to your account
            </p>
          </motion.div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <motion.div variants={itemVariants}>
              <Input
                label="Username"
                type="text"
                placeholder="Enter your username"
                value={username}
                onChange={(e) => {
                  setUsername(e.target.value)
                  if (error) setError(null)
                }}
                leftIcon={<UserIcon />}
                autoComplete="username"
                autoFocus
                required
              />
            </motion.div>

            <motion.div variants={itemVariants}>
              <Input
                label="Password"
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value)
                  if (error) setError(null)
                }}
                leftIcon={<LockIcon />}
                autoComplete="current-password"
                required
              />
            </motion.div>

            {/* Error message */}
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800"
              >
                <svg
                  className="w-4 h-4 text-red-500 shrink-0"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <circle cx="12" cy="12" r="10" />
                  <path
                    strokeLinecap="round"
                    d="M12 8v4m0 4h.01"
                  />
                </svg>
                <p className="text-sm text-red-600 dark:text-red-400">
                  {error}
                </p>
              </motion.div>
            )}

            <motion.div variants={itemVariants} className="pt-1">
              <Button
                type="submit"
                variant="primary"
                size="lg"
                isLoading={isLoading}
                className="w-full"
              >
                {isLoading ? 'Signing in…' : 'Sign in'}
              </Button>
            </motion.div>
          </form>
        </div>

        {/* Subtle footer */}
        <motion.p
          variants={itemVariants}
          className="text-center text-xs text-[var(--text-muted)] mt-6"
        >
          ChatGPT Image Studio &copy; {new Date().getFullYear()}
        </motion.p>
      </motion.div>
    </div>
  )
}

export default LoginPage
