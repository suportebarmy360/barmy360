const SUPABASE_URL = "https://wdpqbqgrahzodvufatwx.supabase.co";
const SUPABASE_ANON_KEY ="sb_publishable_gpdRf5Gf0aupMrcP175_DA_i6anU0N1";

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
