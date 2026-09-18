import { getCarinsImportCandidates, importFromCarins } from '~/utils/api'
import type { CarinsImportCandidate, CarinsImportResult } from '~/types'

/**
 * 車検証からの一括取り込み (CarinsImportModal.vue)。
 *
 * `getCarinsImportCandidates` は「まだ maintenance_vehicles に取り込まれていない」
 * 電子車検証の全件をページネーション無しで返す。利用者が候補から選び、
 * `importFromCarins` へ選んだ car_id だけ渡す (1 クリック全件取り込みはしない設計)。
 */
export function useCarinsImport() {
  const candidates = ref<CarinsImportCandidate[]>([])
  const candidatesLoading = ref(false)
  const candidatesError = ref<string | null>(null)
  const candidatesLoaded = ref(false)

  const selected = ref<Set<string>>(new Set())

  const importing = ref(false)
  const importError = ref<string | null>(null)
  const result = ref<CarinsImportResult | null>(null)

  async function fetchCandidates() {
    candidatesLoading.value = true
    candidatesError.value = null
    try {
      candidates.value = await getCarinsImportCandidates()
      candidatesLoaded.value = true
    } catch (e) {
      candidatesError.value = e instanceof Error ? e.message : String(e)
    } finally {
      candidatesLoading.value = false
    }
  }

  function toggle(carId: string) {
    const next = new Set(selected.value)
    if (next.has(carId)) {
      next.delete(carId)
    } else {
      next.add(carId)
    }
    selected.value = next
  }

  function selectAll() {
    selected.value = new Set(candidates.value.map(c => c.car_id))
  }

  function clearSelection() {
    selected.value = new Set()
  }

  async function runImport(): Promise<boolean> {
    importing.value = true
    importError.value = null
    try {
      result.value = await importFromCarins([...selected.value])
      clearSelection()
      return true
    } catch (e) {
      importError.value = e instanceof Error ? e.message : String(e)
      return false
    } finally {
      importing.value = false
    }
  }

  return {
    candidates,
    candidatesLoading,
    candidatesError,
    candidatesLoaded,
    fetchCandidates,
    selected,
    toggle,
    selectAll,
    clearSelection,
    importing,
    importError,
    result,
    runImport,
  }
}
