-- ============================================================
--  OZ.LAVA RÁPIDO — Migration 05: Corrige courtesy_access
--  Alinha com o modelo email-based do Oz.Barber
--
--  EXECUTE NO SUPABASE SQL EDITOR
--  ⚠️  Dropa e recria a tabela courtesy_access
-- ============================================================

-- ── 1. Dropa tabela antiga e dependências ────────────────────
DROP TABLE IF EXISTS courtesy_access CASCADE;

-- ── 2. Recria no padrão Oz.Barber ───────────────────────────
CREATE TABLE IF NOT EXISTS courtesy_access (
  id               BIGSERIAL PRIMARY KEY,
  granted_to_email TEXT NOT NULL,
  granted_by       UUID REFERENCES auth.users(id),
  notes            TEXT,
  expires_at       TIMESTAMPTZ,
  revoked_at       TIMESTAMPTZ,
  carwash_id       BIGINT REFERENCES carwashes(id) ON DELETE SET NULL,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

-- ── 3. RLS ───────────────────────────────────────────────────
ALTER TABLE courtesy_access ENABLE ROW LEVEL SECURITY;

-- Super admin: acesso total
CREATE POLICY "super_admin_courtesy_all" ON courtesy_access
  FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_super_admin = TRUE)
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_super_admin = TRUE)
  );

-- Usuário autenticado: pode ver apenas a própria cortesia
CREATE POLICY "user_view_own_courtesy" ON courtesy_access
  FOR SELECT TO authenticated
  USING (
    granted_to_email = (SELECT email FROM profiles WHERE id = auth.uid())
  );

-- ── 4. Índice ────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_courtesy_email   ON courtesy_access(granted_to_email);
CREATE INDEX IF NOT EXISTS idx_courtesy_carwash ON courtesy_access(carwash_id);

-- ============================================================
--  5. can_register_with_email
--     Agora também libera quem tem cortesia ativa
-- ============================================================
CREATE OR REPLACE FUNCTION can_register_with_email(p_email TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
  RETURN
    -- pagamento confirmado e não reivindicado
    EXISTS (
      SELECT 1 FROM payment_checkouts
      WHERE email      = p_email
        AND status     = 'paid'
        AND carwash_id IS NULL
    )
    OR
    -- cortesia ativa concedida pelo super admin
    EXISTS (
      SELECT 1 FROM courtesy_access
      WHERE granted_to_email = p_email
        AND revoked_at IS NULL
        AND (expires_at IS NULL OR expires_at >= NOW())
    );
END;
$$;

-- ============================================================
--  6. claim_courtesy_access
--     Chamado no Onboarding quando o usuário tem cortesia
--     (sem pagamento). Vincula carwash_id e promove para admin.
-- ============================================================
CREATE OR REPLACE FUNCTION claim_courtesy_access(
  p_email      TEXT,
  p_carwash_id BIGINT
)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
  -- Vincula a cortesia ao carwash recém-criado
  UPDATE courtesy_access
  SET carwash_id = p_carwash_id
  WHERE granted_to_email = p_email
    AND revoked_at IS NULL
    AND (expires_at IS NULL OR expires_at >= NOW())
    AND carwash_id IS NULL;

  -- Promove o perfil para admin do lava rápido
  UPDATE profiles
  SET role = 'admin', carwash_id = p_carwash_id
  WHERE id = auth.uid();
END;
$$;

-- ============================================================
--  7. current_user_access_status
--     Verifica cortesia por e-mail (antes e após onboarding)
-- ============================================================
CREATE OR REPLACE FUNCTION current_user_access_status()
RETURNS JSON
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_profile    profiles%ROWTYPE;
  v_sub        subscriptions%ROWTYPE;
  v_courtesy   courtesy_access%ROWTYPE;
BEGIN
  SELECT * INTO v_profile FROM profiles WHERE id = auth.uid();

  -- Super admin: sempre tem acesso
  IF v_profile.is_super_admin THEN
    RETURN json_build_object('has_access', TRUE, 'reason', 'super_admin');
  END IF;

  -- Sem carwash = verifica se tem cortesia pendente de onboarding
  IF v_profile.carwash_id IS NULL THEN
    SELECT * INTO v_courtesy FROM courtesy_access
    WHERE granted_to_email = v_profile.email
      AND revoked_at IS NULL
      AND (expires_at IS NULL OR expires_at >= NOW())
    ORDER BY created_at DESC LIMIT 1;

    IF v_courtesy.id IS NOT NULL THEN
      RETURN json_build_object('has_access', TRUE, 'reason', 'courtesy_pending_onboarding');
    END IF;

    RETURN json_build_object('has_access', FALSE, 'reason', 'no_carwash');
  END IF;

  -- Verifica assinatura ativa
  SELECT * INTO v_sub
  FROM subscriptions
  WHERE carwash_id = v_profile.carwash_id
    AND status     IN ('active', 'trial')
    AND expires_at >= CURRENT_DATE
  ORDER BY expires_at DESC LIMIT 1;

  IF v_sub.id IS NOT NULL THEN
    RETURN json_build_object('has_access', TRUE, 'reason', 'active_subscription');
  END IF;

  -- Verifica cortesia por e-mail (inclui carwash já vinculado)
  SELECT * INTO v_courtesy FROM courtesy_access
  WHERE granted_to_email = v_profile.email
    AND revoked_at IS NULL
    AND (expires_at IS NULL OR expires_at >= NOW())
  ORDER BY created_at DESC LIMIT 1;

  IF v_courtesy.id IS NOT NULL THEN
    RETURN json_build_object('has_access', TRUE, 'reason', 'courtesy');
  END IF;

  -- Cortesia revogada
  IF EXISTS (
    SELECT 1 FROM courtesy_access
    WHERE granted_to_email = v_profile.email
      AND revoked_at IS NOT NULL
  ) THEN
    RETURN json_build_object('has_access', FALSE, 'reason', 'courtesy_revoked');
  END IF;

  -- Assinatura expirada
  RETURN json_build_object('has_access', FALSE, 'reason', 'subscription_expired');
END;
$$;

-- ============================================================
--  8. has_active_access(p_carwash_id)
--     Verifica por assinatura OU cortesia (pelo email do admin)
-- ============================================================
CREATE OR REPLACE FUNCTION has_active_access(p_carwash_id BIGINT)
RETURNS BOOLEAN
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_email TEXT;
BEGIN
  -- Busca e-mail do admin do lava rápido
  SELECT email INTO v_email
  FROM profiles
  WHERE carwash_id = p_carwash_id AND role = 'admin'
  LIMIT 1;

  RETURN
    EXISTS (
      SELECT 1 FROM subscriptions
      WHERE carwash_id = p_carwash_id
        AND status     IN ('active', 'trial', 'courtesy')
        AND expires_at >= CURRENT_DATE
    )
    OR
    EXISTS (
      SELECT 1 FROM courtesy_access
      WHERE granted_to_email = v_email
        AND revoked_at IS NULL
        AND (expires_at IS NULL OR expires_at >= NOW())
    );
END;
$$;

-- ============================================================
--  9. get_saas_metrics — ajusta contagem de cortesias
-- ============================================================
CREATE OR REPLACE FUNCTION get_saas_metrics()
RETURNS JSON
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_result JSON;
BEGIN
  SELECT json_build_object(
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
    'total_carwashes',   (SELECT COUNT(*) FROM carwashes),
    'overdue_carwashes', (
      SELECT COUNT(DISTINCT carwash_id) FROM subscriptions
      WHERE status = 'active' AND expires_at < CURRENT_DATE
    ),
    'cancelled_carwashes', (
      SELECT COUNT(DISTINCT carwash_id) FROM subscriptions WHERE status = 'cancelled'
    ),
    'courtesy_active', (
      SELECT COUNT(*) FROM courtesy_access
      WHERE revoked_at IS NULL
        AND (expires_at IS NULL OR expires_at >= NOW())
    ),
    'monthly_revenue', (
      SELECT COALESCE(SUM(amount), 0) FROM payment_checkouts
      WHERE status = 'paid'
        AND paid_at >= date_trunc('month', CURRENT_TIMESTAMP)
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
--  10. GRANTs
-- ============================================================
GRANT EXECUTE ON FUNCTION can_register_with_email(TEXT)                TO anon, authenticated;
GRANT EXECUTE ON FUNCTION claim_courtesy_access(TEXT, BIGINT)          TO authenticated;
GRANT EXECUTE ON FUNCTION current_user_access_status()                 TO authenticated;
GRANT EXECUTE ON FUNCTION has_active_access(BIGINT)                    TO authenticated;
GRANT EXECUTE ON FUNCTION get_saas_metrics()                           TO authenticated;
