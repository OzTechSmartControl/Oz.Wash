-- ============================================================
--  OZ.LAVA RÁPIDO — Migration 07: Fix RLS courtesy_access
--
--  Problema: policy referencia a tabela `profiles`, mas profiles
--  também tem RLS → EXISTS retorna vazio (RLS recursiva).
--  Solução: helper SECURITY DEFINER que lê profiles sem RLS.
--
--  EXECUTE NO SUPABASE SQL EDITOR
-- ============================================================

-- ── 1. Função helper: verifica super admin sem RLS ───────────
CREATE OR REPLACE FUNCTION auth_is_super_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql SECURITY DEFINER STABLE
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
      AND (is_super_admin = TRUE OR role = 'super_admin')
  );
END;
$$;

GRANT EXECUTE ON FUNCTION auth_is_super_admin() TO authenticated;

-- ── 2. Recria policies usando o helper ───────────────────────
DROP POLICY IF EXISTS "super_admin_courtesy_all" ON courtesy_access;
DROP POLICY IF EXISTS "user_view_own_courtesy"   ON courtesy_access;

-- Super admin: acesso total (leitura e escrita)
CREATE POLICY "super_admin_courtesy_all" ON courtesy_access
  FOR ALL TO authenticated
  USING     (auth_is_super_admin())
  WITH CHECK(auth_is_super_admin());

-- Usuário comum: lê apenas a própria cortesia
CREATE POLICY "user_view_own_courtesy" ON courtesy_access
  FOR SELECT TO authenticated
  USING (
    granted_to_email = (
      SELECT email FROM profiles WHERE id = auth.uid()
    )
  );

-- ── 3. Verifica resultado ────────────────────────────────────
SELECT policyname, cmd FROM pg_policies WHERE tablename = 'courtesy_access';
