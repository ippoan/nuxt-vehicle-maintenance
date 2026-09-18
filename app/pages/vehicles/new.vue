<script setup lang="ts">
import { useVehicleNew } from '~/composables/useVehicleNew'

const { form, submitting, errorMessage, submit } = useVehicleNew()
</script>

<template>
  <div class="max-w-lg space-y-6">
    <h1 class="text-xl font-bold">車両を登録</h1>

    <UCard>
      <form class="space-y-4" @submit.prevent="submit">
        <UFormField label="登録番号" required>
          <UInput v-model="form.registration_number" placeholder="品川 100 あ 1234" />
        </UFormField>

        <UFormField label="社内車番 (任意)">
          <UInput v-model="form.display_name" placeholder="社内での呼び名" />
        </UFormField>

        <UFormField label="メモ (任意)">
          <UTextarea v-model="form.note" :rows="3" />
        </UFormField>

        <p class="text-xs text-gray-500">
          車検証の紐づけは登録後にいつでも行えます。車検証が無くても登録番号だけで登録できます。
        </p>

        <p v-if="errorMessage" class="text-sm text-red-600">{{ errorMessage }}</p>

        <div class="flex gap-3">
          <UButton type="submit" label="登録する" :loading="submitting" />
          <UButton label="キャンセル" variant="ghost" to="/" />
        </div>
      </form>
    </UCard>
  </div>
</template>
