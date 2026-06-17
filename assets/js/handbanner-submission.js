let hbUser = null;

function isGoogleUser(user){
  return user?.app_metadata?.provider === "google" ||
    (user?.identities || []).some(i => i.provider === "google");
}

async function hbLoginGoogle(){
  const msg=document.getElementById('hbLoginMsg');
  if(!window.BARMY360_SUPABASE){ 
    if(msg) msg.textContent='Supabase não conectado.'; 
    return; 
  }
  await BARMY360_SUPABASE.auth.signInWithOAuth({
    provider:'google',
    options:{redirectTo: location.href}
  });
}

async function hbInit(){
  const loginCard = document.getElementById('hbLoginCard');
  const formCard = document.getElementById('hbFormCard');

  if(loginCard) loginCard.classList.remove('hidden');
  if(formCard) formCard.classList.add('hidden');

  if(!window.BARMY360_SUPABASE) return;

  const { data } = await BARMY360_SUPABASE.auth.getUser();
  hbUser = data?.user || null;

  if(hbUser && isGoogleUser(hbUser)){
    loginCard?.classList.add('hidden');
    formCard?.classList.remove('hidden');

    const email=document.getElementById('hbEmail');
    if(email && hbUser.email) email.value=hbUser.email;
  } else {
    hbUser = null;
  }

  document.getElementById('hbSubmissionForm')?.addEventListener('submit', hbSubmit);
}
async function hbSubmit(e){
  e.preventDefault();
  const msg=document.getElementById('hbFormMsg');
  if(!window.BARMY360_SUPABASE || !hbUser){ if(msg) msg.textContent='Entre com Google antes de enviar.'; return; }
  const { count, error:countError } = await BARMY360_SUPABASE.from('handbanner_art_submissions').select('id', { count:'exact', head:true }).eq('user_id', hbUser.id);
  if(countError){ if(msg) msg.textContent='Erro ao verificar limite: '+countError.message; return; }
  if((count||0) >= 3){ if(msg) msg.textContent='Limite de 3 envios por conta atingido.'; return; }
  const row={
    user_id: hbUser.id,
    google_email: hbUser.email || '',
    full_name: document.getElementById('hbFullName').value.trim(),
    social_handle: document.getElementById('hbSocial').value.trim(),
    contact_email: document.getElementById('hbEmail').value.trim(),
    cloud_link: document.getElementById('hbCloudLink').value.trim(),
    term_agreement_link: '',
    minor_authorization_link: document.getElementById('hbMinorAuthorizationLink').value.trim(),
    agree_term: document.getElementById('hbAgreeTerm').checked,
    agree_minor: document.getElementById('hbAgreeMinor').checked,
    agree_rules: document.getElementById('hbAgreeRules').checked,
    observation: document.getElementById('hbObservation').value.trim()
  };
  const { error } = await BARMY360_SUPABASE.from('handbanner_art_submissions').insert(row);
  if(error){ if(msg) msg.textContent='Erro ao enviar: '+error.message; return; }
  e.target.reset();
  if(msg) msg.textContent='Envio registrado com sucesso 💜';
}
document.addEventListener('DOMContentLoaded', hbInit);
