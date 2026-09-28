import type { DashboardData } from './data'

const KEY_STORAGE = 'shopify-profit-key'

export type LoadResult =
  | { status: 'live'; data: DashboardData }
  | { status: 'demo' }
  | { status: 'locked'; wrongPassword: boolean }
  | { status: 'error'; message: string }

export function getSavedKey(): string {
  try {
    return localStorage.getItem(KEY_STORAGE) ?? ''
  } catch {
    return ''
  }
}

export function saveKey(key: string) {
  try {
    if (key) localStorage.setItem(KEY_STORAGE, key)
    else localStorage.removeItem(KEY_STORAGE)
  } catch {
    // storage unavailable (private mode) — the key just won't be remembered
  }
}

export async function loadDashboard(key: string): Promise<LoadResult> {
  let res: Response
  try {
    res = await fetch('/api/dashboard', { headers: { 'x-dashboard-key': key } })
  } catch {
    return { status: 'demo' }
  }

  // Local `vite dev` has no /api and serves index.html instead of JSON.
  if (!res.headers.get('content-type')?.includes('application/json')) return { status: 'demo' }

  const body = await res.json()
  if (res.status === 503) return { status: 'demo' }
  if (res.status === 401) return { status: 'locked', wrongPassword: key !== '' }
  if (!res.ok) return { status: 'error', message: body.message ?? body.error ?? `HTTP ${res.status}` }
  return { status: 'live', data: body as DashboardData }
}
