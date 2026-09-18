import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockIsAuthenticated = { value: false }
const mockIsLoading = { value: false }
const mockStagingTenantId = { value: '' }
const navigateToMock = vi.fn((path: string) => ({ __navigateTo: path }))

vi.mock('@ippoan/auth-client', () => ({
  authMiddleware: (options: { publicPaths?: string[]; loginPath?: string }) => {
    const publicPaths = options?.publicPaths || ['/login']
    const loginPath = options?.loginPath || '/login'

    return (to: { path: string }) => {
      if (mockStagingTenantId.value) return
      if (publicPaths.some((p: string) => to.path.startsWith(p))) return

      if (mockIsLoading.value) return
      if (!mockIsAuthenticated.value) {
        return navigateToMock(loginPath)
      }
    }
  },
}))

vi.mock('#app/composables/router', () => ({
  navigateTo: (...args: unknown[]) => navigateToMock(...(args as [string])),
  defineNuxtRouteMiddleware: (fn: Function) => fn,
}))

vi.mock('#app/nuxt', () => ({
  useRuntimeConfig: () => ({ public: { stagingTenantId: '' } }),
  useNuxtApp: () => ({}),
}))

import middleware from '~/middleware/auth.global'

describe('auth.global middleware', () => {
  beforeEach(() => {
    mockIsAuthenticated.value = false
    mockIsLoading.value = false
    mockStagingTenantId.value = ''
    navigateToMock.mockClear()
  })

  it('skips /login path', () => {
    const result = (middleware as Function)({ path: '/login' })
    expect(result).toBeUndefined()
  })

  it('skips /auth/callback path', () => {
    const result = (middleware as Function)({ path: '/auth/callback' })
    expect(result).toBeUndefined()
  })

  it('skips when isLoading is true', () => {
    mockIsLoading.value = true
    const result = (middleware as Function)({ path: '/vehicles/new' })
    expect(result).toBeUndefined()
  })

  it('redirects to /login when not authenticated', () => {
    mockIsAuthenticated.value = false
    const result = (middleware as Function)({ path: '/' })
    expect(navigateToMock).toHaveBeenCalledWith('/login')
    expect(result).toEqual({ __navigateTo: '/login' })
  })

  it('allows access when authenticated', () => {
    mockIsAuthenticated.value = true
    const result = (middleware as Function)({ path: '/' })
    expect(result).toBeUndefined()
    expect(navigateToMock).not.toHaveBeenCalled()
  })
})
