<script setup lang="ts">
import type { MaintenanceFile } from '~/types'
import { getRecordFiles, uploadRecordFile, deleteFile, downloadFile, getFileBlobUrl } from '~/utils/api'

const props = defineProps<{ recordId: string }>()

const files = ref<MaintenanceFile[]>([])
const loading = ref(false)
const uploading = ref(false)
const fileInput = ref<HTMLInputElement | null>(null)

// サムネイル用 blob URL キャッシュ
const thumbnailUrls = ref<Record<string, string>>({})

// 画像プレビューモーダル
const previewOpen = ref(false)
const previewUrl = ref('')
const previewFilename = ref('')

function isImage(contentType: string): boolean {
  return contentType.startsWith('image/')
}

function isPdf(contentType: string): boolean {
  return contentType === 'application/pdf'
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

async function fetchFiles() {
  loading.value = true
  try {
    files.value = await getRecordFiles(props.recordId)
    for (const f of files.value) {
      if (isImage(f.content_type)) {
        loadThumbnail(f.id)
      }
    }
  } catch (e) {
    console.error('ファイル取得エラー:', e)
  } finally {
    loading.value = false
  }
}

async function loadThumbnail(fileId: string) {
  try {
    const url = await getFileBlobUrl(fileId)
    thumbnailUrls.value[fileId] = url
  } catch {
    // サムネイル取得失敗は無視
  }
}

async function handleUpload(event: Event) {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  if (!file) return
  uploading.value = true
  try {
    await uploadRecordFile(props.recordId, file)
    await fetchFiles()
  } catch (e) {
    console.error('アップロードエラー:', e)
  } finally {
    uploading.value = false
    target.value = ''
  }
}

async function handlePreview(f: MaintenanceFile) {
  if (isPdf(f.content_type)) {
    try {
      const url = await getFileBlobUrl(f.id)
      window.open(url, '_blank')
    } catch (e) {
      console.error('PDF表示エラー:', e)
    }
  } else if (isImage(f.content_type)) {
    const url = thumbnailUrls.value[f.id] || await getFileBlobUrl(f.id)
    previewUrl.value = url
    previewFilename.value = f.filename
    previewOpen.value = true
  }
}

async function handleDownload(f: MaintenanceFile) {
  try {
    await downloadFile(f.id, f.filename)
  } catch (e) {
    console.error('ダウンロードエラー:', e)
  }
}

async function handleDelete(id: string) {
  try {
    await deleteFile(id)
    if (thumbnailUrls.value[id]) {
      URL.revokeObjectURL(thumbnailUrls.value[id])
      delete thumbnailUrls.value[id]
    }
    await fetchFiles()
  } catch (e) {
    console.error('ファイル削除エラー:', e)
  }
}

onMounted(fetchFiles)

onUnmounted(() => {
  for (const url of Object.values(thumbnailUrls.value)) {
    URL.revokeObjectURL(url)
  }
})
</script>

<template>
  <div>
    <div class="flex items-center justify-between mb-4">
      <h3 class="text-base font-semibold">添付ファイル</h3>
      <div>
        <input
          ref="fileInput"
          type="file"
          class="hidden"
          @change="handleUpload"
        />
        <UButton
          label="アップロード"
          icon="i-lucide-upload"
          size="sm"
          :loading="uploading"
          @click="fileInput?.click()"
        />
      </div>
    </div>

    <div v-if="loading" class="text-sm text-gray-500">読み込み中...</div>

    <div v-else-if="files.length === 0" class="text-sm text-gray-500">
      添付ファイルはありません
    </div>

    <ul v-else class="divide-y divide-gray-200 dark:divide-gray-800">
      <li
        v-for="f in files"
        :key="f.id"
        class="flex items-center gap-3 py-2"
      >
        <!-- サムネイル (画像) -->
        <div
          v-if="isImage(f.content_type) && thumbnailUrls[f.id]"
          class="shrink-0 cursor-pointer"
          @click="handlePreview(f)"
        >
          <img
            :src="thumbnailUrls[f.id]"
            :alt="f.filename"
            class="w-12 h-12 object-cover rounded border border-gray-200 dark:border-gray-700"
          />
        </div>

        <!-- PDF アイコン -->
        <div
          v-else-if="isPdf(f.content_type)"
          class="shrink-0 w-12 h-12 flex items-center justify-center rounded border border-gray-200 dark:border-gray-700 cursor-pointer text-red-500"
          @click="handlePreview(f)"
        >
          <UIcon name="i-lucide-file-text" class="size-6" />
        </div>

        <!-- その他のファイルアイコン -->
        <div
          v-else
          class="shrink-0 w-12 h-12 flex items-center justify-center rounded border border-gray-200 dark:border-gray-700 text-gray-400"
        >
          <UIcon name="i-lucide-file" class="size-6" />
        </div>

        <!-- ファイル名 -->
        <div class="min-w-0 flex-1">
          <button
            v-if="isImage(f.content_type) || isPdf(f.content_type)"
            :data-testid="`preview-${f.id}`"
            class="text-sm font-medium text-primary hover:underline truncate block text-left"
            @click="handlePreview(f)"
          >
            {{ f.filename }}
          </button>
          <span v-else class="text-sm font-medium truncate block">{{ f.filename }}</span>
          <span class="text-xs text-gray-400">{{ formatSize(f.size_bytes) }}</span>
        </div>

        <!-- アクションボタン -->
        <div class="flex gap-1 shrink-0">
          <UButton
            icon="i-lucide-download"
            variant="ghost"
            size="xs"
            :data-testid="`download-${f.id}`"
            @click="handleDownload(f)"
          />
          <UButton
            icon="i-lucide-trash-2"
            variant="ghost"
            color="error"
            size="xs"
            :data-testid="`delete-${f.id}`"
            @click="handleDelete(f.id)"
          />
        </div>
      </li>
    </ul>

    <!-- 画像プレビューモーダル -->
    <UModal v-model:open="previewOpen">
      <template #content>
        <div class="p-4">
          <div class="flex items-center justify-between mb-3">
            <h3 class="text-sm font-medium truncate">{{ previewFilename }}</h3>
            <UButton
              icon="i-lucide-x"
              variant="ghost"
              size="xs"
              @click="previewOpen = false"
            />
          </div>
          <img
            :src="previewUrl"
            :alt="previewFilename"
            class="max-w-full max-h-[70vh] mx-auto rounded"
          />
        </div>
      </template>
    </UModal>
  </div>
</template>
