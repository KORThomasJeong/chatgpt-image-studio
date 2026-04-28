// ─── Types ────────────────────────────────────────────────────────────────────

export interface ImageRecord {
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

export interface UserRecord {
  id: number
  username: string
  is_admin: boolean
  has_custom_key: boolean
  created_at: string
}

// ─── Token Management ─────────────────────────────────────────────────────────

function getToken(): string | null {
  return localStorage.getItem('access_token')
}

function setToken(token: string): void {
  localStorage.setItem('access_token', token)
}

function clearToken(): void {
  localStorage.removeItem('access_token')
}

// ─── Refresh Logic ────────────────────────────────────────────────────────────

let isRefreshing = false
let refreshPromise: Promise<string | null> | null = null

async function attemptRefresh(): Promise<string | null> {
  if (isRefreshing && refreshPromise) return refreshPromise

  isRefreshing = true
  refreshPromise = (async () => {
    try {
      const res = await fetch('/api/auth/refresh', {
        method: 'POST',
        credentials: 'include',
      })
      if (!res.ok) {
        clearToken()
        return null
      }
      const data = (await res.json()) as { access_token: string }
      setToken(data.access_token)
      return data.access_token
    } catch {
      clearToken()
      return null
    } finally {
      isRefreshing = false
      refreshPromise = null
    }
  })()

  return refreshPromise
}

// ─── Base Fetch ───────────────────────────────────────────────────────────────

export async function apiFetch(
  path: string,
  options: RequestInit = {},
): Promise<Response> {
  const token = getToken()
  const headers = new Headers(options.headers as HeadersInit | undefined)

  if (token) {
    headers.set('Authorization', `Bearer ${token}`)
  }

  const res = await fetch(path, { ...options, headers })

  if (res.status === 401) {
    // Attempt token refresh, then retry once
    const newToken = await attemptRefresh()
    if (!newToken) {
      return res
    }
    headers.set('Authorization', `Bearer ${newToken}`)
    return fetch(path, { ...options, headers })
  }

  return res
}

async function apiJson<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await apiFetch(path, options)
  if (!res.ok) {
    let message = `HTTP ${res.status}`
    try {
      const body = (await res.json()) as { detail?: string; message?: string }
      message = body.detail ?? body.message ?? message
    } catch {
      // ignore parse errors
    }
    throw new Error(message)
  }
  return res.json() as Promise<T>
}

// ─── Auth ─────────────────────────────────────────────────────────────────────

export async function loginApi(
  username: string,
  password: string,
): Promise<{
  access_token: string
  token_type: string
  user_id: number
  username: string
  is_admin: boolean
  has_custom_key: boolean
}> {
  const res = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  })
  if (!res.ok) {
    let message = `HTTP ${res.status}`
    try {
      const b = (await res.json()) as { detail?: string }
      message = b.detail ?? message
    } catch {
      // ignore
    }
    throw new Error(message)
  }
  const data = (await res.json()) as {
    access_token: string
    token_type: string
    user_id: number
    username: string
    is_admin: boolean
    has_custom_key: boolean
  }
  setToken(data.access_token)
  return data
}

export async function logoutApi(): Promise<void> {
  try {
    await apiFetch('/api/auth/logout', { method: 'POST' })
  } finally {
    clearToken()
  }
}

export async function getMeApi(): Promise<{
  id: number
  username: string
  is_admin: boolean
  has_custom_key: boolean
  created_at: string
}> {
  return apiJson('/api/auth/me')
}

// ─── Images ───────────────────────────────────────────────────────────────────

export async function generateImageApi(params: {
  prompt: string
  model: string
  size: string
  quality: string
  n: number
}): Promise<ImageRecord[]> {
  return apiJson('/api/images/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  })
}

export async function editImageApi(formData: FormData): Promise<ImageRecord> {
  return apiJson('/api/images/edit', {
    method: 'POST',
    body: formData,
  })
}

export async function listImagesApi(params?: {
  limit?: number
  cursor?: string
}): Promise<{ items: ImageRecord[]; next_cursor: string | null }> {
  const query = new URLSearchParams()
  if (params?.limit != null) query.set('limit', String(params.limit))
  if (params?.cursor) query.set('cursor', params.cursor)
  const qs = query.toString()
  return apiJson(`/api/images${qs ? `?${qs}` : ''}`)
}

export function getImageFileUrl(imageId: string): string {
  return `/api/images/${imageId}/file`
}

export async function fetchImageBlob(imageId: string): Promise<string> {
  const res = await apiFetch(getImageFileUrl(imageId))
  if (!res.ok) throw new Error(`Failed to load image: HTTP ${res.status}`)
  const blob = await res.blob()
  return URL.createObjectURL(blob)
}

export async function deleteImageApi(imageId: string): Promise<void> {
  await apiJson(`/api/images/${imageId}`, { method: 'DELETE' })
}

// ─── Settings ─────────────────────────────────────────────────────────────────

export async function getOpenAIKeyStatusApi(): Promise<{
  has_key: boolean
  key_preview: string | null
}> {
  return apiJson('/api/settings/openai-key')
}

export async function setOpenAIKeyApi(apiKey: string): Promise<void> {
  await apiJson('/api/settings/openai-key', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ api_key: apiKey }),
  })
}

export async function deleteOpenAIKeyApi(): Promise<void> {
  await apiJson('/api/settings/openai-key', { method: 'DELETE' })
}

export async function changePasswordApi(
  currentPassword: string,
  newPassword: string,
): Promise<void> {
  await apiJson('/api/settings/password', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      current_password: currentPassword,
      new_password: newPassword,
    }),
  })
}

// ─── Users (admin) ────────────────────────────────────────────────────────────

export async function listUsersApi(): Promise<UserRecord[]> {
  return apiJson('/api/admin/users')
}

export async function createUserApi(data: {
  username: string
  password: string
  is_admin: boolean
}): Promise<UserRecord> {
  return apiJson('/api/admin/users', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
}

export async function deleteUserApi(userId: number): Promise<void> {
  await apiJson(`/api/admin/users/${userId}`, { method: 'DELETE' })
}

export async function getServerConfigApi(): Promise<{ default_model: string }> {
  return apiJson<{ default_model: string }>('/api/config')
}
