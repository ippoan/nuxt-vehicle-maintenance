import type {
  MaintenanceVehicle,
  MaintenanceVehiclesResponse,
  MaintenanceVehicleFilter,
  CreateMaintenanceVehicle,
  UpdateMaintenanceVehicle,
  CarInsCandidate,
  LinkCarIns,
  MaintenanceCategory,
  CreateMaintenanceCategory,
  MaintenanceRecord,
  CreateMaintenanceRecord,
  UpdateMaintenanceRecord,
  MaintenanceRecordListFilter,
  MaintenanceRecordsResponse,
  MaintenanceFile,
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

  // FormData のときは Content-Type を付けない — 付けると boundary が潰れ、
  // backend の multipart.next_field() が失敗する。fetch がブラウザ側で
  // boundary 付きの multipart/form-data を自動生成する。
  const isFormData = options.body instanceof FormData

  const headers: Record<string, string> = {
    ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
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

// --- 整備カテゴリ ---

export async function getMaintenanceCategories(): Promise<MaintenanceCategory[]> {
  return request<MaintenanceCategory[]>('/api/maintenance/categories')
}

/** 同名で追加すると 409 (呼び出し側で ApiError.status === 409 を見て出し分ける)。 */
export async function createMaintenanceCategory(data: CreateMaintenanceCategory): Promise<MaintenanceCategory> {
  return request<MaintenanceCategory>('/api/maintenance/categories', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export async function updateMaintenanceCategorySortOrder(id: string, sortOrder: number): Promise<MaintenanceCategory> {
  return request<MaintenanceCategory>(`/api/maintenance/categories/${encodeURIComponent(id)}`, {
    method: 'PUT',
    body: JSON.stringify({ sort_order: sortOrder }),
  })
}

export async function deleteMaintenanceCategory(id: string): Promise<void> {
  await request<void>(`/api/maintenance/categories/${encodeURIComponent(id)}`, { method: 'DELETE' })
}

// --- 整備記録 ---

export async function getMaintenanceRecords(filter: MaintenanceRecordListFilter = {}): Promise<MaintenanceRecordsResponse> {
  return request<MaintenanceRecordsResponse>(`/api/maintenance/records${toParams(filter)}`)
}

/** `vehicle_id` / `category_id` が他テナントのものだと 400。 */
export async function createMaintenanceRecord(data: CreateMaintenanceRecord): Promise<MaintenanceRecord> {
  return request<MaintenanceRecord>('/api/maintenance/records', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export async function getMaintenanceRecord(id: string): Promise<MaintenanceRecord> {
  return request<MaintenanceRecord>(`/api/maintenance/records/${encodeURIComponent(id)}`)
}

/** `vehicle_id` / `category_id` を変更する場合も他テナントのものだと 400。存在しない id は 404。 */
export async function updateMaintenanceRecord(id: string, data: UpdateMaintenanceRecord): Promise<MaintenanceRecord> {
  return request<MaintenanceRecord>(`/api/maintenance/records/${encodeURIComponent(id)}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  })
}

/** ソフト削除。存在しない (または既に削除済みの) id は 404。 */
export async function deleteMaintenanceRecord(id: string): Promise<void> {
  await request<void>(`/api/maintenance/records/${encodeURIComponent(id)}`, { method: 'DELETE' })
}

// --- 整備記録の写真添付 ---

/** 一覧は backend 側で deleted_at IS NULL により削除済みを除外済み。フロントで再度フィルタしないこと。 */
export async function getRecordFiles(recordId: string): Promise<MaintenanceFile[]> {
  return request<MaintenanceFile[]>(`/api/maintenance/records/${encodeURIComponent(recordId)}/files`)
}

/** 1 回のアップロードは 1 ファイル (backend の upload_file が multipart field を 1 回しか読まないため)。 */
export async function uploadRecordFile(recordId: string, file: File): Promise<MaintenanceFile> {
  const fd = new FormData()
  fd.append('file', file)
  return request<MaintenanceFile>(`/api/maintenance/records/${encodeURIComponent(recordId)}/files`, {
    method: 'POST',
    body: fd,
  })
}

/** 204 (body 無し)。 */
export async function deleteFile(fileId: string): Promise<void> {
  await request<void>(`/api/maintenance/files/${encodeURIComponent(fileId)}`, { method: 'DELETE' })
}

/**
 * bytes をそのまま返す download エンドポイント (署名 URL ではない)。blob を
 * `<a>` 要素経由でダウンロードさせる。`request()` は json() 固定なので
 * ここだけ fetch を直接使う。
 */
export async function downloadFile(fileId: string, filename: string): Promise<void> {
  const headers = buildAuthHeaders()
  const res = await fetch(`${apiBase}/api/maintenance/files/${encodeURIComponent(fileId)}/download`, { headers })
  if (!res.ok) throw new ApiError(res.status, res.statusText)
  const blob = await res.blob()
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

/** サムネイル表示用に download エンドポイントを取得して objectURL 化する。呼び出し側が revokeObjectURL する責務を持つ。 */
export async function getFileBlobUrl(fileId: string): Promise<string> {
  const headers = buildAuthHeaders()
  const res = await fetch(`${apiBase}/api/maintenance/files/${encodeURIComponent(fileId)}/download`, { headers })
  if (!res.ok) throw new ApiError(res.status, res.statusText)
  const blob = await res.blob()
  return URL.createObjectURL(blob)
}
