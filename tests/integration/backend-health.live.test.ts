/**
 * integration test — docker-compose.test.yml で立てた rust-alc-api (Release Wave の compatibility edge) を相手に回す。
 *
 * 整備の口 (車両・区分・整備記録・添付ファイル) は ippoan/alc-carins-worker へ移り、rust-alc-api から消えた
 * (W3、Refs ippoan/rust-alc-api#680。本番は auth-worker の振り分けで worker に回る)。nuxt-vehicle-maintenance が
 * rust-alc-api に頼る口はもう無いので、ここでは rust-alc-api が起動して応答することだけを確かめる。
 * 型と backend の契約の検証 (旧 maintenance.live.test.ts・maintenance-files.live.test.ts) は worker 側の repo の
 * 実 DB のテストが持つ。
 *
 * ★ ファイルを丸ごと消すと `npx vitest run tests/integration` が「テストのファイルが無い」で落ちるので、この 1 本を残す。
 * ★ 「env が無いので丸ごと skip、緑のまま検証ゼロ」を防ぐため、TEST_LIVE=1 が立っているのに API_BASE_URL が無い場合は
 *   読み込み時点で落とす (CI は .github/workflows/test.yml の integration_env で両方渡す)。
 */
import { describe, it, expect, beforeAll } from 'vitest'
import { isLive, API_BASE, restoreNativeApis } from '../helpers/api-test-env'

if (process.env.TEST_LIVE === '1' && !isLive) {
  throw new Error(
    'TEST_LIVE=1 ですが API_BASE_URL が未設定です。integration test が mock のまま '
    + '緑になるのを防ぐため落としています (.github/workflows/test.yml の integration_env を確認)',
  )
}

describe.skipIf(!isLive)('rust-alc-api (live, health)', () => {
  beforeAll(() => {
    restoreNativeApis()
  })

  it('GET /api/health — rust-alc-api が起動して応答する', async () => {
    const res = await fetch(`${API_BASE}/api/health`)
    expect(res.ok).toBe(true)
  })
})
