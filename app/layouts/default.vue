<script setup lang="ts">
import { AuthToolbar } from '~/composables/useAuth'

const route = useRoute()
const _darkMode = ref(false)
let _colorMode: { value: string; preference: string } | null = null
try {
  _colorMode = useColorMode()
  _darkMode.value = _colorMode.value === 'dark'
} catch { /* test environment */ }

const isDark = computed({
  get: () => _colorMode ? _colorMode.value === 'dark' : _darkMode.value,
  set: (v) => {
    if (_colorMode) _colorMode.preference = v ? 'dark' : 'light'
    _darkMode.value = v
  },
})

const navigation: { label: string; icon: string; to: string; description: string }[] = [
  {
    label: '車両一覧',
    icon: 'i-lucide-truck',
    to: '/',
    description: '登録済み車両の一覧・検索・車検証の紐づけ状態確認',
  },
]
</script>

<template>
  <div class="flex min-h-screen">
    <!-- Sidebar -->
    <aside class="w-60 border-r border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 flex flex-col">
      <div class="p-4 border-b border-gray-200 dark:border-gray-800">
        <h1 class="text-lg font-bold">車両整備記録</h1>
      </div>

      <nav class="flex-1 p-2">
        <UTooltip
          v-for="item in navigation"
          :key="item.to"
          :text="item.description"
          :content="{ side: 'right', sideOffset: 12 }"
          :delay-duration="150"
          :ui="{ content: 'max-w-md text-lg px-5 py-3 leading-relaxed font-medium ring-2 ring-blue-500 dark:ring-blue-400 shadow-xl' }"
        >
          <NuxtLink
            :to="item.to"
            :title="item.description"
            class="flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors"
            :class="route.path === item.to || (item.to !== '/' && route.path.startsWith(item.to))
              ? 'bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 font-medium'
              : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'"
          >
            <UIcon :name="item.icon" class="size-5" />
            {{ item.label }}
          </NuxtLink>
        </UTooltip>
      </nav>

      <!-- Dark mode toggle + AuthToolbar (Apps / Settings / Logout) -->
      <div class="p-4 border-t border-gray-200 dark:border-gray-800 space-y-3">
        <div class="flex items-center justify-between">
          <span class="text-xs text-gray-500 dark:text-gray-400">ダークモード</span>
          <USwitch v-model="isDark" size="xs" />
        </div>
        <AuthToolbar
          class="flex flex-col items-stretch gap-1
                 [&>*]:w-full [&>button]:justify-start
                 [&>button]:px-3 [&>button]:py-1.5 [&>button]:text-sm"
          :show-copy-url="false"
          :show-qr="false"
        />
      </div>
    </aside>

    <!-- Main content -->
    <main class="flex-1 p-6 bg-gray-50 dark:bg-gray-950 overflow-auto">
      <slot />
    </main>
  </div>
</template>
