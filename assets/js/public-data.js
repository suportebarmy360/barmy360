
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
  description: "Envie sua frase para participar da seleção do Hand Banner.",
  details: "As frases enviadas serão avaliadas pelas ADMs. Depois, as aprovadas poderão entrar em votação.",
  status: "Finalizado",
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
  details: "Área para envio de links do Drive/Nuvem com os arquivos do design. O envio usa login Google e limite de até 3 envios por conta.",
  status: "fase_envio",
  image_url: "assets/images/b360-iso.png",
  published: true,
  is_default: true,
  project_type: "artes"
};

// O envio de frases é um projeto fixo e separado do envio de artes.
// O envio de artes só aparece na página Projetos quando for publicado pelo painel ADM.
const defaultProjects = [DEFAULT_HANDBANNER_PHRASES_PROJECT];

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

  const list = projects.length ? projects : defaultProjects;
  const hasPhraseProject = list.some((p) => projectIsHandbannerPhrases(p));
  return hasPhraseProject ? list : [DEFAULT_HANDBANNER_PHRASES_PROJECT, ...list];
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
  const joined = titleSlug.replace(/-/g, "");
  if (projectIsHandbannerArts(p)) return "handbanner-artes";
  if (projectIsHandbannerPhrases(p)) return "handbanner-frases";
  if (joined.includes("handbanner")) return "handbanner";
  return String(p?.project_key || p?.slug || p?.id || titleSlug);
}

function projectIsHandbannerPhrases(p) {
  const titleSlug = projectTitleSlug(p);
  const joined = titleSlug.replace(/-/g, "");
  const key = String(p?.project_key || p?.slug || p?.id || "").toLowerCase();
  return key.includes("frase") || titleSlug.includes("frase") || joined.includes("enviofrases") || joined.includes("handbannerfrases");
}

function projectIsHandbannerArts(p) {
  const titleSlug = projectTitleSlug(p);
  const joined = titleSlug.replace(/-/g, "");
  const key = String(p?.project_key || p?.slug || p?.id || "").toLowerCase();
  return key.includes("arte") || titleSlug.includes("arte") || titleSlug.includes("design") || joined.includes("envioartes") || joined.includes("handbannerartes");
}

function projectIsHandbanner(p) {
  return projectIsHandbannerPhrases(p) || projectIsHandbannerArts(p);
}

function projectDisplayStatus(p) {
  if (projectIsHandbannerPhrases(p)) return p?.status || "finalizado";
  if (projectIsHandbannerArts(p)) return p?.status || "fase_envio";
  return p?.status || "em_votacao";
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
  return projects.find((x) => projectIsHandbannerPhrases(x)) || DEFAULT_HANDBANNER_PHRASES_PROJECT;
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
        <p class="kicker">COLETA DE FRASES</p>
        <h2>Envie sua frase</h2>
        <p>Preencha o formulário abaixo para enviar sua sugestão de frase para análise das ADMs.</p>
      </div>
      <form id="phraseForm">
        <label for="phraseText">Frase</label>
        <textarea id="phraseText" maxlength="180" placeholder="Digite a frase para o Hand Banner" required></textarea>
        <label for="phraseExplanation">Explicação da frase</label>
        <textarea id="phraseExplanation" maxlength="800" placeholder="Explique o significado, intenção ou contexto da frase" required></textarea>
        <label for="phraseName">Nome</label>
        <input id="phraseName" maxlength="80" placeholder="Nome" required>
        <label for="phraseSocial">@ e rede social</label>
        <input id="phraseSocial" maxlength="120" placeholder="@ e rede social. Ex: @barmy360 no X/Twitter" required>
        <label for="phraseEmail">E-mail</label>
        <input id="phraseEmail" type="email" maxlength="120" placeholder="E-mail para contato" required>
        <button class="btn primary" type="submit">Enviar frase</button>
        <p id="phraseFormMsg" class="form-msg"></p>
      </form>
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
        <p>${escapeHtml(p.description || "Envie sua frase para participar da seleção do Hand Banner.")}</p>
        <div class="project-detail-meta">
          <span class="meta-pill">💜 BARMY360</span>
          <span class="meta-pill">Finalizado</span>
        </div>
        <div class="hero-actions">
          <a class="btn primary" href="envio-frases.html">Enviar frase</a>
          <a class="btn outline back-link" href="projetos.html">← Voltar para projetos</a>
        </div>
      </div>
    </div>
  </section>

  <section class="project-detail-grid section">
    <article class="detail-box glow-card"><h2>📌 Sobre o projeto</h2><p>${escapeHtml(p.description || "Projeto de envio de frases para o Hand Banner.")}</p></article>
    <article class="detail-box glow-card"><h2>✨ Dinâmica</h2><p>${escapeHtml(p.details || "As frases enviadas serão avaliadas pelas ADMs. Depois, as aprovadas poderão entrar em votação.")}</p></article>
    <article class="detail-box glow-card"><h2>⚠️ Avisos importantes</h2><ul><li>Envie apenas uma frase por participação.</li><li>Não envie frases desrespeitosas, com shipp ou conteúdo sensível.</li><li>O formulário de envio fica em uma página separada.</li></ul></article>
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
          <span class="meta-pill">Login Google</span>
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
    <article class="detail-box glow-card"><h2>⚠️ Regras</h2><ul><li>Até 3 envios por conta Google.</li><li>O link deve conter os itens pedidos no edital/manual.</li><li>Menores de idade precisam de autorização do responsável.</li></ul></article>
  </section>`;
}

async function loadHandbannerPhraseProjectPage() {
  const root = document.getElementById("handbannerPhraseProjectRoot") || document.getElementById("handbannerProjectRoot");
  if (!root) return;
  const p = await findHandbannerPhraseProject();
  root.innerHTML = handbannerPhraseProjectMarkup(p || DEFAULT_HANDBANNER_PHRASES_PROJECT);
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
  </section>`;
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

  document.querySelectorAll('a[href^="mailto:Projeto.barmy@gmail.com"]').forEach((a) => {
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
    "não_aprovado": "NÃO APROVADO"
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
const defaultSoloMembers = ["RM","Jin","SUGA","j-hope","Jimin","V","Jung Kook"].map((name, i) => ({ id: String(i+1), member_name: name, title: name, description: "Projeto solo em breve.", status: "planejamento", image_url: "💜", position: i+1 }));
async function getSoloMembers(){
  let rows=[];
  if(window.BARMY360_SUPABASE){
    const { data } = await BARMY360_SUPABASE.from("solo_members").select("*").order("position", { ascending:true });
    rows = data || [];
  } else { rows = JSON.parse(localStorage.getItem(LS_SOLOS) || "[]"); }
  return rows.length ? rows : defaultSoloMembers;
}
function soloCardMarkup(m){
  const img = m.image_url || "💜";
  const image = String(img).startsWith("http") ? `<div class="project-image image-cover ratio-16-9" style="background-image:url('${escapeAttr(img)}')"></div>` : `<div class="project-image purple-bg ratio-16-9">${escapeHtml(img)}</div>`;
  return `<article class="project-card glow-card">${image}<span class="status ${statusClass(m.status || 'planejamento')}">${escapeHtml(statusText(m.status || 'planejamento') || 'EM BREVE')}</span><h3>${escapeHtml(m.title || m.member_name || 'Membro')}</h3><p>${escapeHtml(m.description || 'Projeto solo em breve.')}</p></article>`;
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
