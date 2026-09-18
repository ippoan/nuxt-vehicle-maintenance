import { createVehicle } from '~/utils/api'
import type { MaintenanceVehicle } from '~/types'

/**
 * 車両の新規登録 (vehicles/new.vue)。
 *
 * ★ 登録番号だけで登録できることが最重要要件 — 車検証を持たない (紐づけを
 * 後回しにする、またはそもそも carins マスタが無い) テナントでも使えるように
 * するための設計なので、display_name / note は任意のまま送らない。
 */
export function useVehicleNew() {
  const router = useRouter()

  const form = reactive({
    registration_number: '',
    display_name: '',
    note: '',
  })

  const submitting = ref(false)
  const errorMessage = ref<string | null>(null)

  async function submit(): Promise<MaintenanceVehicle | undefined> {
    const registrationNumber = form.registration_number.trim()
    if (!registrationNumber) {
      errorMessage.value = '登録番号を入力してください'
      return undefined
    }
    submitting.value = true
    errorMessage.value = null
    try {
      const vehicle = await createVehicle({
        registration_number: registrationNumber,
        display_name: form.display_name.trim() || undefined,
        note: form.note.trim() || undefined,
      })
      router.push(`/vehicles/${vehicle.id}`)
      return vehicle
    } catch (e) {
      errorMessage.value = e instanceof Error ? e.message : String(e)
      return undefined
    } finally {
      submitting.value = false
    }
  }

  return { form, submitting, errorMessage, submit }
}
