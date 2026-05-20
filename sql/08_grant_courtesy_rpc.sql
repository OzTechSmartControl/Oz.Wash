-- ============================================================
--  OZ.LAVA RÁPIDO — Migration 08: RPC para operações de cortesia
--
--  Substitui inserção e revogação direta (sujeita a RLS)
--  por funções SECURITY DEFINER que fazem a operação como
--  postgres — sem passar pelas políticas de RLS.
--
--  EXECUTE NO SUPABASE SQL EDITOR
-- ============================================================

-- ── 1. Conceder cortesia ─────────────────────────────────────
CREATE OR REPLACE FUNCTION grant_courtesy_access(
  p_email      TEXT,
  p_expires_at TIMESTAMPTZ DEFAULT NULL,
  p_notes      TEXT        DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
  -- Garante que apenas super admins chamam esta função
  IF NOT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
      AND (is_super_admin = TRUE OR role = 'super_admin')
  ) THEN
    RAISE EXCEPTION 'Acesso negado';
  END IF;

  INSERT INTO courtesy_access (granted_to_email, expires_at, notes, granted_by)
  VALUES (p_email, p_expires_at, p_notes, auth.uid());
END;
$$;

GRANT EXECUTE ON FUNCTION grant_courtesy_access(TEXT, TIMESTAMPTZ, TEXT) TO authenticated;

-- ── 2. Revogar por ID ────────────────────────────────────────
CREATE OR REPLACE FUNCTION revoke_courtesy_by_id(p_id BIGINT)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
      AND (is_super_admin = TRUE OR role = 'super_admin')
  ) THEN
    RAISE EXCEPTION 'Acesso negado';
  END IF;

  UPDATE courtesy_access
  SET revoked_at = NOW()
  WHERE id = p_id;
END;
$$;

GRANT EXECUTE ON FUNCTION revoke_courtesy_by_id(BIGINT) TO authenticated;

-- ── 3. Revogar por e-mail ────────────────────────────────────
CREATE OR REPLACE FUNCTION revoke_courtesy_by_email(p_email TEXT)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
      AND (is_super_admin = TRUE OR role = 'super_admin')
  ) THEN
    RAISE EXCEPTION 'Acesso negado';
  END IF;

  UPDATE courtesy_access
  SET revoked_at = NOW()
  WHERE granted_to_email = p_email
    AND revoked_at IS NULL;
END;
$$;

GRANT EXECUTE ON FUNCTION revoke_courtesy_by_email(TEXT) TO authenticated;

-- ── 4. Confirma ──────────────────────────────────────────────
SELECT routine_name FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name IN ('grant_courtesy_access','revoke_courtesy_by_id','revoke_courtesy_by_email');
