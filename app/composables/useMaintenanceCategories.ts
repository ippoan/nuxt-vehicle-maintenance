import {
  getMaintenanceCategories,
  createMaintenanceCategory,
  updateMaintenanceCategorySortOrder,
  deleteMaintenanceCategory,
  ApiError,
} from '~/utils/api'
import type { MaintenanceCategory } from '~/types'

/**
 * 整備カテゴリの設定画面 (settings/categories.vue)。
 *
 * ★ 初回アクセス時、backend (`GET /api/maintenance/categories`) が空のテナントに
 * 既定 5 件 (定期点検 / 修理 / 部品交換 / タイヤ交換 / オイル交換) を自動で
 * seed する。フロントで既定値を持たず、一覧をそのまま表示する。
 */
export function useMaintenanceCategories() {
  const categories = ref<MaintenanceCategory[]>([])
  const loading = ref(false)
  const errorMessage = ref<string | null>(null)

  const form = reactive({ name: '' })
  const submitting = ref(false)
  const submitError = ref<string | null>(null)

  const deletingId = ref<string | null>(null)
  const deleteError = ref<string | null>(null)

  const reorderingId = ref<string | null>(null)
  const reorderError = ref<string | null>(null)

  async function fetchCategories() {
    loading.value = true
    errorMessage.value = null
    try {
      categories.value = await getMaintenanceCategories()
    } catch (e) {
      errorMessage.value = e instanceof Error ? e.message : String(e)
    } finally {
      loading.value = false
    }
  }

  /** 同名で追加すると 409 (`は既に登録されています` の文言で出す)。 */
  async function add(): Promise<boolean> {
    const name = form.name.trim()
    if (!name) {
      submitError.value = 'カテゴリ名を入力してください'
      return false
    }
    submitting.value = true
    submitError.value = null
    try {
      const category = await createMaintenanceCategory({ name })
      categories.value = [...categories.value, category]
      form.name = ''
      return true
    } catch (e) {
      if (e instanceof ApiError && e.status === 409) {
        submitError.value = `「${name}」は既に登録されています`
      } else {
        submitError.value = e instanceof Error ? e.message : String(e)
      }
      return false
    } finally {
      submitting.value = false
    }
  }

  async function remove(id: string): Promise<boolean> {
    deletingId.value = id
    deleteError.value = null
    try {
      await deleteMaintenanceCategory(id)
      categories.value = categories.value.filter(c => c.id !== id)
      return true
    } catch (e) {
      deleteError.value = e instanceof Error ? e.message : String(e)
      return false
    } finally {
      deletingId.value = null
    }
  }

  /** 隣り合う 2 件の `sort_order` を入れ替える (上へ / 下へ)。 */
  async function swap(a: MaintenanceCategory, b: MaintenanceCategory): Promise<boolean> {
    reorderingId.value = a.id
    reorderError.value = null
    try {
      const [updatedA, updatedB] = await Promise.all([
        updateMaintenanceCategorySortOrder(a.id, b.sort_order),
        updateMaintenanceCategorySortOrder(b.id, a.sort_order),
      ])
      categories.value = categories.value
        .map((c) => {
          if (c.id === updatedA.id) return updatedA
          if (c.id === updatedB.id) return updatedB
          return c
        })
        .sort((x, y) => x.sort_order - y.sort_order || x.name.localeCompare(y.name))
      return true
    } catch (e) {
      reorderError.value = e instanceof Error ? e.message : String(e)
      return false
    } finally {
      reorderingId.value = null
    }
  }

  function moveUp(id: string) {
    const index = categories.value.findIndex(c => c.id === id)
    if (index <= 0) return Promise.resolve(false)
    return swap(categories.value[index]!, categories.value[index - 1]!)
  }

  function moveDown(id: string) {
    const index = categories.value.findIndex(c => c.id === id)
    if (index === -1 || index >= categories.value.length - 1) return Promise.resolve(false)
    return swap(categories.value[index]!, categories.value[index + 1]!)
  }

  return {
    categories,
    loading,
    errorMessage,
    fetchCategories,
    form,
    submitting,
    submitError,
    add,
    deletingId,
    deleteError,
    remove,
    reorderingId,
    reorderError,
    moveUp,
    moveDown,
  }
}
