
const LS_POSTS = "barmy360_posts";
const LS_PROJECTS = "barmy360_projects";
const LS_SITE = "barmy360_site_settings";
const LS_HELP = "barmy360_help_items";
const LS_STREAM = "barmy360_stream_items";
const LS_VOTACOES = "barmy360_votacoes";
const LS_OPCOES = "barmy360_opcoes_votacao";

const defaultProjects = [];

function fallbackPosts() {
  return JSON.parse(localStorage.getItem(LS_POSTS) || "[]");
}

async function loadCommunityPosts() {
  const el = document.getElementById("postsList");
  if (!el) return;

  let posts = [];

  if (window.BARMY360_SUPABASE) {
    const { data } = await BARMY360_SUPABASE.from("community_posts")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(30);
    posts = data || [];
  } else {
    posts = fallbackPosts().reverse();
  }

  el.innerHTML = posts.length
    ? posts
        .map(
          (p) => `<article class="post-card glow-card">
            ${p.image_url ? `<div class="post-image image-cover ratio-16-9" style="background-image:url('${escapeAttr(p.image_url)}')"></div>` : ""}
            <h3>${escapeHtml(p.title || "Aviso")}</h3>
            <p>${escapeHtml(p.content || "")}</p>
            <small>Publicado por ${escapeHtml(p.author || "ADM")}</small>
          </article>`
        )
        .join("")
    : `<article class="post-card glow-card">
        <h3>Nenhum aviso publicado ainda.</h3>
        <p>Os avisos dos ADMs aparecerão aqui.</p>
      </article>`;
}

async function getProjects() {
  let projects = [];

  if (window.BARMY360_SUPABASE) {
    const { data } = await BARMY360_SUPABASE.from("projects")
      .select("*")
      .order("created_at", { ascending: false });
    projects = data || [];
  } else {
    projects = JSON.parse(localStorage.getItem(LS_PROJECTS) || "[]");
  }

  return projects.length ? projects : defaultProjects;
}

async function getVotacoes() {
  if (window.BARMY360_SUPABASE) {
    const { data } = await BARMY360_SUPABASE.from("votacoes")
      .select("*")
      .in("status", ["aberta", "fechada"])
      .order("created_at", { ascending: false });
    return data || [];
  }

  return JSON.parse(localStorage.getItem(LS_VOTACOES) || "[]");
}

async function getOpcoesVotacao(votacaoId) {
  if (!votacaoId) return [];

  if (window.BARMY360_SUPABASE) {
    const { data } = await BARMY360_SUPABASE.from("opcoes_votacao")
      .select("*")
      .eq("votacao_id", votacaoId)
      .order("votos_count", { ascending: false });
    return data || [];
  }

  return JSON.parse(localStorage.getItem(LS_OPCOES) || "[]").filter(
    (o) => String(o.votacao_id) === String(votacaoId)
  );
}


function slugifyProject(value) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
function projectVotingKey(p) {
  const titleSlug = slugifyProject(p?.title);
  if (titleSlug.includes("handbanner")) return "handbanner";
  if (titleSlug.includes("ocean")) return "ocean-roxo";
  if (titleSlug.includes("mensagem")) return "mensagem-final";
  return String(p?.project_key || p?.slug || p?.id || titleSlug);
}

function projectIsHandbanner(p) {
  return projectVotingKey(p) === "handbanner" || slugifyProject(p?.title).includes("handbanner");
}

function projectDetailHref(p) {
  return projectIsHandbanner(p)
    ? `projeto-handbanner.html?id=${encodeURIComponent(p.id)}`
    : `projeto-detalhe.html?id=${encodeURIComponent(p.id)}`;
}

async function findHandbannerProject() {
  const id = new URLSearchParams(location.search).get("id");
  const projects = await getProjects();
  if (id) {
    const byId = projects.find((x) => String(x.id) === String(id));
    if (byId) return byId;
  }
  return projects.find((x) => projectIsHandbanner(x)) || null;
}

async function loadHandbannerProjectPage() {
  const root = document.getElementById("handbannerProjectRoot");
  if (!root) return;

  const p = await findHandbannerProject();

  if (!p) {
    root.innerHTML = `<section class="section page">
      <div class="admin-card glow-card">
        <p class="kicker">HANDBANNER</p>
        <h1>Projeto Handbanner não cadastrado</h1>
        <p>Crie o projeto <strong>Handbanner</strong> no painel ADM. Depois ele aparecerá aqui automaticamente para edição, envio de frases e votação.</p>
        <a class="btn primary" href="admin.html">Ir para o painel ADM</a>
        <a class="btn outline" href="projetos.html">Voltar para projetos</a>
      </div>
    </section>`;
    return;
  }

  root.innerHTML = `<section class="project-detail-hero">
    <div class="project-detail-card glow-card">
      ${projectImageMarkup(p, "project-detail-image purple-bg")}
      <div class="project-detail-info">
        <p class="kicker">PROJETO SHOWS</p>
        <span class="status ${statusClass(p.status)}">${statusText(p.status)}</span>
        <h1>${escapeHtml(p.title || "Handbanner")}</h1>
        <p>${escapeHtml(p.description || "Envie sua frase para participar da seleção do handbanner.")}</p>
        <div class="hero-actions"><a class="btn primary" href="envio-frases.html">Enviar frase</a><a class="btn outline back-link" href="projetos.html">← Voltar para projetos</a></div>
      </div>
    </div>
  </section>

  <section class="project-detail-grid section">
    <article class="detail-box glow-card"><h2>📌 Sobre o projeto</h2><p>${escapeHtml(p.description || "Projeto de handbanner para o show.")}</p></article>
    <article class="detail-box glow-card"><h2>✨ Dinâmica</h2><p>${escapeHtml(p.details || "As frases enviadas serão avaliadas pelos ADMs. Depois, as aprovadas poderão entrar em votação.")}</p></article>
    <article class="detail-box glow-card"><h2>⚠️ Avisos importantes</h2><ul><li>Não compartilhar informações internas fora da área protegida.</li><li>Enviar frases respeitosas e adequadas para o projeto.</li><li>Seguir apenas a versão final aprovada pelos ADMs.</li></ul></article>
  </section>

  `;
}


function projectImageMarkup(p, cls = "project-image purple-bg") {
  const img = p.image_url || p.image || "Imagem do projeto";

  if (String(img).startsWith("http")) {
    return `<div class="${cls} image-cover ratio-16-9" style="background-image:url('${escapeAttr(img)}')"></div>`;
  }

  return `<div class="${cls}">${escapeHtml(img)}</div>`;
}

function optionImageMarkup(o) {
  const img = o.imagem_url || o.image_url || o.imagem || "";
  if (!String(img).trim()) return "";
  if (String(img).startsWith("http")) {
    return `<div class="project-image image-cover option-has-image" style="background-image:url('${escapeAttr(img)}')"></div>`;
  }
  return `<div class="project-image purple-bg option-has-image">${escapeHtml(img)}</div>`;
}

function votingOptionCardClass(o) {
  const img = o.imagem_url || o.image_url || o.imagem || "";
  return String(img).trim() ? "project-card voting-option-card glow-card has-option-image" : "project-card voting-option-card glow-card no-option-image";
}

async function loadDynamicProjects() {
  const el = document.getElementById("dynamicProjectsGrid");
  if (!el) return;

  const projects = await getProjects();

  if (!projects.length) {
    el.innerHTML = `<article class="project-card glow-card">
      <div class="project-image purple-bg ratio-16-9">Projetos</div>
      <span class="status voting">AGUARDANDO</span>
      <h3>Nenhum projeto editável cadastrado</h3>
      <p>Cadastre Ocean Roxo, Mensagem Final ou outros projetos pelo painel ADM.</p>
    </article>`;
    return;
  }

  el.innerHTML = projects
    .slice(0, 12)
    .map(
      (p) => `<article class="project-card campaign-card glow-card">
        <a href="${projectDetailHref(p)}">${projectImageMarkup(p, "project-image purple-bg ratio-16-9")}</a>
        <span class="status ${statusClass(p.status)}">${statusText(p.status)}</span>
        <h3>${escapeHtml(p.title)}</h3>
        <p>${escapeHtml(p.description || "")}</p>
        <div class="vote-line"><span>Status</span><strong>${escapeHtml(statusText(p.status))}</strong></div>
        <a class="btn small" href="${projectDetailHref(p)}">Ver explicação</a>
      </article>`
    )
    .join("");
}

async function loadVotingCampaigns() {
  const wrap = document.getElementById("dynamicVotingCampaigns");
  if (!wrap) return;

  const votacoes = await getVotacoes();

  if (!votacoes.length) {
    wrap.innerHTML = `<article class="project-card glow-card">
      <div class="project-image purple-bg">🗳️</div>
      <span class="status voting">AGUARDANDO</span>
      <h3>Nenhuma votação aberta ainda</h3>
      <p>Quando uma ADM criar a votação no painel, as opções aparecerão aqui automaticamente.</p>
    </article>`;
    return;
  }

  const blocks = [];

  for (const votacao of votacoes) {
    const opcoes = await getOpcoesVotacao(votacao.id);
    const aberta = votacao.status === "aberta";
    const mostrarRanking = votacao.mostrar_ranking !== false;

    blocks.push(`<section class="voting-campaign glow-card">
      <div class="section-heading">
        <p class="kicker">${escapeHtml(votacao.fase || "VOTAÇÃO")}</p>
        <h2>${escapeHtml(votacao.titulo)}</h2>
        <p>${escapeHtml(votacao.descricao || "Escolha sua opção favorita.")}</p>
        <span class="status ${aberta ? "voting" : "closed"}">${aberta ? "VOTAÇÃO ABERTA" : "VOTAÇÃO FECHADA"}</span>
      </div>

      <div class="project-grid voting-options-grid">
        ${
          opcoes.length
            ? opcoes
                .map(
                  (o) => `<article class="${votingOptionCardClass(o)}">
                    ${optionImageMarkup(o)}
                    <h3>${escapeHtml(o.titulo)}</h3>
                    <p>${escapeHtml(o.descricao || "")}</p>
                    ${
                      mostrarRanking
                        ? `<div class="vote-line"><span>Votos</span><strong id="votes-${escapeAttr(o.id)}">${Number(
                            o.votos_count || 0
                          ).toLocaleString("pt-BR")}</strong></div>`
                        : `<div class="vote-line"><span>Resultado</span><strong>oculto</strong></div>`
                    }
                    <button class="btn small primary" onclick="voteOption('${escapeAttr(o.id)}', '${escapeAttr(
                    votacao.id
                  )}')" ${aberta ? "" : "disabled"}>${aberta ? "Votar" : "Fechada"}</button>
                  </article>`
                )
                .join("")
            : `<article class="project-card glow-card">
                <div class="project-image purple-bg">Sem opções</div>
                <h3>Aguardando cadastro</h3>
                <p>As opções do handbanner serão adicionadas no painel ADM.</p>
              </article>`
        }
      </div>
    </section>`);
  }

  wrap.innerHTML = blocks.join("");
}

async function voteOption(opcaoId, votacaoId) {
  if (!opcaoId || !votacaoId) return;

  if (window.BARMY360_SUPABASE) {
    const { error } = await BARMY360_SUPABASE.rpc("registrar_voto_opcao", {
      opcao: String(opcaoId),
      votacao: String(votacaoId),
    });

    if (error) {
      console.error(error);
      alert("Erro ao registrar voto: " + error.message);
      return;
    }
  } else {
    let opcoes = JSON.parse(localStorage.getItem(LS_OPCOES) || "[]");
    opcoes = opcoes.map((o) =>
      String(o.id) === String(opcaoId)
        ? { ...o, votos_count: Number(o.votos_count || 0) + 1 }
        : o
    );
    localStorage.setItem(LS_OPCOES, JSON.stringify(opcoes));
  }

  alert("Voto registrado 💜");
  if (typeof loadVotingOptions === "function") loadVotingOptions();
  else loadVotingCampaigns();
}

async function loadProjectDetail() {
  const root = document.getElementById("dynamicProjectDetail");
  if (!root) return;

  const id = new URLSearchParams(location.search).get("id");
  const projects = await getProjects();
  const p = id ? projects.find((x) => String(x.id) === String(id)) : projects[0];

  if (!p) return;

  root.innerHTML = `<section class="project-detail-hero">
    <div class="project-detail-card glow-card">
      ${projectImageMarkup(p, "project-detail-image purple-bg")}
      <div class="project-detail-info">
        <p class="kicker">PROJETO SHOWS</p>
        <span class="status ${statusClass(p.status)}">${statusText(p.status)}</span>
        <h1>${escapeHtml(p.title)}</h1>
        <p>${escapeHtml(p.description || "")}</p>
        <div class="project-detail-meta">
          <span class="meta-pill">💜 BARMY360</span>
          <span class="meta-pill">${escapeHtml(statusText(p.status))}</span>
        </div>
        <a class="btn outline back-link" href="projetos.html">← Voltar para projetos</a>
      </div>
    </div>
  </section>

  <section class="project-detail-grid section">
    <article class="detail-box glow-card">
      <h2>📌 Sobre o projeto</h2>
      <p>${escapeHtml(p.description || "Texto do projeto.")}</p>
    </article>
    <article class="detail-box glow-card">
      <h2>✨ Dinâmica</h2>
      <p>${escapeHtml(
        p.details || "Os ADMs irão publicar a dinâmica completa, instruções e momento da ação."
      )}</p>
    </article>
    <article class="detail-box glow-card">
      <h2>⚠️ Avisos importantes</h2>
      <ul>
        <li>Não compartilhar informações internas fora da área protegida.</li>
        <li>Seguir apenas a versão publicada pelos ADMs.</li>
        <li>Respeitar as regras oficiais do evento e do estádio.</li>
      </ul>
    </article>
  </section>

  <section class="section">
    <div class="section-heading center">
      <p class="kicker">VOTAÇÃO</p>
      <h2>Vote neste projeto</h2>
      <p id="votingStatusText">Carregando votação deste projeto...</p>
    </div>
    <div id="votingOptionsGrid" data-voting-grid="true" data-votacao-project="${escapeAttr(projectVotingKey(p))}" data-votacao-query="${escapeAttr(p.title)}" class="project-grid voting-options-grid"></div>
  </section>`;

  if (typeof loadVotingOptions === "function") loadVotingOptions();
}


const defaultHelpItems = [
  {
    id: "mapa",
    section_key: "mapa",
    title: "Mapa do estádio e entradas",
    content: "Espaço para imagem do mapa, entradas, portões e pontos importantes.",
    image_url: "🗺️ Adicionar foto do mapa do estádio e portões",
    link_url: "",
    link_label: "",
    position: 1,
  },
  {
    id: "setores",
    section_key: "setores",
    title: "Vista dos setores",
    content: "Adicione fotos de referência dos setores para ajudar quem vai ao show.",
    image_url: "📸 Foto da vista dos setores",
    link_url: "",
    link_label: "",
    position: 2,
  },
  {
    id: "links",
    section_key: "links",
    title: "Threads no X e posts do Instagram",
    content: "Espaço para links de threads, posts e guias gerais de outras ARMYs.",
    image_url: "🧵 Links de apoio",
    link_url: "",
    link_label: "",
    position: 3,
  },
  {
    id: "permitidos",
    section_key: "permitidos",
    title: "O que é permitido levar",
    content: "Documento com foto\nPowerbank permitido pela organização\nÁgua, se permitida pelo evento\nItens pequenos e seguros\nVerificar regras oficiais antes do show",
    image_url: "🎒",
    link_url: "",
    link_label: "",
    position: 4,
  },
];

async function getHelpItems() {
  if (window.BARMY360_SUPABASE) {
    const { data } = await BARMY360_SUPABASE.from("help_items")
      .select("*")
      .order("position", { ascending: true })
      .order("created_at", { ascending: true });
    return data && data.length ? data : defaultHelpItems;
  }
  const local = JSON.parse(localStorage.getItem(LS_HELP) || "[]");
  return local.length ? local : defaultHelpItems;
}

function helpImageMarkup(item) {
  const img = item.image_url || item.image || "";
  if (String(img).startsWith("http")) {
    return `<div class="image-placeholder image-cover" style="background-image:url('${escapeAttr(img)}')"></div>`;
  }
  return `<div class="image-placeholder">${escapeHtml(img || "Adicionar imagem")}</div>`;
}

function parseHelpExtraImages(item) {
  const raw = item.extra_images || item.extra_image_urls || item.gallery_images || "";
  if (Array.isArray(raw)) return raw.filter(Boolean);
  return String(raw || "")
    .split(/\n|,/)
    .map((x) => x.trim())
    .filter(Boolean);
}

function helpExtraImagesMarkup(item) {
  const images = parseHelpExtraImages(item);
  if (!images.length) return "";
  return `<article class="detail-box glow-card help-gallery-box">
    <h2>📸 Fotos adicionais</h2>
    <div class="help-gallery-grid">
      ${images.map((url) => String(url).startsWith("http")
        ? `<a href="${escapeAttr(url)}" target="_blank" rel="noopener" class="help-gallery-image image-cover" style="background-image:url('${escapeAttr(url)}')"></a>`
        : `<div class="help-gallery-image purple-bg">${escapeHtml(url)}</div>`
      ).join("")}
    </div>
  </article>`;
}

function helpContentMarkup(content) {
  const lines = String(content || "").split("\n").map((l) => l.trim()).filter(Boolean);
  if (lines.length > 1) {
    return `<ul class="pretty-list">${lines.map((l) => `<li>${escapeHtml(l)}</li>`).join("")}</ul>`;
  }
  return `<p>${escapeHtml(content || "")}</p>`;
}

function ajudaHref(item) {
  return `ajuda-detalhe.html?id=${encodeURIComponent(item.id || item.section_key || item.title)}`;
}

async function loadHelpPage() {
  const grid = document.getElementById("helpItemsGrid");
  if (!grid) return;
  const items = await getHelpItems();
  const dynamicItems = items.filter((item) => item.section_key !== "permitidos");
  grid.innerHTML = dynamicItems.map((item) => `<article class="support-card glow-card ${item.section_key === "mapa" ? "wide" : ""}">
    <a href="${ajudaHref(item)}">${helpImageMarkup(item)}</a>
    <h3>${escapeHtml(item.title || "Bloco de ajuda")}</h3>
    <p>${escapeHtml(item.content || "").slice(0, 150)}${String(item.content || "").length > 150 ? "..." : ""}</p>
    <a class="btn small outline" href="${ajudaHref(item)}">Abrir página</a>
  </article>`).join("") + `
  <article class="support-card glow-card fixed-info-card">
    <div class="image-placeholder">🎒</div>
    <h3>O que é permitido levar na mochila</h3>
    <ul class="pretty-list">
      <li>Documento com foto.</li>
      <li>Powerbank (pequeno até 500g)</li>
      <li>Capa de chuva.</li>
      <li>Água (em garrafa plástica transparente, sem tampa e até 600ml).</li>
      <li>Lanches lacrados (industrializados e pequenas porções).</li>
    </ul>
  </article>`;
}

async function loadHelpDetailPage() {
  const root = document.getElementById("helpDetailRoot");
  if (!root) return;
  const id = new URLSearchParams(location.search).get("id") || "mapa";
  const items = await getHelpItems();
  const item = items.find((x) => String(x.id) === String(id) || String(x.section_key) === String(id)) || items[0];
  if (!item) return;
  root.innerHTML = `<section class="project-detail-hero">
    <div class="project-detail-card glow-card">
      ${String(item.image_url || "").startsWith("http") ? `<div class="project-detail-image image-cover ratio-16-9" style="background-image:url('${escapeAttr(item.image_url)}')"></div>` : `<div class="project-detail-image purple-bg">${escapeHtml(item.image_url || "Adicionar imagem")}</div>`}
      <div class="project-detail-info">
        <p class="kicker">BARMY AJUDA</p>
        <h1>${escapeHtml(item.title || "BARMY Ajuda")}</h1>
        <p>${escapeHtml(item.content || "")}</p>
        <div class="hero-actions">
          ${item.link_url ? `<a class="btn primary" href="${escapeAttr(item.link_url)}" target="_blank" rel="noopener">${escapeHtml(item.link_label || "Abrir link")}</a>` : ""}
          <a class="btn outline" href="ajuda.html">← Voltar para BARMY Ajuda</a>
        </div>
      </div>
    </div>
  </section>
  <section class="section project-detail-grid">
    <article class="detail-box glow-card">
      <h2>📌 Explicação</h2>
      ${helpContentMarkup(item.content || "Os ADMs podem editar esse texto no painel.")}
    </article>
    <article class="detail-box glow-card">
      <h2>🔗 Links e referências</h2>
      ${item.link_url ? `<p>Link cadastrado pelos ADMs:</p><a class="btn small primary" href="${escapeAttr(item.link_url)}" target="_blank" rel="noopener">${escapeHtml(item.link_label || "Abrir link")}</a>` : `<p>Nenhum link cadastrado ainda. Adicione pelo painel ADM.</p>`}
    </article>
    ${helpExtraImagesMarkup(item)}
  </section>`;
}


const defaultStreamItems = [
  { id: "playlists", section_key: "playlists", title: "Playlists", description: "Playlists oficiais ou organizadas pela comunidade.", content: "Adicione aqui links de playlists, instruções de uso e plataformas prioritárias.", image_url: "🎵", link_url: "", link_label: "Acessar plataformas", position: 1 },
  { id: "youtube", section_key: "youtube", title: "YouTube", description: "Guias para views, metas, revezamento e cuidado com spam.", content: "Explique aqui como assistir, evitar spam e organizar metas de views.", image_url: "▶️", link_url: "", link_label: "Abrir guia", position: 2 },
  { id: "metas", section_key: "metas", title: "Metas", description: "Espaço para metas diárias, semanais ou de comeback.", content: "Cadastre metas, prioridades e atualizações para a comunidade acompanhar.", image_url: "📊", link_url: "", link_label: "Ver metas", position: 3 },
  { id: "tutorial", section_key: "tutorial", title: "Guias de stream", description: "Tutorial rápido para quem quer ajudar e não sabe por onde começar.", content: "Coloque o passo a passo principal para iniciantes.", image_url: "⚡", link_url: "", link_label: "Ler tutorial", position: 4 },
];

async function getStreamItems() {
  if (window.BARMY360_SUPABASE) {
    const { data } = await BARMY360_SUPABASE.from("stream_items")
      .select("*")
      .order("position", { ascending: true })
      .order("created_at", { ascending: true });
    return data && data.length ? data : defaultStreamItems;
  }
  const local = JSON.parse(localStorage.getItem(LS_STREAM) || "[]");
  return local.length ? local : defaultStreamItems;
}

function streamHref(item) {
  return `stream-detalhe.html?id=${encodeURIComponent(item.id || item.section_key || item.title)}`;
}

function streamImageMarkup(item) {
  const img = item.image_url || item.image || "";
  if (String(img).startsWith("http")) {
    return `<div class="project-image image-cover ratio-16-9" style="background-image:url('${escapeAttr(img)}')"></div>`;
  }
  return `<div class="project-image purple-bg ratio-16-9">${escapeHtml(img || "Adicionar imagem")}</div>`;
}

async function loadStreamPage() {
  const grid = document.getElementById("streamItemsGrid");
  if (!grid) return;
  const items = await getStreamItems();
  grid.innerHTML = items.map((item) => `<article class="feature-card glow-card">
    <a href="${streamHref(item)}">${streamImageMarkup(item)}</a>
    <h3>${escapeHtml(item.title)}</h3>
    <p>${escapeHtml(item.description || item.content || "")}</p>
    <a class="btn small" href="${streamHref(item)}">${escapeHtml(item.link_label || "Abrir")}</a>
  </article>`).join("");
}

async function loadStreamDetailPage() {
  const root = document.getElementById("streamDetailRoot");
  if (!root) return;
  const id = new URLSearchParams(location.search).get("id") || "playlists";
  const items = await getStreamItems();
  const item = items.find((x) => String(x.id) === String(id) || String(x.section_key) === String(id)) || items[0];
  if (!item) return;
  root.innerHTML = `<section class="project-detail-hero">
    <div class="project-detail-card glow-card">
      ${streamImageMarkup(item)}
      <div class="project-detail-info">
        <p class="kicker">STREAM</p>
        <h1>${escapeHtml(item.title)}</h1>
        <p>${escapeHtml(item.description || "")}</p>
        <div class="hero-actions">
          ${item.link_url ? `<a class="btn primary" href="${escapeAttr(item.link_url)}" target="_blank" rel="noopener">${escapeHtml(item.link_label || "Abrir link")}</a>` : ""}
          <a class="btn outline" href="stream.html">← Voltar para Stream</a>
        </div>
      </div>
    </div>
  </section>
  <section class="section project-detail-grid">
    <article class="detail-box glow-card">
      <h2>📌 Guia</h2>
      ${helpContentMarkup(item.content || item.description || "Os ADMs podem editar esse texto no painel.")}
    </article>
    <article class="detail-box glow-card">
      <h2>🔗 Link principal</h2>
      ${item.link_url ? `<a class="btn small primary" href="${escapeAttr(item.link_url)}" target="_blank" rel="noopener">${escapeHtml(item.link_label || "Abrir link")}</a>` : `<p>Nenhum link cadastrado ainda. Adicione pelo painel ADM.</p>`}
    </article>
  </section>`;
}

function applySiteSettings() {
  const s = JSON.parse(localStorage.getItem(LS_SITE) || "{}");

  if (s.hero_title && document.querySelector(".home-hero h1")) {
    document.querySelector(".home-hero h1").textContent = s.hero_title;
  }

  if (s.hero_text && document.querySelector(".hero-text")) {
    document.querySelector(".hero-text").textContent = s.hero_text;
  }

  document.querySelectorAll('a[href^="mailto:contato@barmy360.com"]').forEach((a) => {
    if (s.contact_email) a.href = "mailto:" + s.contact_email;
  });
}

function statusClass(s) {
  return s === "aprovado" ? "approved" : s === "fechado" ? "closed" : "voting";
}

function statusText(s) {
  return s === "aprovado" ? "APROVADO" : s === "fechado" ? "VOTAÇÃO FECHADA" : "EM VOTAÇÃO";
}

function escapeHtml(v) {
  return String(v || "").replace(/[&<>'"]/g, (c) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "'": "&#39;",
    '"': "&quot;",
  }[c]));
}

function escapeAttr(v) {
  return escapeHtml(v).replace(/`/g, "");
}


async function submitPhraseForm(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const phrase = form.querySelector("#phraseText")?.value?.trim() || "";
  const author_name = form.querySelector("#phraseName")?.value?.trim() || "";
  const social_handle = form.querySelector("#phraseSocial")?.value?.trim() || "";
  const msg = document.getElementById("phraseFormMsg");
  if (!phrase || phrase.length < 5) {
    if (msg) msg.textContent = "Escreva uma frase válida antes de enviar.";
    return;
  }
  if (phrase.length > 180) {
    if (msg) msg.textContent = "A frase está muito longa. Use até 180 caracteres.";
    return;
  }
  const row = { phrase, author_name, social_handle };
  if (window.BARMY360_SUPABASE) {
    const { error } = await BARMY360_SUPABASE.from("phrase_submissions").insert(row);
    if (error) {
      console.error(error);
      if (msg) msg.textContent = "Erro ao enviar: " + error.message;
      return;
    }
  } else {
    const arr = JSON.parse(localStorage.getItem("barmy360_phrase_submissions") || "[]");
    arr.push({ ...row, created_at: new Date().toISOString() });
    localStorage.setItem("barmy360_phrase_submissions", JSON.stringify(arr));
  }
  form.reset();
  if (msg) msg.textContent = "Frase enviada com sucesso 💜";
}
function initPhraseForm() {
  const form = document.getElementById("phraseForm");
  if (form) form.addEventListener("submit", submitPhraseForm);
}

document.addEventListener("DOMContentLoaded", () => {
  loadCommunityPosts();
  applySiteSettings();
  loadDynamicProjects();
  loadVotingCampaigns();
  loadProjectDetail();
  loadHandbannerProjectPage();
  loadHelpPage();
  loadHelpDetailPage();
  loadStreamPage();
  loadStreamDetailPage();
  initPhraseForm();
});
document.addEventListener("DOMContentLoaded", () => {
  const titles = [...document.querySelectorAll("h1, h2, h3")];

  const title = titles.find(el =>
    el.textContent.trim().toLowerCase().includes("permitido levar")
  );

  if (!title) return;

  const card = title.closest("article, section, div");
  if (!card) return;

  const textElement = [...card.querySelectorAll("p")].find(p =>
    p.textContent.includes("Documento com foto")
  );

  if (!textElement) return;

  const items = textElement.textContent
    .split("\n")
    .map(item => item.trim())
    .filter(Boolean);

  const checklist = document.createElement("div");
  checklist.className = "show-checklist";

  items.forEach((item, index) => {
    const key = `barmy360-checklist-${index}`;

    const label = document.createElement("label");
    label.className = "check-item";

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.checked = localStorage.getItem(key) === "true";

    checkbox.addEventListener("change", () => {
      localStorage.setItem(key, checkbox.checked);
    });

    const span = document.createElement("span");
    span.textContent = item;

    label.appendChild(checkbox);
    label.appendChild(span);
    checklist.appendChild(label);
  });

  textElement.replaceWith(checklist);
});
