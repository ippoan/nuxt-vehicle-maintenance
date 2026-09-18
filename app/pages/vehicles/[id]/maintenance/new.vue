<script setup lang="ts">
import { useMaintenanceRecordNew } from '~/composables/useMaintenanceRecordNew'

const route = useRoute()
const vehicleId = route.params.id as string

const { form, categories, categoriesLoading, categoriesError, fetchCategories, submitting, errorMessage, submit } = useMaintenanceRecordNew(vehicleId)

const categoryOptions = computed(() => categories.value.map(c => ({ label: c.name, value: c.id })))

onMounted(() => fetchCategories())
</script>

<template>
  <div class="max-w-lg space-y-6">
    <div class="flex items-center gap-3">
      <UButton icon="i-lucide-arrow-left" variant="ghost" :to="`/vehicles/${vehicleId}`" />
      <h1 class="text-xl font-bold">整備記録を追加</h1>
    </div>

    <UCard>
      <form class="space-y-4" @submit.prevent="submit">
        <UFormField label="カテゴリ" required>
          <USelect
            v-model="form.category_id"
            :items="categoryOptions"
            :loading="categoriesLoading"
            placeholder="カテゴリを選択"
          />
          <p v-if="categoriesError" class="mt-1 text-sm text-red-600">{{ categoriesError }}</p>
        </UFormField>

        <UFormField label="整備実施日" required>
          <UInput v-model="form.performed_on" type="date" />
        </UFormField>

        <UFormField label="走行距離 (km、任意)">
          <UInput v-model="form.odometer_km" type="number" min="0" />
        </UFormField>

        <UFormField label="整備工場 (任意)">
          <UInput v-model="form.vendor" />
        </UFormField>

        <UFormField label="内容 (任意)">
          <UTextarea v-model="form.description" :rows="3" />
        </UFormField>

        <UFormField label="費用 (任意)">
          <UInput v-model="form.cost" type="number" min="0" step="0.01" />
        </UFormField>

        <UFormField label="次回期限 (任意)">
          <UInput v-model="form.next_due_on" type="date" />
        </UFormField>

        <p v-if="errorMessage" class="text-sm text-red-600">{{ errorMessage }}</p>

        <div class="flex gap-3">
          <UButton type="submit" label="登録する" :loading="submitting" />
          <UButton label="キャンセル" variant="ghost" :to="`/vehicles/${vehicleId}`" />
        </div>
      </form>
    </UCard>
  </div>
</template>
