<script setup lang="ts">
import { isVehicleLinked } from '~/types'
import { useVehicleDetail } from '~/composables/useVehicleDetail'

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

onMounted(() => fetchVehicle())

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
          <dl class="grid grid-cols-2 gap-2 text-sm">
            <dt class="text-gray-500">証明書番号</dt>
            <dd>{{ vehicle.cert_no }}</dd>
            <dt class="text-gray-500">車検満了日</dt>
            <dd>{{ vehicle.car_inspection_expiry || '-' }}</dd>
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
                  <div>{{ candidate.registration_number }} ({{ candidate.cert_no }})</div>
                  <div class="text-xs text-gray-400">
                    車検満了日: {{ candidate.expiry_date || '-' }}
                  </div>
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
    </template>
  </div>
</template>
