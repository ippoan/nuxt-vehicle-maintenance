/* v8 ignore start */
import type { MaintenanceVehicle, CarInsCandidate, MaintenanceCategory, MaintenanceRecord, MaintenanceFile } from '~/types'

export function makeMaintenanceVehicle(overrides: Partial<MaintenanceVehicle> = {}): MaintenanceVehicle {
  return {
    id: 'vehicle-1',
    tenant_id: 'tenant-1',
    registration_number: '品川 100 あ 1234',
    display_name: '1号車',
    note: null,
    car_id: null,
    cert_no: null,
    car_inspection_expiry: null,
    created_at: '2026-01-01T00:00:00',
    updated_at: '2026-01-01T00:00:00',
    ...overrides,
  }
}

export function makeCarInsCandidate(overrides: Partial<CarInsCandidate> = {}): CarInsCandidate {
  return {
    car_id: 'car-1',
    cert_no: 'CERT-0001',
    registration_number: '品川 100 あ 1234',
    expiry_date: '2027-03-31',
    matched_by: 'registration_number',
    ...overrides,
  }
}

export function makeMaintenanceCategory(overrides: Partial<MaintenanceCategory> = {}): MaintenanceCategory {
  return {
    id: 'category-1',
    tenant_id: 'tenant-1',
    name: '定期点検',
    sort_order: 1,
    created_at: '2026-01-01T00:00:00',
    ...overrides,
  }
}

export function makeMaintenanceRecord(overrides: Partial<MaintenanceRecord> = {}): MaintenanceRecord {
  return {
    id: 'record-1',
    tenant_id: 'tenant-1',
    vehicle_id: 'vehicle-1',
    category_id: 'category-1',
    performed_on: '2026-01-15',
    odometer_km: 12000,
    vendor: 'テスト整備工場',
    description: 'オイル交換',
    cost: '5000.00',
    next_due_on: '2026-07-15',
    created_by: null,
    created_at: '2026-01-15T00:00:00',
    updated_at: '2026-01-15T00:00:00',
    deleted_at: null,
    ...overrides,
  }
}

export function makeMaintenanceFile(overrides: Partial<MaintenanceFile> = {}): MaintenanceFile {
  return {
    id: 'file-1',
    tenant_id: 'tenant-1',
    record_id: 'record-1',
    filename: 'photo.jpg',
    content_type: 'image/jpeg',
    storage_key: 'tenant-1/record-1/file-1',
    size_bytes: 12345,
    created_at: '2026-01-15T00:00:00',
    deleted_at: null,
    ...overrides,
  }
}
