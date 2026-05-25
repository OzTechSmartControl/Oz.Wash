-- ============================================================
--  OZ.LAVA RÁPIDO — Migration 12: claim_courtesy_access cria o carwash
--
--  O INSERT direto em carwashes falhava com RLS pois auth.uid()
--  retorna NULL em certos contextos (token expirado, preview, etc.).
--  Solução: mover o INSERT para dentro da função SECURITY DEFINER
--  que executa como postgres e ignora RLS completamente.
--
--  EXECUTE NO SUPABASE SQL EDITOR
-- ============================================================

-- Remove a versão antiga (assinatura diferente)
DROP FUNCTION IF EXISTS claim_courtesy_access(TEXT, BIGINT);

-- Nova versão: recebe os dados do lava rápido e cria tudo de uma vez
CREATE OR REPLACE FUNCTION claim_courtesy_access(
  p_email        TEXT,
  p_name         TEXT,
  p_phone        TEXT    DEFAULT NULL,
  p_accent_color TEXT    DEFAULT '#4db8ff'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid        UUID;
  v_carwash_id BIGINT;
BEGIN
  -- Extrai UID do JWT (funciona em SECURITY DEFINER)
  v_uid := (
    nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub'
  )::uuid;

  -- Cria o carwash (SECURITY DEFINER ignora RLS)
  INSERT INTO public.carwashes (name, phone, accent_color)
  VALUES (p_name, NULLIF(TRIM(p_phone), ''), p_accent_color)
  RETURNING id INTO v_carwash_id;

  -- Vincula a cortesia ao carwash recém-criado
  UPDATE public.courtesy_access
  SET carwash_id = v_carwash_id
  WHERE granted_to_email = p_email
    AND revoked_at IS NULL
    AND (expires_at IS NULL OR expires_at >= NOW())
    AND carwash_id IS NULL;

  -- Promove/cria o perfil como admin do lava rápido
  INSERT INTO public.profiles (id, email, role, carwash_id)
  VALUES (v_uid, p_email, 'admin', v_carwash_id)
  ON CONFLICT (id) DO UPDATE
    SET role      = 'admin',
        carwash_id = EXCLUDED.carwash_id;

  RETURN jsonb_build_object('carwash_id', v_carwash_id);
END;
$$;

GRANT EXECUTE ON FUNCTION claim_courtesy_access(TEXT, TEXT, TEXT, TEXT) TO authenticated;
