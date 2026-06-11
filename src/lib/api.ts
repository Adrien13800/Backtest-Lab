export type ApiStatus = 'checking' | 'online' | 'offline'

export interface ApiHealth {
  status: string
  service: string
  environment: string
}

export interface AuthUser {
  id: string
  email: string
  display_name: string
  created_at: string
}

export interface AuthResponse {
  token: string
  user: AuthUser
}

export interface ServerSessionSnapshotPayload {
  name: string
  data_label: string
  initial_balance: number
  current_balance: number
  cursor: number
  total_trades: number
  snapshot: Record<string, unknown>
  metrics_json: Record<string, unknown>
}

export interface ServerSessionSummary {
  id: string
  name: string
  data_label: string
  current_balance: string | number
  total_trades: number
  updated_at: string
  created_at: string
}

export interface ServerSessionSnapshot extends ServerSessionSummary {
  snapshot: Record<string, unknown>
  metrics_json: Record<string, unknown>
}

export interface ServerDatasetSummary {
  id: string
  name: string
  symbol: string
  asset_class: string
  exchange: string
  timeframe: string
  source: string
  created_at: string
  updated_at: string
  candle_count: number
  start_time: string | null
  end_time: string | null
}

export interface ServerCandle {
  time: number
  open: number
  high: number
  low: number
  close: number
  volume: number
}

export interface ServerDatasetWithCandles {
  dataset: ServerDatasetSummary
  candles: ServerCandle[]
}

export const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? 'http://127.0.0.1:8000/v1'
const authTokenKey = 'backtest-lab-auth-token'

export function getAuthToken() {
  return localStorage.getItem(authTokenKey)
}

export function setAuthToken(token: string) {
  localStorage.setItem(authTokenKey, token)
}

export function clearAuthToken() {
  localStorage.removeItem(authTokenKey)
}

export async function getApiHealth(signal?: AbortSignal): Promise<ApiHealth> {
  const response = await fetch(`${apiBaseUrl}/health`, { signal })

  if (!response.ok) {
    throw new Error(`API health failed: ${response.status}`)
  }

  return response.json() as Promise<ApiHealth>
}

export async function registerUser(payload: {
  email: string
  password: string
  display_name: string
}): Promise<AuthResponse> {
  return apiFetch<AuthResponse>('/auth/register', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export async function loginUser(payload: { email: string; password: string }): Promise<AuthResponse> {
  return apiFetch<AuthResponse>('/auth/login', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export async function getCurrentUser(): Promise<AuthUser> {
  return apiFetch<AuthUser>('/auth/me')
}

export async function logoutUser(): Promise<void> {
  await apiFetch<void>('/auth/logout', { method: 'POST' })
  clearAuthToken()
}

export async function listServerSessionSnapshots(): Promise<ServerSessionSummary[]> {
  return apiFetch<ServerSessionSummary[]>('/sessions/snapshots')
}

export async function createServerSessionSnapshot(
  payload: ServerSessionSnapshotPayload,
): Promise<ServerSessionSnapshot> {
  return apiFetch<ServerSessionSnapshot>('/sessions/snapshots', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export async function updateServerSessionSnapshot(
  sessionId: string,
  payload: ServerSessionSnapshotPayload,
): Promise<ServerSessionSnapshot> {
  return apiFetch<ServerSessionSnapshot>(`/sessions/${sessionId}/snapshot`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  })
}

export async function getServerSessionSnapshot(sessionId: string): Promise<ServerSessionSnapshot> {
  return apiFetch<ServerSessionSnapshot>(`/sessions/${sessionId}/snapshot`)
}

export async function deleteServerSessionSnapshot(sessionId: string): Promise<void> {
  await apiFetch<void>(`/sessions/${sessionId}`, { method: 'DELETE' })
}

export async function listServerDatasets(): Promise<ServerDatasetSummary[]> {
  return apiFetch<ServerDatasetSummary[]>('/datasets')
}

export async function getServerDatasetCandles(
  datasetId: string,
  limit = 50_000,
): Promise<ServerDatasetWithCandles> {
  return apiFetch<ServerDatasetWithCandles>(`/datasets/${datasetId}/candles?limit=${limit}`)
}

export async function uploadServerDataset({
  file,
  name,
  symbol,
  timeframe,
  assetClass,
  exchange,
}: {
  file: File
  name: string
  symbol: string
  timeframe: string
  assetClass: string
  exchange: string
}): Promise<ServerDatasetSummary> {
  const formData = new FormData()
  formData.append('file', file)
  formData.append('name', name)
  formData.append('symbol', symbol)
  formData.append('timeframe', timeframe)
  formData.append('asset_class', assetClass)
  formData.append('exchange', exchange)

  return apiFetch<ServerDatasetSummary>('/datasets/upload', {
    method: 'POST',
    body: formData,
  })
}

export async function deleteServerDataset(datasetId: string): Promise<void> {
  await apiFetch<void>(`/datasets/${datasetId}`, { method: 'DELETE' })
}

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const isFormData = init?.body instanceof FormData
  const token = getAuthToken()
  const response = await fetch(`${apiBaseUrl}${path}`, {
    ...init,
    headers: isFormData
      ? {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          ...init?.headers,
        }
      : {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          ...init?.headers,
        },
  })

  if (!response.ok) {
    throw new Error(`API request failed: ${response.status}`)
  }

  if (response.status === 204) {
    return undefined as T
  }

  return response.json() as Promise<T>
}
