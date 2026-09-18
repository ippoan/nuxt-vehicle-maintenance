import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { allStubs } from '../../../../../helpers/nuxt-stubs'
import { makeMaintenanceCategory, makeMaintenanceRecord } from '../../../../../helpers/test-data'

const pushMock = vi.fn()
const getMaintenanceRecordMock = vi.fn()
const updateMaintenanceRecordMock = vi.fn()
const deleteMaintenanceRecordMock = vi.fn()
const getMaintenanceCategoriesMock = vi.fn()

vi.mock('#app/composables/router', () => ({
  useRoute: () => ({ params: { id: 'vehicle-1', recordId: 'record-1' } }),
  useRouter: () => ({ push: pushMock }),
}))

vi.mock('~/utils/api', async (importOriginal) => ({
  ...(await importOriginal()),
  getMaintenanceRecord: (...args: unknown[]) => getMaintenanceRecordMock(...args),
  updateMaintenanceRecord: (...args: unknown[]) => updateMaintenanceRecordMock(...args),
  deleteMaintenanceRecord: (...args: unknown[]) => deleteMaintenanceRecordMock(...args),
  getMaintenanceCategories: (...args: unknown[]) => getMaintenanceCategoriesMock(...args),
}))

import EditMaintenanceRecordPage from '~/pages/vehicles/[id]/maintenance/[recordId]/edit.vue'

const category = makeMaintenanceCategory()
const record = makeMaintenanceRecord()

describe('vehicles/[id]/maintenance/[recordId]/edit page (整備記録の編集)', () => {
  beforeEach(() => {
    pushMock.mockReset()
    getMaintenanceRecordMock.mockReset()
    updateMaintenanceRecordMock.mockReset()
    deleteMaintenanceRecordMock.mockReset()
    getMaintenanceCategoriesMock.mockReset()
    getMaintenanceCategoriesMock.mockResolvedValue([category])
    getMaintenanceRecordMock.mockResolvedValue(record)
    window.confirm = vi.fn(() => true)
  })

  it('loads the record and pre-fills the form', async () => {
    const wrapper = mount(EditMaintenanceRecordPage, { global: { stubs: allStubs } })
    await flushPromises()
    expect(wrapper.text()).toContain('整備記録を編集')
    const inputs = wrapper.findAll('input')
    expect(inputs.some(i => (i.element as HTMLInputElement).value === record.vendor)).toBe(true)
  })

  it('shows a message when the record is not found (404)', async () => {
    const { ApiError } = await import('~/utils/api')
    getMaintenanceRecordMock.mockRejectedValue(new ApiError(404, 'not found'))
    const wrapper = mount(EditMaintenanceRecordPage, { global: { stubs: allStubs } })
    await flushPromises()
    expect(wrapper.text()).toContain('整備記録が見つかりませんでした')
  })

  it('saves edits', async () => {
    updateMaintenanceRecordMock.mockResolvedValue({ ...record, vendor: '別の工場' })
    const wrapper = mount(EditMaintenanceRecordPage, { global: { stubs: allStubs } })
    await flushPromises()
    const inputs = wrapper.findAll('input')
    const vendorInput = inputs.find(i => (i.element as HTMLInputElement).value === record.vendor)!
    await vendorInput.setValue('別の工場')
    await wrapper.find('form').trigger('submit.prevent')
    await flushPromises()
    expect(updateMaintenanceRecordMock).toHaveBeenCalledWith('record-1', expect.objectContaining({ vendor: '別の工場' }))
  })

  it('deletes the record after confirmation and navigates back to the vehicle', async () => {
    deleteMaintenanceRecordMock.mockResolvedValue(undefined)
    const wrapper = mount(EditMaintenanceRecordPage, { global: { stubs: allStubs } })
    await flushPromises()
    const deleteBtn = wrapper.findAll('button').find(b => b.text() === 'この記録を削除')!
    await deleteBtn.trigger('click')
    await flushPromises()
    expect(deleteMaintenanceRecordMock).toHaveBeenCalledWith('record-1')
    expect(pushMock).toHaveBeenCalledWith('/vehicles/vehicle-1')
  })
})
