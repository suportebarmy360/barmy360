async function barmy360GetLaunchSettings(){
  let local = {}; try{ local = JSON.parse(localStorage.getItem('barmy360_site_settings') || '{}'); }catch(e){}
  if(window.BARMY360_SUPABASE){ try{ const { data } = await BARMY360_SUPABASE.from('site_settings').select('*').eq('id',1).maybeSingle(); if(data) return { ...local, ...data }; }catch(e){} }
  return local;
}
async function barmy360CanPreviewBeforeLaunch(){
  try{ if(!window.BARMY360_SUPABASE) return false; const { data } = await window.BARMY360_SUPABASE.auth.getSession(); return !!data?.session; }catch(e){ return false; }
}
document.addEventListener('DOMContentLoaded', async () => {
  const path = location.pathname.split('/').pop() || 'index.html';
  if(['index.html','admin.html','envio-frases.html'].includes(path)) return;
  const s = await barmy360GetLaunchSettings();
  const mode = s.launch_mode || 'locked';
  const release = new Date(s.launch_at || '2026-06-05T20:00:00-03:00').getTime();
  if(mode === 'open' || (mode === 'auto' && Date.now() >= release)) return;
  const ok = await barmy360CanPreviewBeforeLaunch();
  if(!ok) location.href = 'index.html';
});
