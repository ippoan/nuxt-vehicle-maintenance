import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { allStubs } from '../helpers/nuxt-stubs'
import { makeMaintenanceVehicle } from '../helpers/test-data'

const getVehiclesMock = vi.fn()
const navigateToMock = vi.fn()

vi.mock('~/utils/api', async (importOriginal) => ({
  ...(await importOriginal()),
  getVehicles: (...args: unknown[]) => getVehiclesMock(...args),
}))

vi.mock('#app/composables/router', () => ({
  navigateTo: (...args: unknown[]) => navigateToMock(...args),
}))

import IndexPage from '~/pages/index.vue'

const linked = makeMaintenanceVehicle({
  id: 'v1', registration_number: '品川 100 あ 1111', display_name: '1号車',
  car_id: 'car-1', carins_linked_at: '2026-02-03T09:00:00Z',
})
const unlinked = makeMaintenanceVehicle({ id: 'v2', registration_number: '品川 200 い 2222', display_name: null })

describe('index page (車両一覧)', () => {
  beforeEach(() => {
    getVehiclesMock.mockReset()
    navigateToMock.mockReset()
  })

  it('fetches and renders vehicles with linked/unlinked status', async () => {
    getVehiclesMock.mockResolvedValue({ items: [linked, unlinked], total: 2, page: 1, per_page: 20 })
    const wrapper = mount(IndexPage, { global: { stubs: allStubs } })
    await flushPromises()

    expect(wrapper.text()).toContain('品川 100 あ 1111')
    expect(wrapper.text()).toContain('1号車')
    expect(wrapper.text()).toContain('紐づけ済み')
    // 紐づけ日は carins_linked_at の日付部分。車検満了日は MaintenanceVehicle が
    // 保持していないので列ごと持たない。
    expect(wrapper.text()).toContain('2026-02-03')
    expect(wrapper.text()).toContain('品川 200 い 2222')
    expect(wrapper.text()).toContain('未紐づけ')
  })

  it('shows an empty state when there are no vehicles', async () => {
    getVehiclesMock.mockResolvedValue({ items: [], total: 0, page: 1, per_page: 20 })
    const wrapper = mount(IndexPage, { global: { stubs: allStubs } })
    await flushPromises()
    expect(wrapper.text()).toContain('該当する車両がありません')
  })

  it('searching calls getVehicles with q', async () => {
    getVehiclesMock.mockResolvedValue({ items: [], total: 0, page: 1, per_page: 20 })
    const wrapper = mount(IndexPage, { global: { stubs: allStubs } })
    await flushPromises()
    getVehiclesMock.mockClear()
    await wrapper.find('input').setValue('品川')
    await wrapper.findAll('button').find(b => b.text() === '検索')!.trigger('click')
    await flushPromises()
    expect(getVehiclesMock).toHaveBeenCalledWith(expect.objectContaining({ q: '品川' }))
  })

  it('toggling 未紐づけのみ calls getVehicles with linked=false', async () => {
    getVehiclesMock.mockResolvedValue({ items: [], total: 0, page: 1, per_page: 20 })
    const wrapper = mount(IndexPage, { global: { stubs: allStubs } })
    await flushPromises()
    getVehiclesMock.mockClear()
    await wrapper.find('input[type="checkbox"]').setValue(true)
    await flushPromises()
    expect(getVehiclesMock).toHaveBeenCalledWith(expect.objectContaining({ linked: false }))
  })

  it('clicking a row navigates to the vehicle detail page', async () => {
    getVehiclesMock.mockResolvedValue({ items: [linked], total: 1, page: 1, per_page: 20 })
    const wrapper = mount(IndexPage, { global: { stubs: allStubs } })
    await flushPromises()
    await wrapper.find('tbody tr').trigger('click')
    expect(navigateToMock).toHaveBeenCalledWith('/vehicles/v1')
  })

  it('shows pagination when there is more than one page', async () => {
    getVehiclesMock.mockResolvedValue({ items: [linked], total: 40, page: 1, per_page: 20 })
    const wrapper = mount(IndexPage, { global: { stubs: allStubs } })
    await flushPromises()
    expect(wrapper.text()).toContain('前へ')
    expect(wrapper.text()).toContain('次へ')
  })
})
