<script setup lang="ts">
import { isVehicleLinked } from '~/types'
import { useVehicleList } from '~/composables/useVehicleList'

const { filter, vehicles, total, loading, errorMessage, fetchVehicles, setPage, search, setUnlinkedOnly } = useVehicleList()

const qInput = ref('')
const unlinkedOnly = ref(false)
const importOpen = ref(false)

function onImported() {
  fetchVehicles()
}

onMounted(() => fetchVehicles())

function onSearch() {
  search(qInput.value)
}

function onToggleUnlinkedOnly(value: boolean) {
  unlinkedOnly.value = value
  setUnlinkedOnly(value)
}

const totalPages = computed(() => {
  const perPage = filter.per_page || 20
  return Math.max(1, Math.ceil(total.value / perPage))
})

function goToVehicle(id: string) {
  navigateTo(`/vehicles/${id}`)
}
</script>

<template>
  <div class="space-y-6">
    <div class="flex items-center justify-between">
      <h1 class="text-xl font-bold">車両一覧</h1>
      <div class="flex gap-2">
        <UButton label="車検証から取り込み" icon="i-lucide-file-input" variant="outline" @click="importOpen = true" />
        <UButton label="車両を登録" icon="i-lucide-plus" to="/vehicles/new" />
      </div>
    </div>

    <CarinsImportModal v-model:open="importOpen" @imported="onImported" />

    <UCard>
      <div class="flex flex-wrap items-center gap-4">
        <UInput
          v-model="qInput"
          placeholder="登録番号・社内車番で検索"
          icon="i-lucide-search"
          class="w-64"
          @keyup.enter="onSearch"
        />
        <UButton label="検索" variant="outline" @click="onSearch" />
        <label class="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
          <USwitch
            :model-value="unlinkedOnly"
            @update:model-value="onToggleUnlinkedOnly"
          />
          未紐づけのみ
        </label>
      </div>
    </UCard>

    <p v-if="errorMessage" class="text-sm text-red-600">{{ errorMessage }}</p>
    <p v-if="loading" class="text-sm text-gray-500">読み込み中...</p>

    <UCard v-if="!loading">
      <table class="w-full text-sm">
        <thead>
          <tr class="border-b border-gray-200 dark:border-gray-800 text-left text-gray-500">
            <th class="py-2 pr-4">登録番号</th>
            <th class="py-2 pr-4">社内車番</th>
            <th class="py-2 pr-4">車検証の紐づけ状態</th>
            <th class="py-2 pr-4">紐づけ日</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="vehicle in vehicles"
            :key="vehicle.id"
            class="border-b border-gray-100 dark:border-gray-900 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-900"
            @click="goToVehicle(vehicle.id)"
          >
            <td class="py-2 pr-4">{{ vehicle.registration_number }}</td>
            <td class="py-2 pr-4">{{ vehicle.display_name || '-' }}</td>
            <td class="py-2 pr-4">
              <UBadge v-if="isVehicleLinked(vehicle)" color="success" variant="subtle">紐づけ済み</UBadge>
              <UBadge v-else color="neutral" variant="subtle">未紐づけ</UBadge>
            </td>
            <td class="py-2 pr-4">{{ vehicle.carins_linked_at?.slice(0, 10) || '-' }}</td>
          </tr>
          <tr v-if="vehicles.length === 0">
            <td colspan="4" class="py-6 text-center text-gray-400">該当する車両がありません</td>
          </tr>
        </tbody>
      </table>

      <div v-if="totalPages > 1" class="flex items-center justify-between mt-4 text-sm text-gray-500">
        <span>{{ total }} 件中 {{ (filter.page! - 1) * filter.per_page! + 1 }}〜{{ Math.min(filter.page! * filter.per_page!, total) }} 件を表示</span>
        <div class="flex gap-2">
          <UButton
            label="前へ"
            variant="outline"
            size="xs"
            :disabled="filter.page! <= 1"
            @click="setPage(filter.page! - 1)"
          />
          <UButton
            label="次へ"
            variant="outline"
            size="xs"
            :disabled="filter.page! >= totalPages"
            @click="setPage(filter.page! + 1)"
          />
        </div>
      </div>
    </UCard>
  </div>
</template>
