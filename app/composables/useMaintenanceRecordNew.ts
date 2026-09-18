import { createMaintenanceRecord, getMaintenanceCategories, ApiError } from '~/utils/api'
import type { MaintenanceCategory, MaintenanceRecord } from '~/types'

/**
 * 整備記録の新規作成 (vehicles/[id]/maintenance/new.vue)。
 *
 * ★ `vehicle_id` は URL から受け取り固定する — フォームでは選ばせない
 * (issue #c651-8 の要件)。
 */
export function useMaintenanceRecordNew(vehicleId: string) {
  const router = useRouter()

  const form = reactive({
    category_id: '',
    performed_on: '',
    odometer_km: '',
    vendor: '',
    description: '',
    cost: '',
    next_due_on: '',
  })

  const categories = ref<MaintenanceCategory[]>([])
  const categoriesLoading = ref(false)
  const categoriesError = ref<string | null>(null)

  const submitting = ref(false)
  const errorMessage = ref<string | null>(null)

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

  async function submit(): Promise<MaintenanceRecord | undefined> {
    if (!form.category_id) {
      errorMessage.value = 'カテゴリを選択してください'
      return undefined
    }
    if (!form.performed_on) {
      errorMessage.value = '整備実施日を入力してください'
      return undefined
    }
    submitting.value = true
    errorMessage.value = null
    try {
      const record = await createMaintenanceRecord({
        vehicle_id: vehicleId,
        category_id: form.category_id,
        performed_on: form.performed_on,
        odometer_km: form.odometer_km ? Number(form.odometer_km) : undefined,
        vendor: form.vendor.trim() || undefined,
        description: form.description.trim() || undefined,
        cost: form.cost ? Number(form.cost) : undefined,
        next_due_on: form.next_due_on || undefined,
      })
      router.push(`/vehicles/${vehicleId}`)
      return record
    } catch (e) {
      if (e instanceof ApiError && e.status === 400) {
        errorMessage.value = '車両またはカテゴリが見つかりませんでした。テナントを確認してください。'
      } else {
        errorMessage.value = e instanceof Error ? e.message : String(e)
      }
      return undefined
    } finally {
      submitting.value = false
    }
  }

  return {
    form,
    categories,
    categoriesLoading,
    categoriesError,
    fetchCategories,
    submitting,
    errorMessage,
    submit,
  }
}
