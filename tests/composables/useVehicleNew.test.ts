import { describe, it, expect, vi, beforeEach } from 'vitest'
import { makeMaintenanceVehicle } from '../helpers/test-data'

const pushMock = vi.fn()
const createVehicleMock = vi.fn()

vi.mock('#app/composables/router', () => ({
  useRouter: () => ({ push: pushMock }),
}))

vi.mock('~/utils/api', async (importOriginal) => ({
  ...(await importOriginal()),
  createVehicle: (...args: unknown[]) => createVehicleMock(...args),
}))

import { useVehicleNew } from '~/composables/useVehicleNew'

describe('useVehicleNew', () => {
  beforeEach(() => {
    pushMock.mockReset()
    createVehicleMock.mockReset()
  })

  it('starts with an empty form', () => {
    const n = useVehicleNew()
    expect(n.form.registration_number).toBe('')
    expect(n.form.display_name).toBe('')
    expect(n.form.note).toBe('')
  })

  it('rejects submit without registration_number', async () => {
    const n = useVehicleNew()
    const result = await n.submit()
    expect(result).toBeUndefined()
    expect(n.errorMessage.value).toBe('登録番号を入力してください')
    expect(createVehicleMock).not.toHaveBeenCalled()
  })

  it('rejects submit when registration_number is only whitespace', async () => {
    const n = useVehicleNew()
    n.form.registration_number = '   '
    const result = await n.submit()
    expect(result).toBeUndefined()
    expect(createVehicleMock).not.toHaveBeenCalled()
  })

  it('creates with registration_number only when others are blank (登録番号だけで登録できる)', async () => {
    const vehicle = makeMaintenanceVehicle()
    createVehicleMock.mockResolvedValue(vehicle)
    const n = useVehicleNew()
    n.form.registration_number = '品川 100 あ 1234'
    const result = await n.submit()
    expect(createVehicleMock).toHaveBeenCalledWith({
      registration_number: '品川 100 あ 1234',
      display_name: undefined,
      note: undefined,
    })
    expect(pushMock).toHaveBeenCalledWith(`/vehicles/${vehicle.id}`)
    expect(result).toEqual(vehicle)
  })

  it('trims and includes optional fields when present', async () => {
    const vehicle = makeMaintenanceVehicle()
    createVehicleMock.mockResolvedValue(vehicle)
    const n = useVehicleNew()
    n.form.registration_number = ' 品川 100 あ 1234 '
    n.form.display_name = ' 1号車 '
    n.form.note = ' メモ '
    await n.submit()
    expect(createVehicleMock).toHaveBeenCalledWith({
      registration_number: '品川 100 あ 1234',
      display_name: '1号車',
      note: 'メモ',
    })
  })

  it('sets errorMessage on failure', async () => {
    createVehicleMock.mockRejectedValue(new Error('fail'))
    const n = useVehicleNew()
    n.form.registration_number = '品川 100 あ 1234'
    const result = await n.submit()
    expect(result).toBeUndefined()
    expect(n.errorMessage.value).toBe('fail')
    expect(n.submitting.value).toBe(false)
  })
})
