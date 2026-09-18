import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { allStubs } from '../helpers/nuxt-stubs'

const redirectToLoginMock = vi.fn()

vi.mock('~/composables/useAuth', () => ({
  useAuth: () => ({ redirectToLogin: redirectToLoginMock }),
}))

vi.mock('#app/nuxt', () => ({
  useRuntimeConfig: () => ({ public: { authWorkerUrl: '' } }),
  useNuxtApp: () => ({}),
  defineAppConfig: <T>(c: T) => c,
}))

import LoginPage from '~/pages/login.vue'

describe('login page', () => {
  it('renders a login button', () => {
    const wrapper = mount(LoginPage, { global: { stubs: allStubs } })
    expect(wrapper.text()).toContain('車両整備記録')
    expect(wrapper.text()).toContain('Google でログイン')
  })
})
