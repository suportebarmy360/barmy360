// BARMY360 - Supabase novo
// Chave pública do navegador. NUNCA coloque sb_secret aqui.
const SUPABASE_URL = "https://menaprzrrftribfyymmq.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_MmOi2CxJoIMsMl7dsr5pHg_GGIh2xfJ";

window.BARMY360_SUPABASE = null;

if (
  SUPABASE_URL.startsWith("http") &&
  SUPABASE_ANON_KEY.length > 20 &&
  window.supabase
) {
  window.BARMY360_SUPABASE = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_ANON_KEY
  );
}
