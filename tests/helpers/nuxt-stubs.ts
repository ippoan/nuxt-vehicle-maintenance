/* v8 ignore start */
export const UApp = { template: '<div><slot /></div>' }
// 本体 (@nuxt/ui の Card) と同じく root / header / body の 3 層で、`ui` prop の
// body クラスを body に載せる。レイアウトの assert に data-slot を使えるようにするため。
export const UCard = {
  props: ['ui'],
  template: '<div data-slot="root">'
    + '<div v-if="$slots.header" data-slot="header"><slot name="header" /></div>'
    + '<div data-slot="body" :class="ui?.body"><slot /></div>'
    + '</div>',
}
export const UButton = {
  template: '<button :disabled="disabled || loading" @click="$emit(\'click\')"><slot>{{ label }}</slot></button>',
  props: ['label', 'icon', 'variant', 'color', 'size', 'block', 'to', 'loading', 'disabled', 'type'],
  emits: ['click'],
}
export const UIcon = { template: '<span />', props: ['name'] }
export const UBadge = { template: '<span><slot /></span>', props: ['variant', 'color'] }
export const UInput = {
  template: '<input :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />',
  props: ['modelValue', 'placeholder', 'icon', 'size'],
  emits: ['update:modelValue'],
}
export const UFormField = { template: '<div><slot /></div>', props: ['label', 'required'] }
export const UTextarea = {
  template: '<textarea :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />',
  props: ['modelValue', 'rows'],
  emits: ['update:modelValue'],
}
export const USwitch = {
  template: '<input type="checkbox" :checked="modelValue" @change="$emit(\'update:modelValue\', $event.target.checked)" />',
  props: ['modelValue', 'size'],
  emits: ['update:modelValue'],
}
export const USelect = {
  template: '<select :value="modelValue" @change="$emit(\'update:modelValue\', $event.target.value)">'
    + '<option v-for="item in items" :key="item.value" :value="item.value">{{ item.label }}</option>'
    + '</select>',
  props: ['modelValue', 'items', 'placeholder', 'loading'],
  emits: ['update:modelValue'],
}
export const UTooltip = { template: '<div :data-tooltip="text"><slot /></div>', props: ['text', 'content', 'delayDuration'] }
export const UModal = { template: '<div v-if="open"><slot name="content" /></div>', props: ['open'] }
export const NuxtLink = { template: '<a :href="to"><slot /></a>', props: ['to'] }
export const NuxtLayout = { template: '<div><slot /></div>' }
export const NuxtPage = { template: '<div />' }
export const StagingFooter = { template: '<div />', props: ['apiBase', 'tenantId'] }
export const AuthToolbar = {
  template: '<div data-testid="auth-toolbar"><button data-testid="apps-btn">Apps</button></div>',
  props: ['showCopyUrl', 'showQr'],
}
export const MaintenanceFilesStub = { template: '<div />', props: ['recordId'] }

export const allStubs = {
  UApp, UCard, UButton, UIcon, UBadge, UInput, UFormField,
  UTextarea, USwitch, USelect, UTooltip, UModal, NuxtLink, NuxtLayout, NuxtPage,
  StagingFooter, AuthToolbar, MaintenanceFiles: MaintenanceFilesStub,
}
