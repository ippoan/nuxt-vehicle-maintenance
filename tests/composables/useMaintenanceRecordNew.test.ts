import { describe, it, expect, vi, beforeEach } from 'vitest'
import { makeMaintenanceRecord, makeMaintenanceCategory } from '../helpers/test-data'

const pushMock = vi.fn()
const createMaintenanceRecordMock = vi.fn()
const getMaintenanceCategoriesMock = vi.fn()

vi.mock('#app/composables/router', () => ({
  useRouter: () => ({ push: pushMock }),
}))

vi.mock('~/utils/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('~/utils/api')>()
  return {
    ...actual,
    createMaintenanceRecord: (...args: unknown[]) => createMaintenanceRecordMock(...args),
    getMaintenanceCategories: (...args: unknown[]) => getMaintenanceCategoriesMock(...args),
  }
})

import { useMaintenanceRecordNew } from '~/composables/useMaintenanceRecordNew'
import { ApiError } from '~/utils/api'

const category = makeMaintenanceCategory()

describe('useMaintenanceRecordNew', () => {
  beforeEach(() => {
    pushMock.mockReset()
    createMaintenanceRecordMock.mockReset()
    getMaintenanceCategoriesMock.mockReset()
  })

  it('starts with an empty form', () => {
    const n = useMaintenanceRecordNew('vehicle-1')
    expect(n.form.category_id).toBe('')
    expect(n.form.performed_on).toBe('')
    expect(n.categories.value).toEqual([])
  })

  it('fetchCategories sets categories', async () => {
    getMaintenanceCategoriesMock.mockResolvedValue([category])
    const n = useMaintenanceRecordNew('vehicle-1')
    await n.fetchCategories()
    expect(n.categories.value).toEqual([category])
    expect(n.categoriesLoading.value).toBe(false)
  })

  it('fetchCategories sets categoriesError on failure', async () => {
    getMaintenanceCategoriesMock.mockRejectedValue(new Error('fail'))
    const n = useMaintenanceRecordNew('vehicle-1')
    await n.fetchCategories()
    expect(n.categoriesError.value).toBe('fail')
  })

  it('rejects submit without category_id', async () => {
    const n = useMaintenanceRecordNew('vehicle-1')
    n.form.performed_on = '2026-01-15'
    const result = await n.submit()
    expect(result).toBeUndefined()
    expect(n.errorMessage.value).toBe('カテゴリを選択してください')
    expect(createMaintenanceRecordMock).not.toHaveBeenCalled()
  })

  it('rejects submit without performed_on', async () => {
    const n = useMaintenanceRecordNew('vehicle-1')
    n.form.category_id = category.id
    const result = await n.submit()
    expect(result).toBeUndefined()
    expect(n.errorMessage.value).toBe('整備実施日を入力してください')
    expect(createMaintenanceRecordMock).not.toHaveBeenCalled()
  })

  it('creates with vehicle_id fixed from the URL and required fields only', async () => {
    const record = makeMaintenanceRecord()
    createMaintenanceRecordMock.mockResolvedValue(record)
    const n = useMaintenanceRecordNew('vehicle-1')
    n.form.category_id = category.id
    n.form.performed_on = '2026-01-15'
    const result = await n.submit()
    expect(createMaintenanceRecordMock).toHaveBeenCalledWith({
      vehicle_id: 'vehicle-1',
      category_id: category.id,
      performed_on: '2026-01-15',
      odometer_km: undefined,
      vendor: undefined,
      description: undefined,
      cost: undefined,
      next_due_on: undefined,
    })
    expect(pushMock).toHaveBeenCalledWith('/vehicles/vehicle-1')
    expect(result).toEqual(record)
  })

  it('includes optional fields, trimmed and coerced to numbers, when present', async () => {
    const record = makeMaintenanceRecord()
    createMaintenanceRecordMock.mockResolvedValue(record)
    const n = useMaintenanceRecordNew('vehicle-1')
    n.form.category_id = category.id
    n.form.performed_on = '2026-01-15'
    n.form.odometer_km = '12000'
    n.form.vendor = ' テスト整備工場 '
    n.form.description = ' オイル交換 '
    n.form.cost = '5000'
    n.form.next_due_on = '2026-07-15'
    await n.submit()
    expect(createMaintenanceRecordMock).toHaveBeenCalledWith({
      vehicle_id: 'vehicle-1',
      category_id: category.id,
      performed_on: '2026-01-15',
      odometer_km: 12000,
      vendor: 'テスト整備工場',
      description: 'オイル交換',
      cost: 5000,
      next_due_on: '2026-07-15',
    })
  })

  it('shows a distinct message for 400 (vehicle/category not in this tenant)', async () => {
    createMaintenanceRecordMock.mockRejectedValue(new ApiError(400, 'not found'))
    const n = useMaintenanceRecordNew('vehicle-1')
    n.form.category_id = category.id
    n.form.performed_on = '2026-01-15'
    const result = await n.submit()
    expect(result).toBeUndefined()
    expect(n.errorMessage.value).toContain('見つかりませんでした')
  })

  it('falls back to the raw error message for other failures', async () => {
    createMaintenanceRecordMock.mockRejectedValue(new Error('network down'))
    const n = useMaintenanceRecordNew('vehicle-1')
    n.form.category_id = category.id
    n.form.performed_on = '2026-01-15'
    const result = await n.submit()
    expect(result).toBeUndefined()
    expect(n.errorMessage.value).toBe('network down')
    expect(n.submitting.value).toBe(false)
  })
})
