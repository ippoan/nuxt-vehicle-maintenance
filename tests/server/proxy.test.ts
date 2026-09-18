import { describe, it, expect, vi, beforeEach } from 'vitest'

// 転送 + introspect 検証 + identity 注入の本体は auth-worker `/alc-proxy/*` に
// 集約され、consumer は @ippoan/auth-client/server の
// createAuthWorkerProxyHandler で service binding (AUTH_WORKER) に
// thin-forward するだけ (nuxt-trouble #434 step 3 方式 B と同型)。
// このテストでは本 repo の server route の wiring だけ固定する:
//   1. INTERNAL_SHARED_SECRET binding を resolve して渡す (未設定は throw)
//   2. AUTH_WORKER service binding を解決して authWorkerFetch に渡す (未設定は throw)
//   3. pathPrefix='/' を渡す (client path が既に /api/ を含むため二重 /api 防止)
//   4. createAuthWorkerProxyHandler の戻り値で proxy(event) を返す

const { proxyFn, createAuthWorkerProxyHandlerMock } = vi.hoisted(() => {
  const proxyFn = vi.fn(() => 'PROXY_RESULT')
  ;(globalThis as Record<string, unknown>).defineEventHandler = (fn: unknown) => fn
  return {
    proxyFn,
    createAuthWorkerProxyHandlerMock: vi.fn((_opts: unknown) => proxyFn),
  }
})

vi.mock('@ippoan/auth-client/server', () => ({
  createAuthWorkerProxyHandler: createAuthWorkerProxyHandlerMock,
}))

import handler from '../../server/api/proxy/[...path]'

interface ProxyWiring {
  sharedSecret: string
  authWorkerFetch: (event: unknown) => typeof fetch
  pathPrefix: string
}

const call = (event: unknown) => (handler as unknown as (e: unknown) => Promise<unknown>)(event)
const eventWith = (env: Record<string, unknown>) => ({ context: { cloudflare: { env } } })

describe('proxy handler wiring (createAuthWorkerProxyHandler)', () => {
  beforeEach(() => {
    createAuthWorkerProxyHandlerMock.mockClear()
    proxyFn.mockClear()
  })

  it('INTERNAL_SHARED_SECRET + AUTH_WORKER があれば委譲し proxy(event) を返す', async () => {
    const event = eventWith({
      INTERNAL_SHARED_SECRET: 'secret-x',
      AUTH_WORKER: { fetch: vi.fn() },
    })
    const res = await call(event)
    expect(createAuthWorkerProxyHandlerMock).toHaveBeenCalledTimes(1)
    const opts = createAuthWorkerProxyHandlerMock.mock.calls[0]![0] as ProxyWiring
    expect(opts.sharedSecret).toBe('secret-x')
    expect(opts.pathPrefix).toBe('/')
    expect(typeof opts.authWorkerFetch).toBe('function')
    expect(proxyFn).toHaveBeenCalledWith(event)
    expect(res).toBe('PROXY_RESULT')
  })

  it('INTERNAL_SHARED_SECRET が Secrets Store binding (.get()) でも解決する', async () => {
    const event = eventWith({
      INTERNAL_SHARED_SECRET: { get: async () => 'from-store' },
      AUTH_WORKER: { fetch: vi.fn() },
    })
    await call(event)
    const opts = createAuthWorkerProxyHandlerMock.mock.calls[0]![0] as ProxyWiring
    expect(opts.sharedSecret).toBe('from-store')
  })

  it('INTERNAL_SHARED_SECRET 未設定なら委譲せず throw する', async () => {
    await expect(call(eventWith({ AUTH_WORKER: { fetch: vi.fn() } }))).rejects.toThrow()
    expect(createAuthWorkerProxyHandlerMock).not.toHaveBeenCalled()
  })

  it('AUTH_WORKER service binding 未設定なら委譲せず throw する (fail-closed)', async () => {
    await expect(call(eventWith({ INTERNAL_SHARED_SECRET: 'x' }))).rejects.toThrow()
    expect(createAuthWorkerProxyHandlerMock).not.toHaveBeenCalled()
  })
})
