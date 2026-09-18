<script setup lang="ts">
import { useMaintenanceRecordDetail } from '~/composables/useMaintenanceRecordDetail'

const route = useRoute()
const vehicleId = route.params.id as string
const recordId = route.params.recordId as string

const {
  record, loading, errorMessage, fetchRecord,
  categories, categoriesLoading, categoriesError, fetchCategories,
  saving, saveError, save,
  deleting, deleteError, remove,
} = useMaintenanceRecordDetail(vehicleId, recordId)

const categoryOptions = computed(() => categories.value.map(c => ({ label: c.name, value: c.id })))

const editForm = reactive({
  category_id: '',
  performed_on: '',
  odometer_km: '',
  vendor: '',
  description: '',
  cost: '',
  next_due_on: '',
})

watch(record, (r) => {
  if (!r) return
  editForm.category_id = r.category_id
  editForm.performed_on = r.performed_on
  editForm.odometer_km = r.odometer_km != null ? String(r.odometer_km) : ''
  editForm.vendor = r.vendor || ''
  editForm.description = r.description || ''
  editForm.cost = r.cost != null ? r.cost : ''
  editForm.next_due_on = r.next_due_on || ''
}, { immediate: true })

onMounted(() => {
  fetchRecord()
  fetchCategories()
})

function onSave() {
  if (!editForm.category_id) {
    saveError.value = 'カテゴリを選択してください'
    return
  }
  if (!editForm.performed_on) {
    saveError.value = '整備実施日を入力してください'
    return
  }
  save({
    category_id: editForm.category_id,
    performed_on: editForm.performed_on,
    odometer_km: editForm.odometer_km ? Number(editForm.odometer_km) : undefined,
    vendor: editForm.vendor.trim() || undefined,
    description: editForm.description.trim() || undefined,
    cost: editForm.cost ? Number(editForm.cost) : undefined,
    next_due_on: editForm.next_due_on || undefined,
  })
}

function onDelete() {
  // eslint-disable-next-line no-alert
  if (window.confirm('この整備記録を削除しますか？この操作は取り消せません。')) {
    remove()
  }
}
</script>

<template>
  <div class="max-w-lg space-y-6">
    <div class="flex items-center gap-3">
      <UButton icon="i-lucide-arrow-left" variant="ghost" :to="`/vehicles/${vehicleId}`" />
      <h1 class="text-xl font-bold">整備記録を編集</h1>
    </div>

    <p v-if="loading" class="text-sm text-gray-500">読み込み中...</p>
    <p v-if="errorMessage" class="text-sm text-red-600">{{ errorMessage }}</p>

    <UCard v-if="record && !loading">
      <form class="space-y-4" @submit.prevent="onSave">
        <UFormField label="カテゴリ" required>
          <USelect
            v-model="editForm.category_id"
            :items="categoryOptions"
            :loading="categoriesLoading"
            placeholder="カテゴリを選択"
          />
          <p v-if="categoriesError" class="mt-1 text-sm text-red-600">{{ categoriesError }}</p>
        </UFormField>

        <UFormField label="整備実施日" required>
          <UInput v-model="editForm.performed_on" type="date" />
        </UFormField>

        <UFormField label="走行距離 (km、任意)">
          <UInput v-model="editForm.odometer_km" type="number" min="0" />
        </UFormField>

        <UFormField label="整備工場 (任意)">
          <UInput v-model="editForm.vendor" />
        </UFormField>

        <UFormField label="内容 (任意)">
          <UTextarea v-model="editForm.description" :rows="3" />
        </UFormField>

        <UFormField label="費用 (任意)">
          <UInput v-model="editForm.cost" type="number" min="0" step="0.01" />
        </UFormField>

        <UFormField label="次回期限 (任意)">
          <UInput v-model="editForm.next_due_on" type="date" />
        </UFormField>

        <p v-if="saveError" class="text-sm text-red-600">{{ saveError }}</p>
        <p v-if="deleteError" class="text-sm text-red-600">{{ deleteError }}</p>

        <div class="flex items-center justify-between">
          <UButton type="submit" label="保存する" :loading="saving" />
          <UButton
            label="この記録を削除"
            color="error"
            variant="ghost"
            :loading="deleting"
            @click="onDelete"
          />
        </div>
      </form>
    </UCard>
  </div>
</template>
