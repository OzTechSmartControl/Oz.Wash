import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL  = "https://lolvvhdixbfcrquisnpi.supabase.co";
const SUPABASE_ANON = "sb_publishable_Ud8gUkUl9A3hVrJQTcsI_g_uvwskZax";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON);
