-- ============================================================
--  OZ.LAVA RÁPIDO — Migration 04: Super Admin Seed
--
--  IMPORTANTE: Execute este script DEPOIS de criar o usuário
--  super admin pelo Supabase Auth (Dashboard → Authentication
--  → Users → Invite user / Add user).
--
--  Substitua o UUID abaixo pelo ID real do usuário criado.
-- ============================================================

-- ── PASSO 1: Obtenha o UUID do super admin ───────────────────
-- Execute no SQL Editor para ver os usuários existentes:
--   SELECT id, email FROM auth.users;

-- ── PASSO 2: Atualize o perfil para super_admin ──────────────
-- Substitua 'SEU-UUID-AQUI' pelo UUID real:

UPDATE profiles
SET
  role          = 'super_admin',
  is_super_admin = TRUE,
  name           = 'Super Admin'
WHERE id = 'SEU-UUID-AQUI';   -- ← ALTERE AQUI

-- ── PASSO 3: Verifique ───────────────────────────────────────
-- SELECT id, email, role, is_super_admin FROM profiles WHERE is_super_admin = TRUE;


-- ============================================================
--  DADOS DE EXEMPLO (opcional — remova se não quiser)
-- ============================================================

-- Cria um checkout pago de exemplo para testar o onboarding
-- (use um e-mail real que você vai usar para criar a primeira conta)

-- INSERT INTO payment_checkouts (email, plan, amount, status, paid_at)
-- VALUES ('seu@email.com', 'annual', 699.90, 'paid', NOW());
