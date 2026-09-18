import { getVehicle, updateVehicle, deleteVehicle, getCarInsCandidates, linkCarIns, unlinkCarIns, ApiError } from '~/utils/api'
import type { MaintenanceVehicle, UpdateMaintenanceVehicle, CarInsCandidate, LinkCarIns } from '~/types'

/**
 * 車両の詳細・編集 + 車検証の紐づけ UI (vehicles/[id].vue)。
 *
 * ★ 整備履歴はこのタスクでは扱わない (後続タスクの担当)。
 */
export function useVehicleDetail(id: string) {
  const router = useRouter()

  const vehicle = ref<MaintenanceVehicle | null>(null)
  const loading = ref(false)
  const errorMessage = ref<string | null>(null)

  const saving = ref(false)
  const saveError = ref<string | null>(null)

  const deleting = ref(false)

  const candidates = ref<CarInsCandidate[]>([])
  const candidatesLoading = ref(false)
  const candidatesError = ref<string | null>(null)
  const candidatesLoaded = ref(false)

  const linking = ref(false)
  const linkError = ref<string | null>(null)

  const unlinking = ref(false)
  const unlinkError = ref<string | null>(null)

  async function fetchVehicle() {
    loading.value = true
    errorMessage.value = null
    try {
      vehicle.value = await getVehicle(id)
    } catch (e) {
      errorMessage.value = e instanceof Error ? e.message : String(e)
    } finally {
      loading.value = false
    }
  }

  async function save(data: UpdateMaintenanceVehicle): Promise<boolean> {
    saving.value = true
    saveError.value = null
    try {
      vehicle.value = await updateVehicle(id, data)
      return true
    } catch (e) {
      saveError.value = e instanceof Error ? e.message : String(e)
      return false
    } finally {
      saving.value = false
    }
  }

  async function remove(): Promise<boolean> {
    deleting.value = true
    errorMessage.value = null
    try {
      await deleteVehicle(id)
      router.push('/')
      return true
    } catch (e) {
      errorMessage.value = e instanceof Error ? e.message : String(e)
      return false
    } finally {
      deleting.value = false
    }
  }

  async function fetchCandidates() {
    candidatesLoading.value = true
    candidatesError.value = null
    try {
      candidates.value = await getCarInsCandidates(id)
      candidatesLoaded.value = true
    } catch (e) {
      candidatesError.value = e instanceof Error ? e.message : String(e)
    } finally {
      candidatesLoading.value = false
    }
  }

  /**
   * 候補を紐づける。backend が 400 (matched_by が none = 一致無し) /
   * 409 (他の車両が既にその車検証を持つ) を返す場合があるので、
   * ユーザーに分かる文言で出し分ける。
   */
  async function link(data: LinkCarIns): Promise<boolean> {
    linking.value = true
    linkError.value = null
    try {
      vehicle.value = await linkCarIns(id, data)
      candidates.value = []
      candidatesLoaded.value = false
      return true
    } catch (e) {
      if (e instanceof ApiError && e.status === 400) {
        linkError.value = '一致する車検証が見つかりませんでした。候補を選び直してください。'
      } else if (e instanceof ApiError && e.status === 409) {
        linkError.value = 'この車検証は既に他の車両に紐づいています。'
      } else {
        linkError.value = e instanceof Error ? e.message : String(e)
      }
      return false
    } finally {
      linking.value = false
    }
  }

  async function unlink(): Promise<boolean> {
    unlinking.value = true
    unlinkError.value = null
    try {
      await unlinkCarIns(id)
      if (vehicle.value) {
        vehicle.value = { ...vehicle.value, car_id: null, cert_no: null, car_inspection_expiry: null }
      }
      return true
    } catch (e) {
      unlinkError.value = e instanceof Error ? e.message : String(e)
      return false
    } finally {
      unlinking.value = false
    }
  }

  return {
    vehicle,
    loading,
    errorMessage,
    fetchVehicle,
    saving,
    saveError,
    save,
    deleting,
    remove,
    candidates,
    candidatesLoading,
    candidatesError,
    candidatesLoaded,
    fetchCandidates,
    linking,
    linkError,
    link,
    unlinking,
    unlinkError,
    unlink,
  }
}
