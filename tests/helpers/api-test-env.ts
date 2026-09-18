/* v8 ignore start */
/**
 * API テスト共通環境
 *
 * API_BASE_URL が設定されていれば実 API (live)、未設定なら mock fetch。
 * live で走らせるのは tests/integration/ 配下だけで、そこは
 * .github/workflows/test.yml の integration_test_command が
 * docker-compose.test.yml の API (alc-maintenance crate) を相手に回す。
 * それ以外の unit テストは常に mock (isLive = false)。
 *
 * ★ live では fetch に X-Tenant-ID を被せる (下の withInjectedIdentity)。
 *   本番では auth-worker がこのヘッダーを注入し、rust-alc-api の
 *   require_tenant_header (crates/alc-core/src/auth_middleware.rs:65) は
 *   欠落を 401 にする。app/utils/api.ts は設計上テナントを一切送らない
 *   (送れると詐称の穴になる) ので、integration では**テスト側が auth-worker の
 *   代役**をする。app 側のコードには手を入れない。
 */
import { vi, expect } from 'vitest'
import { initApi } from '~/utils/api'

export const isLive = !!process.env.API_BASE_URL
const API_BASE = process.env.API_BASE_URL || 'https://api.example.com'

// tests/fixtures/seed.sql と一致させること。
export const TEST_TENANT_ID = '11111111-1111-1111-1111-111111111111'
/** 車検証 未紐づけ (seed.sql の ...301) */
export const TEST_VEHICLE_UNLINKED_ID = '33333333-3333-3333-3333-333333333301'
/** 車検証 CAR00000000002 を紐づけ済み (seed.sql の ...302) */
export const TEST_VEHICLE_LINKED_ID = '33333333-3333-3333-3333-333333333302'
export const TEST_CATEGORY_ID = '22222222-2222-2222-2222-222222222201'
export const TEST_RECORD_ID = '44444444-4444-4444-4444-444444444401'
/**
 * TEST_VEHICLE_UNLINKED_ID の登録番号に一致する車検証 (seed.sql)。
 * 形は normalize_carins_numbers の検査に合わせる — cert_no は 12〜13 桁の数字、
 * car_id は 14 文字の英数字。外れた値は照合前に 400 で弾かれる。
 */
export const TEST_CERT_NO = '100000000001'
export const TEST_CAR_ID = 'CAR00000000001'
/** TEST_VEHICLE_LINKED_ID が既に持っている car_id (409 の確認に使う) */
export const TEST_LINKED_CAR_ID = 'CAR00000000002'
/** 形式は正しいが実在しない cert_no (「一致無し」の 400 を出す) */
export const TEST_ABSENT_CERT_NO = '999999999999'

export const mockFetch = vi.fn()

export function okJson(data: unknown = {}) {
  return { ok: true, status: 200, json: () => Promise.resolve(data) }
}

export function ok204() {
  return { ok: true, status: 204 }
}

export function errResponse(status: number, body = '') {
  return { ok: false, status, statusText: 'Error', text: () => Promise.resolve(body) }
}

export function stubResponse(response: unknown) {
  if (!isLive) mockFetch.mockResolvedValueOnce(response)
}

export function stubOk(data: unknown = {}) {
  stubResponse(okJson(data))
}

export function stub204() {
  stubResponse(ok204())
}

export function assertMock(fn: () => void) {
  if (!isLive) fn()
}

export async function verifyApi(
  fn: () => Promise<unknown>,
  mockResponse: unknown = {},
  opts: { expect204?: boolean } = {},
) {
  if (opts.expect204) stub204()
  else stubOk(mockResponse)
  const result = await fn()
  if (opts.expect204) {
    expect(result).toBeUndefined()
  }
  return result
}

export function expectMock(target: unknown) {
  if (isLive) {
    const noop = new Proxy({}, { get: () => () => noop })
    return noop as ReturnType<typeof expect>
  }
  return expect(target)
}

async function waitForApi(url: string, maxRetries = 30): Promise<void> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const res = await fetch(`${url}/api/health`)
      if (res.ok) return
    } catch {
      // not ready yet
    }
    await new Promise(r => setTimeout(r, 1000))
  }
  throw new Error(`API not ready after ${maxRetries} retries`)
}

let liveReady = false

/**
 * live 用の fetch ラッパ。本番で auth-worker が注入する identity ヘッダーを
 * ここで足す。app/utils/api.ts 側は一切テナントを送らないままなので、
 * 「フロントは X-Tenant-ID を送らない」という unit テストの前提は壊れない
 * (このラッパは isLive のときしか掛からない)。
 */
function withInjectedIdentity(base: typeof fetch): typeof fetch {
  return ((input: Parameters<typeof fetch>[0], init?: Parameters<typeof fetch>[1]) => {
    const headers = new Headers(init?.headers)
    headers.set('X-Tenant-ID', TEST_TENANT_ID)
    return base(input, { ...init, headers })
  }) as typeof fetch
}

export function restoreNativeApis() {
  if (!isLive) return
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  globalThis.Blob = require('node:buffer').Blob
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  globalThis.URL = require('node:url').URL
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const undici = require('undici')
  globalThis.FormData = undici.FormData
  // undici.fetch から毎回組み直すので、複数回呼ばれても二重ラップにならない。
  globalThis.fetch = withInjectedIdentity(undici.fetch)
}

export async function setupApi() {
  if (isLive) {
    if (!liveReady) {
      await waitForApi(API_BASE)
      liveReady = true
    }
    initApi(API_BASE)
  } else {
    vi.stubGlobal('fetch', mockFetch)
    initApi(API_BASE)
    mockFetch.mockReset()
  }
}

export function teardownApi() {
  if (!isLive) {
    vi.unstubAllGlobals()
  }
}

export { API_BASE }
