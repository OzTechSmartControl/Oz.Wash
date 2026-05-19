-- ============================================================
--  OZ.LAVA RÁPIDO — Migration 01: Tabelas
--  Execute no Supabase SQL Editor
-- ============================================================

-- ── EXTENSÕES ────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ── ENUM: ROLES ──────────────────────────────────────────────
DO $$ BEGIN
  CREATE TYPE user_role AS ENUM ('super_admin', 'admin', 'employee');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- ── ENUM: SUBSCRIPTION STATUS ─────────────────────────────────
DO $$ BEGIN
  CREATE TYPE subscription_status AS ENUM ('trial', 'active', 'overdue', 'cancelled', 'courtesy');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- ── ENUM: SUBSCRIPTION PLAN ───────────────────────────────────
DO $$ BEGIN
  CREATE TYPE subscription_plan AS ENUM ('monthly', 'semestral', 'annual');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- ── ENUM: ORDER STATUS ────────────────────────────────────────
DO $$ BEGIN
  CREATE TYPE order_status AS ENUM ('pendente', 'em andamento', 'concluído', 'cancelado');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- ============================================================
--  1. CARWASHES
-- ============================================================
CREATE TABLE IF NOT EXISTS carwashes (
  id            BIGSERIAL PRIMARY KEY,
  name          TEXT NOT NULL,
  phone         TEXT,
  accent_color  TEXT DEFAULT '#4db8ff',
  logo_url      TEXT,
  address       TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
--  2. PROFILES
-- ============================================================
CREATE TABLE IF NOT EXISTS profiles (
  id            UUID PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  email         TEXT,
  name          TEXT,
  role          user_role DEFAULT 'employee',
  carwash_id    BIGINT REFERENCES carwashes(id) ON DELETE SET NULL,
  is_super_admin BOOLEAN DEFAULT FALSE,
  avatar_url    TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
--  3. SUBSCRIPTIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS subscriptions (
  id              BIGSERIAL PRIMARY KEY,
  carwash_id      BIGINT NOT NULL REFERENCES carwashes(id) ON DELETE CASCADE,
  plan            subscription_plan NOT NULL,
  status          subscription_status DEFAULT 'active',
  starts_at       DATE NOT NULL DEFAULT CURRENT_DATE,
  expires_at      DATE NOT NULL,
  price_paid      NUMERIC(10,2) DEFAULT 0,
  mp_preapproval_id TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
--  4. PAYMENT_CHECKOUTS  (histórico de pagamentos / webhooks)
-- ============================================================
CREATE TABLE IF NOT EXISTS payment_checkouts (
  id            BIGSERIAL PRIMARY KEY,
  email         TEXT NOT NULL,
  carwash_id    BIGINT REFERENCES carwashes(id) ON DELETE SET NULL,
  plan          TEXT NOT NULL,
  amount        NUMERIC(10,2) DEFAULT 0,
  status        TEXT DEFAULT 'pending',   -- pending | paid | failed
  mp_payment_id TEXT,
  mp_preapproval_id TEXT,
  paid_at       TIMESTAMPTZ,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
--  5. COURTESY_ACCESS
-- ============================================================
CREATE TABLE IF NOT EXISTS courtesy_access (
  id            BIGSERIAL PRIMARY KEY,
  carwash_id    BIGINT NOT NULL REFERENCES carwashes(id) ON DELETE CASCADE,
  granted_by    UUID REFERENCES auth.users(id),
  reason        TEXT,
  expires_at    DATE,
  revoked       BOOLEAN DEFAULT FALSE,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
--  6. PLATFORM_ALERTS
-- ============================================================
CREATE TABLE IF NOT EXISTS platform_alerts (
  id            BIGSERIAL PRIMARY KEY,
  type          TEXT DEFAULT 'info',  -- info | warning | danger | success
  title         TEXT NOT NULL,
  message       TEXT,
  active        BOOLEAN DEFAULT TRUE,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
--  7. EMPLOYEES  (funcionários do lava rápido)
-- ============================================================
CREATE TABLE IF NOT EXISTS employees (
  id            BIGSERIAL PRIMARY KEY,
  carwash_id    BIGINT NOT NULL REFERENCES carwashes(id) ON DELETE CASCADE,
  user_id       UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  name          TEXT NOT NULL,
  phone         TEXT,
  commission    NUMERIC(5,2) DEFAULT 0,  -- percentual 0–100
  status        TEXT DEFAULT 'active',   -- active | inactive
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
--  8. CLIENTS  (clientes do lava rápido)
-- ============================================================
CREATE TABLE IF NOT EXISTS clients (
  id            BIGSERIAL PRIMARY KEY,
  carwash_id    BIGINT NOT NULL REFERENCES carwashes(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  phone         TEXT,
  whatsapp      TEXT,
  birthdate     DATE,
  notes         TEXT,
  points        INT DEFAULT 0,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
--  9. VEHICLES  (veículos dos clientes)
-- ============================================================
CREATE TABLE IF NOT EXISTS vehicles (
  id            BIGSERIAL PRIMARY KEY,
  carwash_id    BIGINT NOT NULL REFERENCES carwashes(id) ON DELETE CASCADE,
  client_id     BIGINT NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  plate         TEXT,
  brand         TEXT,
  model         TEXT,
  color         TEXT,
  year          TEXT,
  notes         TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
--  10. SERVICES  (catálogo de serviços)
-- ============================================================
CREATE TABLE IF NOT EXISTS services (
  id            BIGSERIAL PRIMARY KEY,
  carwash_id    BIGINT NOT NULL REFERENCES carwashes(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  price         NUMERIC(10,2) DEFAULT 0,
  duration      INT DEFAULT 30,  -- minutos
  active        BOOLEAN DEFAULT TRUE,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
--  11. PRODUCTS  (produtos / estoque)
-- ============================================================
CREATE TABLE IF NOT EXISTS products (
  id              BIGSERIAL PRIMARY KEY,
  carwash_id      BIGINT NOT NULL REFERENCES carwashes(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  description     TEXT,
  price           NUMERIC(10,2) DEFAULT 0,
  cost            NUMERIC(10,2) DEFAULT 0,
  stock_current   NUMERIC(10,3) DEFAULT 0,
  stock_minimum   NUMERIC(10,3) DEFAULT 0,
  unit            TEXT DEFAULT 'un',
  active          BOOLEAN DEFAULT TRUE,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
--  12. SERVICE_ORDERS  (ordens de serviço)
-- ============================================================
CREATE TABLE IF NOT EXISTS service_orders (
  id              BIGSERIAL PRIMARY KEY,
  carwash_id      BIGINT NOT NULL REFERENCES carwashes(id) ON DELETE CASCADE,
  client_id       BIGINT NOT NULL REFERENCES clients(id),
  vehicle_id      BIGINT REFERENCES vehicles(id) ON DELETE SET NULL,
  employee_id     BIGINT NOT NULL REFERENCES employees(id),
  service_id      BIGINT NOT NULL REFERENCES services(id),
  price           NUMERIC(10,2) DEFAULT 0,
  services_price  NUMERIC(10,2) DEFAULT 0,
  payment         TEXT DEFAULT 'PIX',
  date            DATE NOT NULL DEFAULT CURRENT_DATE,
  time            TIME,
  notes           TEXT,
  status          TEXT DEFAULT 'pendente',  -- pendente | em andamento | concluído | cancelado
  extra_services  JSONB DEFAULT '[]',       -- [{id, name, price}]
  products_sold   JSONB DEFAULT '[]',       -- [{id, name, qty, price}]
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
--  13. PRODUCT_SALES  (vendas de produtos avulsas)
-- ============================================================
CREATE TABLE IF NOT EXISTS product_sales (
  id            BIGSERIAL PRIMARY KEY,
  carwash_id    BIGINT NOT NULL REFERENCES carwashes(id) ON DELETE CASCADE,
  product_id    BIGINT NOT NULL REFERENCES products(id),
  employee_id   BIGINT REFERENCES employees(id) ON DELETE SET NULL,
  order_id      BIGINT REFERENCES service_orders(id) ON DELETE SET NULL,
  quantity      NUMERIC(10,3) DEFAULT 1,
  unit_price    NUMERIC(10,2) DEFAULT 0,
  total_price   NUMERIC(10,2) DEFAULT 0,
  payment       TEXT DEFAULT 'PIX',
  sold_at       TIMESTAMPTZ DEFAULT NOW(),
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
--  14. STOCK_MOVEMENTS  (movimentações de estoque)
-- ============================================================
CREATE TABLE IF NOT EXISTS stock_movements (
  id            BIGSERIAL PRIMARY KEY,
  carwash_id    BIGINT NOT NULL REFERENCES carwashes(id) ON DELETE CASCADE,
  product_id    BIGINT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  type          TEXT NOT NULL,  -- 'entrada' | 'saida' | 'ajuste'
  quantity      NUMERIC(10,3) NOT NULL,
  notes         TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
--  15. EXPENSES  (despesas / custos)
-- ============================================================
CREATE TABLE IF NOT EXISTS expenses (
  id            BIGSERIAL PRIMARY KEY,
  carwash_id    BIGINT NOT NULL REFERENCES carwashes(id) ON DELETE CASCADE,
  description   TEXT NOT NULL,
  amount        NUMERIC(10,2) DEFAULT 0,
  date          DATE NOT NULL DEFAULT CURRENT_DATE,
  category      TEXT DEFAULT 'Outros',
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
--  INDEXES (performance)
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_profiles_carwash_id     ON profiles(carwash_id);
CREATE INDEX IF NOT EXISTS idx_employees_carwash_id    ON employees(carwash_id);
CREATE INDEX IF NOT EXISTS idx_clients_carwash_id      ON clients(carwash_id);
CREATE INDEX IF NOT EXISTS idx_vehicles_carwash_id     ON vehicles(carwash_id);
CREATE INDEX IF NOT EXISTS idx_vehicles_client_id      ON vehicles(client_id);
CREATE INDEX IF NOT EXISTS idx_services_carwash_id     ON services(carwash_id);
CREATE INDEX IF NOT EXISTS idx_products_carwash_id     ON products(carwash_id);
CREATE INDEX IF NOT EXISTS idx_service_orders_cw_id    ON service_orders(carwash_id);
CREATE INDEX IF NOT EXISTS idx_service_orders_date     ON service_orders(carwash_id, date);
CREATE INDEX IF NOT EXISTS idx_product_sales_cw_id     ON product_sales(carwash_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_cw_id   ON stock_movements(carwash_id);
CREATE INDEX IF NOT EXISTS idx_expenses_carwash_id     ON expenses(carwash_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_cw_id     ON subscriptions(carwash_id);
CREATE INDEX IF NOT EXISTS idx_courtesy_access_cw_id   ON courtesy_access(carwash_id);
