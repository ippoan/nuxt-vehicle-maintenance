import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  setupApi, teardownApi, mockFetch, stubOk, stub204, assertMock,
  verifyApi, expectMock, isLive, API_BASE, restoreNativeApis, errResponse,
} from '../helpers/api-test-env'
import {
  initApi,
  getVehicles,
  getVehicle,
  createVehicle,
  updateVehicle,
  deleteVehicle,
  getCarInsCandidates,
  linkCarIns,
  unlinkCarIns,
  ApiError,
} from '~/utils/api'
import { makeMaintenanceVehicle, makeCarInsCandidate } from '../helpers/test-data'

describe('maintenance vehicle API', () => {
  beforeEach(async () => {
    restoreNativeApis()
    await setupApi()
  })
  afterEach(() => teardownApi())

  describe('getVehicles', () => {
    it('fetches vehicle list with no filter', async () => {
      const mockData = { items: [], total: 0, page: 1, per_page: 20 }
      await verifyApi(() => getVehicles(), mockData)
      assertMock(() => {
        expectMock(mockFetch).toHaveBeenCalledWith(
          `${API_BASE}/api/maintenance/vehicles`,
          expect.objectContaining({ headers: expect.any(Object) }),
        )
      })
    })

    it('passes q/page/per_page params', async () => {
      const mockData = { items: [], total: 0, page: 2, per_page: 10 }
      await verifyApi(() => getVehicles({ q: '品川', page: 2, per_page: 10 }), mockData)
      assertMock(() => {
        const url = mockFetch.mock.calls[0][0] as string
        expect(url).toContain('q=')
        expect(url).toContain('page=2')
        expect(url).toContain('per_page=10')
      })
    })

    it('passes linked=false (未紐づけのみ) even though it is falsy', async () => {
      const mockData = { items: [], total: 0, page: 1, per_page: 20 }
      await verifyApi(() => getVehicles({ linked: false }), mockData)
      assertMock(() => {
        const url = mockFetch.mock.calls[0][0] as string
        expect(url).toContain('linked=false')
      })
    })

    it('passes linked=true', async () => {
      const mockData = { items: [], total: 0, page: 1, per_page: 20 }
      await verifyApi(() => getVehicles({ linked: true }), mockData)
      assertMock(() => {
        const url = mockFetch.mock.calls[0][0] as string
        expect(url).toContain('linked=true')
      })
    })
  })

  describe('getVehicle', () => {
    it('fetches a single vehicle', async () => {
      const mockVehicle = makeMaintenanceVehicle()
      const result = await verifyApi(() => getVehicle('vehicle-1'), mockVehicle)
      expectMock(result).toEqual(mockVehicle)
      assertMock(() => {
        expectMock(mockFetch).toHaveBeenCalledWith(
          `${API_BASE}/api/maintenance/vehicles/vehicle-1`,
          expect.objectContaining({ headers: expect.any(Object) }),
        )
      })
    })
  })

  describe('createVehicle', () => {
    it('creates a vehicle with registration_number only (car_id は送らない)', async () => {
      const mockVehicle = makeMaintenanceVehicle()
      await verifyApi(() => createVehicle({ registration_number: '品川 100 あ 1234' }), mockVehicle)
      assertMock(() => {
        const [url, opts] = mockFetch.mock.calls[0]
        expect(url).toBe(`${API_BASE}/api/maintenance/vehicles`)
        expect(opts.method).toBe('POST')
        const body = JSON.parse(opts.body)
        expect(body).toEqual({ registration_number: '品川 100 あ 1234' })
        expect(body.car_id).toBeUndefined()
      })
    })
  })

  describe('updateVehicle', () => {
    it('updates a vehicle', async () => {
      const mockVehicle = makeMaintenanceVehicle({ display_name: '2号車' })
      await verifyApi(() => updateVehicle('vehicle-1', { display_name: '2号車' }), mockVehicle)
      assertMock(() => {
        const [url, opts] = mockFetch.mock.calls[0]
        expect(url).toBe(`${API_BASE}/api/maintenance/vehicles/vehicle-1`)
        expect(opts.method).toBe('PUT')
      })
    })
  })

  describe('deleteVehicle', () => {
    it('deletes a vehicle (204)', async () => {
      await verifyApi(() => deleteVehicle('vehicle-1'), undefined, { expect204: true })
      assertMock(() => {
        const [url, opts] = mockFetch.mock.calls[0]
        expect(url).toBe(`${API_BASE}/api/maintenance/vehicles/vehicle-1`)
        expect(opts.method).toBe('DELETE')
      })
    })
  })

  describe('getCarInsCandidates', () => {
    it('fetches candidates for a vehicle', async () => {
      const mockCandidates = [makeCarInsCandidate()]
      const result = await verifyApi(() => getCarInsCandidates('vehicle-1'), mockCandidates)
      expectMock(result).toEqual(mockCandidates)
      assertMock(() => {
        expectMock(mockFetch).toHaveBeenCalledWith(
          `${API_BASE}/api/maintenance/vehicles/vehicle-1/carins-candidates`,
          expect.objectContaining({ headers: expect.any(Object) }),
        )
      })
    })
  })

  describe('linkCarIns', () => {
    it('links a car_id/cert_no candidate', async () => {
      const mockVehicle = makeMaintenanceVehicle({ car_id: 'car-1', cert_no: 'CERT-0001' })
      await verifyApi(() => linkCarIns('vehicle-1', { car_id: 'car-1', cert_no: 'CERT-0001' }), mockVehicle)
      assertMock(() => {
        const [url, opts] = mockFetch.mock.calls[0]
        expect(url).toBe(`${API_BASE}/api/maintenance/vehicles/vehicle-1/carins`)
        expect(opts.method).toBe('PUT')
        expect(JSON.parse(opts.body)).toEqual({ car_id: 'car-1', cert_no: 'CERT-0001' })
      })
    })

    it('throws ApiError(400) when matched_by is none', async () => {
      if (isLive) return
      mockFetch.mockResolvedValueOnce(errResponse(400, 'no match'))
      await expect(linkCarIns('vehicle-1', { cert_no: 'NOPE' })).rejects.toMatchObject({ status: 400 })
    })

    it('throws ApiError(409) when another vehicle already holds it', async () => {
      if (isLive) return
      mockFetch.mockResolvedValueOnce(errResponse(409, 'already linked'))
      await expect(linkCarIns('vehicle-1', { car_id: 'car-1' })).rejects.toMatchObject({ status: 409 })
    })
  })

  describe('unlinkCarIns', () => {
    it('unlinks (204)', async () => {
      await verifyApi(() => unlinkCarIns('vehicle-1'), undefined, { expect204: true })
      assertMock(() => {
        const [url, opts] = mockFetch.mock.calls[0]
        expect(url).toBe(`${API_BASE}/api/maintenance/vehicles/vehicle-1/carins`)
        expect(opts.method).toBe('DELETE')
      })
    })
  })

  describe('errors', () => {
    it('throws for unauthorized (401) and calls onUnauthorized', async () => {
      if (isLive) return
      const onUnauthorized = vi.fn()
      initApi(API_BASE, undefined, undefined, onUnauthorized)
      mockFetch.mockResolvedValueOnce(errResponse(401))
      await expect(getVehicle('vehicle-1')).rejects.toThrow('Unauthorized')
      expect(onUnauthorized).toHaveBeenCalled()
    })

    it('throws ApiError with status + body text for other errors', async () => {
      if (isLive) return
      mockFetch.mockResolvedValueOnce(errResponse(500, 'boom'))
      await expect(getVehicle('vehicle-1')).rejects.toBeInstanceOf(ApiError)
      mockFetch.mockResolvedValueOnce(errResponse(500, 'boom'))
      await expect(getVehicle('vehicle-1')).rejects.toMatchObject({ status: 500, message: 'boom' })
    })

    it('sends Authorization header when a token getter is set', async () => {
      if (isLive) return
      initApi(API_BASE, () => 'jwt-token')
      stubOk(makeMaintenanceVehicle())
      await getVehicle('vehicle-1')
      const [, opts] = mockFetch.mock.calls[0]
      expect(opts.headers.Authorization).toBe('Bearer jwt-token')
    })

    it('never sends X-Tenant-ID (tenant はフロントから付けない)', async () => {
      if (isLive) return
      initApi(API_BASE, () => 'jwt-token')
      stubOk(makeMaintenanceVehicle())
      await getVehicle('vehicle-1')
      const [, opts] = mockFetch.mock.calls[0]
      expect(opts.headers['X-Tenant-ID']).toBeUndefined()
    })

    it('throws when initApi has not been called', async () => {
      if (isLive) return
      // 他テストの initApi() はモジュール内の module-scope 変数に残るため、
      // vi.resetModules() で全く別のモジュールインスタンスを作って未初期化の
      // 状態を再現する。
      vi.resetModules()
      const fresh = await import('~/utils/api')
      await expect(fresh.getVehicle('vehicle-1')).rejects.toThrow('API 未初期化')
    })
  })
})
