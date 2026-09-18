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

**★ このタスク (#c651-3) 時点ではまだデプロイしていない。** 前提条件が未了:

- auth-worker 側にこの consumer の登録 (ACL / `INTERNAL_SHARED_SECRET` の払い出し) が
  まだ済んでいない。登録前に deploy すると前段の認証が無い口が生えるため、登録は親が
  別途手配してから `wrangler deploy` を打つこと。
- `.github/workflows/test.yml` は `has_deploy: false` にしてある (上と同じ理由)。
  登録が済んだら true に戻す。
- `.github/workflows/test.yml` は `has_integration: false` にしてある。backend
  (`alc-maintenance` crate, #c651-2) の migration/seed がまだ無く、
  `tests/fixtures/*.sql` も空のプレースホルダのため (下記)。#c651-2 マージ後、
  実際の schema に合わせて fixtures を書いてから true に戻す。
- `ippoan/nuxt-trouble` にあった `preview-deploy.yml` / `tag-release.yml` /
  `release-wave.yml` / `release-wave-retest.yml` / `skills-check.yml` はこの repo に
  まだ入れていない (いずれも deploy を伴うか、この新 repo 未登録の org 設定
  (`release-wave-targets.yaml` の entry 等) に依存するため)。auth-worker 登録・
  release-wave 登録が済んだ後で親の判断で追加する。
- `.ippoan-dev.yaml` の `port: 3018` は仮値。`ippoan/dev-proxy/registry.json` に
  未登録なので、登録時に実際の値と突き合わせること。

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
