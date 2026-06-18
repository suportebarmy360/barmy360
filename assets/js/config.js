const SUPABASE_URL = "https://sopyutkxzqvcknbinivh.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_CusDRusxAfY6JbVXNxkDCw_X2U-DnjE";

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
