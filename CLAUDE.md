# nuxt-vehicle-maintenance

車両整備記録 (定期点検・修理・部品交換・写真添付) アプリ。Nuxt 4 + Cloudflare Workers (`wrangler.toml`)。
rust-alc-api の `alc-maintenance` crate (`/api/maintenance/*`) を叩く。

親 issue: ippoan/rust-alc-api#651「車両整備記録 (maintenance)」。

## ★ マルチテナント (nuxt-trouble との違い)

このアプリは alc 系と同じ**マルチテナント**。`nuxt-trouble` を雛形の参考にしたが、あちらは
大石運輸倉庫の個別アプリで、テナント固有の部品 (`server/api/ichiban/employees.get.ts`、
`useIchibanSync.ts`、`getIchibanEmployees()` 相当) は意図的に持ち込んでいない。

テナント分離は **auth-worker が `X-Tenant-ID` を注入する**。フロントから `X-Tenant-ID` を
付けることは無い (`app/utils/api.ts` に `tenantIdGetter` に相当する引数自体が無い — nuxt-trouble の
`initApi` と違う点)。

## 環境と URL

| 環境 | URL | 備考 |
|---|---|---|
| production | https://maintenance.ippoan.org | `wrangler.toml` の default env |
| staging | https://maintenance-staging.ippoan.org | `env.staging` |
| preview | https://maintenance-preview.ippoan.org | `env.preview` (staging backend を再利用、専用 DB は持たない) |

**★ production は稼働中。** auth-worker 側の前提は実測で確認済み (2026-09-18、
`.github/workflows/test.yml` の `has_deploy: true` コメント参照) — KV `origins:prod` に
`https://maintenance.ippoan.org`、`origins:staging` に maintenance-staging /
maintenance-preview が実在し、`INTERNAL_SHARED_SECRET` は全 consumer 共有の
Secrets Store entry で default / staging / preview すべてに bind 済み (新規払い出し不要)。
ACL は ippoan origin を素通しする opt-in 方式なので、この repo 個別の登録も不要だった。

- `.github/workflows/test.yml` は `has_deploy: true` になっている ([test.yml:52](.github/workflows/test.yml)、上記の理由で有効化済み)。
- `.github/workflows/test.yml` は `has_integration: true` になっている ([test.yml:28](.github/workflows/test.yml))。backend
  (`alc-maintenance` crate, #c651-2) がマージされ migrations/147 が 4 テーブルを作るため、
  `tests/fixtures/{init_local_db,seed}.sql` を実 schema に合わせて書いて有効化済み。
- `ippoan/nuxt-trouble` にあった workflow のうち、**`tag-release.yml` / `release-wave.yml` /
  `cap-catalog-extract.yml` / `release-wave-retest.yml` は入れてある** (`release-wave.yml` は
  commit `31c6226` (PR #6)、`release-wave-retest.yml` は Refs #10 で追加)。
  **`preview-deploy.yml` / `skills-check.yml` / `ci-shape-report.yml` はまだ入れていない**
  (org 未登録の設定に依存するため)。
  - `ci-shape-report.yml` は `ippoan/ci-workflows` の reusable が
    `secrets.RELEASE_WAVE_WEBHOOK_SECRET` (org secret) で ci-dashboard の
    `/webhooks/ci-shape` に POST する。その org secret のアクセス範囲が
    「選択した repository のみ」だと、この新 repo は対象外で fail し続ける
    (`CI_SHAPE_SECRET is empty` で loud fail する実装)。前提が確認できるまで外した。
  - `cap-catalog-extract.yml` (→ `ippoan/ci-workflows` の `catalog-extract.yml`)
    は secrets を一切使わず (`secrets: inherit` も無し)、source を静的解析して
    artifact (JSONL) を upload するだけ (Refs ippoan/cap-catalog#3)。org 側の登録が
    無くても落ちない構成。
- `.ippoan-dev.yaml` の `port` は `3024` (2026-09-18 時点、`ippoan/dev-proxy/registry.json`
  の空き番の実測)。TODO(#c651-12) — 登録 PR がまだ入っておらず未登録なので
  `ci/Dev Proxy Validate` はまだ通らない (登録され次第、値の一致を確認すること)。

## 型 — ★ TODO(#c651-2 マージ後)

backend は ts-rs で型を出力し `app/types/generated/` に同期する運用 (nuxt-trouble と同型)。
`alc-maintenance` crate 本体 (#c651-2) がまだマージされていないため、**`app/types/index.ts`
は手書きの型で暫定している**。マージ後にやること:

1. `app/types/generated/` に生成型を配置する CI 導線を用意する
2. `app/types/index.ts` の手書き型を実際の生成型に差し替える
3. 特に `MaintenanceVehicle.car_id` / `cert_no` / `car_inspection_expiry` の
   フィールド名・null 許容が生成型と一致するか確認する (紐づけ状態の表現が
   backend 側の実装で変わっている可能性がある)
4. `CarInsCandidate.matched_by` の実際の値集合 (`registration_number` /
   `cert_no` / `none` としているのは issue 本文からの推測) を確認する

## ドメインモデル上の注意

### 車両登録は「登録番号だけ」で完結する設計

`vehicles/new.vue` は登録番号のみ必須。車検証 (carins) が無いテナントや、車検証を
後から紐づけたいケースのための設計要件なので、`display_name` / `note` は任意のまま
残し、carins を新規登録フローに混ぜないこと。

### 車検証の紐づけは 400 と 409 を区別して出す

`PUT /api/maintenance/vehicles/{id}/carins` は:

- `matched_by` が `none` (一致無し) → **400** →「一致する車検証が見つかりませんでした」
- 他の車両が既にその車検証を持っている → **409** →「この車検証は既に他の車両に
  紐づいています」

`app/utils/api.ts` の `ApiError` が `status` を持つので、`useVehicleDetail.ts` の
`link()` はこれで出し分けている。新しい carins 関連 API を足すときもこのパターンに
揃えること。

### 整備履歴はこのタスクの範囲外

整備記録の履歴・記録フォーム・写真 UI・カテゴリマスタ画面は後続タスクの担当。
`vehicles/[id].vue` にプレースホルダも意図的に置いていない。
