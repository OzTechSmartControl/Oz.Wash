-- ============================================================
--  OZ.LAVA RÁPIDO — Migration 03: Funções SQL
--  Execute DEPOIS do 02_rls.sql
-- ============================================================

-- ============================================================
--  TRIGGER: criar perfil automaticamente ao cadastrar usuário
-- ============================================================
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO profiles (id, email, name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    'employee'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ============================================================
--  can_register_with_email(p_email TEXT) → BOOLEAN
--  Verifica se um e-mail tem pagamento confirmado (paid)
--  mas ainda não criou conta. Usado no Onboarding.
-- ============================================================
CREATE OR REPLACE FUNCTION can_register_with_email(p_email TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM payment_checkouts
    WHERE email    = p_email
      AND status   = 'paid'
      AND carwash_id IS NULL   -- ainda não reivindicado
  );
END;
$$;

-- ============================================================
--  claim_paid_subscription(p_email, p_carwash_id, p_plan)
--  Chamado após criar o carwash no onboarding.
--  Vincula o checkout pago ao carwash e cria a subscription.
-- ============================================================
CREATE OR REPLACE FUNCTION claim_paid_subscription(
  p_email      TEXT,
  p_carwash_id BIGINT,
  p_plan       TEXT
)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_checkout  payment_checkouts%ROWTYPE;
  v_expires   DATE;
BEGIN
  -- Busca o checkout pago não reivindicado
  SELECT * INTO v_checkout
  FROM payment_checkouts
  WHERE email   = p_email
    AND status  = 'paid'
    AND carwash_id IS NULL
  ORDER BY paid_at DESC
  LIMIT 1;

  -- Vincula o checkout ao carwash
  IF v_checkout.id IS NOT NULL THEN
    UPDATE payment_checkouts
    SET carwash_id = p_carwash_id
    WHERE id = v_checkout.id;
  END IF;

  -- Calcula expiração pelo plano
  v_expires := CASE p_plan
    WHEN 'monthly'   THEN CURRENT_DATE + INTERVAL '30 days'
    WHEN 'semestral' THEN CURRENT_DATE + INTERVAL '6 months'
    WHEN 'annual'    THEN CURRENT_DATE + INTERVAL '1 year'
    ELSE                  CURRENT_DATE + INTERVAL '30 days'
  END;

  -- Cria (ou atualiza) a subscription do carwash
  INSERT INTO subscriptions (carwash_id, plan, status, starts_at, expires_at, price_paid)
  VALUES (
    p_carwash_id,
    p_plan::subscription_plan,
    'active',
    CURRENT_DATE,
    v_expires,
    COALESCE(v_checkout.amount, 0)
  )
  ON CONFLICT DO NOTHING;

  -- Atualiza o perfil do usuário atual para ser admin do carwash
  UPDATE profiles
  SET role = 'admin', carwash_id = p_carwash_id
  WHERE id = auth.uid();

END;
$$;

-- ============================================================
--  current_user_access_status() → JSON
--  Retorna { has_access: boolean, reason: text }
--  Usado pelo App.jsx para liberar ou bloquear acesso.
-- ============================================================
CREATE OR REPLACE FUNCTION current_user_access_status()
RETURNS JSON
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_profile     profiles%ROWTYPE;
  v_sub         subscriptions%ROWTYPE;
  v_courtesy    courtesy_access%ROWTYPE;
BEGIN
  -- Carrega perfil do usuário atual
  SELECT * INTO v_profile FROM profiles WHERE id = auth.uid();

  -- Super admin sempre tem acesso
  IF v_profile.is_super_admin THEN
    RETURN json_build_object('has_access', TRUE, 'reason', 'super_admin');
  END IF;

  -- Sem carwash_id = não completou onboarding
  IF v_profile.carwash_id IS NULL THEN
    RETURN json_build_object('has_access', FALSE, 'reason', 'no_carwash');
  END IF;

  -- Verifica assinatura ativa
  SELECT * INTO v_sub
  FROM subscriptions
  WHERE carwash_id = v_profile.carwash_id
    AND status IN ('active', 'trial')
    AND expires_at >= CURRENT_DATE
  ORDER BY expires_at DESC
  LIMIT 1;

  IF v_sub.id IS NOT NULL THEN
    RETURN json_build_object('has_access', TRUE, 'reason', 'active_subscription');
  END IF;

  -- Verifica cortesia
  SELECT * INTO v_courtesy
  FROM courtesy_access
  WHERE carwash_id = v_profile.carwash_id
    AND revoked    = FALSE
    AND (expires_at IS NULL OR expires_at >= CURRENT_DATE)
  ORDER BY created_at DESC
  LIMIT 1;

  IF v_courtesy.id IS NOT NULL THEN
    RETURN json_build_object('has_access', TRUE, 'reason', 'courtesy');
  END IF;

  -- Verifica cortesia revogada (mensagem específica)
  IF EXISTS (
    SELECT 1 FROM courtesy_access
    WHERE carwash_id = v_profile.carwash_id AND revoked = TRUE
  ) THEN
    RETURN json_build_object('has_access', FALSE, 'reason', 'courtesy_revoked');
  END IF;

  -- Assinatura vencida
  RETURN json_build_object('has_access', FALSE, 'reason', 'subscription_expired');
END;
$$;

-- ============================================================
--  has_active_access(p_carwash_id BIGINT) → BOOLEAN
--  Versão simplificada usada como fallback no App.jsx
-- ============================================================
CREATE OR REPLACE FUNCTION has_active_access(p_carwash_id BIGINT)
RETURNS BOOLEAN
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM subscriptions
    WHERE carwash_id = p_carwash_id
      AND status IN ('active', 'trial', 'courtesy')
      AND expires_at >= CURRENT_DATE
  )
  OR EXISTS (
    SELECT 1 FROM courtesy_access
    WHERE carwash_id = p_carwash_id
      AND revoked    = FALSE
      AND (expires_at IS NULL OR expires_at >= CURRENT_DATE)
  );
END;
$$;

-- ============================================================
--  renew_subscription(p_carwash_id, p_plan, p_amount) → VOID
--  Renova ou cria uma subscription após novo pagamento.
-- ============================================================
CREATE OR REPLACE FUNCTION renew_subscription(
  p_carwash_id BIGINT,
  p_plan       TEXT,
  p_amount     NUMERIC DEFAULT 0
)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_expires DATE;
  v_sub     subscriptions%ROWTYPE;
BEGIN
  -- Calcula nova expiração a partir de hoje (ou da expiração atual, se ainda válida)
  SELECT * INTO v_sub FROM subscriptions
  WHERE carwash_id = p_carwash_id ORDER BY expires_at DESC LIMIT 1;

  v_expires := CASE p_plan
    WHEN 'monthly'   THEN GREATEST(CURRENT_DATE, COALESCE(v_sub.expires_at, CURRENT_DATE)) + INTERVAL '30 days'
    WHEN 'semestral' THEN GREATEST(CURRENT_DATE, COALESCE(v_sub.expires_at, CURRENT_DATE)) + INTERVAL '6 months'
    WHEN 'annual'    THEN GREATEST(CURRENT_DATE, COALESCE(v_sub.expires_at, CURRENT_DATE)) + INTERVAL '1 year'
    ELSE                  GREATEST(CURRENT_DATE, COALESCE(v_sub.expires_at, CURRENT_DATE)) + INTERVAL '30 days'
  END;

  IF v_sub.id IS NOT NULL THEN
    UPDATE subscriptions
    SET plan = p_plan::subscription_plan, status = 'active', expires_at = v_expires,
        price_paid = p_amount, updated_at = NOW()
    WHERE id = v_sub.id;
  ELSE
    INSERT INTO subscriptions (carwash_id, plan, status, starts_at, expires_at, price_paid)
    VALUES (p_carwash_id, p_plan::subscription_plan, 'active', CURRENT_DATE, v_expires, p_amount);
  END IF;
END;
$$;

-- ============================================================
--  cancel_subscription(p_carwash_id BIGINT) → VOID
-- ============================================================
CREATE OR REPLACE FUNCTION cancel_subscription(p_carwash_id BIGINT)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
  UPDATE subscriptions
  SET status = 'cancelled', updated_at = NOW()
  WHERE carwash_id = p_carwash_id
    AND status NOT IN ('cancelled');
END;
$$;

-- ============================================================
--  get_saas_metrics() → JSON
--  Usado pelo Super Admin Dashboard.
--  Retorna métricas agregadas da plataforma.
-- ============================================================
CREATE OR REPLACE FUNCTION get_saas_metrics()
RETURNS JSON
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_result JSON;
BEGIN
  SELECT json_build_object(
    -- MRR = soma das assinaturas ativas normalizadas para /mês
    'mrr', (
      SELECT COALESCE(SUM(
        CASE s.plan
          WHEN 'monthly'   THEN s.price_paid
          WHEN 'semestral' THEN s.price_paid / 6.0
          WHEN 'annual'    THEN s.price_paid / 12.0
          ELSE 0
        END
      ), 0)
      FROM subscriptions s
      WHERE s.status = 'active' AND s.expires_at >= CURRENT_DATE
    ),
    -- ARR
    'arr', (
      SELECT COALESCE(SUM(
        CASE s.plan
          WHEN 'monthly'   THEN s.price_paid * 12
          WHEN 'semestral' THEN s.price_paid * 2
          WHEN 'annual'    THEN s.price_paid
          ELSE 0
        END
      ), 0)
      FROM subscriptions s
      WHERE s.status = 'active' AND s.expires_at >= CURRENT_DATE
    ),
    'active_carwashes', (
      SELECT COUNT(DISTINCT carwash_id) FROM subscriptions
      WHERE status = 'active' AND expires_at >= CURRENT_DATE
    ),
    'total_carwashes', (SELECT COUNT(*) FROM carwashes),
    'overdue_carwashes', (
      SELECT COUNT(DISTINCT carwash_id) FROM subscriptions
      WHERE status = 'active' AND expires_at < CURRENT_DATE
    ),
    'cancelled_carwashes', (
      SELECT COUNT(DISTINCT carwash_id) FROM subscriptions WHERE status = 'cancelled'
    ),
    'courtesy_carwashes', (
      SELECT COUNT(DISTINCT carwash_id) FROM courtesy_access
      WHERE revoked = FALSE AND (expires_at IS NULL OR expires_at >= CURRENT_DATE)
    ),
    'monthly_revenue', (
      SELECT COALESCE(SUM(amount), 0) FROM payment_checkouts
      WHERE status = 'paid'
        AND paid_at >= date_trunc('month', CURRENT_DATE)
    ),
    'plan_distribution', (
      SELECT json_agg(row_to_json(t))
      FROM (
        SELECT plan::text, COUNT(*) AS count
        FROM subscriptions WHERE status = 'active' AND expires_at >= CURRENT_DATE
        GROUP BY plan
      ) t
    ),
    'monthly_growth', (
      SELECT json_agg(row_to_json(t))
      FROM (
        SELECT
          TO_CHAR(date_trunc('month', created_at), 'Mon/YY') AS month,
          COUNT(*) AS new_carwashes,
          COALESCE(SUM(price_paid), 0) AS revenue
        FROM subscriptions
        WHERE created_at >= NOW() - INTERVAL '6 months'
        GROUP BY date_trunc('month', created_at)
        ORDER BY date_trunc('month', created_at)
      ) t
    )
  ) INTO v_result;

  RETURN v_result;
END;
$$;

-- ============================================================
--  TRIGGER: atualizar stock ao registrar product_sale
-- ============================================================
CREATE OR REPLACE FUNCTION update_stock_on_sale()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
  -- Debita do estoque atual
  UPDATE products
  SET stock_current = stock_current - NEW.quantity
  WHERE id = NEW.product_id;

  -- Registra movimentação
  INSERT INTO stock_movements (carwash_id, product_id, type, quantity, notes)
  VALUES (NEW.carwash_id, NEW.product_id, 'saida', NEW.quantity, 'Venda');

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tg_stock_on_sale ON product_sales;
CREATE TRIGGER tg_stock_on_sale
  AFTER INSERT ON product_sales
  FOR EACH ROW EXECUTE FUNCTION update_stock_on_sale();

-- ============================================================
--  TRIGGER: atualizar stock_current ao registrar stock_movement
-- ============================================================
CREATE OR REPLACE FUNCTION apply_stock_movement()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
  IF NEW.type = 'entrada' THEN
    UPDATE products SET stock_current = stock_current + NEW.quantity WHERE id = NEW.product_id;
  ELSIF NEW.type = 'ajuste' THEN
    -- 'ajuste' define o estoque diretamente (usa quantity como novo valor)
    UPDATE products SET stock_current = NEW.quantity WHERE id = NEW.product_id;
  END IF;
  -- 'saida' já é tratada pelo trigger de product_sales
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tg_apply_stock_movement ON stock_movements;
CREATE TRIGGER tg_apply_stock_movement
  AFTER INSERT ON stock_movements
  FOR EACH ROW
  WHEN (NEW.type IN ('entrada', 'ajuste'))
  EXECUTE FUNCTION apply_stock_movement();

-- ============================================================
--  GRANT: funções RPC acessíveis via REST API (anon e auth)
-- ============================================================
GRANT EXECUTE ON FUNCTION can_register_with_email(TEXT)         TO anon, authenticated;
GRANT EXECUTE ON FUNCTION claim_paid_subscription(TEXT, BIGINT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION current_user_access_status()          TO authenticated;
GRANT EXECUTE ON FUNCTION has_active_access(BIGINT)             TO authenticated;
GRANT EXECUTE ON FUNCTION renew_subscription(BIGINT, TEXT, NUMERIC) TO authenticated;
GRANT EXECUTE ON FUNCTION cancel_subscription(BIGINT)           TO authenticated;
GRANT EXECUTE ON FUNCTION get_saas_metrics()                    TO authenticated;
GRANT EXECUTE ON FUNCTION my_carwash_id()                       TO authenticated;
GRANT EXECUTE ON FUNCTION is_super_admin()                      TO authenticated;
GRANT EXECUTE ON FUNCTION my_role()                             TO authenticated;
