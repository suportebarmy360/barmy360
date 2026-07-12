function hbSb(){ return window.BARMY360_SUPABASE; }
function hbEsc(v){return String(v||"").replace(/[&<>'"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"}[c]));}
function hbAttr(v){return hbEsc(v).replace(/`/g,"");}
function hbFingerprint(){const k=`barmy360_handbanner_voter_fase_${HB_PHASE}`;let v=localStorage.getItem(k);if(!v){v="hb_"+Date.now().toString(36)+"_"+Math.random().toString(36).slice(2);localStorage.setItem(k,v);}return v;}
const HB_PHASE=Number(document.body?.dataset?.hbPhase||1);
const HB_KEY=HB_PHASE===1?"handbanner-votacao":`handbanner-votacao-fase-${HB_PHASE}`;
const HB_PREFIX=HB_PHASE===1?"handbanner_vote":`handbanner_vote_phase${HB_PHASE}`;
let hbState={settings:null,votacao:null,opcoes:[],selected:{1:[],2:[],3:[]},published:false,activePhrase:1,pages:{1:1,2:1,3:1}};
const HB_ITEMS_PER_PAGE=20;

function hbImageUrl(url){ return String(url||"").trim(); }
function hbImage(url, cls=""){
  const img=hbImageUrl(url);
  if(!img) return `<div class="hb-art-image ${cls} purple-bg">BARMY360</div>`;
  if(img.startsWith("http") || img.startsWith("assets/")){ const src=window.BARMY_IMAGE?BARMY_IMAGE.optimizedUrl(img,900,66):img; return `<div class="hb-art-image ${cls}"><img src="${hbAttr(src)}" alt="" loading="lazy" decoding="async" fetchpriority="low"></div>`; }
  return `<div class="hb-art-image ${cls} purple-bg">${hbEsc(img)}</div>`;
}
function hbSplitCards(text){
  const raw=String(text||"").trim();
  if(!raw) return [];
  return raw.split(/\n\s*\n/g).map((block,i)=>{const lines=block.split(/\n/).map(x=>x.trim()).filter(Boolean);return {title:lines[0]||`Aviso ${i+1}`, body:lines.slice(1).join(" ")};});
}
function hbMsg(text, type=""){const el=document.getElementById("hbVoteMsg"); if(el){el.textContent=text||""; el.className="form-msg "+(type||"");}}
function hbSetting(name, fallback=""){const s=hbState.settings||{}; return s[`${HB_PREFIX}_${name}`] ?? fallback;}
function hbPhraseLabel(n){return hbSetting(`phrase_${n}`,`Frase ${n}`);}
function hbOptionById(id){return hbState.opcoes.find(x=>String(x.id)===String(id));}
function hbLimit(){ if(HB_PHASE===2) return 3; if(HB_PHASE===3) return 1; const n=Number(hbSetting("limit_per_phrase",1)); return Math.max(1,Math.min(20,Number.isFinite(n)?n:1)); }
function hbExact(){return HB_PHASE===2||HB_PHASE===3;}
async function hbLoad(){
  if(!hbSb()){hbMsg("Supabase não conectado. Confira assets/js/config.js.","error");return;}
  const {data:settings}=await hbSb().from("site_settings").select("*").eq("id",1).maybeSingle();
  hbState.settings=settings||{};
  hbState.published = !!hbSetting("published", HB_PHASE===1);
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
  const title=hbSetting("title")||v.titulo||`Hand Banner — Fase ${HB_PHASE}`;
  document.title=title+" | BARMY360";
  document.getElementById("hbTitle").textContent=title;
  document.getElementById("hbDescription").textContent=hbSetting("description")||v.descricao||"Escolha uma arte para cada frase.";
  const heroImg=document.getElementById("hbHeroImage");
  const img=hbSetting("cover_image")||hbSetting("card_image")||"";
  if(heroImg) heroImg.innerHTML = hbImage(img, "hb-hero-cover");
  const cards=hbSplitCards(hbSetting("important_cards") || "Obrigatório votar nas três frases\nSelecione uma arte em cada seção antes de confirmar.");
  document.getElementById("hbImportantCards").innerHTML=cards.map(c=>`<article class="hb-warning-card glow-card"><span>AVISO</span><h3>${hbEsc(c.title)}</h3><p>${hbEsc(c.body)}</p></article>`).join("");
}
function hbRender(){
  hbRenderTopOnly();
  document.getElementById("hbVoteSectionTitle").textContent=hbSetting("section_title")||"Vote nos Hand Banners";
  const limit=hbLimit();
  document.getElementById("hbVoteSectionDescription").textContent=hbSetting("section_description")||(hbExact()?`É obrigatório escolher exatamente ${limit} arte${limit>1?"s":""} em cada frase (${limit*3} votos no total). É carregada somente uma frase por vez, com até ${HB_ITEMS_PER_PAGE} artes, para economizar internet.`:(limit===1?"É obrigatório escolher 1 hand banner em cada frase.":`Escolha de 1 até ${limit} hand banners em cada frase.`));
  document.getElementById("hbConfirmText").textContent=hbSetting("confirm_text")||"Revise suas escolhas antes de confirmar. Depois de enviado, o voto não poderá ser alterado.";
  hbRenderActivePhrase();
  hbRenderReview();
}
function hbRenderActivePhrase(){
  const root=document.getElementById("hbVotingSections");
  if(!root) return;
  const active=Number(hbState.activePhrase||1);
  root.innerHTML=`<nav class="hb-phrase-tabs" aria-label="Frases da votação">${[1,2,3].map(n=>{const count=(hbState.selected[n]||[]).length;return `<button type="button" class="hb-phrase-tab ${n===active?'active':''} ${count?'has-selection':''}" data-hb-open-phrase="${n}"><span>Frase ${n}</span><small>${count}/${hbLimit()} escolhida(s)</small></button>`}).join('')}</nav>${hbRenderPhraseSection(active)}`;
  root.querySelectorAll('[data-hb-open-phrase]').forEach(btn=>btn.addEventListener('click',()=>hbOpenPhrase(Number(btn.dataset.hbOpenPhrase))));
  root.querySelectorAll('.hb-option-card').forEach(card=>card.addEventListener('click',()=>hbSelectOption(card.dataset.frase,card.dataset.id)));
  root.querySelectorAll('[data-hb-page]').forEach(btn=>btn.addEventListener('click',()=>hbChangePage(active,Number(btn.dataset.hbPage))));
}
function hbOpenPhrase(n){
  hbState.activePhrase=Math.max(1,Math.min(3,Number(n)||1));
  hbRenderActivePhrase();
  document.getElementById(`hbPhrase${hbState.activePhrase}`)?.scrollIntoView({behavior:'smooth',block:'start'});
}
function hbChangePage(frase,page){
  const total=hbState.opcoes.filter(o=>Number(o.hb_frase||1)===frase).length;
  const max=Math.max(1,Math.ceil(total/HB_ITEMS_PER_PAGE));
  hbState.pages[frase]=Math.max(1,Math.min(max,page));
  hbRenderActivePhrase();
  document.getElementById(`hbPhrase${frase}`)?.scrollIntoView({behavior:'smooth',block:'start'});
}
function hbRenderPhraseSection(n){
  const all=hbState.opcoes.filter(o=>Number(o.hb_frase||1)===n);
  const selectedIds=hbState.selected[n]||[];
  const phraseTitle=hbPhraseLabel(n);
  const limit=hbLimit();
  const selectedCount=selectedIds.length;
  const totalPages=Math.max(1,Math.ceil(all.length/HB_ITEMS_PER_PAGE));
  const page=Math.max(1,Math.min(totalPages,Number(hbState.pages[n]||1)));
  hbState.pages[n]=page;
  const from=(page-1)*HB_ITEMS_PER_PAGE;
  const list=all.slice(from,from+HB_ITEMS_PER_PAGE);
  const pagination=totalPages>1?`<div class="hb-pagination"><button type="button" class="btn small outline" data-hb-page="${page-1}" ${page<=1?'disabled':''}>← Anterior</button><span>Página <strong>${page}</strong> de ${totalPages} · ${all.length} artes</span><button type="button" class="btn small outline" data-hb-page="${page+1}" ${page>=totalPages?'disabled':''}>Próxima →</button></div>`:'';
  return `<section class="hb-public-phrase-section glow-card" id="hbPhrase${n}">
    <div class="hb-public-phrase-header">
      <div><span class="hb-step">FRASE ${n}</span><h2>Frase:</h2><p class="hb-phrase-text">${hbEsc(phraseTitle)}</p><p class="hb-required">${hbExact()?`Obrigatório escolher exatamente ${limit} arte${limit>1?"s":""} nesta frase.`:`Obrigatório escolher pelo menos 1 hand banner. Limite desta seção: ${limit}.`}</p></div>
      <div class="hb-section-status ${selectedCount?'done':'pending'}">${selectedCount?`${selectedCount}/${limit} escolhido(s)`:'Pendente'}</div>
    </div>
    ${pagination}
    <div class="hb-public-options-grid">${list.length?list.map(o=>hbRenderOptionCard(n,o)).join(""):`<article class="hb-public-option-card"><h3>Nenhuma arte cadastrada</h3><p>Adicione as artes desta frase no painel ADM.</p></article>`}</div>
    ${pagination}
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
  hbRenderActivePhrase();
  hbRenderReview();
}
function hbRenderReview(){
  const limit=hbLimit();
  const missing=[1,2,3].filter(n=>hbExact()?(hbState.selected[n]||[]).length!==limit:(hbState.selected[n]||[]).length<1);
  const review=document.getElementById("hbReviewList");
  review.innerHTML=[1,2,3].map(n=>{
    const selected=(hbState.selected[n]||[]).map(id=>hbOptionById(id)).filter(Boolean);
    return `<button type="button" class="hb-review-item ${selected.length?'done':'missing'}" onclick="hbOpenPhrase(${n})"><strong>Frase ${n}</strong><span>${selected.length?hbEsc(selected.map(o=>o.titulo).join(", ")):"Ainda não selecionada"}</span><small>${selected.length}/${limit}</small></button>`;
  }).join("");
  const btn=document.getElementById("hbConfirmBtn");
  if(btn) btn.disabled=missing.length>0 || (hbState.votacao && hbState.votacao.status!=="aberta");
  if(hbState.votacao && hbState.votacao.status!=="aberta") hbMsg("Esta votação não está aberta no momento.","error");
  else hbMsg(missing.length?`Complete corretamente ${missing.map(n=>`Frase ${n}`).join(", ")}.`:"Tudo certo. Confirme para enviar seus votos.", missing.length?"error":"success");
}
async function hbConfirmVotes(){
  const limit=hbLimit();
  const missing=[1,2,3].filter(n=>hbExact()?(hbState.selected[n]||[]).length!==limit:(hbState.selected[n]||[]).length<1);
  if(missing.length){hbMsg(`Não foi possível enviar. Complete corretamente ${missing.map(n=>`Frase ${n}`).join(", ")}.`,"error");return;}
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
