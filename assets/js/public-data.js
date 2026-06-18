
const LS_POSTS = "barmy360_posts";
const LS_PROJECTS = "barmy360_projects";
const LS_SITE = "barmy360_site_settings";
const LS_HELP = "barmy360_help_items";
const LS_STREAM = "barmy360_stream_items";
const LS_VOTACOES = "barmy360_votacoes";
const LS_OPCOES = "barmy360_opcoes_votacao";

const DEFAULT_HANDBANNER_PHRASES_PROJECT = {
  id: "handbanner-frases",
  project_key: "handbanner-frases",
  slug: "handbanner-frases",
  title: "HAND BANNER - Envio de frases",
  description: "A fase de envio de frases foi encerrada. As frases enviadas ficam salvas para análise das ADMs.",
  details: "O formulário público de envio de frases foi fechado. Acompanhe as próximas fases pela página de projetos.",
  status: "finalizado",
  image_url: "assets/images/b360-iso.png",
  published: true,
  is_default: true,
  project_type: "frases"
};

const DEFAULT_HANDBANNER_ARTS_PROJECT = {
  id: "handbanner-artes",
  project_key: "handbanner-artes",
  slug: "handbanner-artes",
  title: "HAND BANNER - Envio de artes",
  description: "Envie sua arte seguindo o edital e o manual de submissão.",
  details: "Área para envio de links do Drive/Nuvem com os arquivos do design. O envio usa limite de até 3 envios por aparelho/navegador, sem login Google.",
  status: "fase de envio",
  image_url: "assets/images/b360-iso.png",
  published: true,
  is_default: true,
  project_type: "artes"
};

// Não criar projetos fixos automaticamente na listagem.
// Todos os cards de projetos devem vir do Supabase/painel ADM para evitar duplicação.
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

function projectTitleSlug(p){
  return slugifyProject(p?.title || p?.slug || p?.project_key || p?.id || "");
}

function projectVotingKey(p) {
  const titleSlug = projectTitleSlug(p);
  if (projectIsHandbannerArts(p)) return "handbanner-artes";
  if (projectIsHandbannerPhrases(p)) return "handbanner-frases";
  return String(p?.project_key || p?.slug || p?.id || titleSlug);
}

function projectIsHandbannerPhrases(p) {
  const key = String(p?.project_key || p?.slug || p?.id || "").toLowerCase().trim();
  const type = String(p?.project_type || "").toLowerCase().trim();
  return type === "frases" || key === "handbanner-frases" || key === "envio-frases";
}

function projectIsHandbannerArts(p) {
  const key = String(p?.project_key || p?.slug || p?.id || "").toLowerCase().trim();
  const type = String(p?.project_type || "").toLowerCase().trim();
  return type === "artes" || key === "handbanner-artes" || key === "envio-artes";
}

function projectIsHandbanner(p) {
  return projectIsHandbannerPhrases(p) || projectIsHandbannerArts(p);
}

function projectDisplayStatus(p) {
  return p?.status || (projectIsHandbannerPhrases(p) || projectIsHandbannerArts(p) ? "fase_envio" : "em_votacao");
}

function projectDetailHref(p) {
  if (projectIsHandbannerArts(p)) return `projeto-handbanner-artes.html?id=${encodeURIComponent(p.id || "handbanner-artes")}`;
  if (projectIsHandbannerPhrases(p)) return `projeto-handbanner-frases.html?id=${encodeURIComponent(p.id || "handbanner-frases")}`;
  return `projeto-detalhe.html?id=${encodeURIComponent(p.id)}`;
}

async function findHandbannerPhraseProject() {
  const id = new URLSearchParams(location.search).get("id");
  const projects = await getProjects();
  if (id) {
    const byId = projects.find((x) => String(x.id) === String(id));
    if (byId && !projectIsHandbannerArts(byId)) return byId;
  }
  return projects.find((x) => projectIsHandbannerPhrases(x)) || null;
}

async function findHandbannerArtProject() {
  const id = new URLSearchParams(location.search).get("id");
  const projects = await getProjects();
  if (id) {
    const byId = projects.find((x) => String(x.id) === String(id));
    if (byId && projectIsHandbannerArts(byId)) return byId;
  }
  return DEFAULT_HANDBANNER_ARTS_PROJECT;
}

function phraseSubmissionFormMarkup() {
  return `<section id="phraseFormSection" class="section phrase-inline-section">
    <article class="admin-card phrase-form-card glow-card">
      <div class="section-heading compact-heading">
        <p class="kicker">COLETA ENCERRADA</p>
        <h2>Envio de frases finalizado</h2>
        <p>A fase de envio de frases já foi encerrada. O formulário público não está mais disponível.</p>
      </div>
      <div class="hero-actions"><a class="btn primary" href="projetos.html">Voltar para projetos</a></div>
    </article>
  </section>`;
}


function handbannerPhraseProjectMarkup(p) {
  return `<section class="project-detail-hero">
    <div class="project-detail-card glow-card">
      ${projectImageMarkup(p, "project-detail-image purple-bg")}
      <div class="project-detail-info">
        <p class="kicker">PROJETO SHOWS</p>
        <span class="status ${statusClass(projectDisplayStatus(p))}">${statusText(projectDisplayStatus(p))}</span>
        <h1>${escapeHtml(p.title || "Hand Banner - Envio de frases")}</h1>
        <p>${escapeHtml(p.description || "Envio de frases encerrado. Acompanhe as próximas etapas pela página de projetos.")}</p>
        <div class="project-detail-meta">
          <span class="meta-pill">💜 BARMY360</span>
          <span class="meta-pill">Envio encerrado</span>
        </div>
        <div class="hero-actions">
          <a class="btn primary" href="projetos.html">← Voltar para projetos</a>
        </div>
      </div>
    </div>
  </section>

  <section class="project-detail-grid section">
    <article class="detail-box glow-card"><h2>📌 Sobre o projeto</h2><p>${escapeHtml(p.description || "Projeto de envio de frases para o Hand Banner. Fase encerrada.")}</p></article>
    <article class="detail-box glow-card"><h2>✨ Dinâmica</h2><p>${escapeHtml(p.details || "O envio de frases foi encerrado. As frases recebidas ficam salvas para análise das ADMs.")}</p></article>
    <article class="detail-box glow-card"><h2>⚠️ Avisos importantes</h2><ul><li>O formulário público de frases está fechado.</li><li>As frases já enviadas ficam registradas para análise.</li><li>Acompanhe as próximas etapas pela página de projetos.</li></ul></article>
  </section>`;
}

function handbannerArtProjectMarkup(p, siteSettings = {}) {
  const artTitle = siteSettings.handbanner_art_title || p.title || "Hand Banner - Envio de artes";
  const artText = siteSettings.handbanner_art_text || p.description || "Envie sua arte seguindo o edital e o manual de submissão.";
  return `<section class="project-detail-hero">
    <div class="project-detail-card glow-card">
      ${projectImageMarkup(p, "project-detail-image purple-bg")}
      <div class="project-detail-info">
        <p class="kicker">PROJETO SHOWS</p>
        <span class="status sending">FASE DE ENVIO</span>
        <h1>${escapeHtml(artTitle)}</h1>
        <p>${escapeHtml(artText)}</p>
        <div class="project-detail-meta">
          <span class="meta-pill">🎨 Envio de artes</span>
          <span class="meta-pill">Sem login Google</span>
          <span class="meta-pill">Até 3 envios</span>
        </div>
        <div class="hero-actions">
          <a class="btn primary" href="envio-handbanner-artes.html">Enviar arte</a>
          <a class="btn outline back-link" href="projetos.html">← Voltar para projetos</a>
        </div>
      </div>
    </div>
  </section>

  <section class="project-detail-grid section">
    <article class="detail-box glow-card"><h2>📌 Sobre o envio</h2><p>${escapeHtml(artText)}</p></article>
    <article class="detail-box glow-card"><h2>📁 Como enviar</h2><p>O formulário de envio fica em uma página separada. Envie links do Drive/Nuvem com acesso de leitura. Não envie arquivos pesados direto para o banco.</p></article>
    <article class="detail-box glow-card"><h2>⚠️ Regras</h2><ul><li>Até 3 envios por aparelho/navegador.</li><li>O link deve conter os itens pedidos no edital/manual.</li><li>Menores de idade precisam de autorização do responsável.</li></ul></article>
  </section>`;
}

async function loadHandbannerPhraseProjectPage() {
  const root = document.getElementById("handbannerPhraseProjectRoot") || document.getElementById("handbannerProjectRoot");
  if (!root) return;
  const p = await findHandbannerPhraseProject();
  if (!p) {
    root.innerHTML = phraseSubmissionFormMarkup();
    return;
  }
  root.innerHTML = handbannerPhraseProjectMarkup(p);
  initPhraseForm();
}

async function loadHandbannerArtProjectPage() {
  const root = document.getElementById("handbannerArtProjectRoot");
  if (!root) return;
  const siteSettings = await getPublicSiteSettings();
  const p = await findHandbannerArtProject();
  root.innerHTML = handbannerArtProjectMarkup(p || DEFAULT_HANDBANNER_ARTS_PROJECT, siteSettings);
  if (typeof hbInit === "function") hbInit();
}

// Compatibilidade com versões antigas/links antigos.
async function loadHandbannerProjectPage() {
  return loadHandbannerPhraseProjectPage();
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
      <p>Cadastre novos projetos pelo painel ADM.</p>
    </article>`;
    return;
  }

  const siteSettings = await getPublicSiteSettings();
  const artEnabled = !!siteSettings.handbanner_art_enabled;
  const cards = projects
    .slice(0, 12)
    .map(
      (p) => {
        const isPhrase = projectIsHandbannerPhrases(p);
        const isArt = projectIsHandbannerArts(p);
        const href = isPhrase ? `projeto-handbanner-frases.html?id=${encodeURIComponent(p.id || "handbanner-frases")}` : isArt ? `projeto-handbanner-artes.html?id=${encodeURIComponent(p.id || "handbanner-artes")}` : projectDetailHref(p);
        const label = isPhrase ? "Ver projeto" : isArt ? "Ver projeto" : "Ver explicação";
        return `<article class="project-card campaign-card glow-card">
          <a href="${href}">${projectImageMarkup(p, "project-image purple-bg ratio-16-9")}</a>
          <span class="status ${statusClass(projectDisplayStatus(p))}">${statusText(projectDisplayStatus(p))}</span>
          <h3>${escapeHtml(p.title)}</h3>
          <p>${escapeHtml(p.description || "")}</p>
          <div class="vote-line"><span>Status</span><strong>${escapeHtml(statusText(projectDisplayStatus(p)))}</strong></div>
          <a class="btn small ${isPhrase || isArt ? "primary" : ""}" href="${href}">${label}</a>
        </article>`;
      }
    );

  if (artEnabled) {
    cards.push(`<article class="project-card campaign-card glow-card">
      <a href="projeto-handbanner-artes.html"><div class="project-image purple-bg ratio-16-9">🎨</div></a>
      <span class="status sending">FASE DE ENVIO</span>
      <h3>${escapeHtml(siteSettings.handbanner_art_title || "Hand Banner - Envio de artes")}</h3>
      <p>${escapeHtml(siteSettings.handbanner_art_text || "Envie sua arte seguindo o edital e o manual de submissão.")}</p>
      <div class="vote-line"><span>Status</span><strong>Publicado</strong></div>
      <a class="btn small primary" href="projeto-handbanner-artes.html">Ver projeto</a>
    </article>`);
  }

  el.innerHTML = cards.join("");
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
                <p>As opções do hand banner serão adicionadas no painel ADM.</p>
              </article>`
        }
      </div>
    </section>`);
  }

  wrap.innerHTML = blocks.join("");
}

function getBarmyVoterFingerprint() {
  const key = "barmy360_voter_fingerprint";
  let value = localStorage.getItem(key);
  if (!value) {
    value = "voter_" + Date.now().toString(36) + "_" + Math.random().toString(36).slice(2);
    localStorage.setItem(key, value);
  }
  return value;
}

async function voteOption(opcaoId, votacaoId) {
  if (!opcaoId || !votacaoId) return;

  if (window.BARMY360_SUPABASE) {
    const { error } = await BARMY360_SUPABASE.rpc("registrar_voto_opcao", {
      opcao: String(opcaoId),
      votacao: String(votacaoId),
      voter_fingerprint: getBarmyVoterFingerprint(),
    });

    if (error) {
      console.error(error);
      alert(error.message || "Erro ao registrar voto.");
      return;
    }
  } else {
    const browserKey = `barmy360_votes_${votacaoId}`;
    const voted = JSON.parse(localStorage.getItem(browserKey) || "[]");
    if (voted.includes(String(opcaoId))) {
      alert("Você já votou nessa opção.");
      return;
    }
    if (voted.length >= 3) {
      alert("Limite de 3 opções por votação atingido.");
      return;
    }
    let opcoes = JSON.parse(localStorage.getItem(LS_OPCOES) || "[]");
    opcoes = opcoes.map((o) =>
      String(o.id) === String(opcaoId)
        ? { ...o, votos_count: Number(o.votos_count || 0) + 1 }
        : o
    );
    localStorage.setItem(LS_OPCOES, JSON.stringify(opcoes));
    localStorage.setItem(browserKey, JSON.stringify([...voted, String(opcaoId)]));
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

  if (projectIsHandbannerPhrases(p)) {
    root.innerHTML = handbannerPhraseProjectMarkup(p);
    return;
  }
  if (projectIsHandbannerArts(p)) {
    const siteSettings = await getPublicSiteSettings();
    root.innerHTML = handbannerArtProjectMarkup(p, siteSettings);
    return;
  }

  root.innerHTML = `<section class="project-detail-hero">
    <div class="project-detail-card glow-card">
      ${projectImageMarkup(p, "project-detail-image purple-bg")}
      <div class="project-detail-info">
        <p class="kicker">PROJETO SHOWS</p>
        <span class="status ${statusClass(projectDisplayStatus(p))}">${statusText(projectDisplayStatus(p))}</span>
        <h1>${escapeHtml(p.title)}</h1>
        <p>${escapeHtml(p.description || "")}</p>
        <div class="project-detail-meta">
          <span class="meta-pill">💜 BARMY360</span>
          <span class="meta-pill">${escapeHtml(statusText(projectDisplayStatus(p)))}</span>
        </div>
        <a class="btn outline back-link" href="projetos.html">← Voltar para projetos</a>
      </div>
    </div>
  </section>

  <section class="project-detail-grid section">
    <article class="detail-box glow-card docs-card">
      <h2>📄 Documentos para votação</h2>
      <p>Leia os termos, editais e documentos antes de votar ou participar.</p>
      <a class="btn small primary" href="documento-votacao.html">Abrir documentos</a>
    </article>
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

  <section class="section voting-campaign glow-card">
    <div class="section-heading compact-heading">
      <p class="kicker">VOTAÇÃO DO PROJETO</p>
      <h2>Opções para votação</h2>
      <p id="votingStatusText">Carregando votação vinculada a este projeto...</p>
    </div>
    <div id="votingOptionsGrid" class="project-grid voting-options-grid" data-voting-grid data-votacao-project="${escapeAttr(projectVotingKey(p))}"></div>
  </section>`;
  if (typeof loadVotingOptions === "function") setTimeout(loadVotingOptions, 0);
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
    content: "Documento com foto\nCarregador portátil / powerbank\nGarrafa d’água sem tampa até 500ml\nCapa de chuva\nComidas industrializadas e fechadas",
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

function checklistContentMarkup(item) {
  const lines = String(item.content || "").split("\n").map((l) => l.trim()).filter(Boolean);
  if (!lines.length) return `<p>Nenhum item cadastrado ainda.</p>`;
  const baseKey = `barmy360_check_${String(item.id || item.section_key || item.title).replace(/[^a-z0-9]/gi, "_")}`;
  return `<div class="checklist-box">${lines.map((line, index) => {
    const key = `${baseKey}_${index}`;
    return `<label class="check-item"><input type="checkbox" data-check-key="${escapeAttr(key)}"><span>${escapeHtml(line)}</span></label>`;
  }).join("")}</div>`;
}

function initLocalChecklist(root = document) {
  root.querySelectorAll("input[data-check-key]").forEach((input) => {
    const key = input.getAttribute("data-check-key");
    input.checked = localStorage.getItem(key) === "true";
    input.addEventListener("change", () => localStorage.setItem(key, input.checked ? "true" : "false"));
  });
}

function ajudaHref(item) {
  return `ajuda-detalhe.html?id=${encodeURIComponent(item.id || item.section_key || item.title)}`;
}

async function loadHelpPage() {
  const grid = document.getElementById("helpItemsGrid");
  if (!grid) return;
  const items = await getHelpItems();
  grid.innerHTML = items.map((item) => `<article class="support-card glow-card ${item.section_key === "mapa" ? "wide" : ""}">
    <a href="${ajudaHref(item)}">${helpImageMarkup(item)}</a>
    <h3>${escapeHtml(item.title || "Bloco de ajuda")}</h3>
    <p>${escapeHtml(item.content || "").slice(0, 150)}${String(item.content || "").length > 150 ? "..." : ""}</p>
    <a class="btn small outline" href="${ajudaHref(item)}">Abrir página</a>
  </article>`).join("");
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
      ${String(item.section_key || "").includes("permitidos") ? checklistContentMarkup(item) : helpContentMarkup(item.content || "Os ADMs podem editar esse texto no painel.")}
    </article>
    <article class="detail-box glow-card">
      <h2>🔗 Links e referências</h2>
      ${item.link_url ? `<p>Link cadastrado pelos ADMs:</p><a class="btn small primary" href="${escapeAttr(item.link_url)}" target="_blank" rel="noopener">${escapeHtml(item.link_label || "Abrir link")}</a>` : `<p>Nenhum link cadastrado ainda. Adicione pelo painel ADM.</p>`}
    </article>
    ${helpExtraImagesMarkup(item)}
  </section>`;
  initLocalChecklist(root);
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

async function getPublicSiteSettings(){
  let s={};
  try{s=JSON.parse(localStorage.getItem(LS_SITE)||"{}")}catch(e){}
  if(window.BARMY360_SUPABASE){ try{ const {data}=await BARMY360_SUPABASE.from("site_settings").select("*").eq("id",1).maybeSingle(); if(data) s={...s,...data}; }catch(e){} }
  return s;
}

async function applySiteSettings() {
  const s = await getPublicSiteSettings();

  if (s.hero_title && document.querySelector(".home-hero h1")) {
    document.querySelector(".home-hero h1").textContent = s.hero_title;
  }

  if (s.hero_text && document.querySelector(".hero-text")) {
    document.querySelector(".hero-text").textContent = s.hero_text;
  }

  document.querySelectorAll('a[href^="mailto:projeto.barmy360@gmail.com"]').forEach((a) => {
    if (s.contact_email) a.href = "mailto:" + s.contact_email;
  });
}

function statusClass(s) {
  const v = String(s || "").toLowerCase();
  if (["aprovado"].includes(v)) return "approved";
  if (["finalizado", "fechado", "nao_aprovado", "não_aprovado"].includes(v)) return "closed";
  if (["analise", "em_analise", "em análise"].includes(v)) return "analysis";
  if (["planejamento", "em_planejamento"].includes(v)) return "planning";
  if (["fase_envio", "em_fase_de_envio", "envio"].includes(v)) return "sending";
  return "voting";
}

function statusText(s) {
  const map = {
    fase_envio: "EM FASE DE ENVIO",
    em_fase_de_envio: "EM FASE DE ENVIO",
    envio: "EM FASE DE ENVIO",
    analise: "EM ANÁLISE",
    em_analise: "EM ANÁLISE",
    planejamento: "EM PLANEJAMENTO",
    em_planejamento: "EM PLANEJAMENTO",
    em_votacao: "EM VOTAÇÃO",
    votacao: "EM VOTAÇÃO",
    aprovado: "APROVADO",
    finalizado: "FINALIZADO",
    fechado: "FINALIZADO",
    nao_aprovado: "NÃO APROVADO",
    "não_aprovado": "NÃO APROVADO",
    "em_colaboracao":"EM COLABORAÇÃO"
  };
  return map[String(s || "").toLowerCase()] || "EM VOTAÇÃO";
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
  const phrase_explanation = form.querySelector("#phraseExplanation")?.value?.trim() || "";
  const author_name = form.querySelector("#phraseName")?.value?.trim() || "";
  const social_handle = form.querySelector("#phraseSocial")?.value?.trim() || "";
  const contact_email = form.querySelector("#phraseEmail")?.value?.trim() || "";
  const msg = document.getElementById("phraseFormMsg");
  if (!phrase || phrase.length < 5) {
    if (msg) msg.textContent = "Escreva uma frase válida antes de enviar.";
    return;
  }
  if (phrase.length > 180) {
    if (msg) msg.textContent = "A frase está muito longa. Use até 180 caracteres.";
    return;
  }
  const row = { phrase, phrase_explanation, author_name, social_handle, contact_email };
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



const LS_DOCS = "barmy360_site_documents";
const defaultDocuments = [
  { id: "edital-handbanner", title: "Edital do Projeto Hand Banner", description: "Edital completo com regras, fases e diretrizes do projeto.", file_url: "assets/docs/edital-hand-banner-barmy360.pdf", download_url: "assets/docs/edital-hand-banner-barmy360.pdf", cover_image: "assets/images/b360-iso.png", category: "documento", position: 1 },
  { id: "manual-handbanner", title: "Manual de submissão do Hand Banner", description: "Guia para preparar e enviar os arquivos corretamente.", file_url: "assets/docs/manual-submissao-hand-banner.pdf", download_url: "assets/docs/manual-submissao-hand-banner.pdf", cover_image: "assets/images/b360-iso.png", category: "documento", position: 2 },
  { id: "termos-votacao", title: "Termo de ciência e concordância", description: "Documento para leitura antes das votações oficiais.", file_url: "assets/docs/termo-ciencia-concordancia-votacao.docx", download_url: "assets/docs/termo-ciencia-concordancia-votacao.docx", cover_image: "assets/images/b360-iso.png", category: "documento", position: 3 },
  { id: "cronograma-handbanner", title: "Cronograma do Projeto Hand Banner", description: "Prazos e etapas do edital do projeto.", file_url: "assets/docs/edital-hand-banner-barmy360.pdf", download_url: "assets/docs/edital-hand-banner-barmy360.pdf", cover_image: "assets/images/b360-iso.png", category: "cronograma", position: 1 }
];
async function getSiteDocuments(category) {
  let rows = [];
  if (window.BARMY360_SUPABASE) {
    const q = BARMY360_SUPABASE.from("site_documents").select("*").order("position", { ascending: true }).order("created_at", { ascending: true });
    const { data } = category ? await q.eq("category", category) : await q;
    rows = data || [];
  } else {
    rows = JSON.parse(localStorage.getItem(LS_DOCS) || "[]");
  }
  if (!rows.length) rows = defaultDocuments.filter((d) => !category || d.category === category);
  return rows;
}
function documentCardMarkup(d) {
  const file = d.file_url || d.link_url || "";
  const download = d.download_url || d.file_url || d.link_url || "";
  const cover = d.cover_image || d.image_url || "";
  const image = cover
    ? `<div class="project-image image-cover ratio-16-9" style="background-image:url('${escapeAttr(cover)}')"></div>`
    : `<div class="project-image purple-bg ratio-16-9">📄</div>`;
  return `<article class="project-card glow-card">
    ${image}
    <span class="status analysis">${escapeHtml(d.category || "DOCUMENTO")}</span>
    <h3>${escapeHtml(d.title || "Documento")}</h3>
    <p>${escapeHtml(d.description || "")}</p>
    <div class="hero-actions">
      ${file ? `<a class="btn small primary" href="${escapeAttr(file)}" target="_blank" rel="noopener">Ler</a>` : ``}
      ${download ? `<a class="btn small outline" href="${escapeAttr(download)}" download>Baixar</a>` : `<span class="muted-text">Link ainda não cadastrado.</span>`}
    </div>
  </article>`;
}
async function loadDocumentsPage() {
  const grid = document.getElementById("documentsGrid");
  if (!grid) return;
  const rows = await getSiteDocuments("documento");
  grid.innerHTML = rows.map(documentCardMarkup).join("");
}
async function loadSchedulePage() {
  const grid = document.getElementById("scheduleGrid");
  if (!grid) return;
  const rows = await getSiteDocuments();
  grid.innerHTML = rows.map(documentCardMarkup).join("");
}



const LS_SOLOS = "barmy360_solo_members";
const defaultSoloMembers = ["RM","Jin","SUGA","j-hope","Jimin","V","Jung Kook"].map((name, i) => ({ id: String(i+1), member_name: name, title: name, description: "Projeto individual em breve.", status: "planejamento", image_url: "💜", cover_image: "💜", position: i+1 }));
async function getSoloMembers(){
  let rows=[];
  if(window.BARMY360_SUPABASE){
    const { data } = await BARMY360_SUPABASE.from("solo_members").select("*").order("position", { ascending:true });
    rows = data || [];
  } else { rows = JSON.parse(localStorage.getItem(LS_SOLOS) || "[]"); }
  return rows.length ? rows : defaultSoloMembers;
}
function soloCardMarkup(m){
  const img = m.cover_image || m.image_url || "💜";
  const image = String(img).startsWith("http") ? `<div class="project-image image-cover ratio-16-9" style="background-image:url('${escapeAttr(img)}')"></div>` : `<div class="project-image purple-bg ratio-16-9">${escapeHtml(img)}</div>`;
  const href = `projeto-solo-detalhe.html?id=${encodeURIComponent(m.id || m.member_name || m.title || '')}`;
  return `<a class="project-card glow-card solo-member-card-link" href="${escapeAttr(href)}">${image}<span class="status ${statusClass(m.status || 'planejamento')}">${escapeHtml(statusText(m.status || 'planejamento') || 'EM BREVE')}</span><h3>${escapeHtml(m.title || m.member_name || 'Membro')}</h3><p>${escapeHtml(m.description || 'Projeto individual em breve.')}</p></a>`;
}
async function loadSoloMembersPage(){
  const grid = document.getElementById("soloMembersGrid");
  if(!grid) return;
  const rows = await getSoloMembers();
  grid.innerHTML = rows.map(soloCardMarkup).join("");
}

document.addEventListener("DOMContentLoaded", () => {
  loadCommunityPosts();
  applySiteSettings();
  loadDynamicProjects();
  loadVotingCampaigns();
  loadProjectDetail();
  loadHandbannerProjectPage();
  loadHandbannerPhraseProjectPage();
  loadHandbannerArtProjectPage();
  loadHelpPage();
  loadHelpDetailPage();
  loadStreamPage();
  loadStreamDetailPage();
  initPhraseForm();
  loadDocumentsPage();
  loadSchedulePage();
  loadSoloMembersPage();
});

/* ===== Projetos Individuais com páginas por membro - 2026-06-11 ===== */
const LS_SOLO_PROJECTS = "barmy360_solo_projects";

function soloMemberHref(m) {
  return `projeto-solo-detalhe.html?id=${encodeURIComponent(m.id || m.member_name || m.title)}`;
}

function soloImageMarkupFromValue(img, cls = "project-image") {
  const value = img || "💜";
  if (String(value).startsWith("http") || String(value).startsWith("assets/")) {
    return `<div class="${cls} image-cover ratio-16-9" style="background-image:url('${escapeAttr(value)}')"></div>`;
  }
  return `<div class="${cls} purple-bg ratio-16-9">${escapeHtml(value)}</div>`;
}

async function getSoloProjects(memberId) {
  let rows = [];
  if (window.BARMY360_SUPABASE) {
    let query = BARMY360_SUPABASE.from("solo_projects").select("*").order("position", { ascending: true }).order("created_at", { ascending: true });
    if (memberId) query = query.eq("solo_member_id", memberId);
    const { data } = await query;
    rows = data || [];
  } else {
    rows = JSON.parse(localStorage.getItem(LS_SOLO_PROJECTS) || "[]");
    if (memberId) rows = rows.filter((p) => String(p.solo_member_id) === String(memberId));
    rows.sort((a, b) => Number(a.position || 0) - Number(b.position || 0));
  }
  return rows;
}

soloCardMarkup = function(m) {
  return `<article class="project-card glow-card">
    <a href="${soloMemberHref(m)}">${soloImageMarkupFromValue(m.cover_image || m.image_url, "project-image")}</a>
    <span class="status ${statusClass(m.status || 'planejamento')}">${escapeHtml(statusText(m.status || 'planejamento') || 'EM BREVE')}</span>
    <h3>${escapeHtml(m.title || m.member_name || 'Membro')}</h3>
    <p>${escapeHtml(m.description || 'Projeto individual em breve.')}</p>
    <a class="btn small primary" href="${soloMemberHref(m)}">Ver projetos</a>
  </article>`;
};

function soloProjectCardMarkup(p) {
  return `<article class="project-card glow-card">
    ${soloImageMarkupFromValue(p.cover_image || p.image_url, "project-image")}
    <span class="status ${statusClass(p.status || 'planejamento')}">${escapeHtml(statusText(p.status || 'planejamento') || 'EM BREVE')}</span>
    <h3>${escapeHtml(p.title || 'Projeto')}</h3>
    <p>${escapeHtml(p.description || '')}</p>
    ${p.link_url ? `<a class="btn small outline" href="${escapeAttr(p.link_url)}" target="_blank" rel="noopener">Abrir projeto</a>` : ``}
  </article>`;
}

async function loadSoloDetailPage() {
  const root = document.getElementById("soloDetailRoot");
  if (!root) return;
  const id = new URLSearchParams(location.search).get("id");
  const members = await getSoloMembers();
  const member = members.find((m) => String(m.id) === String(id) || String(m.member_name) === String(id) || String(m.title) === String(id)) || members[0];
  if (!member) return;
  const projects = await getSoloProjects(member.id);
  root.innerHTML = `<section class="project-detail-hero solo-member-hero">
    <div class="project-detail-card glow-card">
      ${soloImageMarkupFromValue(member.image_url || member.cover_image, "project-detail-image")}
      <div class="project-detail-info">
        <p class="kicker">PROJETO SOLO</p>
        <span class="status ${statusClass(member.status || 'planejamento')}">${escapeHtml(statusText(member.status || 'planejamento') || 'EM BREVE')}</span>
        <h1>${escapeHtml(member.title || member.member_name || 'Membro')}</h1>
        <p>${escapeHtml(member.description || 'Página para organizar projetos individuais deste membro.')}</p>
        <div class="hero-actions"><a class="btn outline" href="projetos-solos.html">← Voltar para Projetos Individuais</a></div>
      </div>
    </div>
  </section>
  <section class="section">
    <div class="section-heading compact-heading"><p class="kicker">CARDS DE PROJETOS</p><h2>Projetos cadastrados</h2><p>As ADMs podem adicionar, editar e remover esses cards pelo painel.</p></div>
    <div class="project-grid solo-projects-grid">
      ${projects.length ? projects.map(soloProjectCardMarkup).join("") : `<article class="project-card glow-card"><div class="project-image purple-bg ratio-16-9">✨</div><span class="status planning">EM BREVE</span><h3>Nenhum projeto cadastrado ainda</h3><p>Quando as ADMs cadastrarem projetos para este membro, eles aparecerão aqui.</p></article>`}
    </div>
  </section>`;
}

document.addEventListener("DOMContentLoaded", loadSoloDetailPage);

/* ===== Ajustes públicos: Projetos Individuais / status colaboração - 2026-06-17 ===== */
function normalizeBarmyStatus(value){
  const v = String(value || '').toLowerCase().trim();
  if (v === 'aprovado' || v === 'colaboracao' || v === 'em colaboração' || v === 'em-colaboracao') return 'em_colaboracao';
  if (v === 'breve' || v === 'em breve' || v === 'em-breve') return 'em_breve';
  if (v === 'em planejamento' || v === 'em-planejamento') return 'planejamento';
  return v || 'planejamento';
}

statusClass = function(s) {
  const v = normalizeBarmyStatus(s);
  if (["finalizado", "fechado", "nao_aprovado", "não_aprovado"].includes(v)) return "closed";
  if (["analise", "em_analise", "em análise"].includes(v)) return "analysis";
  if (["planejamento", "em_breve"].includes(v)) return "planning";
  if (["fase_envio", "em_fase_de_envio", "envio"].includes(v)) return "sending";
  if (["em_colaboracao"].includes(v)) return "collab";
  return "voting";
};

statusText = function(s) {
  const map = {
    em_breve: "EM BREVE",
    fase_envio: "EM FASE DE ENVIO",
    em_fase_de_envio: "EM FASE DE ENVIO",
    envio: "EM FASE DE ENVIO",
    analise: "EM ANÁLISE",
    em_analise: "EM ANÁLISE",
    planejamento: "EM PLANEJAMENTO",
    em_planejamento: "EM PLANEJAMENTO",
    em_votacao: "EM VOTAÇÃO",
    votacao: "EM VOTAÇÃO",
    aprovado: "EM COLABORAÇÃO",
    em_colaboracao: "EM COLABORAÇÃO",
    finalizado: "FINALIZADO",
    fechado: "FINALIZADO",
    nao_aprovado: "NÃO APROVADO",
    "não_aprovado": "NÃO APROVADO"
  };
  return map[normalizeBarmyStatus(s)] || "EM PLANEJAMENTO";
};

async function getSoloPublicSettings(){
  const s = await getPublicSiteSettings();
  return {
    kicker: s.solo_page_kicker || 'PROJETOS INDIVIDUAIS',
    title: s.solo_page_title || 'Projetos por membro',
    text: s.solo_page_text || 'Espaço reservado para projetos individuais.',
    detailKicker: s.solo_detail_kicker || 'PROJETO INDIVIDUAL'
  };
}

loadSoloMembersPage = async function(){
  const grid = document.getElementById("soloMembersGrid");
  if(!grid) return;
  const settings = await getSoloPublicSettings();
  const heading = document.querySelector('main .section-heading');
  if (heading) {
    const kicker = heading.querySelector('.kicker');
    const title = heading.querySelector('h1');
    const text = heading.querySelector('p:not(.kicker)');
    if (kicker) kicker.textContent = settings.kicker;
    if (title) title.textContent = settings.title;
    if (text) text.textContent = settings.text;
  }
  const rows = await getSoloMembers();
  grid.innerHTML = rows.map(soloCardMarkup).join("");
};

soloCardMarkup = function(m) {
  return `<article class="project-card glow-card">
    <a href="${soloMemberHref(m)}">${soloImageMarkupFromValue(m.cover_image || m.image_url, "project-image")}</a>
    <span class="status ${statusClass(m.status || 'planejamento')}">${escapeHtml(statusText(m.status || 'planejamento'))}</span>
    <h3>${escapeHtml(m.title || m.member_name || 'Membro')}</h3>
    <p>${escapeHtml(m.description || 'Projeto individual em breve.')}</p>
    <a class="btn small primary" href="${soloMemberHref(m)}">Ver projetos</a>
  </article>`;
};

soloProjectCardMarkup = function(p) {
  return `<article class="project-card glow-card">
    ${soloImageMarkupFromValue(p.cover_image || p.image_url, "project-image")}
    <span class="status ${statusClass(p.status || 'planejamento')}">${escapeHtml(statusText(p.status || 'planejamento'))}</span>
    <h3>${escapeHtml(p.title || 'Projeto')}</h3>
    <p>${escapeHtml(p.description || '')}</p>
    ${p.link_url ? `<a class="btn small outline" href="${escapeAttr(p.link_url)}" target="_blank" rel="noopener">Abrir projeto</a>` : ``}
  </article>`;
};

loadSoloDetailPage = async function() {
  const root = document.getElementById("soloDetailRoot");
  if (!root) return;
  const settings = await getSoloPublicSettings();
  const id = new URLSearchParams(location.search).get("id");
  const members = await getSoloMembers();
  const member = members.find((m) => String(m.id) === String(id) || String(m.member_name) === String(id) || String(m.title) === String(id)) || members[0];
  if (!member) return;
  const projects = await getSoloProjects(member.id);
  document.title = `${member.title || member.member_name || 'Projeto Individual'} | BARMY360`;
  root.innerHTML = `<section class="project-detail-hero solo-member-hero">
    <div class="project-detail-card glow-card">
      ${soloImageMarkupFromValue(member.image_url || member.cover_image, "project-detail-image")}
      <div class="project-detail-info">
        <p class="kicker">${escapeHtml(settings.detailKicker)}</p>
        <span class="status ${statusClass(member.status || 'planejamento')}">${escapeHtml(statusText(member.status || 'planejamento'))}</span>
        <h1>${escapeHtml(member.title || member.member_name || 'Membro')}</h1>
        <p>${escapeHtml(member.description || 'Página para organizar projetos individuais deste membro.')}</p>
        <div class="hero-actions"><a class="btn outline" href="projetos-solos.html">← Voltar para Projetos Individuais</a></div>
      </div>
    </div>
  </section>
  <section class="section">
    <div class="section-heading compact-heading"><p class="kicker">CARDS DE PROJETOS</p><h2>Projetos cadastrados</h2><p>As ADMs podem adicionar, editar e remover esses cards pelo painel.</p></div>
    <div class="project-grid solo-projects-grid">
      ${projects.length ? projects.map(soloProjectCardMarkup).join("") : `<article class="project-card glow-card"><div class="project-image purple-bg ratio-16-9">✨</div><span class="status planning">EM BREVE</span><h3>Nenhum projeto cadastrado ainda</h3><p>Quando as ADMs cadastrarem projetos para este membro, eles aparecerão aqui.</p></article>`}
    </div>
  </section>`;
};
