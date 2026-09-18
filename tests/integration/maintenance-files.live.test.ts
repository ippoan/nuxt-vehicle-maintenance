/**
 * integration test — 整備記録の添付ファイル (写真) の往復。
 *
 * maintenance.live.test.ts と同じ狙いで、**手書き型と backend の契約のズレ**を
 * 実データで見る層。files API は #c651-9 で入ったばかりで、この検査を
 * まだ受けていない面なのでここで塞ぐ。
 *
 * storage (minio) は docker-compose.test.yml が立てる。未配線なら backend の
 * upload_file は 503 を返す (crates/alc-maintenance/src/files.rs:205)。
 */
import { describe, it, expect, beforeAll } from 'vitest'
import {
  setupApi, restoreNativeApis, isLive, API_BASE, TEST_RECORD_ID,
} from '../helpers/api-test-env'
import { getRecordFiles, uploadRecordFile, deleteFile, downloadFile, getFileBlobUrl } from '~/utils/api'

if (process.env.TEST_LIVE === '1' && !isLive) {
  throw new Error(
    'TEST_LIVE=1 ですが API_BASE_URL が未設定です。integration test が mock のまま '
    + '緑になるのを防ぐため落としています (.github/workflows/test.yml の integration_env を確認)',
  )
}

const ABSENT_ID = '00000000-0000-0000-0000-0000000000ff'

/** PNG の magic number だけの最小データ (画像として扱われる形にしておく)。 */
const PNG_BYTES = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])

function makePng(name = 'test-photo.png'): File {
  return new File([PNG_BYTES], name, { type: 'image/png' })
}

describe.skipIf(!isLive)('maintenance files API (live)', () => {
  beforeAll(async () => {
    restoreNativeApis()
    await setupApi()
  })

  it('upload → list → download → delete が往復する', async () => {
    const uploaded = await uploadRecordFile(TEST_RECORD_ID, makePng())

    // --- MaintenanceFile の形が backend の実物と一致する ---
    expect(Object.keys(uploaded)).toEqual(expect.arrayContaining([
      'id', 'tenant_id', 'record_id', 'filename', 'content_type',
      'size_bytes', 'storage_key', 'created_at', 'deleted_at',
    ]))
    expect(uploaded.record_id).toBe(TEST_RECORD_ID)
    expect(uploaded.filename).toBe('test-photo.png')
    expect(uploaded.content_type).toBe('image/png')
    expect(uploaded.storage_key).toContain(TEST_RECORD_ID)
    expect(uploaded.deleted_at).toBeNull()

    // ★ size_bytes は backend が i64 (ts-rs なら bigint) だが、JSON をまたぐと
    //   number で来る。app/types 側の override がこの前提で正しいことを実測で裏づける。
    expect(typeof uploaded.size_bytes).toBe('number')
    expect(uploaded.size_bytes).toBe(PNG_BYTES.length)

    // --- 一覧に出る ---
    const listed = await getRecordFiles(TEST_RECORD_ID)
    expect(listed.map(f => f.id)).toContain(uploaded.id)

    // --- download は署名 URL ではなく bytes をそのまま返す ---
    const res = await fetch(`${API_BASE}/api/maintenance/files/${uploaded.id}/download`)
    expect(res.status).toBe(200)
    expect(res.headers.get('content-type')).toBe('image/png')
    expect(res.headers.get('content-disposition')).toContain('test-photo.png')
    expect(new Uint8Array(await res.arrayBuffer())).toEqual(PNG_BYTES)

    // サムネイル表示の経路 (写真 UI が使う) も実 API に対して通ることを見る。
    const blobUrl = await getFileBlobUrl(uploaded.id)
    expect(blobUrl.startsWith('blob:')).toBe(true)
    URL.revokeObjectURL(blobUrl)

    // ダウンロード経路 (<a download> を組み立てて click する) も例外を投げないこと。
    await expect(downloadFile(uploaded.id, 'test-photo.png')).resolves.toBeUndefined()

    // --- 削除すると一覧から消える (backend が deleted_at IS NULL で除外) ---
    await deleteFile(uploaded.id)
    const after = await getRecordFiles(TEST_RECORD_ID)
    expect(after.map(f => f.id)).not.toContain(uploaded.id)
  })

  it('POST は 201、DELETE は 204 (body 無し)', async () => {
    // app/utils/api.ts は status を返さないので、ここだけ生の fetch で確かめる
    // (X-Tenant-ID は api-test-env の live ラッパが被せる)。
    const fd = new FormData()
    fd.append('file', makePng('status-check.png'))
    const created = await fetch(`${API_BASE}/api/maintenance/records/${TEST_RECORD_ID}/files`, {
      method: 'POST',
      body: fd,
    })
    expect(created.status).toBe(201)
    const file = await created.json() as { id: string }

    const deleted = await fetch(`${API_BASE}/api/maintenance/files/${file.id}`, { method: 'DELETE' })
    expect(deleted.status).toBe(204)
    expect(await deleted.text()).toBe('')
  })

  it('他テナント / 存在しない id は 404', async () => {
    await expect(getRecordFiles(ABSENT_ID)).rejects.toMatchObject({ status: 404 })
    await expect(uploadRecordFile(ABSENT_ID, makePng())).rejects.toMatchObject({ status: 404 })
    await expect(deleteFile(ABSENT_ID)).rejects.toMatchObject({ status: 404 })
  })
})
