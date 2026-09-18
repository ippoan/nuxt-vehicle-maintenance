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

  // Refs ippoan/rust-alc-api#666: min-h-screen だとシェルが中身に応じて画面より下へ伸び、
  // main の overflow-auto が効かずページ全体がビューポートからはみ出す。
  // happy-dom は実レイアウトを計算しないので、ここで見るのはクラスの付与まで。
  it('constrains the shell to the viewport so that main scrolls internally', () => {
    const wrapper = mount(DefaultLayout, { global: { stubs: allStubs }, slots: { default: '<p>content</p>' } })

    const shell = wrapper.element as HTMLElement
    expect(shell.className).toContain('h-dvh')
    expect(shell.className).toContain('overflow-hidden')
    expect(shell.className).not.toContain('min-h-screen')

    // flex の子は既定で内容より小さくなれない。min-h-0 が無いと overflow-auto は効かない。
    const main = wrapper.find('main')
    expect(main.classes()).toEqual(expect.arrayContaining(['flex-1', 'min-h-0', 'overflow-auto']))
  })

  it('keeps the sidebar inside the viewport when the menu grows', () => {
    const wrapper = mount(DefaultLayout, { global: { stubs: allStubs } })
    expect(wrapper.find('aside').classes()).toContain('shrink-0')
    expect(wrapper.find('nav').classes()).toEqual(expect.arrayContaining(['flex-1', 'min-h-0', 'overflow-y-auto']))
  })

  it('renders a tooltip with descriptive text for the nav item', () => {
    const wrapper = mount(DefaultLayout, { global: { stubs: allStubs } })
    const tooltips = wrapper.findAll('[data-tooltip]')
    const texts = tooltips.map(t => t.attributes('data-tooltip'))
    expect(texts).toContain('登録済み車両の一覧・検索・車検証の紐づけ状態確認')
  })
})
