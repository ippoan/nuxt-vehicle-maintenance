import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { allStubs } from '../../helpers/nuxt-stubs'
import { makeMaintenanceCategory } from '../../helpers/test-data'

const getMaintenanceCategoriesMock = vi.fn()
const createMaintenanceCategoryMock = vi.fn()
const deleteMaintenanceCategoryMock = vi.fn()
const updateMaintenanceCategorySortOrderMock = vi.fn()

vi.mock('~/utils/api', async (importOriginal) => ({
  ...(await importOriginal()),
  getMaintenanceCategories: (...args: unknown[]) => getMaintenanceCategoriesMock(...args),
  createMaintenanceCategory: (...args: unknown[]) => createMaintenanceCategoryMock(...args),
  deleteMaintenanceCategory: (...args: unknown[]) => deleteMaintenanceCategoryMock(...args),
  updateMaintenanceCategorySortOrder: (...args: unknown[]) => updateMaintenanceCategorySortOrderMock(...args),
}))

import CategoriesSettingsPage from '~/pages/settings/categories.vue'

const categoryA = makeMaintenanceCategory({ id: 'category-a', name: '定期点検', sort_order: 1 })
const categoryB = makeMaintenanceCategory({ id: 'category-b', name: '修理', sort_order: 2 })

describe('settings/categories page (整備カテゴリ設定)', () => {
  beforeEach(() => {
    getMaintenanceCategoriesMock.mockReset()
    createMaintenanceCategoryMock.mockReset()
    deleteMaintenanceCategoryMock.mockReset()
    updateMaintenanceCategorySortOrderMock.mockReset()
    getMaintenanceCategoriesMock.mockResolvedValue([categoryA, categoryB])
    window.confirm = vi.fn(() => true)
  })

  it('lists categories', async () => {
    const wrapper = mount(CategoriesSettingsPage, { global: { stubs: allStubs } })
    await flushPromises()
    expect(wrapper.text()).toContain('定期点検')
    expect(wrapper.text()).toContain('修理')
  })

  it('adds a category', async () => {
    const newCategory = makeMaintenanceCategory({ id: 'category-c', name: '車検', sort_order: 3 })
    createMaintenanceCategoryMock.mockResolvedValue(newCategory)
    const wrapper = mount(CategoriesSettingsPage, { global: { stubs: allStubs } })
    await flushPromises()
    await wrapper.find('input').setValue('車検')
    await wrapper.find('form').trigger('submit.prevent')
    await flushPromises()
    expect(createMaintenanceCategoryMock).toHaveBeenCalledWith({ name: '車検' })
    expect(wrapper.text()).toContain('車検')
  })

  it('shows a distinct message for 409 (duplicate name)', async () => {
    const { ApiError } = await import('~/utils/api')
    createMaintenanceCategoryMock.mockRejectedValue(new ApiError(409, 'duplicate'))
    const wrapper = mount(CategoriesSettingsPage, { global: { stubs: allStubs } })
    await flushPromises()
    await wrapper.find('input').setValue('定期点検')
    await wrapper.find('form').trigger('submit.prevent')
    await flushPromises()
    expect(wrapper.text()).toContain('既に登録されています')
  })

  it('deletes a category after confirmation', async () => {
    deleteMaintenanceCategoryMock.mockResolvedValue(undefined)
    const wrapper = mount(CategoriesSettingsPage, { global: { stubs: allStubs } })
    await flushPromises()
    const deleteBtn = wrapper.findAll('button').find(b => b.attributes('aria-label') === '削除')!
    await deleteBtn.trigger('click')
    await flushPromises()
    expect(deleteMaintenanceCategoryMock).toHaveBeenCalledWith('category-a')
    expect(wrapper.text()).not.toContain('定期点検')
  })

  it('reorders categories with the up/down buttons', async () => {
    updateMaintenanceCategorySortOrderMock.mockImplementation((id: string, sortOrder: number) => {
      const target = [categoryA, categoryB].find(c => c.id === id)!
      return Promise.resolve({ ...target, sort_order: sortOrder })
    })
    const wrapper = mount(CategoriesSettingsPage, { global: { stubs: allStubs } })
    await flushPromises()
    const downBtn = wrapper.findAll('button').find(b => b.attributes('aria-label') === '下へ')!
    await downBtn.trigger('click')
    await flushPromises()
    expect(updateMaintenanceCategorySortOrderMock).toHaveBeenCalled()
  })
})
