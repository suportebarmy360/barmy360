(function () {
  const PROJECT_RE = /what\s*is\s*your\s*love\s*project/i;
  const fallbackKey = "barmy360_love_project_stories";

  function esc(value) {
    return String(value ?? "").replace(/[&<>'"]/g, (c) => ({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"}[c]));
  }

  window.BARMY_LOVE_PROJECT = {
    matches(project) {
      return !!project && PROJECT_RE.test(String(project.title || ""));
    },

    markup(project) {
      return `
      <section id="loveProjectCommunity" class="section love-project-community" data-project-id="${esc(project.id || "")}">
        <div class="section-heading compact-heading love-project-heading">
          <p class="kicker">PARTICIPE</p>
          <h2>Relatos da comunidade</h2>
          <p>Envie sua história para análise das ADMs ou leia os relatos já aprovados.</p>
          <button type="button" class="btn primary love-open-form-btn" onclick="BARMY_LOVE_PROJECT.toggleSubmit(true)">Enviar meu relato</button>
        </div>

        <div id="loveTabSubmit" class="love-tab-panel hidden" aria-hidden="true">
          <div class="love-form-header">
            <div><p class="kicker">SEU RELATO</p><h3>Conte a sua história</h3></div>
            <button type="button" class="btn small outline" onclick="BARMY_LOVE_PROJECT.toggleSubmit(false)">Fechar formulário</button>
          </div>
          <form id="loveStoryForm" class="love-story-form glow-card" autocomplete="on">
            <div class="love-form-grid">
              <label>Nome <span>*</span><input id="loveStoryName" name="name" maxlength="100" required placeholder="Seu nome"></label>
              <label>@ <span>*</span><input id="loveStoryHandle" name="handle" maxlength="100" required placeholder="@seuusuario"></label>
              <label>Rede social <small>(opcional)</small><select id="loveStorySocial" name="social_network"><option value="">Não informar</option><option>Instagram</option><option>X / Twitter</option><option>TikTok</option><option>Facebook</option><option>Threads</option><option>Outra</option></select></label>
              <label>Desde quando é ARMY <span>*</span><input id="loveStoryArmySince" name="army_since" maxlength="100" required placeholder="Ex.: desde 2019"></label>
              <label>Cidade <span>*</span><input id="loveStoryCity" name="city" maxlength="100" required placeholder="Sua cidade"></label>
              <label>Estado <span>*</span><input id="loveStoryState" name="state" maxlength="50" required placeholder="Ex.: SP"></label>
            </div>
            <label class="love-story-text-label">Seu relato <span>*</span><textarea id="loveStoryText" name="story" minlength="20" maxlength="5000" required placeholder="Conte sua história, o que o BTS representa para você e como esse amor faz parte da sua vida."></textarea><small>O relato será analisado e poderá ser editado pelas ADMs antes da publicação.</small></label>
            <label class="love-consent"><input id="loveStoryConsent" type="checkbox" required> Autorizo a publicação das informações enviadas nesta página.</label>
            <div class="love-form-actions"><button type="submit" class="btn primary">Enviar relato para análise</button></div>
            <p id="loveStoryMessage" class="form-msg" role="status"></p>
          </form>
        </div>

        <div class="love-published-section">
          <div class="section-heading compact-heading"><p class="kicker">HISTÓRIAS</p><h2>Relatos publicados</h2></div>
          <div id="loveStoriesList" class="love-stories-grid"><p>Carregando relatos...</p></div>
        </div>
      </section>`;
    },

    showTab(name) {
      this.toggleSubmit(name === "submit");
    },

    toggleSubmit(open) {
      const panel = document.getElementById("loveTabSubmit");
      if (!panel) return;
      panel.classList.toggle("hidden", !open);
      panel.setAttribute("aria-hidden", open ? "false" : "true");
      if (open) panel.scrollIntoView({behavior:"smooth", block:"start"});
    },

    openSubmit() {
      this.toggleSubmit(true);
    },

    async init() {
      const section = document.getElementById("loveProjectCommunity");
      const form = document.getElementById("loveStoryForm");
      if (!section || !form) return;
      form.addEventListener("submit", (event) => this.submit(event));
      await this.loadPublished();
    },

    async submit(event) {
      event.preventDefault();
      const msg = document.getElementById("loveStoryMessage");
      const section = document.getElementById("loveProjectCommunity");
      const button = event.currentTarget.querySelector('button[type="submit"]');
      const payload = {
        project_id: section?.dataset.projectId || null,
        name: document.getElementById("loveStoryName")?.value.trim(),
        social_handle: document.getElementById("loveStoryHandle")?.value.trim(),
        social_network: document.getElementById("loveStorySocial")?.value || null,
        army_since: document.getElementById("loveStoryArmySince")?.value.trim(),
        city: document.getElementById("loveStoryCity")?.value.trim(),
        state: document.getElementById("loveStoryState")?.value.trim(),
        story: document.getElementById("loveStoryText")?.value.trim(),
        status: "pending",
        source: "public"
      };
      if (!payload.name || !payload.social_handle || !payload.army_since || !payload.city || !payload.state || !payload.story) {
        msg.textContent = "Preencha todos os campos obrigatórios."; return;
      }
      if (payload.story.length < 20) { msg.textContent = "Escreva um relato um pouco mais completo."; return; }
      button.disabled = true; msg.textContent = "Enviando seu relato...";
      try {
        if (window.BARMY360_SUPABASE) {
          const { error } = await BARMY360_SUPABASE.from("love_project_stories").insert(payload);
          if (error) throw error;
        } else {
          const rows = JSON.parse(localStorage.getItem(fallbackKey) || "[]");
          rows.unshift({...payload, id: crypto.randomUUID?.() || String(Date.now()), created_at:new Date().toISOString()});
          localStorage.setItem(fallbackKey, JSON.stringify(rows));
        }
        event.currentTarget.reset();
        msg.textContent = "Relato enviado! Ele aparecerá aqui depois da análise e aprovação das ADMs. 💜";
      } catch (error) {
        console.error(error);
        msg.textContent = "Não foi possível enviar: " + (error.message || "erro inesperado");
      } finally { button.disabled = false; }
    },

    async loadPublished() {
      const list = document.getElementById("loveStoriesList");
      if (!list) return;
      try {
        let rows = [];
        if (window.BARMY360_SUPABASE) {
          const projectId = document.getElementById("loveProjectCommunity")?.dataset.projectId;
          let query = BARMY360_SUPABASE.from("love_project_stories").select("*").eq("status", "approved").order("published_at", {ascending:false, nullsFirst:false}).order("created_at", {ascending:false});
          if (projectId) query = query.eq("project_id", projectId);
          const { data, error } = await query;
          if (error) throw error;
          rows = data || [];
        } else {
          rows = JSON.parse(localStorage.getItem(fallbackKey) || "[]").filter((r) => r.status === "approved");
        }
        list.innerHTML = rows.length ? rows.map((r) => `
          <article class="love-story-card glow-card">
            <div class="love-story-card-head"><div><h3>${esc(r.name)}</h3><p>${esc(r.social_handle || "")}${r.social_network ? ` · ${esc(r.social_network)}` : ""}</p></div><span class="love-location">${esc(r.city)}, ${esc(r.state)}</span></div>
            <p class="love-army-since">ARMY ${esc(r.army_since || "")}</p>
            <div class="love-story-body">${esc(r.story).replace(/\n/g,"<br>")}</div>
          </article>`).join("") : `<article class="love-empty glow-card"><h3>Os relatos aparecerão aqui</h3><p>Assim que as ADMs aprovarem os primeiros envios, eles serão publicados nesta área.</p></article>`;
      } catch (error) {
        console.error(error);
        list.innerHTML = `<p class="form-msg">Não foi possível carregar os relatos. Confirme se o SQL desta versão foi executado.</p>`;
      }
    }
  };
})();
