import { describe, it, expect, vi, beforeEach } from 'vitest'
import { makeMaintenanceRecord, makeMaintenanceCategory } from '../helpers/test-data'

const pushMock = vi.fn()
const getMaintenanceRecordMock = vi.fn()
const updateMaintenanceRecordMock = vi.fn()
const deleteMaintenanceRecordMock = vi.fn()
const getMaintenanceCategoriesMock = vi.fn()

vi.mock('#app/composables/router', () => ({
  useRouter: () => ({ push: pushMock }),
}))

vi.mock('~/utils/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('~/utils/api')>()
  return {
    ...actual,
    getMaintenanceRecord: (...args: unknown[]) => getMaintenanceRecordMock(...args),
    updateMaintenanceRecord: (...args: unknown[]) => updateMaintenanceRecordMock(...args),
    deleteMaintenanceRecord: (...args: unknown[]) => deleteMaintenanceRecordMock(...args),
    getMaintenanceCategories: (...args: unknown[]) => getMaintenanceCategoriesMock(...args),
  }
})

import { useMaintenanceRecordDetail } from '~/composables/useMaintenanceRecordDetail'
import { ApiError } from '~/utils/api'

const record = makeMaintenanceRecord()
const category = makeMaintenanceCategory()

describe('useMaintenanceRecordDetail', () => {
  beforeEach(() => {
    pushMock.mockReset()
    getMaintenanceRecordMock.mockReset()
    updateMaintenanceRecordMock.mockReset()
    deleteMaintenanceRecordMock.mockReset()
    getMaintenanceCategoriesMock.mockReset()
  })

  it('fetchRecord sets record', async () => {
    getMaintenanceRecordMock.mockResolvedValue(record)
    const d = useMaintenanceRecordDetail('vehicle-1', 'record-1')
    await d.fetchRecord()
    expect(d.record.value).toEqual(record)
    expect(d.loading.value).toBe(false)
  })

  it('fetchRecord shows a distinct message for 404', async () => {
    getMaintenanceRecordMock.mockRejectedValue(new ApiError(404, 'not found'))
    const d = useMaintenanceRecordDetail('vehicle-1', 'record-1')
    await d.fetchRecord()
    expect(d.errorMessage.value).toBe('整備記録が見つかりませんでした')
  })

  it('fetchRecord falls back to the raw error message for other failures', async () => {
    getMaintenanceRecordMock.mockRejectedValue(new Error('boom'))
    const d = useMaintenanceRecordDetail('vehicle-1', 'record-1')
    await d.fetchRecord()
    expect(d.errorMessage.value).toBe('boom')
  })

  it('fetchCategories sets categories', async () => {
    getMaintenanceCategoriesMock.mockResolvedValue([category])
    const d = useMaintenanceRecordDetail('vehicle-1', 'record-1')
    await d.fetchCategories()
    expect(d.categories.value).toEqual([category])
  })

  it('fetchCategories sets categoriesError on failure', async () => {
    getMaintenanceCategoriesMock.mockRejectedValue(new Error('fail'))
    const d = useMaintenanceRecordDetail('vehicle-1', 'record-1')
    await d.fetchCategories()
    expect(d.categoriesError.value).toBe('fail')
  })

  it('save updates record and returns true', async () => {
    updateMaintenanceRecordMock.mockResolvedValue({ ...record, vendor: '別の工場' })
    const d = useMaintenanceRecordDetail('vehicle-1', 'record-1')
    const ok = await d.save({ vendor: '別の工場' })
    expect(ok).toBe(true)
    expect(d.record.value?.vendor).toBe('別の工場')
    expect(d.saving.value).toBe(false)
  })

  it('save shows a distinct message for 400 (category not in this tenant)', async () => {
    updateMaintenanceRecordMock.mockRejectedValue(new ApiError(400, 'not found'))
    const d = useMaintenanceRecordDetail('vehicle-1', 'record-1')
    const ok = await d.save({ category_id: 'other-tenant' })
    expect(ok).toBe(false)
    expect(d.saveError.value).toContain('カテゴリが見つかりませんでした')
  })

  it('save shows a distinct message for 404', async () => {
    updateMaintenanceRecordMock.mockRejectedValue(new ApiError(404, 'not found'))
    const d = useMaintenanceRecordDetail('vehicle-1', 'record-1')
    const ok = await d.save({ vendor: 'x' })
    expect(ok).toBe(false)
    expect(d.saveError.value).toBe('整備記録が見つかりませんでした')
  })

  it('save falls back to the raw error message for other failures', async () => {
    updateMaintenanceRecordMock.mockRejectedValue(new Error('network down'))
    const d = useMaintenanceRecordDetail('vehicle-1', 'record-1')
    const ok = await d.save({ vendor: 'x' })
    expect(ok).toBe(false)
    expect(d.saveError.value).toBe('network down')
  })

  it('remove deletes and navigates to the vehicle detail page', async () => {
    deleteMaintenanceRecordMock.mockResolvedValue(undefined)
    const d = useMaintenanceRecordDetail('vehicle-1', 'record-1')
    const ok = await d.remove()
    expect(ok).toBe(true)
    expect(pushMock).toHaveBeenCalledWith('/vehicles/vehicle-1')
    expect(d.deleting.value).toBe(false)
  })

  it('remove sets deleteError on failure', async () => {
    deleteMaintenanceRecordMock.mockRejectedValue(new Error('cannot delete'))
    const d = useMaintenanceRecordDetail('vehicle-1', 'record-1')
    const ok = await d.remove()
    expect(ok).toBe(false)
    expect(d.deleteError.value).toBe('cannot delete')
    expect(pushMock).not.toHaveBeenCalled()
  })
})
