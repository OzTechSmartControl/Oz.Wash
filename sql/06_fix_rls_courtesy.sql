-- ============================================================
--  OZ.LAVA RÁPIDO — Migration 06: Corrige RLS da courtesy_access
--
--  Problema: policy anterior só cheava is_super_admin = TRUE,
--  mas o perfil super admin usa role = 'super_admin'.
--  Alinha com a mesma lógica do App.jsx.
--
--  EXECUTE NO SUPABASE SQL EDITOR
-- ============================================================

-- ── 1. Remove policies antigas ───────────────────────────────
DROP POLICY IF EXISTS "super_admin_courtesy_all"  ON courtesy_access;
DROP POLICY IF EXISTS "user_view_own_courtesy"     ON courtesy_access;

-- ── 2. Recria policy super admin (is_super_admin OU role) ───
CREATE POLICY "super_admin_courtesy_all" ON courtesy_access
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
        AND (is_super_admin = TRUE OR role = 'super_admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
        AND (is_super_admin = TRUE OR role = 'super_admin')
    )
  );

-- ── 3. Recria policy usuário: ver própria cortesia ───────────
CREATE POLICY "user_view_own_courtesy" ON courtesy_access
  FOR SELECT TO authenticated
  USING (
    granted_to_email = (SELECT email FROM profiles WHERE id = auth.uid())
  );

-- ── 4. Confirma ──────────────────────────────────────────────
SELECT policyname, cmd, qual
FROM pg_policies
WHERE tablename = 'courtesy_access';
