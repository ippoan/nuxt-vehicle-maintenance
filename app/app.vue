<script setup lang="ts">
import { StagingFooter } from '@ippoan/auth-client'

const { apiBase, stagingTenantId, isLoading, setup } = useAppInit()

onMounted(() => setup())
</script>

<template>
  <UApp>
    <div v-if="isLoading" class="flex items-center justify-center min-h-screen">
      <UIcon name="i-lucide-loader-circle" class="animate-spin size-8 text-gray-400" />
    </div>
    <NuxtLayout v-else>
      <NuxtPage />
    </NuxtLayout>
    <StagingFooter :api-base="apiBase" :tenant-id="stagingTenantId" />
  </UApp>
</template>
