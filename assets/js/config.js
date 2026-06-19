// Dados do Supabase do projeto BARMY360.
// Use somente chave pública/publishable no site. Nunca use sb_secret aqui.
const SUPABASE_URL = "https://wdpqbqgrahzodvufatwx.supabase.co"; 
const SUPABASE_ANON_KEY = "sb_publishable_3Mkx5WvdF6uW3I9_sHzC1w_joCWF2ZF";

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
