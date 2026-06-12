const DEFAULT_RELEASE_AT = '2026-06-05T20:00:00-03:00';
const RELEASE_AT = new Date(DEFAULT_RELEASE_AT).getTime();
function pad(n){return String(n).padStart(2,'0');}
function setText(id,v){ const el=document.getElementById(id); if(el) el.textContent=pad(v); }
async function getLaunchSettings(){
  let local = {};
  try{ local = JSON.parse(localStorage.getItem('barmy360_site_settings') || '{}'); }catch(e){}
  if(window.BARMY360_SUPABASE){
    try{
      const { data } = await BARMY360_SUPABASE.from('site_settings').select('*').eq('id',1).maybeSingle();
      if(data) return { ...local, ...data };
    }catch(e){}
  }
  return local;
}
async function updateLaunch(){
  const s = await getLaunchSettings();
  const mode = s.launch_mode || 'locked';
  const release = new Date(s.launch_at || DEFAULT_RELEASE_AT).getTime();
  if(mode === 'open' || (mode === 'auto' && Date.now() >= release)){ location.replace('home.html'); return; }
  const diff = Math.max(0, release - Date.now());
  const d=Math.floor(diff/86400000), h=Math.floor((diff%86400000)/3600000), m=Math.floor((diff%3600000)/60000), sec=Math.floor((diff%60000)/1000);
  setText('days',d); setText('hours',h); setText('minutes',m); setText('seconds',sec);
  const note=document.querySelector('.launch-note');
  if(note){ note.innerHTML = mode === 'locked' ? 'Liberação manual pelo <strong>Painel ADM</strong>' : 'Liberação automática em <strong>05/06/2026 às 20:00</strong>'; }
}
document.addEventListener('DOMContentLoaded',()=>{updateLaunch(); setInterval(updateLaunch());});
