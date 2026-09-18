import type {
  MaintenanceVehicle,
  MaintenanceVehiclesResponse,
  MaintenanceVehicleFilter,
  CreateMaintenanceVehicle,
  UpdateMaintenanceVehicle,
  CarInsCandidate,
  LinkCarIns,
} from '~/types'

let apiBase = ''
let getAccessToken: (() => string | null) | null = null
let onUnauthorized: (() => void) | null = null

/**
 * base は '/api/proxy' (同一 Worker の server route。auth-worker が
 * introspect 検証後にテナント識別ヘッダー / ユーザー識別ヘッダーを注入する)。
 *
 * ★ マルチテナント: tenant の指定はここでは一切行わない。tenant は
 * auth-worker が browser JWT から解決して注入するものであり、client から
 * 渡せてしまうと tenant 詐称の穴になる。よって tenantIdGetter に相当する
 * 引数は存在しない (nuxt-trouble の initApi と違う点)。
 */
export function initApi(
  baseUrl: string,
  tokenGetter?: () => string | null,
  _refresher?: () => Promise<void>,
  unauthorizedHandler?: () => void,
) {
  apiBase = baseUrl.replace(/\/$/, '')
  getAccessToken = tokenGetter || null
  onUnauthorized = unauthorizedHandler || null
}

function buildAuthHeaders(): Record<string, string> {
  const headers: Record<string, string> = {}
  const token = getAccessToken?.()
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }
  return headers
}

function toParams(filter: object): string {
  const params = new URLSearchParams()
  for (const [k, v] of Object.entries(filter)) {
    if (v != null && v !== '') params.set(k, String(v))
  }
  const qs = params.toString()
  return qs ? `?${qs}` : ''
}

/** API エラー。`status` を持つので呼び出し側が 400/409 等で文言を出し分けられる。 */
export class ApiError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

/** @internal テスト用にも export */
export async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  if (!apiBase) throw new Error('API 未初期化: initApi() を呼んでください')

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...buildAuthHeaders(),
    ...(options.headers as Record<string, string> || {}),
  }

  const res = await fetch(`${apiBase}${path}`, { ...options, headers })

  if (res.status === 401) {
    onUnauthorized?.()
    throw new ApiError(401, 'Unauthorized')
  }
  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new ApiError(res.status, body || res.statusText)
  }
  if (res.status === 204) return undefined as T
  return res.json()
}

// --- Vehicles ---

export async function getVehicles(filter: MaintenanceVehicleFilter = {}): Promise<MaintenanceVehiclesResponse> {
  return request<MaintenanceVehiclesResponse>(`/api/maintenance/vehicles${toParams(filter)}`)
}

export async function getVehicle(id: string): Promise<MaintenanceVehicle> {
  return request<MaintenanceVehicle>(`/api/maintenance/vehicles/${encodeURIComponent(id)}`)
}

export async function createVehicle(data: CreateMaintenanceVehicle): Promise<MaintenanceVehicle> {
  return request<MaintenanceVehicle>('/api/maintenance/vehicles', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export async function updateVehicle(id: string, data: UpdateMaintenanceVehicle): Promise<MaintenanceVehicle> {
  return request<MaintenanceVehicle>(`/api/maintenance/vehicles/${encodeURIComponent(id)}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  })
}

export async function deleteVehicle(id: string): Promise<void> {
  await request<void>(`/api/maintenance/vehicles/${encodeURIComponent(id)}`, { method: 'DELETE' })
}

// --- 車検証の紐づけ ---

export async function getCarInsCandidates(vehicleId: string): Promise<CarInsCandidate[]> {
  return request<CarInsCandidate[]>(`/api/maintenance/vehicles/${encodeURIComponent(vehicleId)}/carins-candidates`)
}

export async function linkCarIns(vehicleId: string, data: LinkCarIns): Promise<MaintenanceVehicle> {
  return request<MaintenanceVehicle>(`/api/maintenance/vehicles/${encodeURIComponent(vehicleId)}/carins`, {
    method: 'PUT',
    body: JSON.stringify(data),
  })
}

export async function unlinkCarIns(vehicleId: string): Promise<void> {
  await request<void>(`/api/maintenance/vehicles/${encodeURIComponent(vehicleId)}/carins`, {
    method: 'DELETE',
  })
}
