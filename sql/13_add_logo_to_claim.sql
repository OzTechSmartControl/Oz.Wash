-- ============================================================
--  OZ.LAVA RÁPIDO — Migration 13: Adiciona p_logo_url à claim_courtesy_access
--
--  Atualiza a função SECURITY DEFINER para aceitar a URL da logo
--  e salvá-la diretamente no INSERT do carwash.
--
--  EXECUTE NO SUPABASE SQL EDITOR (Oz.Wash)
-- ============================================================

-- Remove versão anterior
DROP FUNCTION IF EXISTS claim_courtesy_access(TEXT, TEXT, TEXT, TEXT);

-- Nova versão com p_logo_url
CREATE OR REPLACE FUNCTION claim_courtesy_access(
  p_email        TEXT,
  p_name         TEXT,
  p_phone        TEXT    DEFAULT NULL,
  p_accent_color TEXT    DEFAULT '#4db8ff',
  p_logo_url     TEXT    DEFAULT NULL
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
  -- Extrai UID do JWT
  v_uid := (
    nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub'
  )::uuid;

  -- Cria o carwash com logo (SECURITY DEFINER ignora RLS)
  INSERT INTO public.carwashes (name, phone, accent_color, logo_url)
  VALUES (
    p_name,
    NULLIF(TRIM(p_phone), ''),
    p_accent_color,
    NULLIF(TRIM(COALESCE(p_logo_url, '')), '')
  )
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
    SET role       = 'admin',
        carwash_id = EXCLUDED.carwash_id;

  RETURN jsonb_build_object('carwash_id', v_carwash_id);
END;
$$;

GRANT EXECUTE ON FUNCTION claim_courtesy_access(TEXT, TEXT, TEXT, TEXT, TEXT) TO authenticated;
