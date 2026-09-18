import { describe, it, expect, vi, beforeEach } from 'vitest'
import { makeMaintenanceRecord, makeMaintenanceCategory } from '../helpers/test-data'

const getMaintenanceRecordsMock = vi.fn()
const getMaintenanceCategoriesMock = vi.fn()

vi.mock('~/utils/api', async (importOriginal) => ({
  ...(await importOriginal()),
  getMaintenanceRecords: (...args: unknown[]) => getMaintenanceRecordsMock(...args),
  getMaintenanceCategories: (...args: unknown[]) => getMaintenanceCategoriesMock(...args),
}))

import { useMaintenanceRecords } from '~/composables/useMaintenanceRecords'

const record = makeMaintenanceRecord()
const category = makeMaintenanceCategory()

describe('useMaintenanceRecords', () => {
  beforeEach(() => {
    getMaintenanceRecordsMock.mockReset()
    getMaintenanceCategoriesMock.mockReset()
  })

  it('initializes with vehicle_id fixed and default paging', () => {
    const r = useMaintenanceRecords('vehicle-1')
    expect(r.filter.vehicle_id).toBe('vehicle-1')
    expect(r.filter.page).toBe(1)
    expect(r.filter.per_page).toBe(20)
    expect(r.records.value).toEqual([])
  })

  it('fetchRecords sets records and total', async () => {
    getMaintenanceRecordsMock.mockResolvedValue({ records: [record], total: 1, page: 1, per_page: 20 })
    const r = useMaintenanceRecords('vehicle-1')
    await r.fetchRecords()
    expect(r.records.value).toEqual([record])
    expect(r.total.value).toBe(1)
    expect(r.loading.value).toBe(false)
    expect(r.errorMessage.value).toBeNull()
  })

  it('fetchRecords sets errorMessage on failure', async () => {
    getMaintenanceRecordsMock.mockRejectedValue(new Error('fail'))
    const r = useMaintenanceRecords('vehicle-1')
    await r.fetchRecords()
    expect(r.errorMessage.value).toBe('fail')
    expect(r.loading.value).toBe(false)
  })

  it('fetchCategories sets categories', async () => {
    getMaintenanceCategoriesMock.mockResolvedValue([category])
    const r = useMaintenanceRecords('vehicle-1')
    await r.fetchCategories()
    expect(r.categories.value).toEqual([category])
    expect(r.categoriesLoading.value).toBe(false)
  })

  it('fetchCategories clears categories on failure without throwing', async () => {
    getMaintenanceCategoriesMock.mockRejectedValue(new Error('fail'))
    const r = useMaintenanceRecords('vehicle-1')
    await r.fetchCategories()
    expect(r.categories.value).toEqual([])
    expect(r.categoriesLoading.value).toBe(false)
  })

  it('categoryName resolves a known category, falls back to "-" otherwise', async () => {
    getMaintenanceCategoriesMock.mockResolvedValue([category])
    const r = useMaintenanceRecords('vehicle-1')
    await r.fetchCategories()
    expect(r.categoryName(category.id)).toBe(category.name)
    expect(r.categoryName('unknown')).toBe('-')
  })

  it('setPage updates page and refetches', async () => {
    getMaintenanceRecordsMock.mockResolvedValue({ records: [], total: 0, page: 2, per_page: 20 })
    const r = useMaintenanceRecords('vehicle-1')
    await r.setPage(2)
    expect(r.filter.page).toBe(2)
    expect(getMaintenanceRecordsMock).toHaveBeenCalled()
  })

  it('setCategoryFilter sets category_id and resets to page 1', async () => {
    getMaintenanceRecordsMock.mockResolvedValue({ records: [], total: 0, page: 1, per_page: 20 })
    const r = useMaintenanceRecords('vehicle-1')
    r.filter.page = 3
    await r.setCategoryFilter('category-1')
    expect(r.filter.category_id).toBe('category-1')
    expect(r.filter.page).toBe(1)
  })

  it('setCategoryFilter(undefined) clears the filter', async () => {
    getMaintenanceRecordsMock.mockResolvedValue({ records: [], total: 0, page: 1, per_page: 20 })
    const r = useMaintenanceRecords('vehicle-1')
    await r.setCategoryFilter('category-1')
    await r.setCategoryFilter(undefined)
    expect(r.filter.category_id).toBeUndefined()
  })

  it('setDateRange sets date_from/date_to and resets to page 1', async () => {
    getMaintenanceRecordsMock.mockResolvedValue({ records: [], total: 0, page: 1, per_page: 20 })
    const r = useMaintenanceRecords('vehicle-1')
    r.filter.page = 4
    await r.setDateRange('2026-01-01', '2026-12-31')
    expect(r.filter.date_from).toBe('2026-01-01')
    expect(r.filter.date_to).toBe('2026-12-31')
    expect(r.filter.page).toBe(1)
  })

  it('setDateRange with blanks clears the range', async () => {
    getMaintenanceRecordsMock.mockResolvedValue({ records: [], total: 0, page: 1, per_page: 20 })
    const r = useMaintenanceRecords('vehicle-1')
    await r.setDateRange('2026-01-01', '2026-12-31')
    await r.setDateRange('', '')
    expect(r.filter.date_from).toBeUndefined()
    expect(r.filter.date_to).toBeUndefined()
  })

  it('search trims q and resets to page 1', async () => {
    getMaintenanceRecordsMock.mockResolvedValue({ records: [], total: 0, page: 1, per_page: 20 })
    const r = useMaintenanceRecords('vehicle-1')
    r.filter.page = 5
    await r.search('  オイル  ')
    expect(r.filter.q).toBe('オイル')
    expect(r.filter.page).toBe(1)
  })

  it('search with blank clears q', async () => {
    getMaintenanceRecordsMock.mockResolvedValue({ records: [], total: 0, page: 1, per_page: 20 })
    const r = useMaintenanceRecords('vehicle-1')
    await r.search('   ')
    expect(r.filter.q).toBeUndefined()
  })
})
