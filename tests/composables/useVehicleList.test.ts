import { describe, it, expect, vi, beforeEach } from 'vitest'
import { makeMaintenanceVehicle } from '../helpers/test-data'

const getVehiclesMock = vi.fn()

vi.mock('~/utils/api', async (importOriginal) => ({
  ...(await importOriginal()),
  getVehicles: (...args: unknown[]) => getVehiclesMock(...args),
}))

import { useVehicleList } from '~/composables/useVehicleList'

const vehicle = makeMaintenanceVehicle()

describe('useVehicleList', () => {
  beforeEach(() => {
    getVehiclesMock.mockReset()
  })

  it('initializes with default filter', () => {
    const l = useVehicleList()
    expect(l.filter.page).toBe(1)
    expect(l.filter.per_page).toBe(20)
    expect(l.filter.linked).toBeUndefined()
    expect(l.vehicles.value).toEqual([])
  })

  it('fetchVehicles sets vehicles and total', async () => {
    getVehiclesMock.mockResolvedValue({ items: [vehicle], total: 1, page: 1, per_page: 20 })
    const l = useVehicleList()
    await l.fetchVehicles()
    expect(l.vehicles.value).toEqual([vehicle])
    expect(l.total.value).toBe(1)
    expect(l.loading.value).toBe(false)
    expect(l.errorMessage.value).toBeNull()
  })

  it('fetchVehicles sets errorMessage on failure', async () => {
    getVehiclesMock.mockRejectedValue(new Error('fail'))
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const l = useVehicleList()
    await l.fetchVehicles()
    expect(l.errorMessage.value).toBe('fail')
    expect(l.loading.value).toBe(false)
    spy.mockRestore()
  })

  it('search sets q and resets to page 1', async () => {
    getVehiclesMock.mockResolvedValue({ items: [], total: 0, page: 1, per_page: 20 })
    const l = useVehicleList()
    l.filter.page = 3
    await l.search('  品川  ')
    expect(l.filter.q).toBe('品川')
    expect(l.filter.page).toBe(1)
  })

  it('search with blank query clears q', async () => {
    getVehiclesMock.mockResolvedValue({ items: [], total: 0, page: 1, per_page: 20 })
    const l = useVehicleList()
    await l.search('   ')
    expect(l.filter.q).toBeUndefined()
  })

  it('setPage updates page and refetches', async () => {
    getVehiclesMock.mockResolvedValue({ items: [], total: 0, page: 2, per_page: 20 })
    const l = useVehicleList()
    await l.setPage(2)
    expect(l.filter.page).toBe(2)
    expect(getVehiclesMock).toHaveBeenCalled()
  })

  it('setUnlinkedOnly(true) filters to linked=false', async () => {
    getVehiclesMock.mockResolvedValue({ items: [], total: 0, page: 1, per_page: 20 })
    const l = useVehicleList()
    l.filter.page = 5
    await l.setUnlinkedOnly(true)
    expect(l.filter.linked).toBe(false)
    expect(l.filter.page).toBe(1)
  })

  it('setUnlinkedOnly(false) clears the filter', async () => {
    getVehiclesMock.mockResolvedValue({ items: [], total: 0, page: 1, per_page: 20 })
    const l = useVehicleList()
    await l.setUnlinkedOnly(true)
    await l.setUnlinkedOnly(false)
    expect(l.filter.linked).toBeUndefined()
  })
})
