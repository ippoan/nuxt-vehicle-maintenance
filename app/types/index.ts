/**
 * backend (rust-alc-api の `alc-maintenance` crate) の ts-rs 生成型が正本。
 * 生成物は `app/types/generated/` に commit してある — 取得は
 * `./scripts/sync-ts-bindings.sh <SHA>`。
 *
 * ★ 渡す SHA に罠がある。artifact 名は `ts-bindings-<SHA>` だが、この <SHA> は
 * **PR の head SHA ではない** — pull_request イベントの `GITHUB_SHA`、つまり
 * **merge commit の SHA** が使われる。PR の head SHA を渡すと
 * `Artifact 'ts-bindings-<sha>' not found` で落ちる。確実なのは
 * `gh api "repos/ippoan/rust-alc-api/actions/artifacts?per_page=100"` で
 * `ts-bindings-` から始まる artifact を実際に一覧し、その名前を渡すこと。
 *
 * ★ `main` への push では artifact が出ない: ts-rs の `export_bindings_*` を
 * 走らせる `test-lib` job が main push では動かないため (ci.yml:88)。
 * pull_request の run か、タグ (`v*`) への push の run を使う。
 *
 * ★ CI で毎回生成する方式は採らない。backend の artifact 取得が CI 経路に増え、
 * backend の CI 失敗がこちらの CI を巻き込むため。
 *
 * このファイルには次の 2 種類だけを置く:
 *
 *   1. そのまま使える生成型の re-export
 *   2. 生成型をそのまま使えないときの override (理由をコメントで明記する)
 *      — ts-rs には 2 つの既知のズレがあり、nuxt-trouble も同じ形で潰している:
 *        (a) `Option<T>` が `T | null` の**必須キー**になる。リクエスト body は
 *            キーごと省略できるのが実際の契約なので `?:` へ緩める
 *        (b) `i64` が `bigint` になる。JSON を `res.json()` したものは実際には
 *            JS の `number` なので、`bigint` の方が実物と食い違う
 */

// --- そのまま使える生成型 ---
export type {
  MaintenanceVehicle,
  CarinsCandidate,
  MaintenanceCategory,
  MaintenanceRecord,
} from './generated'

import type {
  MaintenanceVehicle,
  MaintenanceFile as GeneratedMaintenanceFile,
  VehicleListResponse as GeneratedVehicleListResponse,
  MaintenanceRecordsResponse as GeneratedMaintenanceRecordsResponse,
} from './generated'

/**
 * 車両が車検証に紐づいているか。UI 側の判定はこれに寄せる (フラグを別途持たない)。
 *
 * ★ `MaintenanceVehicle` は車検証番号 (`cert_no`) も車検満了日も保持していない。
 * 紐づけ済みの車両について表示できるのは `car_id` と `carins_linked_at` だけ
 * (車検満了日を出すには backend 側の API 追加が要る — 別 issue)。
 */
export function isVehicleLinked(vehicle: Pick<MaintenanceVehicle, 'car_id'>): boolean {
  return vehicle.car_id != null
}

// --- 車両: リクエスト body / クエリ / レスポンス ---

/**
 * override (a): `POST /api/maintenance/vehicles` の body。
 *
 * ★ `car_id` は backend の `CreateMaintenanceVehicle` には在るが、ここでは
 * 意図的に持たせていない。登録番号だけで車両登録が完結することが設計要件で
 * (車検証が無いテナント / 後から紐づけたいケース、CLAUDE.md 参照)、carins を
 * 新規登録フローに混ぜないため。紐づけは `PUT .../carins` 側の仕事。
 */
export interface CreateMaintenanceVehicle {
  registration_number: string
  display_name?: string | null
  note?: string | null
}

/** override (a): `PUT /api/maintenance/vehicles/{id}` の body (COALESCE 意味論)。 */
export interface UpdateMaintenanceVehicle {
  registration_number?: string | null
  display_name?: string | null
  note?: string | null
}

/** override (a)(b): `GET /api/maintenance/vehicles` のクエリパラメータ。 */
export interface VehicleListFilter {
  q?: string | null
  /** true = 紐づけ済みのみ、false = 未紐づけのみ、未指定 = 絞り込みなし。 */
  linked?: boolean | null
  page?: number | null
  per_page?: number | null
}

/** override (b): `GET /api/maintenance/vehicles` のレスポンス。 */
export type VehicleListResponse =
  Omit<GeneratedVehicleListResponse, 'total' | 'page' | 'per_page'>
  & { total: number, page: number, per_page: number }

/**
 * override (a): `PUT /api/maintenance/vehicles/{id}/carins` の body。
 * どちらか一方 (または両方) を指定して紐づけを試みる。
 *
 * backend は `cert_no` / `car_id` の OR で車検証を引き、一致した方を
 * `matched_by` (`'cert_no'` | `'car_id'` | `'none'`) として扱う。`'none'` は
 * 400 になる — 値そのものはレスポンスに載らないので、フロントは
 * `ApiError.status` の 400 / 409 で文言を出し分ける (useVehicleDetail.link)。
 */
export interface LinkCarinsRequest {
  cert_no?: string | null
  car_id?: string | null
}

// --- 整備カテゴリ ---

/** override (a): `POST /api/maintenance/categories` の body。同名で追加すると 409。 */
export interface CreateMaintenanceCategory {
  name: string
  sort_order?: number | null
}

// --- 整備記録 ---

/** override (a): `POST /api/maintenance/records` の body。 */
export interface CreateMaintenanceRecord {
  vehicle_id: string
  category_id: string
  performed_on: string
  odometer_km?: number | null
  vendor?: string | null
  description?: string | null
  cost?: number | null
  next_due_on?: string | null
}

/** override (a): `PUT /api/maintenance/records/{id}` の body (COALESCE 意味論)。 */
export interface UpdateMaintenanceRecord {
  vehicle_id?: string | null
  category_id?: string | null
  performed_on?: string | null
  odometer_km?: number | null
  vendor?: string | null
  description?: string | null
  cost?: number | null
  next_due_on?: string | null
}

/** override (a)(b): `GET /api/maintenance/records` のクエリパラメータ。 */
export interface MaintenanceRecordListFilter {
  vehicle_id?: string | null
  category_id?: string | null
  /** `performed_on` に対する範囲検索 (以上、YYYY-MM-DD) */
  date_from?: string | null
  /** `performed_on` に対する範囲検索 (以下、YYYY-MM-DD) */
  date_to?: string | null
  /** `description` / `vendor` の部分一致 */
  q?: string | null
  page?: number | null
  per_page?: number | null
}

/** override (b): `GET /api/maintenance/records` のレスポンス。 */
export type MaintenanceRecordsResponse =
  Omit<GeneratedMaintenanceRecordsResponse, 'total' | 'page' | 'per_page'>
  & { total: number, page: number, per_page: number }

/**
 * override (b): 整備記録の添付ファイル。`size_bytes` だけが `i64` → `bigint` で
 * 実物と食い違うので、そこだけ差し替えて他は生成型から引く
 * (backend が列を足したら自動で追随する)。一覧・download は backend 側で
 * `deleted_at IS NULL` により削除済みを除外済み。
 */
export type MaintenanceFile =
  Omit<GeneratedMaintenanceFile, 'size_bytes'> & { size_bytes: number }
