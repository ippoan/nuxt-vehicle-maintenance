import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ref } from 'vue'

const initApiMock = vi.fn()
const loadFromStorageMock = vi.fn()
const recoverFromCookieMock = vi.fn()
const clearAuthMock = vi.fn()
const isAuthenticatedRef = ref(false)

vi.mock('~/utils/api', () => ({
  initApi: (...args: unknown[]) => initApiMock(...args),
}))

vi.mock('~/composables/useAuth', () => ({
  useAuth: () => ({
    loadFromStorage: loadFromStorageMock,
    recoverFromCookie: recoverFromCookieMock,
    isAuthenticated: isAuthenticatedRef,
    clearAuth: clearAuthMock,
    token: ref('test-token'),
    isLoading: ref(false),
  }),
}))

vi.mock('#app/nuxt', async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>()
  return {
    ...actual,
    useRuntimeConfig: () => ({
      public: { apiBase: 'https://api.test', stagingTenantId: 'stg-tenant' },
    }),
  }
})

vi.mock('#app/composables/router', () => ({
  navigateTo: vi.fn(),
}))

import { useAppInit } from '~/composables/useAppInit'

describe('useAppInit', () => {
  beforeEach(() => {
    initApiMock.mockReset()
    loadFromStorageMock.mockReset()
    recoverFromCookieMock.mockReset()
    clearAuthMock.mockReset()
    isAuthenticatedRef.value = false
  })

  it('returns apiBase and stagingTenantId from config', () => {
    const { apiBase, stagingTenantId } = useAppInit()
    expect(apiBase).toBe('https://api.test')
    expect(stagingTenantId).toBe('stg-tenant')
  })

  it('setup calls initApi via /api/proxy without a tenantIdGetter, and loadFromStorage', async () => {
    const { setup } = useAppInit()
    await setup()

    // tenant はここでは一切渡さない (auth-worker が introspect で注入する)。
    // 引数は (baseUrl, tokenGetter, refresher, unauthorizedHandler) の 4 つのみ。
    expect(initApiMock).toHaveBeenCalledWith(
      '/api/proxy',
      expect.any(Function),
      undefined,
      expect.any(Function),
    )
    expect(loadFromStorageMock).toHaveBeenCalled()

    const tokenGetter = initApiMock.mock.calls[0][1]
    expect(tokenGetter()).toBe('test-token')
  })

  it('setup recovers from shared cookie when not authenticated', async () => {
    isAuthenticatedRef.value = false
    const { setup } = useAppInit()
    await setup()
    expect(recoverFromCookieMock).toHaveBeenCalled()
  })

  it('setup skips cookie recovery when already authenticated', async () => {
    isAuthenticatedRef.value = true
    const { setup } = useAppInit()
    await setup()
    expect(recoverFromCookieMock).not.toHaveBeenCalled()
  })

  it('returns isLoading ref', () => {
    const { isLoading } = useAppInit()
    expect(isLoading.value).toBe(false)
  })

  it('onUnauthorized handler clears auth and navigates to /login', async () => {
    const { setup } = useAppInit()
    await setup()

    const onUnauthorized = initApiMock.mock.calls[0][3] as () => void
    onUnauthorized()

    expect(clearAuthMock).toHaveBeenCalled()
    const { navigateTo } = await import('#app/composables/router')
    expect(navigateTo).toHaveBeenCalledWith('/login')
  })
})
