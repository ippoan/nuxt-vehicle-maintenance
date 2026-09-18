import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { allStubs } from '../../helpers/nuxt-stubs'
import { makeMaintenanceVehicle, makeCarInsCandidate, makeMaintenanceRecord, makeMaintenanceCategory } from '../../helpers/test-data'

const pushMock = vi.fn()
const getVehicleMock = vi.fn()
const updateVehicleMock = vi.fn()
const deleteVehicleMock = vi.fn()
const getCarInsCandidatesMock = vi.fn()
const linkCarInsMock = vi.fn()
const unlinkCarInsMock = vi.fn()
const getMaintenanceRecordsMock = vi.fn()
const getMaintenanceCategoriesMock = vi.fn()

vi.mock('#app/composables/router', () => ({
  useRoute: () => ({ params: { id: 'vehicle-1' } }),
  useRouter: () => ({ push: pushMock }),
}))

vi.mock('~/utils/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('~/utils/api')>()
  return {
    ...actual,
    getVehicle: (...args: unknown[]) => getVehicleMock(...args),
    updateVehicle: (...args: unknown[]) => updateVehicleMock(...args),
    deleteVehicle: (...args: unknown[]) => deleteVehicleMock(...args),
    getCarInsCandidates: (...args: unknown[]) => getCarInsCandidatesMock(...args),
    linkCarIns: (...args: unknown[]) => linkCarInsMock(...args),
    unlinkCarIns: (...args: unknown[]) => unlinkCarInsMock(...args),
    getMaintenanceRecords: (...args: unknown[]) => getMaintenanceRecordsMock(...args),
    getMaintenanceCategories: (...args: unknown[]) => getMaintenanceCategoriesMock(...args),
  }
})

import VehicleDetailPage from '~/pages/vehicles/[id].vue'

const unlinked = makeMaintenanceVehicle({ id: 'vehicle-1' })
const linked = makeMaintenanceVehicle({ id: 'vehicle-1', car_id: 'car-1', cert_no: 'CERT-1', car_inspection_expiry: '2027-01-01' })
const candidate = makeCarInsCandidate()
const category = makeMaintenanceCategory()
const record = makeMaintenanceRecord()

describe('vehicles/[id] page (詳細・編集 + 車検証紐づけ)', () => {
  beforeEach(() => {
    pushMock.mockReset()
    getVehicleMock.mockReset()
    updateVehicleMock.mockReset()
    deleteVehicleMock.mockReset()
    getCarInsCandidatesMock.mockReset()
    linkCarInsMock.mockReset()
    unlinkCarInsMock.mockReset()
    getMaintenanceRecordsMock.mockReset()
    getMaintenanceCategoriesMock.mockReset()
    getMaintenanceRecordsMock.mockResolvedValue({ records: [record], total: 1, page: 1, per_page: 20 })
    getMaintenanceCategoriesMock.mockResolvedValue([category])
    // happy-dom は window.confirm を実装していないため、直接差し替える。
    window.confirm = vi.fn(() => true)
  })

  it('shows 未紐づけ state and lets the user search for candidates', async () => {
    getVehicleMock.mockResolvedValue(unlinked)
    getCarInsCandidatesMock.mockResolvedValue([candidate])
    const wrapper = mount(VehicleDetailPage, { global: { stubs: allStubs } })
    await flushPromises()

    expect(wrapper.text()).toContain('未紐づけ')
    const findBtn = wrapper.findAll('button').find(b => b.text() === '候補を探す')!
    await findBtn.trigger('click')
    await flushPromises()

    expect(getCarInsCandidatesMock).toHaveBeenCalledWith('vehicle-1')
    expect(wrapper.text()).toContain(candidate.cert_no)
  })

  it('shows 紐づけ済み state with cert_no and expiry, and can unlink', async () => {
    getVehicleMock.mockResolvedValue(linked)
    unlinkCarInsMock.mockResolvedValue(undefined)
    const wrapper = mount(VehicleDetailPage, { global: { stubs: allStubs } })
    await flushPromises()

    expect(wrapper.text()).toContain('紐づけ済み')
    expect(wrapper.text()).toContain('CERT-1')
    expect(wrapper.text()).toContain('2027-01-01')

    const unlinkBtn = wrapper.findAll('button').find(b => b.text() === '紐づけを解除')!
    await unlinkBtn.trigger('click')
    await flushPromises()
    expect(unlinkCarInsMock).toHaveBeenCalledWith('vehicle-1')
  })

  it('linking a candidate calls linkCarIns with car_id and cert_no', async () => {
    getVehicleMock.mockResolvedValue(unlinked)
    getCarInsCandidatesMock.mockResolvedValue([candidate])
    linkCarInsMock.mockResolvedValue(linked)
    const wrapper = mount(VehicleDetailPage, { global: { stubs: allStubs } })
    await flushPromises()
    await wrapper.findAll('button').find(b => b.text() === '候補を探す')!.trigger('click')
    await flushPromises()
    await wrapper.findAll('button').find(b => b.text() === 'この車検証に紐づける')!.trigger('click')
    await flushPromises()
    expect(linkCarInsMock).toHaveBeenCalledWith('vehicle-1', { car_id: candidate.car_id, cert_no: candidate.cert_no })
  })

  it('shows a distinct message when linking fails with 409 (conflict)', async () => {
    const { ApiError } = await import('~/utils/api')
    getVehicleMock.mockResolvedValue(unlinked)
    getCarInsCandidatesMock.mockResolvedValue([candidate])
    linkCarInsMock.mockRejectedValue(new ApiError(409, 'conflict'))
    const wrapper = mount(VehicleDetailPage, { global: { stubs: allStubs } })
    await flushPromises()
    await wrapper.findAll('button').find(b => b.text() === '候補を探す')!.trigger('click')
    await flushPromises()
    await wrapper.findAll('button').find(b => b.text() === 'この車検証に紐づける')!.trigger('click')
    await flushPromises()
    expect(wrapper.text()).toContain('既に他の車両に紐づいています')
  })

  it('rejects saving with a blank registration_number', async () => {
    getVehicleMock.mockResolvedValue(unlinked)
    const wrapper = mount(VehicleDetailPage, { global: { stubs: allStubs } })
    await flushPromises()
    await wrapper.find('input').setValue('   ')
    await wrapper.find('form').trigger('submit.prevent')
    await flushPromises()
    expect(wrapper.text()).toContain('登録番号を入力してください')
    expect(updateVehicleMock).not.toHaveBeenCalled()
  })

  it('saves edits to registration_number/display_name/note', async () => {
    getVehicleMock.mockResolvedValue(unlinked)
    updateVehicleMock.mockResolvedValue({ ...unlinked, display_name: '2号車' })
    const wrapper = mount(VehicleDetailPage, { global: { stubs: allStubs } })
    await flushPromises()
    const inputs = wrapper.findAll('input')
    await inputs[1]!.setValue('2号車')
    await wrapper.find('form').trigger('submit.prevent')
    await flushPromises()
    expect(updateVehicleMock).toHaveBeenCalledWith('vehicle-1', expect.objectContaining({ display_name: '2号車' }))
  })

  it('deletes the vehicle after confirmation and navigates to /', async () => {
    getVehicleMock.mockResolvedValue(unlinked)
    deleteVehicleMock.mockResolvedValue(undefined)
    const wrapper = mount(VehicleDetailPage, { global: { stubs: allStubs } })
    await flushPromises()
    const deleteBtn = wrapper.findAll('button').find(b => b.text() === 'この車両を削除')!
    await deleteBtn.trigger('click')
    await flushPromises()
    expect(deleteVehicleMock).toHaveBeenCalledWith('vehicle-1')
    expect(pushMock).toHaveBeenCalledWith('/')
  })

  it('shows the maintenance history for this vehicle only', async () => {
    getVehicleMock.mockResolvedValue(unlinked)
    const wrapper = mount(VehicleDetailPage, { global: { stubs: allStubs } })
    await flushPromises()
    expect(getMaintenanceRecordsMock).toHaveBeenCalledWith(expect.objectContaining({ vehicle_id: 'vehicle-1' }))
    expect(wrapper.text()).toContain('整備履歴')
    expect(wrapper.text()).toContain(record.performed_on)
    expect(wrapper.text()).toContain(category.name)
    expect(wrapper.text()).toContain(record.vendor)
  })

  it('filters maintenance history by category', async () => {
    getVehicleMock.mockResolvedValue(unlinked)
    const wrapper = mount(VehicleDetailPage, { global: { stubs: allStubs } })
    await flushPromises()
    getMaintenanceRecordsMock.mockClear()
    await wrapper.find('select').setValue(category.id)
    await flushPromises()
    expect(getMaintenanceRecordsMock).toHaveBeenCalledWith(expect.objectContaining({ category_id: category.id }))
  })
})
