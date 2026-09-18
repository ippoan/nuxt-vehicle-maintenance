import { describe, it, expect, vi, beforeEach } from 'vitest'
import { makeCarinsImportCandidate } from '../helpers/test-data'

const getCarinsImportCandidatesMock = vi.fn()
const importFromCarinsMock = vi.fn()

vi.mock('~/utils/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('~/utils/api')>()
  return {
    ...actual,
    getCarinsImportCandidates: (...args: unknown[]) => getCarinsImportCandidatesMock(...args),
    importFromCarins: (...args: unknown[]) => importFromCarinsMock(...args),
  }
})

import { useCarinsImport } from '~/composables/useCarinsImport'

const newCandidate = makeCarinsImportCandidate({ car_id: 'CAR-new', existing_vehicle_id: null })
const linkOnlyCandidate = makeCarinsImportCandidate({ car_id: 'CAR-linked', existing_vehicle_id: 'vehicle-9' })

describe('useCarinsImport', () => {
  beforeEach(() => {
    getCarinsImportCandidatesMock.mockReset()
    importFromCarinsMock.mockReset()
  })

  it('fetchCandidates sets candidates and candidatesLoaded', async () => {
    getCarinsImportCandidatesMock.mockResolvedValue([newCandidate, linkOnlyCandidate])
    const d = useCarinsImport()
    await d.fetchCandidates()
    expect(d.candidates.value).toEqual([newCandidate, linkOnlyCandidate])
    expect(d.candidatesLoaded.value).toBe(true)
    expect(d.candidatesLoading.value).toBe(false)
  })

  it('fetchCandidates sets candidatesError on failure', async () => {
    getCarinsImportCandidatesMock.mockRejectedValue(new Error('fail'))
    const d = useCarinsImport()
    await d.fetchCandidates()
    expect(d.candidatesError.value).toBe('fail')
    expect(d.candidatesLoaded.value).toBe(false)
  })

  it('toggle adds and removes a car_id from the selection', () => {
    const d = useCarinsImport()
    d.toggle('CAR-1')
    expect(d.selected.value.has('CAR-1')).toBe(true)
    d.toggle('CAR-1')
    expect(d.selected.value.has('CAR-1')).toBe(false)
  })

  it('selectAll selects every current candidate, clearSelection empties it', async () => {
    getCarinsImportCandidatesMock.mockResolvedValue([newCandidate, linkOnlyCandidate])
    const d = useCarinsImport()
    await d.fetchCandidates()
    d.selectAll()
    expect(d.selected.value).toEqual(new Set(['CAR-new', 'CAR-linked']))
    d.clearSelection()
    expect(d.selected.value.size).toBe(0)
  })

  it('runImport posts the selected car_ids and stores the result', async () => {
    importFromCarinsMock.mockResolvedValue({ created: 1, linked: 1, skipped: 0 })
    const d = useCarinsImport()
    d.toggle('CAR-new')
    d.toggle('CAR-linked')
    const ok = await d.runImport()
    expect(ok).toBe(true)
    expect(importFromCarinsMock).toHaveBeenCalledWith(expect.arrayContaining(['CAR-new', 'CAR-linked']))
    expect(d.result.value).toEqual({ created: 1, linked: 1, skipped: 0 })
    expect(d.importing.value).toBe(false)
    expect(d.selected.value.size).toBe(0)
  })

  it('runImport sets importError and keeps selection on failure', async () => {
    importFromCarinsMock.mockRejectedValue(new Error('boom'))
    const d = useCarinsImport()
    d.toggle('CAR-new')
    const ok = await d.runImport()
    expect(ok).toBe(false)
    expect(d.importError.value).toBe('boom')
    expect(d.result.value).toBeNull()
    expect(d.selected.value.has('CAR-new')).toBe(true)
  })
})
