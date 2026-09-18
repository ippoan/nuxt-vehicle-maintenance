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
  getMaintenanceCategories,
  createMaintenanceCategory,
  updateMaintenanceCategorySortOrder,
  deleteMaintenanceCategory,
  getMaintenanceRecords,
  createMaintenanceRecord,
  getMaintenanceRecord,
  updateMaintenanceRecord,
  deleteMaintenanceRecord,
  getRecordFiles,
  uploadRecordFile,
  deleteFile,
  downloadFile,
  getFileBlobUrl,
  ApiError,
} from '~/utils/api'
import { makeMaintenanceVehicle, makeCarinsCandidate, makeMaintenanceCategory, makeMaintenanceRecord, makeMaintenanceFile } from '../helpers/test-data'

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
      const mockCandidates = [makeCarinsCandidate()]
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
      const mockVehicle = makeMaintenanceVehicle({ car_id: 'car-1', carins_linked_at: '2026-02-03T09:00:00Z' })
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

  describe('getMaintenanceCategories', () => {
    it('fetches category list', async () => {
      const mockCategories = [makeMaintenanceCategory()]
      const result = await verifyApi(() => getMaintenanceCategories(), mockCategories)
      expectMock(result).toEqual(mockCategories)
      assertMock(() => {
        expectMock(mockFetch).toHaveBeenCalledWith(
          `${API_BASE}/api/maintenance/categories`,
          expect.objectContaining({ headers: expect.any(Object) }),
        )
      })
    })
  })

  describe('createMaintenanceCategory', () => {
    it('creates a category', async () => {
      const mockCategory = makeMaintenanceCategory({ name: '車検' })
      await verifyApi(() => createMaintenanceCategory({ name: '車検' }), mockCategory)
      assertMock(() => {
        const [url, opts] = mockFetch.mock.calls[0]
        expect(url).toBe(`${API_BASE}/api/maintenance/categories`)
        expect(opts.method).toBe('POST')
        expect(JSON.parse(opts.body)).toEqual({ name: '車検' })
      })
    })

    it('throws ApiError(409) when the same name already exists', async () => {
      if (isLive) return
      mockFetch.mockResolvedValueOnce(errResponse(409, 'duplicate name'))
      await expect(createMaintenanceCategory({ name: '定期点検' })).rejects.toMatchObject({ status: 409 })
    })
  })

  describe('updateMaintenanceCategorySortOrder', () => {
    it('updates sort_order', async () => {
      const mockCategory = makeMaintenanceCategory({ sort_order: 3 })
      await verifyApi(() => updateMaintenanceCategorySortOrder('category-1', 3), mockCategory)
      assertMock(() => {
        const [url, opts] = mockFetch.mock.calls[0]
        expect(url).toBe(`${API_BASE}/api/maintenance/categories/category-1`)
        expect(opts.method).toBe('PUT')
        expect(JSON.parse(opts.body)).toEqual({ sort_order: 3 })
      })
    })

    it('throws ApiError(404) when the category does not exist', async () => {
      if (isLive) return
      mockFetch.mockResolvedValueOnce(errResponse(404, 'not found'))
      await expect(updateMaintenanceCategorySortOrder('missing', 1)).rejects.toMatchObject({ status: 404 })
    })
  })

  describe('deleteMaintenanceCategory', () => {
    it('deletes a category (204)', async () => {
      await verifyApi(() => deleteMaintenanceCategory('category-1'), undefined, { expect204: true })
      assertMock(() => {
        const [url, opts] = mockFetch.mock.calls[0]
        expect(url).toBe(`${API_BASE}/api/maintenance/categories/category-1`)
        expect(opts.method).toBe('DELETE')
      })
    })

    it('throws ApiError(404) when the category does not exist', async () => {
      if (isLive) return
      mockFetch.mockResolvedValueOnce(errResponse(404, 'not found'))
      await expect(deleteMaintenanceCategory('missing')).rejects.toMatchObject({ status: 404 })
    })
  })

  describe('getMaintenanceRecords', () => {
    it('fetches record list with no filter', async () => {
      const mockData = { records: [], total: 0, page: 1, per_page: 20 }
      await verifyApi(() => getMaintenanceRecords(), mockData)
      assertMock(() => {
        expectMock(mockFetch).toHaveBeenCalledWith(
          `${API_BASE}/api/maintenance/records`,
          expect.objectContaining({ headers: expect.any(Object) }),
        )
      })
    })

    it('passes vehicle_id/category_id/date_from/date_to/q/page/per_page params', async () => {
      const mockData = { records: [], total: 0, page: 2, per_page: 10 }
      await verifyApi(() => getMaintenanceRecords({
        vehicle_id: 'vehicle-1',
        category_id: 'category-1',
        date_from: '2026-01-01',
        date_to: '2026-12-31',
        q: 'オイル',
        page: 2,
        per_page: 10,
      }), mockData)
      assertMock(() => {
        const url = mockFetch.mock.calls[0][0] as string
        expect(url).toContain('vehicle_id=vehicle-1')
        expect(url).toContain('category_id=category-1')
        expect(url).toContain('date_from=2026-01-01')
        expect(url).toContain('date_to=2026-12-31')
        expect(url).toContain('q=')
        expect(url).toContain('page=2')
        expect(url).toContain('per_page=10')
      })
    })
  })

  describe('createMaintenanceRecord', () => {
    it('creates a record', async () => {
      const mockRecord = makeMaintenanceRecord()
      const input = {
        vehicle_id: 'vehicle-1',
        category_id: 'category-1',
        performed_on: '2026-01-15',
        odometer_km: 12000,
        vendor: 'テスト整備工場',
        description: 'オイル交換',
        cost: 5000,
        next_due_on: '2026-07-15',
      }
      await verifyApi(() => createMaintenanceRecord(input), mockRecord)
      assertMock(() => {
        const [url, opts] = mockFetch.mock.calls[0]
        expect(url).toBe(`${API_BASE}/api/maintenance/records`)
        expect(opts.method).toBe('POST')
        expect(JSON.parse(opts.body)).toEqual(input)
      })
    })

    it('throws ApiError(400) when vehicle_id/category_id belongs to another tenant', async () => {
      if (isLive) return
      mockFetch.mockResolvedValueOnce(errResponse(400, 'vehicle or category not found'))
      await expect(createMaintenanceRecord({
        vehicle_id: 'other-tenant-vehicle',
        category_id: 'category-1',
        performed_on: '2026-01-15',
      })).rejects.toMatchObject({ status: 400 })
    })
  })

  describe('getMaintenanceRecord', () => {
    it('fetches a single record', async () => {
      const mockRecord = makeMaintenanceRecord()
      const result = await verifyApi(() => getMaintenanceRecord('record-1'), mockRecord)
      expectMock(result).toEqual(mockRecord)
      assertMock(() => {
        expectMock(mockFetch).toHaveBeenCalledWith(
          `${API_BASE}/api/maintenance/records/record-1`,
          expect.objectContaining({ headers: expect.any(Object) }),
        )
      })
    })

    it('throws ApiError(404) when the record does not exist', async () => {
      if (isLive) return
      mockFetch.mockResolvedValueOnce(errResponse(404, 'not found'))
      await expect(getMaintenanceRecord('missing')).rejects.toMatchObject({ status: 404 })
    })
  })

  describe('updateMaintenanceRecord', () => {
    it('updates a record', async () => {
      const mockRecord = makeMaintenanceRecord({ vendor: '別の整備工場' })
      await verifyApi(() => updateMaintenanceRecord('record-1', { vendor: '別の整備工場' }), mockRecord)
      assertMock(() => {
        const [url, opts] = mockFetch.mock.calls[0]
        expect(url).toBe(`${API_BASE}/api/maintenance/records/record-1`)
        expect(opts.method).toBe('PUT')
      })
    })

    it('throws ApiError(400) when category_id belongs to another tenant', async () => {
      if (isLive) return
      mockFetch.mockResolvedValueOnce(errResponse(400, 'category not found'))
      await expect(updateMaintenanceRecord('record-1', { category_id: 'other-tenant-category' })).rejects.toMatchObject({ status: 400 })
    })

    it('throws ApiError(404) when the record does not exist', async () => {
      if (isLive) return
      mockFetch.mockResolvedValueOnce(errResponse(404, 'not found'))
      await expect(updateMaintenanceRecord('missing', { vendor: 'x' })).rejects.toMatchObject({ status: 404 })
    })
  })

  describe('deleteMaintenanceRecord', () => {
    it('deletes (soft-deletes) a record (204)', async () => {
      await verifyApi(() => deleteMaintenanceRecord('record-1'), undefined, { expect204: true })
      assertMock(() => {
        const [url, opts] = mockFetch.mock.calls[0]
        expect(url).toBe(`${API_BASE}/api/maintenance/records/record-1`)
        expect(opts.method).toBe('DELETE')
      })
    })

    it('throws ApiError(404) when the record does not exist', async () => {
      if (isLive) return
      mockFetch.mockResolvedValueOnce(errResponse(404, 'not found'))
      await expect(deleteMaintenanceRecord('missing')).rejects.toMatchObject({ status: 404 })
    })
  })

  describe('getRecordFiles', () => {
    it('fetches file list for a record', async () => {
      const mockFiles = [makeMaintenanceFile()]
      const result = await verifyApi(() => getRecordFiles('record-1'), mockFiles)
      expectMock(result).toEqual(mockFiles)
      assertMock(() => {
        expectMock(mockFetch).toHaveBeenCalledWith(
          `${API_BASE}/api/maintenance/records/record-1/files`,
          expect.objectContaining({ headers: expect.any(Object) }),
        )
      })
    })

    it('throws ApiError(404) when the record does not belong to the tenant / does not exist', async () => {
      if (isLive) return
      mockFetch.mockResolvedValueOnce(errResponse(404, 'not found'))
      await expect(getRecordFiles('missing')).rejects.toMatchObject({ status: 404 })
    })

    it('throws ApiError(503) when storage is not configured', async () => {
      if (isLive) return
      mockFetch.mockResolvedValueOnce(errResponse(503, 'storage unavailable'))
      await expect(getRecordFiles('record-1')).rejects.toMatchObject({ status: 503 })
    })
  })

  describe('uploadRecordFile', () => {
    it('uploads a single file as multipart/form-data (no explicit Content-Type)', async () => {
      if (isLive) return
      const mockFile = makeMaintenanceFile()
      stubOk(mockFile)
      const file = new File(['content'], 'photo.jpg', { type: 'image/jpeg' })
      const result = await uploadRecordFile('record-1', file)
      expect(result).toEqual(mockFile)
      const [url, opts] = mockFetch.mock.calls[0]
      expect(url).toBe(`${API_BASE}/api/maintenance/records/record-1/files`)
      expect(opts.method).toBe('POST')
      expect(opts.body).toBeInstanceOf(FormData)
      // isFormData 分岐: FormData のときは Content-Type を手で付けない
      // (fetch がブラウザ側で boundary 付きの値を自動生成する)。
      expect(opts.headers['Content-Type']).toBeUndefined()
    })

    it('throws ApiError(404) when the record does not exist', async () => {
      if (isLive) return
      mockFetch.mockResolvedValueOnce(errResponse(404, 'not found'))
      const file = new File(['content'], 'photo.jpg', { type: 'image/jpeg' })
      await expect(uploadRecordFile('missing', file)).rejects.toMatchObject({ status: 404 })
    })

    it('throws ApiError(503) when storage is not configured', async () => {
      if (isLive) return
      mockFetch.mockResolvedValueOnce(errResponse(503, 'storage unavailable'))
      const file = new File(['content'], 'photo.jpg', { type: 'image/jpeg' })
      await expect(uploadRecordFile('record-1', file)).rejects.toMatchObject({ status: 503 })
    })
  })

  describe('deleteFile', () => {
    it('deletes a file (204, no body)', async () => {
      await verifyApi(() => deleteFile('file-1'), undefined, { expect204: true })
      assertMock(() => {
        const [url, opts] = mockFetch.mock.calls[0]
        expect(url).toBe(`${API_BASE}/api/maintenance/files/file-1`)
        expect(opts.method).toBe('DELETE')
      })
    })

    it('throws ApiError(404) when the file does not exist', async () => {
      if (isLive) return
      mockFetch.mockResolvedValueOnce(errResponse(404, 'not found'))
      await expect(deleteFile('missing')).rejects.toMatchObject({ status: 404 })
    })
  })

  describe('downloadFile', () => {
    it('triggers a file download via a temporary <a> element', async () => {
      if (isLive) return
      const blobUrl = 'blob:http://localhost/fake'
      const clickMock = vi.fn()
      const createElementSpy = vi.spyOn(document, 'createElement').mockReturnValue({
        href: '', download: '', click: clickMock,
      } as unknown as HTMLElement)
      const createObjectURLSpy = vi.spyOn(URL, 'createObjectURL').mockReturnValue(blobUrl)
      const revokeObjectURLSpy = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {})

      mockFetch.mockResolvedValueOnce({
        ok: true,
        blob: () => Promise.resolve(new Blob(['data'])),
      })
      await downloadFile('file-1', 'photo.jpg')
      const [calledUrl] = mockFetch.mock.calls[0]
      expect(calledUrl).toBe(`${API_BASE}/api/maintenance/files/file-1/download`)
      expect(clickMock).toHaveBeenCalled()
      expect(revokeObjectURLSpy).toHaveBeenCalledWith(blobUrl)

      createElementSpy.mockRestore()
      createObjectURLSpy.mockRestore()
      revokeObjectURLSpy.mockRestore()
    })

    it('throws ApiError on non-ok response', async () => {
      if (isLive) return
      mockFetch.mockResolvedValueOnce({ ok: false, status: 404, statusText: 'Not Found' })
      await expect(downloadFile('file-1', 'photo.jpg')).rejects.toMatchObject({ status: 404 })
    })
  })

  describe('getFileBlobUrl', () => {
    it('returns an object URL for the fetched blob', async () => {
      if (isLive) return
      const blobUrl = 'blob:http://localhost/fake'
      const createObjectURLSpy = vi.spyOn(URL, 'createObjectURL').mockReturnValue(blobUrl)
      mockFetch.mockResolvedValueOnce({
        ok: true,
        blob: () => Promise.resolve(new Blob(['data'])),
      })
      const url = await getFileBlobUrl('file-1')
      expect(url).toBe(blobUrl)
      const [calledUrl] = mockFetch.mock.calls[0]
      expect(calledUrl).toBe(`${API_BASE}/api/maintenance/files/file-1/download`)
      createObjectURLSpy.mockRestore()
    })

    it('throws ApiError on non-ok response', async () => {
      if (isLive) return
      mockFetch.mockResolvedValueOnce({ ok: false, status: 503, statusText: 'Service Unavailable' })
      await expect(getFileBlobUrl('file-1')).rejects.toMatchObject({ status: 503 })
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
