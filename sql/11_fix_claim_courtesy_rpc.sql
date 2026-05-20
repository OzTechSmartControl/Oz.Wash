-- ============================================================
--  OZ.LAVA RÁPIDO — Migration 11: Fix claim_courtesy_access
--
--  auth.uid() retorna NULL em SECURITY DEFINER.
--  Usa current_setting('request.jwt.claims') diretamente.
--
--  EXECUTE NO SUPABASE SQL EDITOR
-- ============================================================

CREATE OR REPLACE FUNCTION claim_courtesy_access(
  p_email      TEXT,
  p_carwash_id BIGINT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID;
BEGIN
  -- Extrai UID do JWT (funciona em SECURITY DEFINER)
  v_uid := (
    nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub'
  )::uuid;

  -- Vincula a cortesia ao carwash recém-criado
  UPDATE public.courtesy_access
  SET carwash_id = p_carwash_id
  WHERE granted_to_email = p_email
    AND revoked_at IS NULL
    AND (expires_at IS NULL OR expires_at >= NOW())
    AND carwash_id IS NULL;

  -- Promove o perfil para admin do lava rápido
  -- (cria o perfil se ainda não existir — caso do OTP sem trigger)
  INSERT INTO public.profiles (id, email, role, carwash_id)
  VALUES (v_uid, p_email, 'admin', p_carwash_id)
  ON CONFLICT (id) DO UPDATE
    SET role = 'admin', carwash_id = p_carwash_id;
END;
$$;

GRANT EXECUTE ON FUNCTION claim_courtesy_access(TEXT, BIGINT) TO authenticated;
