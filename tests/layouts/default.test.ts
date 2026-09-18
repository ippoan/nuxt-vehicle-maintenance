import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { allStubs } from '../helpers/nuxt-stubs'

vi.mock('~/composables/useAuth', () => ({
  AuthToolbar: { template: '<div data-testid="auth-toolbar"><button>Apps</button></div>' },
}))

vi.mock('#app/composables/router', () => ({
  useRoute: () => ({ path: '/' }),
}))

import DefaultLayout from '~/layouts/default.vue'

describe('default layout', () => {
  it('renders navigation and AuthToolbar', () => {
    const wrapper = mount(DefaultLayout, { global: { stubs: allStubs }, slots: { default: '<p>content</p>' } })
    expect(wrapper.text()).toContain('車両一覧')
    expect(wrapper.find('[data-testid="auth-toolbar"]').exists()).toBe(true)
    expect(wrapper.text()).toContain('content')
  })

  it('renders a tooltip with descriptive text for the nav item', () => {
    const wrapper = mount(DefaultLayout, { global: { stubs: allStubs } })
    const tooltips = wrapper.findAll('[data-tooltip]')
    const texts = tooltips.map(t => t.attributes('data-tooltip'))
    expect(texts).toContain('登録済み車両の一覧・検索・車検証の紐づけ状態確認')
  })
})
