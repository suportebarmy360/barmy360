const SUPABASE_URL = "https://qulpiltealpyfukxgqid.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_DoY4GNMKfgBwC7FW40847A_kGYWwe8S";

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
