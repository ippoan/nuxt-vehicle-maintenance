/**
 * ★ TODO(#c651-2 マージ後): ts-rs 生成型へ差し替える。
 *
 * backend (rust-alc-api の `alc-maintenance` crate) は ts-rs で型を出力し、
 * `app/types/generated/` に同期する運用 (nuxt-trouble と同型)。
 * #c651-2 (alc-maintenance crate 本体) がまだマージされていないため、
 * このファイルは backend の API 契約 (issue #651 本文) を元にした手書きの
 * 型で暫定している。マージ後は:
 *
 *   1. `app/types/generated/` に生成型を配置
 *   2. このファイルの手書き型を `export * from './generated'` 相当へ差し替え
 *   3. 特に MaintenanceVehicle.car_id / cert_no / car_inspection_expiry の
 *      実際のフィールド名・null 許容が生成型と一致するか確認する
 *      (紐づけ状態の表現が backend 側で変わっている可能性がある)
 *
 * ★ 現状 (#c651-8 時点): records / categories (#654 / #656) は backend
 * マージ済みで、下記の `MaintenanceRecord*` / `MaintenanceCategory*` は
 * `crates/alc-maintenance/src/models.rs` の実物を見て手書きした型 (フィールド名・
 * 型は実物と一致させてある)。写真添付 (files, #651 の一部) がまだマージされて
 * いないため、生成型への移行はそちらのマージ後にまとめて行う。
 */

/** 車両本体 (整備記録の対象)。車検証への紐づけは任意 (carins が無いテナントでも使える設計)。 */
export interface MaintenanceVehicle {
  id: string
  tenant_id: string
  /** 登録番号 (ナンバープレート表記)。唯一必須の識別子。 */
  registration_number: string
  /** 社内車番など、テナント内での呼び名。任意。 */
  display_name: string | null
  note: string | null
  /** 紐づいている車検証の car_id。未紐づけなら null。 */
  car_id: string | null
  /** 紐づいている車検証の証明書番号。未紐づけなら null。 */
  cert_no: string | null
  /** 車検満了日 (YYYY-MM-DD)。紐づけ済みのときのみ値が入る。 */
  car_inspection_expiry: string | null
  created_at: string
  updated_at: string
}

/** 車両が車検証に紐づいているか。UI 側の判定はこれに寄せる (フラグを別途持たない)。 */
export function isVehicleLinked(vehicle: Pick<MaintenanceVehicle, 'car_id'>): boolean {
  return vehicle.car_id != null
}

export interface MaintenanceVehiclesResponse {
  items: MaintenanceVehicle[]
  total: number
  page: number
  per_page: number
}

export interface MaintenanceVehicleFilter {
  q?: string
  /** true = 紐づけ済みのみ、false = 未紐づけのみ、未指定 = 絞り込みなし。 */
  linked?: boolean
  page?: number
  per_page?: number
}

/** `car_id` は送らなくてよい (backend が採番する)。 */
export interface CreateMaintenanceVehicle {
  registration_number: string
  display_name?: string
  note?: string
}

export interface UpdateMaintenanceVehicle {
  registration_number?: string
  display_name?: string
  note?: string
}

/** 車検証候補がどう一致したか。`'none'` は「一致無し」を表し、紐づけ実行時は 400 になる。 */
export type CarInsMatchedBy = 'registration_number' | 'cert_no' | 'none'

export interface CarInsCandidate {
  car_id: string
  cert_no: string
  registration_number: string
  /** 車検満了日 (YYYY-MM-DD)。 */
  expiry_date: string | null
  matched_by: CarInsMatchedBy
}

/** どちらか一方 (または両方) を指定して紐づけを試みる。 */
export interface LinkCarIns {
  cert_no?: string
  car_id?: string
}

/**
 * 整備カテゴリ 1 行 (`maintenance_categories`)。初回アクセス時に backend が
 * テナントごとの既定 5 件 (定期点検・修理・部品交換・タイヤ交換・オイル交換) を
 * 自動で seed する — フロントで既定値を持たないこと。
 */
export interface MaintenanceCategory {
  id: string
  tenant_id: string
  name: string
  sort_order: number
  created_at: string
}

/** `POST /api/maintenance/categories` の body。同名で追加すると 409。 */
export interface CreateMaintenanceCategory {
  name: string
  sort_order?: number
}

/**
 * 整備記録 1 行 (`maintenance_records`)。`cost` は `NUMERIC(12,2)` を
 * backend が `::text` キャストして文字列で返す (`f64` に丸めない作法)。
 */
export interface MaintenanceRecord {
  id: string
  tenant_id: string
  vehicle_id: string
  category_id: string
  /** 整備実施日 (YYYY-MM-DD) */
  performed_on: string
  odometer_km: number | null
  vendor: string | null
  description: string | null
  cost: string | null
  /** 次回期限 (YYYY-MM-DD) */
  next_due_on: string | null
  created_by: string | null
  created_at: string
  updated_at: string
  deleted_at: string | null
}

/**
 * `POST /api/maintenance/records` の body。`vehicle_id` / `category_id` は
 * 他テナントのものを指定すると 400。
 */
export interface CreateMaintenanceRecord {
  vehicle_id: string
  category_id: string
  performed_on: string
  odometer_km?: number
  vendor?: string
  description?: string
  cost?: number
  next_due_on?: string
}

/** `PUT /api/maintenance/records/{id}` の body。`undefined` のフィールドは変更しない (COALESCE 意味論)。 */
export interface UpdateMaintenanceRecord {
  vehicle_id?: string
  category_id?: string
  performed_on?: string
  odometer_km?: number
  vendor?: string
  description?: string
  cost?: number
  next_due_on?: string
}

/** `GET /api/maintenance/records` のクエリパラメータ。 */
export interface MaintenanceRecordListFilter {
  vehicle_id?: string
  category_id?: string
  /** `performed_on` に対する範囲検索 (以上、YYYY-MM-DD) */
  date_from?: string
  /** `performed_on` に対する範囲検索 (以下、YYYY-MM-DD) */
  date_to?: string
  /** `description` / `vendor` の部分一致 */
  q?: string
  page?: number
  per_page?: number
}

export interface MaintenanceRecordsResponse {
  records: MaintenanceRecord[]
  total: number
  page: number
  per_page: number
}

/**
 * 整備記録に添付されたファイル (`crates/alc-maintenance/src/models.rs:197-209`)。
 * 一覧・download は backend 側で `deleted_at IS NULL` により削除済みを除外済み。
 */
export interface MaintenanceFile {
  id: string
  tenant_id: string
  record_id: string
  filename: string
  content_type: string
  storage_key: string
  size_bytes: number
  created_at: string
  deleted_at: string | null
}
