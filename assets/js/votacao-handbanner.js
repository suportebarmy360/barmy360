function hbSb(){ return window.BARMY360_SUPABASE; }
function hbEsc(v){return String(v||"").replace(/[&<>'"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"}[c]));}
function hbAttr(v){return hbEsc(v).replace(/`/g,"");}
function hbFingerprint(){const k="barmy360_handbanner_voter";let v=localStorage.getItem(k);if(!v){v="hb_"+Date.now().toString(36)+"_"+Math.random().toString(36).slice(2);localStorage.setItem(k,v);}return v;}
const HB_KEY="handbanner-votacao";
let hbState={settings:null,votacao:null,opcoes:[],selected:{1:[],2:[],3:[]},published:false};

function hbImageUrl(url){ return String(url||"").trim(); }
function hbImage(url, cls=""){
  const img=hbImageUrl(url);
  if(!img) return `<div class="hb-art-image ${cls} purple-bg">BARMY360</div>`;
  if(img.startsWith("http") || img.startsWith("assets/")) return `<div class="hb-art-image ${cls}" style="background-image:url('${hbAttr(img)}')"></div>`;
  return `<div class="hb-art-image ${cls} purple-bg">${hbEsc(img)}</div>`;
}
function hbSplitCards(text){
  const raw=String(text||"").trim();
  if(!raw) return [];
  return raw.split(/\n\s*\n/g).map((block,i)=>{const lines=block.split(/\n/).map(x=>x.trim()).filter(Boolean);return {title:lines[0]||`Aviso ${i+1}`, body:lines.slice(1).join(" ")};});
}
function hbMsg(text, type=""){const el=document.getElementById("hbVoteMsg"); if(el){el.textContent=text||""; el.className="form-msg "+(type||"");}}
function hbPhraseLabel(n){const s=hbState.settings||{}; return s[`handbanner_vote_phrase_${n}`]||`Frase ${n}`;}
function hbOptionById(id){return hbState.opcoes.find(x=>String(x.id)===String(id));}
function hbLimit(){ const n=Number((hbState.settings||{}).handbanner_vote_limit_per_phrase || 1); return Math.max(1, Math.min(20, Number.isFinite(n)?n:1)); }
async function hbLoad(){
  if(!hbSb()){hbMsg("Supabase não conectado. Confira assets/js/config.js.","error");return;}
  const {data:settings}=await hbSb().from("site_settings").select("*").eq("id",1).maybeSingle();
  hbState.settings=settings||{};
  hbState.published = !!(hbState.settings.handbanner_vote_published ?? true);
  const {data:vots,error:ve}=await hbSb().from("votacoes").select("*").eq("project_key",HB_KEY).limit(1);
  if(ve){hbMsg("Erro ao carregar votação: "+ve.message,"error");return;}
  hbState.votacao=(vots||[])[0];
  if(!hbState.votacao){hbMsg("A votação handbanner-votacao ainda não foi criada no ADM/SQL.","error");return;}
  if(!hbState.published){
    document.getElementById("hbVotingSections").innerHTML = `<section class="admin-card glow-card"><h2>Página ainda não publicada</h2><p>As ADMs ainda não liberaram esta votação.</p></section>`;
    document.getElementById("hbReview").style.display="none";
    return hbRenderTopOnly();
  }
  const {data:ops,error:oe}=await hbSb().from("opcoes_votacao").select("*").eq("votacao_id",hbState.votacao.id).order("hb_frase",{ascending:true}).order("position",{ascending:true}).order("created_at",{ascending:true});
  if(oe){hbMsg("Erro ao carregar artes: "+oe.message,"error");return;}
  hbState.opcoes=(ops||[]).filter(o=>[1,2,3].includes(Number(o.hb_frase||1)));
  hbRender();
}
function hbRenderTopOnly(){
  const s=hbState.settings||{}, v=hbState.votacao||{};
  const title=s.handbanner_vote_title||v.titulo||"Votação de Hand Banner";
  document.title=title+" | BARMY360";
  document.getElementById("hbTitle").textContent=title;
  document.getElementById("hbDescription").textContent=s.handbanner_vote_description||v.descricao||"Escolha uma arte para cada frase.";
  const heroImg=document.getElementById("hbHeroImage");
  const img=s.handbanner_vote_cover_image||s.handbanner_vote_card_image||"";
  if(heroImg) heroImg.innerHTML = hbImage(img, "hb-hero-cover");
  const cards=hbSplitCards(s.handbanner_vote_important_cards || "Obrigatório votar nas três frases\nSelecione uma arte em cada seção antes de confirmar.");
  document.getElementById("hbImportantCards").innerHTML=cards.map(c=>`<article class="hb-warning-card glow-card"><span>AVISO</span><h3>${hbEsc(c.title)}</h3><p>${hbEsc(c.body)}</p></article>`).join("");
}
function hbRender(){
  hbRenderTopOnly();
  const s=hbState.settings||{};
  document.getElementById("hbVoteSectionTitle").textContent=s.handbanner_vote_section_title||"Vote nos Hand Banners";
  const limit=hbLimit();
  document.getElementById("hbVoteSectionDescription").textContent=s.handbanner_vote_section_description||(limit===1?"É obrigatório escolher 1 hand banner em cada frase.":`Escolha de 1 até ${limit} hand banners em cada frase.`);
  document.getElementById("hbConfirmText").textContent=s.handbanner_vote_confirm_text||"Revise suas escolhas antes de confirmar. Depois de enviado, o voto não poderá ser alterado.";
  document.getElementById("hbVotingSections").innerHTML=[1,2,3].map(n=>hbRenderPhraseSection(n)).join("");
  document.querySelectorAll(".hb-option-card").forEach(card=>card.addEventListener("click",()=>hbSelectOption(card.dataset.frase, card.dataset.id)));
  hbRenderReview();
}
function hbRenderPhraseSection(n){
  const list=hbState.opcoes.filter(o=>Number(o.hb_frase||1)===n);
  const selectedIds=hbState.selected[n]||[];
  const phraseTitle=hbPhraseLabel(n);
  const limit=hbLimit();
  const selectedCount=selectedIds.length;
  return `<section class="hb-public-phrase-section glow-card" id="hbPhrase${n}">
    <div class="hb-public-phrase-header">
      <div>
        <span class="hb-step">FRASE ${n}</span>
        <h2>Frase:</h2>
        <p class="hb-phrase-text">${hbEsc(phraseTitle)}</p>
        <p class="hb-required">Obrigatório escolher pelo menos 1 hand banner. Limite desta seção: ${limit}.</p>
      </div>
      <div class="hb-section-status ${selectedCount?'done':'pending'}">${selectedCount?`${selectedCount}/${limit} escolhido(s)`:'Pendente'}</div>
    </div>
    <div class="hb-public-options-grid">
      ${list.length?list.map(o=>hbRenderOptionCard(n,o)).join(""):`<article class="hb-public-option-card"><h3>Nenhuma arte cadastrada</h3><p>Adicione as artes desta frase no painel ADM.</p></article>`}
    </div>
  </section>`;
}
function hbRenderOptionCard(n,o){
  const selectedIds=hbState.selected[n]||[];
  const isSelected=selectedIds.map(String).includes(String(o.id));
  return `<article class="hb-public-option-card hb-option-card ${isSelected?"selected":""}" data-frase="${n}" data-id="${hbAttr(o.id)}">
    ${hbImage(o.imagem_url||o.imagem,"hb-public-art-img")}
    <div class="hb-selected-ribbon">✓ Escolhido</div>
    <div class="hb-option-content">
      <span class="status voting">OPÇÃO</span>
      <h3>${hbEsc(o.titulo||`Opção ${n}`)}</h3>
      ${o.descricao?`<p>${hbEsc(o.descricao)}</p>`:""}
      <div class="vote-line hb-vote-counter"><span>Votos</span><strong id="hb-votes-${hbAttr(o.id)}">${Number(o.votos_count||o.votos||0).toLocaleString("pt-BR")}</strong></div>
      <button class="btn small ${isSelected?'primary':'outline'}" type="button">${isSelected?"Selecionado":"Selecionar"}</button>
    </div>
  </article>`;
}
function hbSelectOption(frase,id){
  frase=Number(frase);
  const limit=hbLimit();
  const arr=hbState.selected[frase]||[];
  const idx=arr.map(String).indexOf(String(id));
  if(idx>=0){
    arr.splice(idx,1);
  }else{
    if(arr.length>=limit){
      hbMsg(`Você já selecionou o limite de ${limit} arte(s) para a Frase ${frase}. Desmarque uma para escolher outra.`, "error");
      return;
    }
    arr.push(id);
  }
  hbState.selected[frase]=arr;
  hbRender();
}
function hbRenderReview(){
  const limit=hbLimit();
  const missing=[1,2,3].filter(n=>(hbState.selected[n]||[]).length<1);
  const review=document.getElementById("hbReviewList");
  review.innerHTML=[1,2,3].map(n=>{
    const selected=(hbState.selected[n]||[]).map(id=>hbOptionById(id)).filter(Boolean);
    return `<div class="hb-review-item ${selected.length?'done':'missing'}"><strong>Frase ${n}</strong><span>${selected.length?hbEsc(selected.map(o=>o.titulo).join(", ")):"Ainda não selecionada"}</span><small>${selected.length}/${limit}</small></div>`;
  }).join("");
  const btn=document.getElementById("hbConfirmBtn");
  if(btn) btn.disabled=missing.length>0 || (hbState.votacao && hbState.votacao.status!=="aberta");
  if(hbState.votacao && hbState.votacao.status!=="aberta") hbMsg("Esta votação não está aberta no momento.","error");
  else hbMsg(missing.length?`Falta votar na ${missing.map(n=>`Frase ${n}`).join(", ")}.`:"Tudo certo. Confirme para enviar seus votos.", missing.length?"error":"success");
}
async function hbConfirmVotes(){
  const missing=[1,2,3].filter(n=>(hbState.selected[n]||[]).length<1);
  if(missing.length){hbMsg(`Não foi possível enviar. Falta votar na ${missing.map(n=>`Frase ${n}`).join(", ")}.`,"error");return;}
  const ids=[...hbState.selected[1],...hbState.selected[2],...hbState.selected[3]];
  const resumo=[1,2,3].map(n=>`Frase ${n}: ${(hbState.selected[n]||[]).map(id=>hbOptionById(id)?.titulo||"").join(", ")}`).join("\n");
  if(!confirm("Confirmar seus votos?\n\n"+resumo+"\n\nDepois de enviado, não poderá ser alterado.")) return;
  const btn=document.getElementById("hbConfirmBtn"); btn.disabled=true; btn.textContent="Enviando votos...";
  const {error}=await hbSb().rpc("registrar_votos_handbanner_confirmados",{votacao:String(hbState.votacao.id), opcoes:ids, voter_fingerprint:hbFingerprint()});
  if(error){hbMsg(error.message||"Erro ao confirmar votos.","error"); btn.disabled=false; btn.textContent="Confirmar voto"; return;}
  ids.forEach(id=>{
    const opt=hbOptionById(id);
    if(opt){ opt.votos_count=Number(opt.votos_count||opt.votos||0)+1; opt.votos=opt.votos_count; }
    const el=document.getElementById(`hb-votes-${String(id).replace(/[^a-zA-Z0-9_-]/g,"")}`) || document.getElementById(`hb-votes-${id}`);
    if(el && opt) el.textContent=Number(opt.votos_count||0).toLocaleString("pt-BR");
  });
  hbMsg("Voto enviado com sucesso 💜", "success"); btn.textContent="Voto enviado";
}
document.addEventListener("DOMContentLoaded",()=>{
  hbLoad();
  document.getElementById("hbConfirmBtn")?.addEventListener("click",hbConfirmVotes);
  document.getElementById("hbScrollToVote")?.addEventListener("click",()=>document.getElementById("hbVoteStart")?.scrollIntoView({behavior:"smooth",block:"start"}));
});
