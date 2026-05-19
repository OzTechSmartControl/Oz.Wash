-- ============================================================
--  OZ.LAVA RÁPIDO — Migration 02: Row Level Security (RLS)
--  Execute DEPOIS do 01_tables.sql
-- ============================================================

-- ── HABILITAR RLS EM TODAS AS TABELAS ────────────────────────
ALTER TABLE carwashes       ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles        ENABLE ROW LEVEL SECURITY;
ALTER TABLE employees       ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients         ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicles        ENABLE ROW LEVEL SECURITY;
ALTER TABLE services        ENABLE ROW LEVEL SECURITY;
ALTER TABLE products        ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_orders  ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_sales   ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses        ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions   ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_checkouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE courtesy_access ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform_alerts ENABLE ROW LEVEL SECURITY;

-- ============================================================
--  FUNÇÃO AUXILIAR: my_carwash_id()
--  Retorna o carwash_id do usuário autenticado atual
-- ============================================================
CREATE OR REPLACE FUNCTION my_carwash_id()
RETURNS BIGINT
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT carwash_id FROM profiles WHERE id = auth.uid();
$$;

-- ============================================================
--  FUNÇÃO AUXILIAR: is_super_admin()
-- ============================================================
CREATE OR REPLACE FUNCTION is_super_admin()
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT COALESCE(is_super_admin, FALSE) FROM profiles WHERE id = auth.uid();
$$;

-- ============================================================
--  FUNÇÃO AUXILIAR: my_role()
-- ============================================================
CREATE OR REPLACE FUNCTION my_role()
RETURNS user_role
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT role FROM profiles WHERE id = auth.uid();
$$;

-- ============================================================
--  PROFILES
-- ============================================================
DROP POLICY IF EXISTS "profiles_self_read"   ON profiles;
DROP POLICY IF EXISTS "profiles_self_update" ON profiles;
DROP POLICY IF EXISTS "profiles_same_cw"     ON profiles;
DROP POLICY IF EXISTS "profiles_superadmin"  ON profiles;
DROP POLICY IF EXISTS "profiles_insert_own"  ON profiles;

-- Cada usuário lê e edita o próprio perfil
CREATE POLICY "profiles_self_read" ON profiles
  FOR SELECT USING (id = auth.uid());

CREATE POLICY "profiles_self_update" ON profiles
  FOR UPDATE USING (id = auth.uid());

-- Admin lê perfis do mesmo carwash
CREATE POLICY "profiles_same_cw" ON profiles
  FOR SELECT USING (
    is_super_admin()
    OR (my_role() = 'admin' AND carwash_id = my_carwash_id())
  );

-- Super admin faz tudo
CREATE POLICY "profiles_superadmin" ON profiles
  FOR ALL USING (is_super_admin());

-- Trigger de inserção automática de perfil (ver 03_functions.sql)
CREATE POLICY "profiles_insert_own" ON profiles
  FOR INSERT WITH CHECK (id = auth.uid());

-- ============================================================
--  CARWASHES
-- ============================================================
DROP POLICY IF EXISTS "carwashes_read_own"    ON carwashes;
DROP POLICY IF EXISTS "carwashes_update_own"  ON carwashes;
DROP POLICY IF EXISTS "carwashes_insert"      ON carwashes;
DROP POLICY IF EXISTS "carwashes_superadmin"  ON carwashes;

-- Usuário lê o próprio carwash
CREATE POLICY "carwashes_read_own" ON carwashes
  FOR SELECT USING (id = my_carwash_id() OR is_super_admin());

-- Admin atualiza o próprio carwash
CREATE POLICY "carwashes_update_own" ON carwashes
  FOR UPDATE USING (id = my_carwash_id() AND my_role() = 'admin');

-- Qualquer auth pode inserir (durante onboarding)
CREATE POLICY "carwashes_insert" ON carwashes
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Super admin faz tudo
CREATE POLICY "carwashes_superadmin" ON carwashes
  FOR ALL USING (is_super_admin());

-- ============================================================
--  MACRO: política padrão para tabelas com carwash_id
--  Admin: CRUD completo no próprio carwash
--  Employee: somente leitura no próprio carwash
--  Super admin: tudo
-- ============================================================

-- ── EMPLOYEES ────────────────────────────────────────────────
DROP POLICY IF EXISTS "employees_read"    ON employees;
DROP POLICY IF EXISTS "employees_write"   ON employees;
DROP POLICY IF EXISTS "employees_superadmin" ON employees;

CREATE POLICY "employees_read" ON employees
  FOR SELECT USING (
    carwash_id = my_carwash_id() OR is_super_admin()
  );

CREATE POLICY "employees_write" ON employees
  FOR ALL USING (
    carwash_id = my_carwash_id() AND my_role() = 'admin'
  ) WITH CHECK (
    carwash_id = my_carwash_id() AND my_role() = 'admin'
  );

CREATE POLICY "employees_superadmin" ON employees
  FOR ALL USING (is_super_admin());

-- ── CLIENTS ──────────────────────────────────────────────────
DROP POLICY IF EXISTS "clients_read"       ON clients;
DROP POLICY IF EXISTS "clients_write"      ON clients;
DROP POLICY IF EXISTS "clients_superadmin" ON clients;

CREATE POLICY "clients_read" ON clients
  FOR SELECT USING (
    carwash_id = my_carwash_id() OR is_super_admin()
  );

CREATE POLICY "clients_write" ON clients
  FOR ALL USING (
    carwash_id = my_carwash_id()
  ) WITH CHECK (
    carwash_id = my_carwash_id()
  );

CREATE POLICY "clients_superadmin" ON clients
  FOR ALL USING (is_super_admin());

-- ── VEHICLES ─────────────────────────────────────────────────
DROP POLICY IF EXISTS "vehicles_read"       ON vehicles;
DROP POLICY IF EXISTS "vehicles_write"      ON vehicles;
DROP POLICY IF EXISTS "vehicles_superadmin" ON vehicles;

CREATE POLICY "vehicles_read" ON vehicles
  FOR SELECT USING (
    carwash_id = my_carwash_id() OR is_super_admin()
  );

CREATE POLICY "vehicles_write" ON vehicles
  FOR ALL USING (
    carwash_id = my_carwash_id()
  ) WITH CHECK (
    carwash_id = my_carwash_id()
  );

CREATE POLICY "vehicles_superadmin" ON vehicles
  FOR ALL USING (is_super_admin());

-- ── SERVICES ─────────────────────────────────────────────────
DROP POLICY IF EXISTS "services_read"       ON services;
DROP POLICY IF EXISTS "services_write"      ON services;
DROP POLICY IF EXISTS "services_superadmin" ON services;

CREATE POLICY "services_read" ON services
  FOR SELECT USING (
    carwash_id = my_carwash_id() OR is_super_admin()
  );

CREATE POLICY "services_write" ON services
  FOR ALL USING (
    carwash_id = my_carwash_id() AND my_role() = 'admin'
  ) WITH CHECK (
    carwash_id = my_carwash_id() AND my_role() = 'admin'
  );

CREATE POLICY "services_superadmin" ON services
  FOR ALL USING (is_super_admin());

-- ── PRODUCTS ─────────────────────────────────────────────────
DROP POLICY IF EXISTS "products_read"       ON products;
DROP POLICY IF EXISTS "products_write"      ON products;
DROP POLICY IF EXISTS "products_superadmin" ON products;

CREATE POLICY "products_read" ON products
  FOR SELECT USING (
    carwash_id = my_carwash_id() OR is_super_admin()
  );

CREATE POLICY "products_write" ON products
  FOR ALL USING (
    carwash_id = my_carwash_id() AND my_role() = 'admin'
  ) WITH CHECK (
    carwash_id = my_carwash_id() AND my_role() = 'admin'
  );

CREATE POLICY "products_superadmin" ON products
  FOR ALL USING (is_super_admin());

-- ── SERVICE_ORDERS ────────────────────────────────────────────
DROP POLICY IF EXISTS "orders_read"       ON service_orders;
DROP POLICY IF EXISTS "orders_write"      ON service_orders;
DROP POLICY IF EXISTS "orders_superadmin" ON service_orders;

CREATE POLICY "orders_read" ON service_orders
  FOR SELECT USING (
    carwash_id = my_carwash_id() OR is_super_admin()
  );

CREATE POLICY "orders_write" ON service_orders
  FOR ALL USING (
    carwash_id = my_carwash_id()
  ) WITH CHECK (
    carwash_id = my_carwash_id()
  );

CREATE POLICY "orders_superadmin" ON service_orders
  FOR ALL USING (is_super_admin());

-- ── PRODUCT_SALES ─────────────────────────────────────────────
DROP POLICY IF EXISTS "product_sales_read"       ON product_sales;
DROP POLICY IF EXISTS "product_sales_write"      ON product_sales;
DROP POLICY IF EXISTS "product_sales_superadmin" ON product_sales;

CREATE POLICY "product_sales_read" ON product_sales
  FOR SELECT USING (
    carwash_id = my_carwash_id() OR is_super_admin()
  );

CREATE POLICY "product_sales_write" ON product_sales
  FOR ALL USING (
    carwash_id = my_carwash_id()
  ) WITH CHECK (
    carwash_id = my_carwash_id()
  );

CREATE POLICY "product_sales_superadmin" ON product_sales
  FOR ALL USING (is_super_admin());

-- ── STOCK_MOVEMENTS ───────────────────────────────────────────
DROP POLICY IF EXISTS "stock_read"       ON stock_movements;
DROP POLICY IF EXISTS "stock_write"      ON stock_movements;
DROP POLICY IF EXISTS "stock_superadmin" ON stock_movements;

CREATE POLICY "stock_read" ON stock_movements
  FOR SELECT USING (
    carwash_id = my_carwash_id() OR is_super_admin()
  );

CREATE POLICY "stock_write" ON stock_movements
  FOR ALL USING (
    carwash_id = my_carwash_id() AND my_role() = 'admin'
  ) WITH CHECK (
    carwash_id = my_carwash_id() AND my_role() = 'admin'
  );

CREATE POLICY "stock_superadmin" ON stock_movements
  FOR ALL USING (is_super_admin());

-- ── EXPENSES ─────────────────────────────────────────────────
DROP POLICY IF EXISTS "expenses_read"       ON expenses;
DROP POLICY IF EXISTS "expenses_write"      ON expenses;
DROP POLICY IF EXISTS "expenses_superadmin" ON expenses;

CREATE POLICY "expenses_read" ON expenses
  FOR SELECT USING (
    carwash_id = my_carwash_id() OR is_super_admin()
  );

CREATE POLICY "expenses_write" ON expenses
  FOR ALL USING (
    carwash_id = my_carwash_id() AND my_role() = 'admin'
  ) WITH CHECK (
    carwash_id = my_carwash_id() AND my_role() = 'admin'
  );

CREATE POLICY "expenses_superadmin" ON expenses
  FOR ALL USING (is_super_admin());

-- ── SUBSCRIPTIONS ────────────────────────────────────────────
DROP POLICY IF EXISTS "subscriptions_read"       ON subscriptions;
DROP POLICY IF EXISTS "subscriptions_superadmin" ON subscriptions;

CREATE POLICY "subscriptions_read" ON subscriptions
  FOR SELECT USING (
    carwash_id = my_carwash_id() OR is_super_admin()
  );

CREATE POLICY "subscriptions_superadmin" ON subscriptions
  FOR ALL USING (is_super_admin());

-- ── PAYMENT_CHECKOUTS ────────────────────────────────────────
DROP POLICY IF EXISTS "payment_checkouts_superadmin" ON payment_checkouts;

CREATE POLICY "payment_checkouts_superadmin" ON payment_checkouts
  FOR ALL USING (is_super_admin());

-- ── COURTESY_ACCESS ──────────────────────────────────────────
DROP POLICY IF EXISTS "courtesy_read"       ON courtesy_access;
DROP POLICY IF EXISTS "courtesy_superadmin" ON courtesy_access;

CREATE POLICY "courtesy_read" ON courtesy_access
  FOR SELECT USING (
    carwash_id = my_carwash_id() OR is_super_admin()
  );

CREATE POLICY "courtesy_superadmin" ON courtesy_access
  FOR ALL USING (is_super_admin());

-- ── PLATFORM_ALERTS ──────────────────────────────────────────
DROP POLICY IF EXISTS "alerts_read"       ON platform_alerts;
DROP POLICY IF EXISTS "alerts_superadmin" ON platform_alerts;

CREATE POLICY "alerts_read" ON platform_alerts
  FOR SELECT USING (active = TRUE OR is_super_admin());

CREATE POLICY "alerts_superadmin" ON platform_alerts
  FOR ALL USING (is_super_admin());
