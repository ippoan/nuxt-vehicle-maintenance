import {
  getMaintenanceRecord,
  updateMaintenanceRecord,
  deleteMaintenanceRecord,
  getMaintenanceCategories,
  ApiError,
} from '~/utils/api'
import type { MaintenanceCategory, MaintenanceRecord, UpdateMaintenanceRecord } from '~/types'

/**
 * 整備記録の編集 (vehicles/[id]/maintenance/[recordId]/edit.vue)。
 *
 * ★ `vehicle_id` は URL の車両 ID に固定されたままで、このフォームでは
 * 変更させない (category_id のみ変更可)。
 */
export function useMaintenanceRecordDetail(vehicleId: string, recordId: string) {
  const router = useRouter()

  const record = ref<MaintenanceRecord | null>(null)
  const loading = ref(false)
  const errorMessage = ref<string | null>(null)

  const categories = ref<MaintenanceCategory[]>([])
  const categoriesLoading = ref(false)
  const categoriesError = ref<string | null>(null)

  const saving = ref(false)
  const saveError = ref<string | null>(null)

  const deleting = ref(false)
  const deleteError = ref<string | null>(null)

  async function fetchRecord() {
    loading.value = true
    errorMessage.value = null
    try {
      record.value = await getMaintenanceRecord(recordId)
    } catch (e) {
      if (e instanceof ApiError && e.status === 404) {
        errorMessage.value = '整備記録が見つかりませんでした'
      } else {
        errorMessage.value = e instanceof Error ? e.message : String(e)
      }
    } finally {
      loading.value = false
    }
  }

  async function fetchCategories() {
    categoriesLoading.value = true
    categoriesError.value = null
    try {
      categories.value = await getMaintenanceCategories()
    } catch (e) {
      categoriesError.value = e instanceof Error ? e.message : String(e)
    } finally {
      categoriesLoading.value = false
    }
  }

  async function save(data: UpdateMaintenanceRecord): Promise<boolean> {
    saving.value = true
    saveError.value = null
    try {
      record.value = await updateMaintenanceRecord(recordId, data)
      return true
    } catch (e) {
      if (e instanceof ApiError && e.status === 400) {
        saveError.value = 'カテゴリが見つかりませんでした。テナントを確認してください。'
      } else if (e instanceof ApiError && e.status === 404) {
        saveError.value = '整備記録が見つかりませんでした'
      } else {
        saveError.value = e instanceof Error ? e.message : String(e)
      }
      return false
    } finally {
      saving.value = false
    }
  }

  async function remove(): Promise<boolean> {
    deleting.value = true
    deleteError.value = null
    try {
      await deleteMaintenanceRecord(recordId)
      router.push(`/vehicles/${vehicleId}`)
      return true
    } catch (e) {
      deleteError.value = e instanceof Error ? e.message : String(e)
      return false
    } finally {
      deleting.value = false
    }
  }

  return {
    record,
    loading,
    errorMessage,
    fetchRecord,
    categories,
    categoriesLoading,
    categoriesError,
    fetchCategories,
    saving,
    saveError,
    save,
    deleting,
    deleteError,
    remove,
  }
}
