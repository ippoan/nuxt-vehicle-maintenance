/**
 * integration test — docker-compose.test.yml で立てた実 API (rust-alc-api の
 * alc-maintenance crate) を相手に、app/utils/api.ts をそのまま叩く。
 *
 * ★ この層の役目は「app/types の形が backend の実物と合っているか」を実データで
 *   確かめること。unit テスト (tests/utils/api.test.ts) は tests/helpers/test-data.ts
 *   の手書きレスポンスを使うので、型が backend とズレていても緑のまま通る
 *   (カバレッジ 100% でも捕まらない)。だから下の shape テストは
 *   Object.keys() を実レスポンスに対して見る形で書いてある。
 *
 * ★ 「env が無いので丸ごと skip、緑のまま検証ゼロ」を防ぐため、TEST_LIVE=1 が
 *   立っているのに API_BASE_URL が無い場合は読み込み時点で落とす。
 *   CI は .github/workflows/test.yml の integration_env で両方渡す。
 */
import { describe, it, expect, beforeAll } from 'vitest'
import {
  setupApi, restoreNativeApis, isLive,
  TEST_VEHICLE_UNLINKED_ID, TEST_VEHICLE_LINKED_ID,
  TEST_CATEGORY_ID, TEST_RECORD_ID,
  TEST_CERT_NO, TEST_CAR_ID, TEST_LINKED_CAR_ID, TEST_ABSENT_CERT_NO,
} from '../helpers/api-test-env'
import {
  getVehicles, getVehicle, createVehicle, updateVehicle, deleteVehicle,
  getCarInsCandidates, linkCarIns, unlinkCarIns,
  getMaintenanceCategories, createMaintenanceCategory,
  updateMaintenanceCategorySortOrder, deleteMaintenanceCategory,
  getMaintenanceRecords, createMaintenanceRecord, getMaintenanceRecord,
  updateMaintenanceRecord, deleteMaintenanceRecord,
} from '~/utils/api'

if (process.env.TEST_LIVE === '1' && !isLive) {
  throw new Error(
    'TEST_LIVE=1 ですが API_BASE_URL が未設定です。integration test が mock のまま '
    + '緑になるのを防ぐため落としています (.github/workflows/test.yml の integration_env を確認)',
  )
}

/** 同一テナントに存在しない id (400 / 404 の確認用)。 */
const ABSENT_ID = '00000000-0000-0000-0000-0000000000ff'

describe.skipIf(!isLive)('maintenance API (live)', () => {
  beforeAll(async () => {
    restoreNativeApis()
    await setupApi()
  })

  describe('vehicles', () => {
    it('seed の車両が一覧に出る', async () => {
      const res = await getVehicles({ per_page: 100 })
      const ids = res.items.map(v => v.id)
      expect(ids).toContain(TEST_VEHICLE_UNLINKED_ID)
      expect(ids).toContain(TEST_VEHICLE_LINKED_ID)
      expect(res.total).toBeGreaterThanOrEqual(2)
      expect(res.page).toBe(1)
    })

    it('MaintenanceVehicle の形が backend の実物と一致する', async () => {
      const vehicle = await getVehicle(TEST_VEHICLE_UNLINKED_ID)
      const keys = Object.keys(vehicle)
      expect(keys).toEqual(expect.arrayContaining([
        'id', 'tenant_id', 'registration_number', 'display_name', 'car_id',
        'carins_linked_at', 'note', 'created_at', 'updated_at', 'deleted_at',
      ]))
      // backend に存在しないフィールド (手書き型が持っていた嘘) が生えていないこと。
      expect(keys).not.toContain('cert_no')
      expect(keys).not.toContain('car_inspection_expiry')
      expect(vehicle.car_id).toBeNull()
    })

    it('linked フィルタが紐づけ済み / 未紐づけを分ける', async () => {
      const unlinked = await getVehicles({ linked: false, per_page: 100 })
      expect(unlinked.items.map(v => v.id)).toContain(TEST_VEHICLE_UNLINKED_ID)
      expect(unlinked.items.every(v => v.car_id === null)).toBe(true)

      const linked = await getVehicles({ linked: true, per_page: 100 })
      expect(linked.items.map(v => v.id)).toContain(TEST_VEHICLE_LINKED_ID)
      expect(linked.items.every(v => v.car_id !== null)).toBe(true)
    })

    it('登録番号だけで作成でき、更新・削除まで往復する', async () => {
      const created = await createVehicle({ registration_number: '横浜200か9999' })
      expect(created.registration_number).toBe('横浜200か9999')
      expect(created.car_id).toBeNull()

      const fetched = await getVehicle(created.id)
      expect(fetched.id).toBe(created.id)

      const updated = await updateVehicle(created.id, { display_name: '3号車', note: 'メモ' })
      expect(updated.display_name).toBe('3号車')
      expect(updated.note).toBe('メモ')

      await deleteVehicle(created.id)
      await expect(getVehicle(created.id)).rejects.toMatchObject({ status: 404 })
    })
  })

  describe('車検証の紐づけ', () => {
    it('候補が CarinsCandidate の形で返る', async () => {
      const candidates = await getCarInsCandidates(TEST_VEHICLE_UNLINKED_ID)
      expect(candidates.length).toBeGreaterThanOrEqual(1)
      const hit = candidates.find(c => c.car_id === TEST_CAR_ID)
      expect(hit).toBeDefined()
      expect(hit!.cert_no).toBe(TEST_CERT_NO)
      const keys = Object.keys(hit!)
      expect(keys.sort()).toEqual(['car_id', 'car_no', 'cert_no'])
      // 手書き型が持っていた別 struct 由来のフィールド。
      expect(keys).not.toContain('matched_by')
      expect(keys).not.toContain('expiry_date')
    })

    it('cert_no だけで紐づけでき、解除で元に戻る', async () => {
      const linked = await linkCarIns(TEST_VEHICLE_UNLINKED_ID, { cert_no: TEST_CERT_NO })
      expect(linked.car_id).toBe(TEST_CAR_ID)
      expect(linked.carins_linked_at).not.toBeNull()

      await unlinkCarIns(TEST_VEHICLE_UNLINKED_ID)
      const after = await getVehicle(TEST_VEHICLE_UNLINKED_ID)
      expect(after.car_id).toBeNull()
      expect(after.carins_linked_at).toBeNull()
    })

    it('一致する車検証が無ければ 400 (CLAUDE.md の出し分け)', async () => {
      await expect(
        linkCarIns(TEST_VEHICLE_UNLINKED_ID, { cert_no: TEST_ABSENT_CERT_NO }),
      ).rejects.toMatchObject({ status: 400 })
    })

    it('番号の形が不正でも 400 (照合前に normalize_carins_numbers が弾く)', async () => {
      // cert_no は 12〜13 桁の数字、car_id は 14 文字の英数字ちょうど。
      await expect(
        linkCarIns(TEST_VEHICLE_UNLINKED_ID, { cert_no: 'NOPE-9999' }),
      ).rejects.toMatchObject({ status: 400 })
      await expect(
        linkCarIns(TEST_VEHICLE_UNLINKED_ID, { car_id: 'SHORT' }),
      ).rejects.toMatchObject({ status: 400 })
    })

    it('他の車両が既に持っている車検証なら 409 (同上)', async () => {
      await expect(
        linkCarIns(TEST_VEHICLE_UNLINKED_ID, { car_id: TEST_LINKED_CAR_ID }),
      ).rejects.toMatchObject({ status: 409 })
      // 409 で弾かれた後も未紐づけのままであること。
      const after = await getVehicle(TEST_VEHICLE_UNLINKED_ID)
      expect(after.car_id).toBeNull()
    })
  })

  describe('整備カテゴリ', () => {
    it('seed のカテゴリが一覧に出る', async () => {
      const categories = await getMaintenanceCategories()
      const seeded = categories.find(c => c.id === TEST_CATEGORY_ID)
      expect(seeded).toBeDefined()
      expect(seeded!.name).toBe('定期点検')
      expect(Object.keys(seeded!).sort()).toEqual(
        ['created_at', 'id', 'name', 'sort_order', 'tenant_id'],
      )
    })

    it('作成・並び替え・削除が往復し、同名は 409', async () => {
      const created = await createMaintenanceCategory({ name: 'タイヤ交換' })
      expect(created.name).toBe('タイヤ交換')

      await expect(
        createMaintenanceCategory({ name: 'タイヤ交換' }),
      ).rejects.toMatchObject({ status: 409 })

      const moved = await updateMaintenanceCategorySortOrder(created.id, 9)
      expect(moved.sort_order).toBe(9)

      await deleteMaintenanceCategory(created.id)
      const after = await getMaintenanceCategories()
      expect(after.map(c => c.id)).not.toContain(created.id)
    })

    it('存在しないカテゴリの並び替え / 削除は 404', async () => {
      await expect(
        updateMaintenanceCategorySortOrder(ABSENT_ID, 1),
      ).rejects.toMatchObject({ status: 404 })
      await expect(
        deleteMaintenanceCategory(ABSENT_ID),
      ).rejects.toMatchObject({ status: 404 })
    })
  })

  describe('整備記録', () => {
    it('MaintenanceRecord の形が backend の実物と一致し、cost は文字列', async () => {
      const record = await getMaintenanceRecord(TEST_RECORD_ID)
      expect(Object.keys(record)).toEqual(expect.arrayContaining([
        'id', 'tenant_id', 'vehicle_id', 'category_id', 'performed_on',
        'odometer_km', 'vendor', 'description', 'cost', 'next_due_on',
        'created_by', 'created_at', 'updated_at', 'deleted_at',
      ]))
      // NUMERIC(12,2) を ::text で返す作法 (f64 に丸めない)。
      expect(typeof record.cost).toBe('string')
      expect(record.cost).toBe('5000.00')
      expect(record.performed_on).toBe('2026-01-15')
      expect(record.odometer_km).toBe(12000)
    })

    it('vehicle_id で絞り込める', async () => {
      const res = await getMaintenanceRecords({ vehicle_id: TEST_VEHICLE_UNLINKED_ID })
      expect(res.records.map(r => r.id)).toContain(TEST_RECORD_ID)
      expect(res.records.every(r => r.vehicle_id === TEST_VEHICLE_UNLINKED_ID)).toBe(true)
    })

    it('日付・フリーワードで絞り込める', async () => {
      const hit = await getMaintenanceRecords({ date_from: '2026-01-01', date_to: '2026-01-31' })
      expect(hit.records.map(r => r.id)).toContain(TEST_RECORD_ID)

      const miss = await getMaintenanceRecords({ date_from: '2030-01-01' })
      expect(miss.records).toHaveLength(0)

      const byWord = await getMaintenanceRecords({ q: 'オイル' })
      expect(byWord.records.map(r => r.id)).toContain(TEST_RECORD_ID)
    })

    it('作成・更新・削除が往復する', async () => {
      const created = await createMaintenanceRecord({
        vehicle_id: TEST_VEHICLE_UNLINKED_ID,
        category_id: TEST_CATEGORY_ID,
        performed_on: '2026-03-01',
        odometer_km: 15000,
        vendor: 'テスト整備工場',
        description: 'ブレーキパッド交換',
        cost: 18000,
        next_due_on: '2026-09-01',
      })
      expect(created.cost).toBe('18000.00')

      const updated = await updateMaintenanceRecord(created.id, { vendor: '別の整備工場' })
      expect(updated.vendor).toBe('別の整備工場')
      expect(updated.description).toBe('ブレーキパッド交換')

      await deleteMaintenanceRecord(created.id)
      await expect(getMaintenanceRecord(created.id)).rejects.toMatchObject({ status: 404 })
    })

    it('他テナントの vehicle_id / category_id は 400、存在しない記録は 404', async () => {
      await expect(createMaintenanceRecord({
        vehicle_id: ABSENT_ID,
        category_id: TEST_CATEGORY_ID,
        performed_on: '2026-03-01',
      })).rejects.toMatchObject({ status: 400 })

      await expect(createMaintenanceRecord({
        vehicle_id: TEST_VEHICLE_UNLINKED_ID,
        category_id: ABSENT_ID,
        performed_on: '2026-03-01',
      })).rejects.toMatchObject({ status: 400 })

      await expect(
        getMaintenanceRecord(ABSENT_ID),
      ).rejects.toMatchObject({ status: 404 })
      await expect(
        updateMaintenanceRecord(ABSENT_ID, { vendor: 'x' }),
      ).rejects.toMatchObject({ status: 404 })
      await expect(
        deleteMaintenanceRecord(ABSENT_ID),
      ).rejects.toMatchObject({ status: 404 })
    })
  })
})
