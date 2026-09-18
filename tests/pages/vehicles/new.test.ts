import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { allStubs } from '../../helpers/nuxt-stubs'
import { makeMaintenanceVehicle } from '../../helpers/test-data'

const pushMock = vi.fn()
const createVehicleMock = vi.fn()

vi.mock('#app/composables/router', () => ({
  useRouter: () => ({ push: pushMock }),
}))

vi.mock('~/utils/api', async (importOriginal) => ({
  ...(await importOriginal()),
  createVehicle: (...args: unknown[]) => createVehicleMock(...args),
}))

import NewVehiclePage from '~/pages/vehicles/new.vue'

describe('vehicles/new page (車両の新規登録)', () => {
  beforeEach(() => {
    pushMock.mockReset()
    createVehicleMock.mockReset()
  })

  it('renders the registration form', () => {
    const wrapper = mount(NewVehiclePage, { global: { stubs: allStubs } })
    expect(wrapper.text()).toContain('車両を登録')
    expect(wrapper.text()).toContain('登録番号')
  })

  it('registers with registration_number only', async () => {
    const vehicle = makeMaintenanceVehicle()
    createVehicleMock.mockResolvedValue(vehicle)
    const wrapper = mount(NewVehiclePage, { global: { stubs: allStubs } })
    await wrapper.find('input').setValue('品川 100 あ 1234')
    await wrapper.find('form').trigger('submit.prevent')
    await flushPromises()
    expect(createVehicleMock).toHaveBeenCalledWith({
      registration_number: '品川 100 あ 1234',
      display_name: undefined,
      note: undefined,
    })
    expect(pushMock).toHaveBeenCalledWith(`/vehicles/${vehicle.id}`)
  })

  it('shows an error message when submitted blank', async () => {
    const wrapper = mount(NewVehiclePage, { global: { stubs: allStubs } })
    await wrapper.find('form').trigger('submit.prevent')
    await flushPromises()
    expect(wrapper.text()).toContain('登録番号を入力してください')
    expect(createVehicleMock).not.toHaveBeenCalled()
  })
})
