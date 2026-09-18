import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { allStubs } from '../../../../helpers/nuxt-stubs'
import { makeMaintenanceCategory, makeMaintenanceRecord } from '../../../../helpers/test-data'

const pushMock = vi.fn()
const createMaintenanceRecordMock = vi.fn()
const getMaintenanceCategoriesMock = vi.fn()

vi.mock('#app/composables/router', () => ({
  useRoute: () => ({ params: { id: 'vehicle-1' } }),
  useRouter: () => ({ push: pushMock }),
}))

vi.mock('~/utils/api', async (importOriginal) => ({
  ...(await importOriginal()),
  createMaintenanceRecord: (...args: unknown[]) => createMaintenanceRecordMock(...args),
  getMaintenanceCategories: (...args: unknown[]) => getMaintenanceCategoriesMock(...args),
}))

import NewMaintenanceRecordPage from '~/pages/vehicles/[id]/maintenance/new.vue'

const category = makeMaintenanceCategory()

describe('vehicles/[id]/maintenance/new page (整備記録の新規作成)', () => {
  beforeEach(() => {
    pushMock.mockReset()
    createMaintenanceRecordMock.mockReset()
    getMaintenanceCategoriesMock.mockReset()
    getMaintenanceCategoriesMock.mockResolvedValue([category])
  })

  it('renders the form and loads categories', async () => {
    const wrapper = mount(NewMaintenanceRecordPage, { global: { stubs: allStubs } })
    await flushPromises()
    expect(wrapper.text()).toContain('整備記録を追加')
    expect(getMaintenanceCategoriesMock).toHaveBeenCalled()
    expect(wrapper.find('select').text()).toContain(category.name)
  })

  it('rejects submit without category/performed_on', async () => {
    const wrapper = mount(NewMaintenanceRecordPage, { global: { stubs: allStubs } })
    await flushPromises()
    await wrapper.find('form').trigger('submit.prevent')
    await flushPromises()
    expect(wrapper.text()).toContain('カテゴリを選択してください')
    expect(createMaintenanceRecordMock).not.toHaveBeenCalled()
  })

  it('creates a record with vehicle_id fixed from the URL', async () => {
    const record = makeMaintenanceRecord()
    createMaintenanceRecordMock.mockResolvedValue(record)
    const wrapper = mount(NewMaintenanceRecordPage, { global: { stubs: allStubs } })
    await flushPromises()
    await wrapper.find('select').setValue(category.id)
    const dateInputs = wrapper.findAll('input[type="date"]')
    await dateInputs[0]!.setValue('2026-01-15')
    await wrapper.find('form').trigger('submit.prevent')
    await flushPromises()
    expect(createMaintenanceRecordMock).toHaveBeenCalledWith(expect.objectContaining({
      vehicle_id: 'vehicle-1',
      category_id: category.id,
      performed_on: '2026-01-15',
    }))
    expect(pushMock).toHaveBeenCalledWith('/vehicles/vehicle-1')
  })
})
