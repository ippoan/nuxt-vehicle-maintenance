import { getVehicles } from '~/utils/api'
import type { MaintenanceVehicle, VehicleListFilter } from '~/types'

/** 車両一覧 (index.vue)。検索 (`q`) と「未紐づけのみ」の絞り込みを持つ。 */
export function useVehicleList() {
  const filter = reactive<VehicleListFilter>({
    q: undefined,
    linked: undefined,
    page: 1,
    per_page: 20,
  })

  const vehicles = ref<MaintenanceVehicle[]>([])
  const total = ref(0)
  const loading = ref(false)
  const errorMessage = ref<string | null>(null)

  async function fetchVehicles() {
    loading.value = true
    errorMessage.value = null
    try {
      const res = await getVehicles({ ...filter })
      vehicles.value = res.items
      total.value = res.total
    } catch (e) {
      errorMessage.value = e instanceof Error ? e.message : String(e)
      console.error(e)
    } finally {
      loading.value = false
    }
  }

  function setPage(page: number) {
    filter.page = page
    return fetchVehicles()
  }

  function search(q: string) {
    filter.q = q.trim() || undefined
    filter.page = 1
    return fetchVehicles()
  }

  /** true = 未紐づけのみ絞り込み、false = 絞り込み解除。 */
  function setUnlinkedOnly(value: boolean) {
    filter.linked = value ? false : undefined
    filter.page = 1
    return fetchVehicles()
  }

  return { filter, vehicles, total, loading, errorMessage, fetchVehicles, setPage, search, setUnlinkedOnly }
}
