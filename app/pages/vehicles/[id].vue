<script setup lang="ts">
import { isVehicleLinked } from '~/types'
import { useVehicleDetail } from '~/composables/useVehicleDetail'
import { useMaintenanceRecords } from '~/composables/useMaintenanceRecords'

const route = useRoute()
const id = route.params.id as string

const {
  vehicle, loading, errorMessage, fetchVehicle,
  saving, saveError, save,
  deleting, remove,
  candidates, candidatesLoading, candidatesError, candidatesLoaded, fetchCandidates,
  linking, linkError, link,
  unlinking, unlinkError, unlink,
} = useVehicleDetail(id)

const {
  filter: recordsFilter, records, total: recordsTotal, loading: recordsLoading, errorMessage: recordsErrorMessage,
  fetchRecords, categories: recordCategories, fetchCategories: fetchRecordCategories, categoryName,
  setPage: setRecordsPage, setCategoryFilter, setDateRange, search: searchRecords,
} = useMaintenanceRecords(id)

const recordQInput = ref('')
const categoryFilterValue = ref('')
const dateFrom = ref('')
const dateTo = ref('')

const categoryFilterOptions = computed(() => [
  { label: 'すべてのカテゴリ', value: '' },
  ...recordCategories.value.map(c => ({ label: c.name, value: c.id })),
])

const recordTotalPages = computed(() => {
  const perPage = recordsFilter.per_page || 20
  return Math.max(1, Math.ceil(recordsTotal.value / perPage))
})

function onCategoryFilterChange(value: string) {
  setCategoryFilter(value || undefined)
}

function onDateRangeChange() {
  setDateRange(dateFrom.value || undefined, dateTo.value || undefined)
}

function onRecordSearch() {
  searchRecords(recordQInput.value)
}

function goToRecord(recordId: string) {
  navigateTo(`/vehicles/${id}/maintenance/${recordId}/edit`)
}

const editForm = reactive({
  registration_number: '',
  display_name: '',
  note: '',
})

watch(vehicle, (v) => {
  if (!v) return
  editForm.registration_number = v.registration_number
  editForm.display_name = v.display_name || ''
  editForm.note = v.note || ''
}, { immediate: true })

onMounted(() => {
  fetchVehicle()
  fetchRecords()
  fetchRecordCategories()
})

function onSave() {
  const registrationNumber = editForm.registration_number.trim()
  if (!registrationNumber) {
    saveError.value = '登録番号を入力してください'
    return
  }
  save({
    registration_number: registrationNumber,
    display_name: editForm.display_name.trim() || undefined,
    note: editForm.note.trim() || undefined,
  })
}

function onDelete() {
  // eslint-disable-next-line no-alert
  if (window.confirm('この車両を削除しますか？この操作は取り消せません。')) {
    remove()
  }
}

function onUnlink() {
  // eslint-disable-next-line no-alert
  if (window.confirm('車検証の紐づけを解除しますか？')) {
    unlink()
  }
}
</script>

<template>
  <div class="max-w-2xl space-y-6">
    <div class="flex items-center gap-3">
      <UButton icon="i-lucide-arrow-left" variant="ghost" to="/" />
      <h1 class="text-xl font-bold">車両詳細</h1>
    </div>

    <p v-if="loading" class="text-sm text-gray-500">読み込み中...</p>
    <p v-if="errorMessage" class="text-sm text-red-600">{{ errorMessage }}</p>

    <template v-if="vehicle && !loading">
      <UCard>
        <template #header>
          <h2 class="font-semibold">基本情報</h2>
        </template>

        <form class="space-y-4" @submit.prevent="onSave">
          <UFormField label="登録番号" required>
            <UInput v-model="editForm.registration_number" />
          </UFormField>
          <UFormField label="社内車番 (任意)">
            <UInput v-model="editForm.display_name" />
          </UFormField>
          <UFormField label="メモ (任意)">
            <UTextarea v-model="editForm.note" :rows="3" />
          </UFormField>

          <p v-if="saveError" class="text-sm text-red-600">{{ saveError }}</p>

          <div class="flex items-center justify-between">
            <UButton type="submit" label="保存する" :loading="saving" />
            <UButton
              label="この車両を削除"
              color="error"
              variant="ghost"
              :loading="deleting"
              @click="onDelete"
            />
          </div>
        </form>
      </UCard>

      <UCard>
        <template #header>
          <h2 class="font-semibold">車検証の紐づけ</h2>
        </template>

        <div v-if="isVehicleLinked(vehicle)" class="space-y-3">
          <UBadge color="success" variant="subtle">紐づけ済み</UBadge>
          <!--
            ★ 車検証番号 (cert_no) と車検満了日はここに出せない — backend の
            MaintenanceVehicle が保持していないため (car_id と carins_linked_at
            だけ)。出すには backend 側の API 追加が要る (別 issue)。
          -->
          <dl class="grid grid-cols-2 gap-2 text-sm">
            <dt class="text-gray-500">車両 ID (car_id)</dt>
            <dd>{{ vehicle.car_id }}</dd>
            <dt class="text-gray-500">紐づけ日</dt>
            <dd>{{ vehicle.carins_linked_at?.slice(0, 10) || '-' }}</dd>
          </dl>
          <p v-if="unlinkError" class="text-sm text-red-600">{{ unlinkError }}</p>
          <UButton
            label="紐づけを解除"
            color="error"
            variant="outline"
            :loading="unlinking"
            @click="onUnlink"
          />
        </div>

        <div v-else class="space-y-4">
          <UBadge color="neutral" variant="subtle">未紐づけ</UBadge>
          <p class="text-sm text-gray-500">
            車検証が無いテナントや、後から紐づけたい場合はそのままで構いません。
          </p>

          <UButton
            label="候補を探す"
            variant="outline"
            :loading="candidatesLoading"
            @click="fetchCandidates"
          />

          <p v-if="candidatesError" class="text-sm text-red-600">{{ candidatesError }}</p>
          <p v-if="linkError" class="text-sm text-red-600">{{ linkError }}</p>

          <div v-if="candidatesLoaded" class="space-y-2">
            <p v-if="candidates.length === 0" class="text-sm text-gray-400">
              一致する車検証の候補が見つかりませんでした。
            </p>
            <ul v-else class="divide-y divide-gray-100 dark:divide-gray-900">
              <li
                v-for="candidate in candidates"
                :key="candidate.car_id"
                class="flex items-center justify-between py-2 text-sm"
              >
                <div>
                  <div>{{ candidate.car_no }} ({{ candidate.cert_no }})</div>
                  <div class="text-xs text-gray-400">車両 ID: {{ candidate.car_id }}</div>
                </div>
                <UButton
                  label="この車検証に紐づける"
                  size="xs"
                  :loading="linking"
                  @click="link({ car_id: candidate.car_id, cert_no: candidate.cert_no })"
                />
              </li>
            </ul>
          </div>
        </div>
      </UCard>

      <UCard>
        <template #header>
          <div class="flex items-center justify-between">
            <h2 class="font-semibold">整備履歴</h2>
            <UButton label="記録を追加" icon="i-lucide-plus" size="xs" :to="`/vehicles/${id}/maintenance/new`" />
          </div>
        </template>

        <div class="flex flex-wrap items-center gap-3 mb-4">
          <USelect
            v-model="categoryFilterValue"
            :items="categoryFilterOptions"
            placeholder="カテゴリで絞り込み"
            class="w-48"
            @update:model-value="onCategoryFilterChange"
          />
          <UInput v-model="dateFrom" type="date" class="w-40" @change="onDateRangeChange" />
          <span class="text-gray-400">〜</span>
          <UInput v-model="dateTo" type="date" class="w-40" @change="onDateRangeChange" />
          <UInput
            v-model="recordQInput"
            placeholder="内容・整備工場で検索"
            icon="i-lucide-search"
            class="w-56"
            @keyup.enter="onRecordSearch"
          />
          <UButton label="検索" variant="outline" size="xs" @click="onRecordSearch" />
        </div>

        <p v-if="recordsErrorMessage" class="text-sm text-red-600">{{ recordsErrorMessage }}</p>
        <p v-if="recordsLoading" class="text-sm text-gray-500">読み込み中...</p>

        <table v-if="!recordsLoading" class="w-full text-sm">
          <thead>
            <tr class="border-b border-gray-200 dark:border-gray-800 text-left text-gray-500">
              <th class="py-2 pr-4">実施日</th>
              <th class="py-2 pr-4">カテゴリ</th>
              <th class="py-2 pr-4">内容</th>
              <th class="py-2 pr-4">整備工場</th>
              <th class="py-2 pr-4">走行距離</th>
              <th class="py-2 pr-4">費用</th>
              <th class="py-2 pr-4">次回期限</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="record in records"
              :key="record.id"
              class="border-b border-gray-100 dark:border-gray-900 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-900"
              @click="goToRecord(record.id)"
            >
              <td class="py-2 pr-4">{{ record.performed_on }}</td>
              <td class="py-2 pr-4">{{ categoryName(record.category_id) }}</td>
              <td class="py-2 pr-4">{{ record.description || '-' }}</td>
              <td class="py-2 pr-4">{{ record.vendor || '-' }}</td>
              <td class="py-2 pr-4">{{ record.odometer_km != null ? `${record.odometer_km} km` : '-' }}</td>
              <td class="py-2 pr-4">{{ record.cost != null ? `¥${record.cost}` : '-' }}</td>
              <td class="py-2 pr-4">{{ record.next_due_on || '-' }}</td>
            </tr>
            <tr v-if="records.length === 0">
              <td colspan="7" class="py-6 text-center text-gray-400">整備記録がありません</td>
            </tr>
          </tbody>
        </table>

        <div v-if="recordTotalPages > 1" class="flex items-center justify-between mt-4 text-sm text-gray-500">
          <span>
            {{ recordsTotal }} 件中
            {{ (recordsFilter.page! - 1) * recordsFilter.per_page! + 1 }}〜{{ Math.min(recordsFilter.page! * recordsFilter.per_page!, recordsTotal) }}
            件を表示
          </span>
          <div class="flex gap-2">
            <UButton
              label="前へ"
              variant="outline"
              size="xs"
              :disabled="recordsFilter.page! <= 1"
              @click="setRecordsPage(recordsFilter.page! - 1)"
            />
            <UButton
              label="次へ"
              variant="outline"
              size="xs"
              :disabled="recordsFilter.page! >= recordTotalPages"
              @click="setRecordsPage(recordsFilter.page! + 1)"
            />
          </div>
        </div>
      </UCard>
    </template>
  </div>
</template>
