(function(){
let HB_ADMIN_PHASE=1;
function hbAdminConfig(){const p=HB_ADMIN_PHASE;return {phase:p,key:p===1?"handbanner-votacao":`handbanner-votacao-fase-${p}`,prefix:p===1?"handbanner_vote":`handbanner_vote_phase${p}`,limit:p===2?3:p===3?1:null,page:p===1?"votacao-handbanner.html":`votacao-handbanner-fase-${p}.html`};}
function hbAdminSetting(s,name,fallback=""){const c=hbAdminConfig();return s[`${c.prefix}_${name}`]??fallback;}
window.hbAdminSetPhase=async function(phase){HB_ADMIN_PHASE=Number(phase)||1;const c=hbAdminConfig();const title=$id("hbAdmModuleTitle");if(title) title.textContent=`Hand Banner — Fase ${c.phase}`;const link=$id("hbAdmPublicLink");if(link) link.href=c.page;const inp=$id("hbAdmVotesPerPhraseLimit");if(inp){inp.disabled=!!c.limit;inp.value=String(c.limit||inp.value||1);}const rule=$id("hbAdmPhaseRule");if(rule) rule.textContent=c.phase===2?"Regra fixa: exatamente 3 artes em cada frase, totalizando 9 votos, sem repetição.":c.phase===3?"Regra fixa da final: exatamente 1 arte em cada frase, totalizando 3 votos.":"A Fase 1 mantém a regra configurável atual.";await hbLoadAdmin();};
function $id(id){return document.getElementById(id);} 
function val(id){return ($id(id)?.value||"").trim();}
function setVal(id,v){const el=$id(id); if(el) el.value=v||"";}
function msg(id,t){const el=$id(id); if(el) el.textContent=t||"";}
function esc(v){return String(v||"").replace(/[&<>'"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"}[c]));}
function sb(){return window.BARMY360_SUPABASE;}
async function hbGetVotacao(){
  const {data,error}=await sb().from("votacoes").select("*").eq("project_key",hbAdminConfig().key).limit(1);
  if(error) throw error;
  return (data||[])[0]||null;
}
async function hbEnsureVotacao(){
  let v=await hbGetVotacao();
  if(v) return v;
  const item={project_key:hbAdminConfig().key,titulo:val("hbAdmPageTitle")||"Votação Hand Banner",descricao:val("hbAdmPageDescription")||"Escolha uma arte para cada frase.",status:val("hbAdmStatus")||"aberta",fase:`handbanner-fase-${HB_ADMIN_PHASE}`,mostrar_ranking:false};
  const {data,error}=await sb().from("votacoes").insert(item).select().single();
  if(error) throw error;
  return data;
}
async function hbLoadAdmin(){
  if(!sb()) return;
  try{
    const [{data:settings},{data:projects},v]=await Promise.all([
      sb().from("site_settings").select("*").eq("id",1).maybeSingle(),
      sb().from("projects").select("*").eq("project_key",hbAdminConfig().key).limit(1),
      hbGetVotacao().catch(()=>null)
    ]);
    const s=settings||{}, p=(projects||[])[0]||{};
    setVal("hbAdmProjectTitle",p.title||`Hand Banner — Fase ${HB_ADMIN_PHASE}`);
    setVal("hbAdmProjectDescription",p.description||"Vote nas artes oficiais do hand banner.");
    setVal("hbAdmProjectImage",p.image_url||hbAdminSetting(s,"card_image")||"");
    setVal("hbAdmPageTitle",hbAdminSetting(s,"title")||(v&&v.titulo)||`Hand Banner — Fase ${HB_ADMIN_PHASE}`);
    setVal("hbAdmPageDescription",hbAdminSetting(s,"description")||(v&&v.descricao)||"Escolha uma arte para cada frase. O voto só será enviado depois da confirmação final.");
    setVal("hbAdmPageCover",hbAdminSetting(s,"cover_image")||"");
    setVal("hbAdmSectionTitle",hbAdminSetting(s,"section_title")||"Escolha 1 arte em cada frase");
    setVal("hbAdmSectionDescription",hbAdminSetting(s,"section_description")||"É obrigatório votar nas três frases para confirmar.");
    setVal("hbAdmImportantCards",hbAdminSetting(s,"important_cards")||"Obrigatório votar nas três frases\nSelecione uma arte em cada seção antes de confirmar.\n\nConfirmação final\nO voto só é enviado após clicar em Confirmar votos.");
    setVal("hbAdmConfirmText",hbAdminSetting(s,"confirm_text")||"Revise suas escolhas antes de confirmar. Depois de enviado, o voto não poderá ser alterado.");
    setVal("hbAdmPhrase1",hbAdminSetting(s,"phrase_1")||"Frase 1");
    setVal("hbAdmPhrase2",hbAdminSetting(s,"phrase_2")||"Frase 2");
    setVal("hbAdmPhrase3",hbAdminSetting(s,"phrase_3")||"Frase 3");
    setVal("hbAdmStatus",(v&&v.status)||"rascunho");
    setVal("hbAdmRestrictionMode", hbAdminSetting(s,"restriction_mode") || "fingerprint");
    setVal("hbAdmVotesPerPhraseLimit", String(hbAdminConfig().limit || hbAdminSetting(s,"limit_per_phrase",1)));
    setVal("hbAdmPublished", String(hbAdminSetting(s,"published") ?? false));
    await hbAdminRenderArts();
  }catch(e){msg("hbAdmMsg","Erro ao carregar: "+e.message);}
}
window.hbAdminSavePage=async function(){
  if(!sb()) return msg("hbAdmMsg","Supabase não conectado.");
  try{
    const title=val("hbAdmPageTitle")||"Votação Hand Banner";
    const desc=val("hbAdmPageDescription")||"Escolha uma arte para cada frase.";
    const status=val("hbAdmStatus")||"aberta";
    const c=hbAdminConfig();
    const settingsPayload={id:1};
    Object.assign(settingsPayload,{
      [`${c.prefix}_title`]:title,
      [`${c.prefix}_description`]:desc,
      [`${c.prefix}_cover_image`]:val("hbAdmPageCover"),
      [`${c.prefix}_card_image`]:val("hbAdmProjectImage"),
      [`${c.prefix}_section_title`]:val("hbAdmSectionTitle"),
      [`${c.prefix}_section_description`]:val("hbAdmSectionDescription"),
      [`${c.prefix}_important_cards`]:val("hbAdmImportantCards"),
      [`${c.prefix}_confirm_text`]:val("hbAdmConfirmText"),
      [`${c.prefix}_phrase_1`]:val("hbAdmPhrase1")||"Frase 1",
      [`${c.prefix}_phrase_2`]:val("hbAdmPhrase2")||"Frase 2",
      [`${c.prefix}_phrase_3`]:val("hbAdmPhrase3")||"Frase 3",
      [`${c.prefix}_published`]: val("hbAdmPublished")==="true",
      [`${c.prefix}_restriction_mode`]: val("hbAdmRestrictionMode")||"fingerprint",
      [`${c.prefix}_limit_per_phrase`]: Math.max(1, Math.min(20, Number(val("hbAdmVotesPerPhraseLimit") || 1))),
      [`${c.prefix}_restriction_label`]: ({fingerprint:"1 voto por navegador/dispositivo", strict:"Mais rígido: navegador/dispositivo + IP", ip:"1 voto por IP/rede"}[val("hbAdmRestrictionMode")||"fingerprint"])
    });
    if(c.limit) settingsPayload[`${c.prefix}_limit_per_phrase`]=c.limit;
    const {error:settingsError}=await sb().from("site_settings").upsert(settingsPayload,{onConflict:"id"});
    if(settingsError) throw settingsError;
    const published=val("hbAdmPublished")==="true";
    const project={project_key:hbAdminConfig().key,title:val("hbAdmProjectTitle")||title,description:val("hbAdmProjectDescription")||desc,details:desc,image_url:val("hbAdmProjectImage"),status:published?"em_votacao":"rascunho",voting_open:published && status==="aberta"};
    const {data:existing,error:pe}=await sb().from("projects").select("id").eq("project_key",hbAdminConfig().key).limit(1); if(pe) throw pe;
    const pq=(existing&&existing.length)?sb().from("projects").update(project).eq("id",existing[0].id):sb().from("projects").insert(project);
    const {error:projectError}=await pq; if(projectError) throw projectError;
    let v=await hbGetVotacao();
    const vot={project_key:hbAdminConfig().key,titulo:title,descricao:desc,status:status,fase:`handbanner-fase-${HB_ADMIN_PHASE}`,mostrar_ranking:false};
    const vq=v?sb().from("votacoes").update(vot).eq("id",v.id):sb().from("votacoes").insert(vot);
    const {error:vError}=await vq; if(vError) throw vError;
    msg("hbAdmMsg","Página, card e votação salvos."); await hbLoadAdmin();
  }catch(e){msg("hbAdmMsg","Erro: "+e.message+" — rode o SQL patch corrigido.");}
};
window.hbAdminSaveArt=async function(){
  if(!sb()) return msg("hbAdmArtMsg","Supabase não conectado.");
  try{
    const v=await hbEnsureVotacao();
    const item={votacao_id:v.id,titulo:val("hbAdmArtTitle"),descricao:val("hbAdmArtDescription"),imagem_url:val("hbAdmArtImage"),imagem:val("hbAdmArtImage"),hb_frase:Number(val("hbAdmArtPhrase")||1),position:Number(val("hbAdmArtPosition")||0),votos_count:0,votos:0};
    if(!item.titulo) return msg("hbAdmArtMsg","Preencha o nome da arte.");
    const {error}=await sb().from("opcoes_votacao").insert(item); if(error) throw error;
    ["hbAdmArtTitle","hbAdmArtDescription","hbAdmArtImage","hbAdmArtPosition"].forEach(id=>setVal(id,""));
    msg("hbAdmArtMsg","Arte adicionada."); await hbAdminRenderArts();
  }catch(e){msg("hbAdmArtMsg","Erro: "+e.message+" — confira se rodou o SQL patch.");}
};
window.hbAdminDeleteArt=async function(id){
  if(!confirm("Apagar esta arte?")) return;
  const {error}=await sb().from("opcoes_votacao").delete().eq("id",id);
  if(error) return msg("hbAdmArtMsg","Erro: "+error.message);
  msg("hbAdmArtMsg","Arte apagada."); hbAdminRenderArts();
};
window.hbAdminUpdateArt=async function(id){
  const item={
    titulo:val(`hbEditTitle_${id}`),
    descricao:val(`hbEditDesc_${id}`),
    imagem_url:val(`hbEditImg_${id}`),
    imagem:val(`hbEditImg_${id}`),
    hb_frase:Number(val(`hbEditPhrase_${id}`)||1),
    position:Number(val(`hbEditPos_${id}`)||0)
  };
  if(!item.titulo) return msg("hbAdmArtMsg","O nome da arte não pode ficar vazio.");
  const {error}=await sb().from("opcoes_votacao").update(item).eq("id",id);
  if(error) return msg("hbAdmArtMsg","Erro: "+error.message);
  msg("hbAdmArtMsg","Arte atualizada."); hbAdminRenderArts();
};

window.hbAdminPublishPage=async function(){
  setVal("hbAdmPublished","true");
  if(!val("hbAdmStatus") || val("hbAdmStatus")==="rascunho") setVal("hbAdmStatus","aberta");
  await hbAdminSavePage();
};
window.hbAdminUnpublishPage=async function(){
  setVal("hbAdmPublished","false");
  setVal("hbAdmStatus","rascunho");
  await hbAdminSavePage();
};
window.hbAdminRenderArts=async function(){
  const box=$id("hbAdmArtsList"); if(!box||!sb()) return;
  try{
    const v=await hbGetVotacao(); if(!v){box.innerHTML="<p>Salve a página para criar a votação.</p>";return;}
    const {data,error}=await sb().from("opcoes_votacao").select("*").eq("votacao_id",v.id).order("hb_frase",{ascending:true}).order("position",{ascending:true}).order("created_at",{ascending:true});
    if(error) throw error;
    const rows=data||[];
    if(!rows.length){box.innerHTML="<p>Nenhuma arte cadastrada.</p>";return;}
    box.innerHTML=[1,2,3].map(n=>{
      const list=rows.filter(o=>Number(o.hb_frase||1)===n);
      return `<section class="hb-admin-phrase-board">
        <div class="hb-admin-phrase-board-title"><h3>Frase ${n}</h3><span>${list.length} arte(s)</span></div>
        <div class="hb-admin-phrase-art-list">
        ${list.length?list.map(o=>`<article class="hb-admin-art-card">
          <div class="hb-admin-art-preview" style="${(o.imagem_url||o.imagem||'').startsWith('http')||String(o.imagem_url||o.imagem||'').startsWith('assets/')?`background-image:url('${esc(o.imagem_url||o.imagem)}')`:''}">${!(String(o.imagem_url||o.imagem||'').startsWith('http')||String(o.imagem_url||o.imagem||'').startsWith('assets/'))?esc(o.imagem_url||o.imagem||''):''}</div>
          <div class="hb-admin-art-edit">
            <div class="hb-admin-art-row-top">
              <div><label>Frase</label><select id="hbEditPhrase_${o.id}"><option value="1" ${Number(o.hb_frase||1)===1?'selected':''}>Frase 1</option><option value="2" ${Number(o.hb_frase||1)===2?'selected':''}>Frase 2</option><option value="3" ${Number(o.hb_frase||1)===3?'selected':''}>Frase 3</option></select></div>
              <div><label>Ordem</label><input id="hbEditPos_${o.id}" type="number" value="${Number(o.position||0)}"></div>
            </div>
            <label>Nome da arte</label><input id="hbEditTitle_${o.id}" value="${esc(o.titulo)}">
            <label>Descrição</label><textarea id="hbEditDesc_${o.id}">${esc(o.descricao||"")}</textarea>
            <label>Imagem 16:9</label><input id="hbEditImg_${o.id}" value="${esc(o.imagem_url||o.imagem||"")}">
            <small>Votos computados: ${Number(o.votos_count||0)}</small>
            <div class="admin-row-actions"><button class="btn small primary" onclick="hbAdminUpdateArt('${o.id}')">Salvar arte</button><button class="btn danger small" onclick="hbAdminDeleteArt('${o.id}')">Apagar</button></div>
          </div>
        </article>`).join(""):`<p>Nenhuma arte nesta frase.</p>`}
        </div>
      </section>`;
    }).join("");
  }catch(e){box.innerHTML=`<p>Erro: ${esc(e.message)}</p>`;}
};
const oldLoad=window.loadAdminData;
window.loadAdminData=async function(){ if(oldLoad) await oldLoad(); await hbLoadAdmin(); };
document.addEventListener("DOMContentLoaded",()=>setTimeout(hbLoadAdmin,800));
})();
