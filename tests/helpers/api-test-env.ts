/* v8 ignore start */
/**
 * API テスト共通環境
 *
 * API_BASE_URL が設定されていれば実 API (live)、未設定なら mock fetch。
 * backend (alc-maintenance crate) は #c651-2 がまだマージされていないため、
 * このタスク時点では常に mock (isLive = false) で走る。has_integration は
 * .github/workflows/test.yml で false にしてあり、docker-compose.test.yml の
 * 実 API 経路は使わない。#c651-2 マージ後の再有効化に備えて nuxt-trouble と
 * 同じ形にしておく。
 */
import { vi, expect } from 'vitest'
import { initApi } from '~/utils/api'

export const isLive = !!process.env.API_BASE_URL
const API_BASE = process.env.API_BASE_URL || 'https://api.example.com'

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

export function restoreNativeApis() {
  if (!isLive) return
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  globalThis.Blob = require('node:buffer').Blob
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  globalThis.URL = require('node:url').URL
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const undici = require('undici')
  globalThis.FormData = undici.FormData
  globalThis.fetch = undici.fetch
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
