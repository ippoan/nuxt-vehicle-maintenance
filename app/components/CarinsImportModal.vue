<script setup lang="ts">
import { useCarinsImport } from '~/composables/useCarinsImport'

const open = defineModel<boolean>('open', { default: false })
const emit = defineEmits<{ imported: [] }>()

const {
  candidates, candidatesLoading, candidatesError, candidatesLoaded, fetchCandidates,
  selected, toggle, selectAll, clearSelection,
  importing, importError, result, runImport,
} = useCarinsImport()

const selectedCount = computed(() => selected.value.size)
const allSelected = computed(() => candidates.value.length > 0 && selectedCount.value === candidates.value.length)

function onToggleAll(event: Event) {
  const checked = (event.target as HTMLInputElement).checked
  if (checked) selectAll()
  else clearSelection()
}

/** 新規作成 (登録番号一致の車両が無い) か、既存車両への紐づけのみか。 */
function classify(existingVehicleId: string | null): { label: string, color: 'success' | 'neutral' } {
  return existingVehicleId === null
    ? { label: '新規登録', color: 'success' }
    : { label: '紐づけのみ', color: 'neutral' }
}

async function handleImport() {
  const ok = await runImport()
  if (ok) emit('imported')
}

function close() {
  open.value = false
}

watch(open, (v) => {
  if (v) {
    clearSelection()
    result.value = null
    fetchCandidates()
  }
})
</script>

<template>
  <UModal v-model:open="open" :ui="{ content: 'max-w-2xl' }">
    <template #content>
      <div class="p-6 space-y-4">
        <div class="flex items-center justify-between">
          <h3 class="text-lg font-bold">車検証から取り込み</h3>
          <UButton icon="i-lucide-x" variant="ghost" size="sm" @click="close" />
        </div>

        <template v-if="result">
          <div class="p-3 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 rounded-lg text-sm space-y-1">
            <p>新規作成: {{ result.created }} 件</p>
            <p>紐づけ: {{ result.linked }} 件</p>
            <p>スキップ: {{ result.skipped }} 件</p>
          </div>
          <div class="flex justify-end">
            <UButton label="閉じる" @click="close" />
          </div>
        </template>

        <template v-else>
          <p class="text-sm text-gray-500">
            まだ車両マスタに取り込まれていない電子車検証の一覧です。取り込む行を選んでください。
          </p>

          <p v-if="candidatesError" class="text-sm text-red-600">{{ candidatesError }}</p>
          <p v-if="candidatesLoading" class="text-sm text-gray-500">読み込み中...</p>

          <template v-else-if="candidatesLoaded">
            <div v-if="candidates.length === 0" class="text-sm text-gray-400 py-6 text-center">
              取り込める電子車検証はありません
            </div>

            <div v-else class="overflow-auto max-h-[50vh]">
              <table class="w-full text-sm">
                <thead class="sticky top-0 bg-white dark:bg-gray-900">
                  <tr class="border-b border-gray-200 dark:border-gray-800 text-left text-gray-500">
                    <th class="py-2 pr-2 w-8">
                      <input
                        type="checkbox"
                        :checked="allSelected"
                        @change="onToggleAll"
                      >
                    </th>
                    <th class="py-2 pr-4">車検証番号</th>
                    <th class="py-2 pr-4">登録番号</th>
                    <th class="py-2 pr-4">分類</th>
                  </tr>
                </thead>
                <tbody>
                  <tr
                    v-for="c in candidates"
                    :key="c.car_id"
                    class="border-b border-gray-100 dark:border-gray-900"
                  >
                    <td class="py-2 pr-2">
                      <input
                        type="checkbox"
                        :checked="selected.has(c.car_id)"
                        @change="toggle(c.car_id)"
                      >
                    </td>
                    <td class="py-2 pr-4">{{ c.cert_no }}</td>
                    <td class="py-2 pr-4">{{ c.car_no }}</td>
                    <td class="py-2 pr-4">
                      <UBadge
                        :color="classify(c.existing_vehicle_id).color"
                        variant="subtle"
                      >
                        {{ classify(c.existing_vehicle_id).label }}
                      </UBadge>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <p v-if="importError" class="text-sm text-red-600">{{ importError }}</p>

            <div class="flex justify-end gap-2">
              <UButton label="キャンセル" variant="outline" @click="close" />
              <UButton
                :label="`${selectedCount} 件を取り込む`"
                :loading="importing"
                :disabled="selectedCount === 0"
                @click="handleImport"
              />
            </div>
          </template>
        </template>
      </div>
    </template>
  </UModal>
</template>
