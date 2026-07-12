(function(){
  const METRIC_KEY = "barmy360_visitor_id";
  function visitorId(){
    try{
      let id=localStorage.getItem(METRIC_KEY);
      if(!id){ id="vis_"+Date.now().toString(36)+"_"+Math.random().toString(36).slice(2,12); localStorage.setItem(METRIC_KEY,id); }
      return id;
    }catch(e){ return "session_"+Math.random().toString(36).slice(2,12); }
  }
  async function registerAccess(){
    const client=window.BARMY360_SUPABASE;
    if(!client || location.protocol === "file:") return;
    const page=(location.pathname.split('/').pop() || 'index.html').slice(0,160);
    const referrer=(document.referrer || '').slice(0,500);
    try{
      await client.rpc('registrar_acesso_site',{
        pagina: page,
        visitante: visitorId(),
        referencia: referrer
      });
    }catch(e){ console.warn('Métrica de acesso não registrada:',e); }
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',registerAccess,{once:true});
  else registerAccess();
})();
