import { getMaintenanceRecords, getMaintenanceCategories } from '~/utils/api'
import type { MaintenanceCategory, MaintenanceRecord, MaintenanceRecordListFilter } from '~/types'

/**
 * 車両詳細の整備履歴 (vehicles/[id].vue の節)。`vehicle_id` はこの車両に固定し、
 * カテゴリ・期間 (`date_from`/`date_to`)・フリーワード (`q`) で絞り込む。
 *
 * カテゴリ名の表示・絞り込み選択肢のため `maintenance_categories` も合わせて
 * 保持する (`MaintenanceRecord` は `category_id` しか持たないため)。
 */
export function useMaintenanceRecords(vehicleId: string) {
  const filter = reactive<MaintenanceRecordListFilter>({
    vehicle_id: vehicleId,
    category_id: undefined,
    date_from: undefined,
    date_to: undefined,
    q: undefined,
    page: 1,
    per_page: 20,
  })

  const records = ref<MaintenanceRecord[]>([])
  const total = ref(0)
  const loading = ref(false)
  const errorMessage = ref<string | null>(null)

  const categories = ref<MaintenanceCategory[]>([])
  const categoriesLoading = ref(false)

  async function fetchRecords() {
    loading.value = true
    errorMessage.value = null
    try {
      const res = await getMaintenanceRecords({ ...filter })
      records.value = res.records
      total.value = res.total
    } catch (e) {
      errorMessage.value = e instanceof Error ? e.message : String(e)
    } finally {
      loading.value = false
    }
  }

  /** 絞り込みのカテゴリ選択肢・表示名解決に使う。取得失敗は絞り込みが使えないだけなので致命的にしない。 */
  async function fetchCategories() {
    categoriesLoading.value = true
    try {
      categories.value = await getMaintenanceCategories()
    } catch {
      categories.value = []
    } finally {
      categoriesLoading.value = false
    }
  }

  function categoryName(categoryId: string): string {
    return categories.value.find(c => c.id === categoryId)?.name || '-'
  }

  function setPage(page: number) {
    filter.page = page
    return fetchRecords()
  }

  function setCategoryFilter(categoryId: string | undefined) {
    filter.category_id = categoryId || undefined
    filter.page = 1
    return fetchRecords()
  }

  function setDateRange(dateFrom: string | undefined, dateTo: string | undefined) {
    filter.date_from = dateFrom || undefined
    filter.date_to = dateTo || undefined
    filter.page = 1
    return fetchRecords()
  }

  function search(q: string) {
    filter.q = q.trim() || undefined
    filter.page = 1
    return fetchRecords()
  }

  return {
    filter,
    records,
    total,
    loading,
    errorMessage,
    fetchRecords,
    categories,
    categoriesLoading,
    fetchCategories,
    categoryName,
    setPage,
    setCategoryFilter,
    setDateRange,
    search,
  }
}
