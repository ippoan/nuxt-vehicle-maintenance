import { describe, it, expect } from 'vitest'

// useAuth is a re-export from @ippoan/auth-client.
// Unit tests for useAuth internals belong in auth-client's own test suite.
// This file verifies the re-export wiring only.

describe('useAuth re-export', () => {
  it('re-exports useAuth from @ippoan/auth-client', async () => {
    const mod = await import('~/composables/useAuth')
    expect(mod.useAuth).toBeDefined()
    expect(typeof mod.useAuth).toBe('function')
  })

  it('re-exports AuthToolbar', async () => {
    const mod = await import('~/composables/useAuth')
    expect(mod.AuthToolbar).toBeDefined()
  })
})
