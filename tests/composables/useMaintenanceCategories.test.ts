import { describe, it, expect, vi, beforeEach } from 'vitest'
import { makeMaintenanceCategory } from '../helpers/test-data'

const getMaintenanceCategoriesMock = vi.fn()
const createMaintenanceCategoryMock = vi.fn()
const updateMaintenanceCategorySortOrderMock = vi.fn()
const deleteMaintenanceCategoryMock = vi.fn()

vi.mock('~/utils/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('~/utils/api')>()
  return {
    ...actual,
    getMaintenanceCategories: (...args: unknown[]) => getMaintenanceCategoriesMock(...args),
    createMaintenanceCategory: (...args: unknown[]) => createMaintenanceCategoryMock(...args),
    updateMaintenanceCategorySortOrder: (...args: unknown[]) => updateMaintenanceCategorySortOrderMock(...args),
    deleteMaintenanceCategory: (...args: unknown[]) => deleteMaintenanceCategoryMock(...args),
  }
})

import { useMaintenanceCategories } from '~/composables/useMaintenanceCategories'
import { ApiError } from '~/utils/api'

const categoryA = makeMaintenanceCategory({ id: 'category-a', name: '定期点検', sort_order: 1 })
const categoryB = makeMaintenanceCategory({ id: 'category-b', name: '修理', sort_order: 2 })
const categoryC = makeMaintenanceCategory({ id: 'category-c', name: '部品交換', sort_order: 3 })

describe('useMaintenanceCategories', () => {
  beforeEach(() => {
    getMaintenanceCategoriesMock.mockReset()
    createMaintenanceCategoryMock.mockReset()
    updateMaintenanceCategorySortOrderMock.mockReset()
    deleteMaintenanceCategoryMock.mockReset()
  })

  it('fetchCategories sets categories', async () => {
    getMaintenanceCategoriesMock.mockResolvedValue([categoryA, categoryB])
    const c = useMaintenanceCategories()
    await c.fetchCategories()
    expect(c.categories.value).toEqual([categoryA, categoryB])
    expect(c.loading.value).toBe(false)
  })

  it('fetchCategories sets errorMessage on failure', async () => {
    getMaintenanceCategoriesMock.mockRejectedValue(new Error('fail'))
    const c = useMaintenanceCategories()
    await c.fetchCategories()
    expect(c.errorMessage.value).toBe('fail')
  })

  it('add rejects a blank name without calling the API', async () => {
    const c = useMaintenanceCategories()
    const ok = await c.add()
    expect(ok).toBe(false)
    expect(c.submitError.value).toBe('カテゴリ名を入力してください')
    expect(createMaintenanceCategoryMock).not.toHaveBeenCalled()
  })

  it('add creates a category, appends it, and clears the form', async () => {
    createMaintenanceCategoryMock.mockResolvedValue(categoryA)
    const c = useMaintenanceCategories()
    c.form.name = ' 定期点検 '
    const ok = await c.add()
    expect(ok).toBe(true)
    expect(createMaintenanceCategoryMock).toHaveBeenCalledWith({ name: '定期点検' })
    expect(c.categories.value).toEqual([categoryA])
    expect(c.form.name).toBe('')
    expect(c.submitting.value).toBe(false)
  })

  it('add shows a distinct message for 409 (duplicate name)', async () => {
    createMaintenanceCategoryMock.mockRejectedValue(new ApiError(409, 'duplicate'))
    const c = useMaintenanceCategories()
    c.form.name = '定期点検'
    const ok = await c.add()
    expect(ok).toBe(false)
    expect(c.submitError.value).toContain('既に登録されています')
  })

  it('add falls back to the raw error message for other failures', async () => {
    createMaintenanceCategoryMock.mockRejectedValue(new Error('network down'))
    const c = useMaintenanceCategories()
    c.form.name = '定期点検'
    const ok = await c.add()
    expect(ok).toBe(false)
    expect(c.submitError.value).toBe('network down')
  })

  it('remove deletes and drops the category from the list', async () => {
    deleteMaintenanceCategoryMock.mockResolvedValue(undefined)
    const c = useMaintenanceCategories()
    c.categories.value = [categoryA, categoryB]
    const ok = await c.remove(categoryA.id)
    expect(ok).toBe(true)
    expect(c.categories.value).toEqual([categoryB])
    expect(c.deletingId.value).toBeNull()
  })

  it('remove sets deleteError on failure', async () => {
    deleteMaintenanceCategoryMock.mockRejectedValue(new Error('cannot delete'))
    const c = useMaintenanceCategories()
    c.categories.value = [categoryA]
    const ok = await c.remove(categoryA.id)
    expect(ok).toBe(false)
    expect(c.deleteError.value).toBe('cannot delete')
    expect(c.categories.value).toEqual([categoryA])
  })

  it('moveUp swaps sort_order with the previous category', async () => {
    updateMaintenanceCategorySortOrderMock.mockImplementation((id: string, sortOrder: number) => {
      const target = [categoryA, categoryB].find(c => c.id === id)!
      return Promise.resolve({ ...target, sort_order: sortOrder })
    })
    const c = useMaintenanceCategories()
    c.categories.value = [categoryA, categoryB]
    const ok = await c.moveUp(categoryB.id)
    expect(ok).toBe(true)
    expect(updateMaintenanceCategorySortOrderMock).toHaveBeenCalledWith(categoryB.id, categoryA.sort_order)
    expect(updateMaintenanceCategorySortOrderMock).toHaveBeenCalledWith(categoryA.id, categoryB.sort_order)
    expect(c.categories.value.map(x => x.id)).toEqual([categoryB.id, categoryA.id])
  })

  it('moveUp on the first item is a no-op', async () => {
    const c = useMaintenanceCategories()
    c.categories.value = [categoryA, categoryB]
    const ok = await c.moveUp(categoryA.id)
    expect(ok).toBe(false)
    expect(updateMaintenanceCategorySortOrderMock).not.toHaveBeenCalled()
  })

  it('moveDown swaps sort_order with the next category', async () => {
    updateMaintenanceCategorySortOrderMock.mockImplementation((id: string, sortOrder: number) => {
      const target = [categoryA, categoryB, categoryC].find(c => c.id === id)!
      return Promise.resolve({ ...target, sort_order: sortOrder })
    })
    const c = useMaintenanceCategories()
    c.categories.value = [categoryA, categoryB, categoryC]
    const ok = await c.moveDown(categoryA.id)
    expect(ok).toBe(true)
    expect(c.categories.value.map(x => x.id)).toEqual([categoryB.id, categoryA.id, categoryC.id])
  })

  it('moveDown on the last item is a no-op', async () => {
    const c = useMaintenanceCategories()
    c.categories.value = [categoryA, categoryB]
    const ok = await c.moveDown(categoryB.id)
    expect(ok).toBe(false)
    expect(updateMaintenanceCategorySortOrderMock).not.toHaveBeenCalled()
  })

  it('moveDown on an id not in the list is a no-op', async () => {
    const c = useMaintenanceCategories()
    c.categories.value = [categoryA, categoryB]
    const ok = await c.moveDown('unknown')
    expect(ok).toBe(false)
    expect(updateMaintenanceCategorySortOrderMock).not.toHaveBeenCalled()
  })

  it('moveUp sets reorderError on failure', async () => {
    updateMaintenanceCategorySortOrderMock.mockRejectedValue(new Error('conflict'))
    const c = useMaintenanceCategories()
    c.categories.value = [categoryA, categoryB]
    const ok = await c.moveUp(categoryB.id)
    expect(ok).toBe(false)
    expect(c.reorderError.value).toBe('conflict')
    expect(c.reorderingId.value).toBeNull()
  })
})
