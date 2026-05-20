import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL  = "https://lolvvhdixbfcrquisnpi.supabase.co";
const SUPABASE_ANON = "sb_publishable_Ud8gUkUl9A3hVrJQTcsI_g_uvwskZax";

// Cliente base (sem sessão) — usado apenas para auth público
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON);

// Cliente autenticado — envia o JWT do usuário logado em todas as requisições
// Isso garante que auth.uid() funcione corretamente nas RLS e RPCs
export const createAuthedClient = (token) =>
  createClient(SUPABASE_URL, SUPABASE_ANON, {
    auth: { autoRefreshToken: false, persistSession: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
