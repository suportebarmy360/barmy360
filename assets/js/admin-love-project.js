(function () {
  const table = "love_project_stories";
  const esc = (v) => String(v ?? "").replace(/[&<>'"]/g,(c)=>({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"}[c]));
  const q = (id) => document.getElementById(id);
  let currentRows = [];

  window.loadLoveStoriesAdmin = async function () {
    const pending = q("loveStoriesPendingList"), published = q("loveStoriesPublishedList");
    if (!pending || !published) return;
    pending.innerHTML = published.innerHTML = "<p>Carregando...</p>";
    try {
      if (!window.BARMY360_SUPABASE) throw new Error("Supabase não conectado.");
      const { data, error } = await BARMY360_SUPABASE.from(table).select("*").order("created_at", {ascending:false});
      if (error) throw error;
      currentRows = data || [];
      renderList(pending, currentRows.filter((r)=>r.status !== "approved"), false);
      renderList(published, currentRows.filter((r)=>r.status === "approved"), true);
    } catch (error) {
      pending.innerHTML = published.innerHTML = `<p class="form-msg">${esc(error.message || error)}</p>`;
    }
  };

  function renderList(container, rows, approved) {
    container.innerHTML = rows.length ? rows.map((r)=>`
      <article class="mini-admin-item love-admin-item">
        <div class="love-admin-title"><strong>${esc(r.name)}</strong><span class="status ${approved ? "active" : "planning"}">${approved ? "PUBLICADO" : esc((r.status || "pending").toUpperCase())}</span></div>
        <p><b>${esc(r.social_handle || "")}</b>${r.social_network ? ` · ${esc(r.social_network)}` : ""} · ARMY ${esc(r.army_since || "")}</p>
        <small>${esc(r.city || "")}, ${esc(r.state || "")} · ${new Date(r.created_at).toLocaleString("pt-BR")}</small>
        <p class="love-admin-story">${esc(r.story || "")}</p>
        <div class="admin-actions">
          <button class="btn small outline" onclick="editLoveStory('${r.id}')">Editar</button>
          ${approved ? `<button class="btn small outline" onclick="setLoveStoryStatus('${r.id}','pending')">Retirar da publicação</button>` : `<button class="btn small primary" onclick="setLoveStoryStatus('${r.id}','approved')">Aprovar e publicar</button>`}
          <button class="btn small outline danger" onclick="deleteLoveStory('${r.id}')">Excluir</button>
        </div>
      </article>`).join("") : `<p>${approved ? "Nenhum relato publicado." : "Nenhum relato pendente."}</p>`;
  }

  window.editLoveStory = function(id) {
    const r = currentRows.find((x)=>String(x.id)===String(id)); if (!r) return;
    q("loveAdmId").value = r.id || ""; q("loveAdmName").value = r.name || ""; q("loveAdmHandle").value = r.social_handle || "";
    q("loveAdmSocial").value = r.social_network || ""; q("loveAdmArmySince").value = r.army_since || ""; q("loveAdmCity").value = r.city || "";
    q("loveAdmState").value = r.state || ""; q("loveAdmStory").value = r.story || ""; q("loveAdmStatus").value = r.status || "pending";
    q("loveAdmProjectId").value = r.project_id || ""; q("loveAdmForm")?.scrollIntoView({behavior:"smooth",block:"start"});
  };

  window.clearLoveStoryForm = function() {
    ["loveAdmId","loveAdmName","loveAdmHandle","loveAdmArmySince","loveAdmCity","loveAdmState","loveAdmStory","loveAdmProjectId"].forEach((id)=>{if(q(id))q(id).value="";});
    if(q("loveAdmSocial")) q("loveAdmSocial").value=""; if(q("loveAdmStatus")) q("loveAdmStatus").value="approved"; if(q("loveAdmMsg")) q("loveAdmMsg").textContent="";
  };

  window.saveLoveStoryAdmin = async function() {
    const id=q("loveAdmId").value;
    const payload={project_id:q("loveAdmProjectId").value||null,name:q("loveAdmName").value.trim(),social_handle:q("loveAdmHandle").value.trim(),social_network:q("loveAdmSocial").value||null,army_since:q("loveAdmArmySince").value.trim(),city:q("loveAdmCity").value.trim(),state:q("loveAdmState").value.trim(),story:q("loveAdmStory").value.trim(),status:q("loveAdmStatus").value,source:id?undefined:"admin",published_at:q("loveAdmStatus").value==="approved"?new Date().toISOString():null,updated_at:new Date().toISOString()};
    Object.keys(payload).forEach((k)=>payload[k]===undefined&&delete payload[k]);
    if(!payload.name||!payload.story){q("loveAdmMsg").textContent="Preencha nome e relato.";return;}
    const request=id?BARMY360_SUPABASE.from(table).update(payload).eq("id",id):BARMY360_SUPABASE.from(table).insert(payload);
    const {error}=await request; if(error){q("loveAdmMsg").textContent="Erro: "+error.message;return;}
    q("loveAdmMsg").textContent=id?"Relato atualizado.":"Relato criado."; clearLoveStoryForm(); loadLoveStoriesAdmin();
  };

  window.setLoveStoryStatus = async function(id,status) {
    const {error}=await BARMY360_SUPABASE.from(table).update({status,published_at:status==="approved"?new Date().toISOString():null,updated_at:new Date().toISOString()}).eq("id",id);
    if(error) alert(error.message); else loadLoveStoriesAdmin();
  };

  window.deleteLoveStory = async function(id) {
    if(!confirm("Excluir este relato definitivamente?"))return;
    const {error}=await BARMY360_SUPABASE.from(table).delete().eq("id",id); if(error)alert(error.message);else loadLoveStoriesAdmin();
  };
})();
