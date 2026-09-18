import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import AuthLayout from '~/layouts/auth.vue'

describe('auth layout', () => {
  it('renders slot content', () => {
    const wrapper = mount(AuthLayout, { slots: { default: '<p>child</p>' } })
    expect(wrapper.text()).toContain('child')
  })
})
