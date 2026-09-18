import { describe, it, expect, vi, beforeEach } from 'vitest'
import { makeMaintenanceVehicle, makeCarInsCandidate } from '../helpers/test-data'

const pushMock = vi.fn()
const getVehicleMock = vi.fn()
const updateVehicleMock = vi.fn()
const deleteVehicleMock = vi.fn()
const getCarInsCandidatesMock = vi.fn()
const linkCarInsMock = vi.fn()
const unlinkCarInsMock = vi.fn()

vi.mock('#app/composables/router', () => ({
  useRouter: () => ({ push: pushMock }),
}))

vi.mock('~/utils/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('~/utils/api')>()
  return {
    ...actual,
    getVehicle: (...args: unknown[]) => getVehicleMock(...args),
    updateVehicle: (...args: unknown[]) => updateVehicleMock(...args),
    deleteVehicle: (...args: unknown[]) => deleteVehicleMock(...args),
    getCarInsCandidates: (...args: unknown[]) => getCarInsCandidatesMock(...args),
    linkCarIns: (...args: unknown[]) => linkCarInsMock(...args),
    unlinkCarIns: (...args: unknown[]) => unlinkCarInsMock(...args),
  }
})

import { useVehicleDetail } from '~/composables/useVehicleDetail'
import { ApiError } from '~/utils/api'

const vehicle = makeMaintenanceVehicle()
const linkedVehicle = makeMaintenanceVehicle({ car_id: 'car-1', cert_no: 'CERT-0001', car_inspection_expiry: '2027-03-31' })
const candidate = makeCarInsCandidate()

describe('useVehicleDetail', () => {
  beforeEach(() => {
    pushMock.mockReset()
    getVehicleMock.mockReset()
    updateVehicleMock.mockReset()
    deleteVehicleMock.mockReset()
    getCarInsCandidatesMock.mockReset()
    linkCarInsMock.mockReset()
    unlinkCarInsMock.mockReset()
  })

  it('fetchVehicle sets vehicle', async () => {
    getVehicleMock.mockResolvedValue(vehicle)
    const d = useVehicleDetail('vehicle-1')
    await d.fetchVehicle()
    expect(d.vehicle.value).toEqual(vehicle)
    expect(d.loading.value).toBe(false)
  })

  it('fetchVehicle sets errorMessage on failure', async () => {
    getVehicleMock.mockRejectedValue(new Error('not found'))
    const d = useVehicleDetail('vehicle-1')
    await d.fetchVehicle()
    expect(d.errorMessage.value).toBe('not found')
  })

  it('save updates vehicle and returns true', async () => {
    updateVehicleMock.mockResolvedValue({ ...vehicle, display_name: '2号車' })
    const d = useVehicleDetail('vehicle-1')
    const ok = await d.save({ display_name: '2号車' })
    expect(ok).toBe(true)
    expect(d.vehicle.value?.display_name).toBe('2号車')
    expect(d.saving.value).toBe(false)
  })

  it('save sets saveError and returns false on failure', async () => {
    updateVehicleMock.mockRejectedValue(new Error('conflict'))
    const d = useVehicleDetail('vehicle-1')
    const ok = await d.save({ display_name: 'x' })
    expect(ok).toBe(false)
    expect(d.saveError.value).toBe('conflict')
  })

  it('remove deletes and navigates to /', async () => {
    deleteVehicleMock.mockResolvedValue(undefined)
    const d = useVehicleDetail('vehicle-1')
    const ok = await d.remove()
    expect(ok).toBe(true)
    expect(pushMock).toHaveBeenCalledWith('/')
    expect(d.deleting.value).toBe(false)
  })

  it('remove sets errorMessage on failure', async () => {
    deleteVehicleMock.mockRejectedValue(new Error('cannot delete'))
    const d = useVehicleDetail('vehicle-1')
    const ok = await d.remove()
    expect(ok).toBe(false)
    expect(d.errorMessage.value).toBe('cannot delete')
    expect(pushMock).not.toHaveBeenCalled()
  })

  it('fetchCandidates sets candidates and candidatesLoaded', async () => {
    getCarInsCandidatesMock.mockResolvedValue([candidate])
    const d = useVehicleDetail('vehicle-1')
    await d.fetchCandidates()
    expect(d.candidates.value).toEqual([candidate])
    expect(d.candidatesLoaded.value).toBe(true)
    expect(d.candidatesLoading.value).toBe(false)
  })

  it('fetchCandidates sets candidatesError on failure', async () => {
    getCarInsCandidatesMock.mockRejectedValue(new Error('fail'))
    const d = useVehicleDetail('vehicle-1')
    await d.fetchCandidates()
    expect(d.candidatesError.value).toBe('fail')
    expect(d.candidatesLoaded.value).toBe(false)
  })

  it('link succeeds and clears candidates', async () => {
    linkCarInsMock.mockResolvedValue(linkedVehicle)
    const d = useVehicleDetail('vehicle-1')
    d.candidates.value = [candidate]
    d.candidatesLoaded.value = true
    const ok = await d.link({ car_id: candidate.car_id, cert_no: candidate.cert_no })
    expect(ok).toBe(true)
    expect(d.vehicle.value).toEqual(linkedVehicle)
    expect(d.candidates.value).toEqual([])
    expect(d.candidatesLoaded.value).toBe(false)
  })

  it('link shows a distinct message for 400 (matched_by=none)', async () => {
    linkCarInsMock.mockRejectedValue(new ApiError(400, 'no match'))
    const d = useVehicleDetail('vehicle-1')
    const ok = await d.link({ cert_no: 'NOPE' })
    expect(ok).toBe(false)
    expect(d.linkError.value).toContain('一致する車検証が見つかりませんでした')
  })

  it('link shows a distinct message for 409 (already linked to another vehicle)', async () => {
    linkCarInsMock.mockRejectedValue(new ApiError(409, 'conflict'))
    const d = useVehicleDetail('vehicle-1')
    const ok = await d.link({ car_id: 'car-1' })
    expect(ok).toBe(false)
    expect(d.linkError.value).toContain('既に他の車両に紐づいています')
  })

  it('link falls back to the raw error message for other failures', async () => {
    linkCarInsMock.mockRejectedValue(new Error('network down'))
    const d = useVehicleDetail('vehicle-1')
    const ok = await d.link({ car_id: 'car-1' })
    expect(ok).toBe(false)
    expect(d.linkError.value).toBe('network down')
  })

  it('unlink clears car_id/cert_no/car_inspection_expiry on the local vehicle', async () => {
    unlinkCarInsMock.mockResolvedValue(undefined)
    const d = useVehicleDetail('vehicle-1')
    d.vehicle.value = linkedVehicle
    const ok = await d.unlink()
    expect(ok).toBe(true)
    expect(d.vehicle.value).toMatchObject({ car_id: null, cert_no: null, car_inspection_expiry: null })
  })

  it('unlink sets unlinkError on failure', async () => {
    unlinkCarInsMock.mockRejectedValue(new Error('fail'))
    const d = useVehicleDetail('vehicle-1')
    d.vehicle.value = linkedVehicle
    const ok = await d.unlink()
    expect(ok).toBe(false)
    expect(d.unlinkError.value).toBe('fail')
  })
})
