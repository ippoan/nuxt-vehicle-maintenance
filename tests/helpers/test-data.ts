/* v8 ignore start */
import type { MaintenanceVehicle, CarInsCandidate } from '~/types'

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
