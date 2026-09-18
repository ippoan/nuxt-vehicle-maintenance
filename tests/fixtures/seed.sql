-- Integration test seed data (docker-compose.test.yml の db-seed が
-- api-migrate 完了後に psql で流す)。
--
-- schema の正本は ippoan/rust-alc-api の migrations/147_create_maintenance_tables.sql
-- (maintenance_vehicles / maintenance_categories / maintenance_records /
-- maintenance_files の 4 テーブル)。car_inspection は migrations/048。
--
-- ID は tests/integration/maintenance.live.test.ts と一致させること
-- (テスト側は tests/helpers/api-test-env.ts の TEST_* 定数経由で参照する)。
--
-- RLS: 4 テーブルすべてに tenant_isolation policy (147:94-108) が掛かっているが、
-- この seed は postgres (superuser) で流すため RLS をバイパスする。API 側は
-- TenantConn が app.current_tenant_id を張った接続で読むので、下の set_config は
-- 「seed も同じテナント文脈で書いている」ことを明示するためのもの。

SET search_path TO alc_api;

-- ---------------------------------------------------------------------------
-- テナント
-- ---------------------------------------------------------------------------
INSERT INTO tenants (id, name, slug) VALUES
  ('11111111-1111-1111-1111-111111111111', 'Test Company', 'test-company');

SELECT set_config('app.current_tenant_id', '11111111-1111-1111-1111-111111111111', false);

-- ---------------------------------------------------------------------------
-- 整備カテゴリ (UNIQUE (tenant_id, name) — 同名 POST が 409 になることの確認に使う)
-- ---------------------------------------------------------------------------
INSERT INTO maintenance_categories (id, tenant_id, name, sort_order) VALUES
  ('22222222-2222-2222-2222-222222222201', '11111111-1111-1111-1111-111111111111', '定期点検', 0),
  ('22222222-2222-2222-2222-222222222202', '11111111-1111-1111-1111-111111111111', '車検', 1),
  ('22222222-2222-2222-2222-222222222203', '11111111-1111-1111-1111-111111111111', '修理', 2),
  ('22222222-2222-2222-2222-222222222204', '11111111-1111-1111-1111-111111111111', '部品交換', 3);

-- ---------------------------------------------------------------------------
-- 電子車検証 (car_inspection)
--
-- NOT NULL の TEXT 列が 90 本以上あり全列を並べると seed が壊れやすいので、
-- 「NOT NULL かつ default 無しの text 列」を information_schema から引いて '' で
-- 埋めた行を 1 行ずつ入れ、直後に必要な列だけ UPDATE する。列が増減しても
-- この seed は追随する。
--
-- 1 行ずつ insert → update するのは car_inspection_org_unique
-- (tenant_id, "ElectCertMgNo", "Grantdate"E/Y/M/D) に引っかからないため
-- (全列 '' の行が 2 行同時に存在できない)。
--
-- "TwodimensionCodeInfoValidPeriodExpirdate" は YYMMDD。lookup_expiry
-- (crates/alc-core/src/repo/car_inspections.rs:55) がこの形の行を期限として読む。
--
-- ★ 番号の形は normalize_carins_numbers
-- (crates/alc-core/src/repository/car_inspections.rs:74-79) が検査する:
--   - "ElectCertMgNo" (cert_no) は **12〜13 桁の数字のみ**
--   - "CarId" (car_id) は **14 文字の英数字ちょうど**
-- 外れた値は照合前に 400 で弾かれるため、seed もこの形に揃える
-- (整備記録側の ...-0001 のような見た目の値にすると、紐づけが「一致無し」ではなく
--  「形式不正」の 400 になり、テストが理由を取り違える)。
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  blank_cols TEXT := '';
  blank_vals TEXT := '';
  col_name   TEXT;
  new_id     INT;
  spec       RECORD;
BEGIN
  FOR col_name IN
    SELECT column_name FROM information_schema.columns
    WHERE table_schema = 'alc_api' AND table_name = 'car_inspection'
      AND is_nullable = 'NO' AND column_default IS NULL AND data_type = 'text'
    ORDER BY ordinal_position
  LOOP
    blank_cols := blank_cols || format(', %I', col_name);
    blank_vals := blank_vals || ', ''''';
  END LOOP;

  FOR spec IN
    SELECT * FROM (VALUES
      -- cert_no,        car_id,           car_no (登録番号),  期限 YYMMDD
      ('100000000001', 'CAR00000000001', '品川100あ1234', '271130'),
      ('100000000002', 'CAR00000000002', '足立300さ5678', '280228')
    ) AS t(cert_no, car_id, car_no, expires)
  LOOP
    EXECUTE format(
      'INSERT INTO alc_api.car_inspection (tenant_id%s) VALUES (%L%s) RETURNING id',
      blank_cols, '11111111-1111-1111-1111-111111111111', blank_vals
    ) INTO new_id;

    UPDATE alc_api.car_inspection SET
      "ElectCertMgNo" = spec.cert_no,
      "CarId"         = spec.car_id,
      "EntryNoCarNo"  = spec.car_no,
      "CarNo"         = spec.car_no,
      "TwodimensionCodeInfoValidPeriodExpirdate" = spec.expires,
      "GrantdateE" = '令和', "GrantdateY" = '7', "GrantdateM" = '11', "GrantdateD" = '30'
    WHERE id = new_id;
  END LOOP;
END $$;

-- ---------------------------------------------------------------------------
-- 車両マスタ
--
-- - ...301 は car_id NULL (未紐づけ)。carins-candidates / link の成功・400・409 を
--   すべてこの 1 台で確かめる。registration_number は 100000000001 の EntryNoCarNo と
--   一致させてあるので候補に CAR00000000001 が出る。
-- - ...302 は CAR00000000002 を既に持っている。...301 にそれを紐づけようとすると
--   partial unique index (147:30) に当たり 409 になる。
-- ---------------------------------------------------------------------------
INSERT INTO maintenance_vehicles (id, tenant_id, registration_number, display_name, car_id, carins_linked_at, note) VALUES
  ('33333333-3333-3333-3333-333333333301', '11111111-1111-1111-1111-111111111111',
   '品川100あ1234', '1号車', NULL, NULL, '車検証は未紐づけ'),
  ('33333333-3333-3333-3333-333333333302', '11111111-1111-1111-1111-111111111111',
   '足立300さ5678', '2号車', 'CAR00000000002', now(), NULL);

-- ---------------------------------------------------------------------------
-- 整備記録 (cost は NUMERIC(12,2)。API は ::text で文字列として返す)
-- ---------------------------------------------------------------------------
INSERT INTO maintenance_records
  (id, tenant_id, vehicle_id, category_id, performed_on, odometer_km, vendor, description, cost, next_due_on) VALUES
  ('44444444-4444-4444-4444-444444444401', '11111111-1111-1111-1111-111111111111',
   '33333333-3333-3333-3333-333333333301', '22222222-2222-2222-2222-222222222201',
   '2026-01-15', 12000, 'テスト整備工場', 'オイル交換', 5000.00, '2026-07-15'),
  ('44444444-4444-4444-4444-444444444402', '11111111-1111-1111-1111-111111111111',
   '33333333-3333-3333-3333-333333333302', '22222222-2222-2222-2222-222222222202',
   '2026-02-20', 48000, '車検センター', '継続検査', 128000.00, '2028-02-20');
