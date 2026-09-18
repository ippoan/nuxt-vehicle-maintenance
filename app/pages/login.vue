<script setup lang="ts">
definePageMeta({ layout: 'auth' })

const { redirectToLogin } = useAuth()
const config = useRuntimeConfig()

onMounted(() => {
  // auth-worker 設定時は自動でリダイレクト（ログインページを表示しない）
  if (config.public.authWorkerUrl) {
    redirectToLogin({ provider: 'google', callbackPath: '/auth/callback' })
  }
})
</script>

<template>
  <UCard class="w-full max-w-sm">
    <div class="text-center space-y-4">
      <h1 class="text-2xl font-bold">車両整備記録</h1>
      <p class="text-sm text-gray-500">車両整備記録管理システム</p>
      <UButton
        label="Google でログイン"
        icon="i-lucide-log-in"
        size="lg"
        block
        @click="redirectToLogin({ provider: 'google', callbackPath: '/auth/callback' })"
      />
    </div>
  </UCard>
</template>
