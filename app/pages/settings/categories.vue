<script setup lang="ts">
import { useMaintenanceCategories } from '~/composables/useMaintenanceCategories'

const {
  categories, loading, errorMessage, fetchCategories,
  form, submitting, submitError, add,
  deletingId, deleteError, remove,
  reorderingId, reorderError, moveUp, moveDown,
} = useMaintenanceCategories()

onMounted(() => fetchCategories())

function onDelete(id: string, name: string) {
  // eslint-disable-next-line no-alert
  if (window.confirm(`「${name}」を削除しますか？この操作は取り消せません。`)) {
    remove(id)
  }
}
</script>

<template>
  <div class="max-w-lg space-y-6">
    <h1 class="text-xl font-bold">整備カテゴリ設定</h1>

    <UCard>
      <template #header>
        <h2 class="font-semibold">カテゴリを追加</h2>
      </template>

      <form class="flex items-start gap-3" @submit.prevent="add">
        <UFormField class="flex-1" label="カテゴリ名">
          <UInput v-model="form.name" placeholder="例: 車検" />
        </UFormField>
        <UButton type="submit" label="追加" class="mt-6" :loading="submitting" />
      </form>
      <p v-if="submitError" class="mt-2 text-sm text-red-600">{{ submitError }}</p>
    </UCard>

    <UCard>
      <template #header>
        <h2 class="font-semibold">カテゴリ一覧</h2>
      </template>

      <p v-if="loading" class="text-sm text-gray-500">読み込み中...</p>
      <p v-if="errorMessage" class="text-sm text-red-600">{{ errorMessage }}</p>
      <p v-if="deleteError" class="text-sm text-red-600">{{ deleteError }}</p>
      <p v-if="reorderError" class="text-sm text-red-600">{{ reorderError }}</p>

      <ul v-if="!loading" class="divide-y divide-gray-100 dark:divide-gray-900">
        <li
          v-for="(category, index) in categories"
          :key="category.id"
          class="flex items-center justify-between py-3"
        >
          <span>{{ category.name }}</span>
          <div class="flex items-center gap-1">
            <UButton
              icon="i-lucide-arrow-up"
              variant="ghost"
              size="xs"
              :disabled="index === 0"
              :loading="reorderingId === category.id"
              aria-label="上へ"
              @click="moveUp(category.id)"
            />
            <UButton
              icon="i-lucide-arrow-down"
              variant="ghost"
              size="xs"
              :disabled="index === categories.length - 1"
              :loading="reorderingId === category.id"
              aria-label="下へ"
              @click="moveDown(category.id)"
            />
            <UButton
              icon="i-lucide-trash-2"
              color="error"
              variant="ghost"
              size="xs"
              :loading="deletingId === category.id"
              aria-label="削除"
              @click="onDelete(category.id, category.name)"
            />
          </div>
        </li>
        <li v-if="categories.length === 0" class="py-6 text-center text-gray-400">
          カテゴリがありません
        </li>
      </ul>
    </UCard>
  </div>
</template>
