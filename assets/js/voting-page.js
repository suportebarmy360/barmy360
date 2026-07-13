function sb() {
  return window.BARMY360_SUPABASE;
}

function escapeHtml(value) {
  return String(value || "").replace(/[&<>'"]/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "'": "&#39;",
    '"': "&quot;",
  }[char]));
}

function escapeAttr(value) {
  return escapeHtml(value).replace(/`/g, "");
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

function optionImage(opcao) {
  const img = opcao.imagem_url || opcao.imagem || "";
  if (!String(img).trim()) return "";
  if (String(img).startsWith("http")) {
    // Votações comuns (como o mosaico) mantêm exatamente o enquadramento antigo.
    // A URL continua otimizada, mas a imagem volta a ser aplicada como background cover.
    const src = window.BARMY_IMAGE ? BARMY_IMAGE.optimizedUrl(img, 800, 66) : img;
    return `<div class="project-image image-cover option-has-image" style="background-image:url('${escapeAttr(src)}')"></div>`;
  }
  return `<div class="project-image purple-bg option-has-image">${escapeHtml(img)}</div>`;
}

function optionCardClass(opcao) {
  const img = opcao.imagem_url || opcao.imagem || "";
  return String(img).trim() ? "option-card glow-card has-option-image" : "option-card glow-card no-option-image";
}

async function loadVotingOptions() {
  const grids = document.querySelectorAll("[data-voting-grid], #votingOptionsGrid");
  if (!grids.length) return;
  for (const grid of grids) await renderVotingGrid(grid);
}

async function renderVotingGrid(grid) {
  const statusText = document.getElementById(grid.dataset.statusTarget || "votingStatusText");
  const query = grid.dataset.votacaoQuery || "Hand Banner";
  const projectKey = grid.dataset.votacaoProject || "";

  if (!sb()) {
    grid.innerHTML = `<article class="project-card glow-card"><h3>Supabase não conectado</h3><p>Confira o arquivo <strong>assets/js/config.js</strong>.</p></article>`;
    if (statusText) statusText.textContent = "Não foi possível carregar porque o Supabase não está conectado.";
    return;
  }

  let votacaoRequest = sb().from("votacoes").select("*");
  if (projectKey) {
    votacaoRequest = votacaoRequest.eq("project_key", projectKey);
  } else {
    votacaoRequest = votacaoRequest.ilike("titulo", `%${query}%`);
  }
  const { data: votacoes, error: votacaoError } = await votacaoRequest
    .order("created_at", { ascending: false })
    .limit(1);

  if (votacaoError) {
    console.error(votacaoError);
    grid.innerHTML = `<article class="project-card glow-card"><h3>Erro ao carregar votação</h3><p>${escapeHtml(votacaoError.message)}</p></article>`;
    return;
  }

  if (!votacoes || !votacoes.length) {
    grid.innerHTML = `<article class="project-card glow-card"><h3>Nenhuma votação criada</h3><p>Crie uma votação no painel ADM e vincule ao projeto <strong>${escapeHtml(projectKey || query)}</strong>.</p></article>`;
    if (statusText) statusText.textContent = "Aguardando criação da votação.";
    return;
  }

  const votacao = votacoes[0];
  const aberta = votacao.status === "aberta";
  const mostrarRanking = votacao.mostrar_ranking !== false;

  if (statusText) {
    statusText.textContent = aberta
      ? "Escolha uma opção e clique em votar. O número sobe na tela assim que o Supabase confirma."
      : "Esta votação está fechada.";
  }

  const { data: opcoes, error: opcoesError } = await sb()
    .from("opcoes_votacao")
    .select("*")
    .eq("votacao_id", votacao.id)
    .order("votos_count", { ascending: false })
    .order("created_at", { ascending: true });

  if (opcoesError) {
    console.error(opcoesError);
    grid.innerHTML = `<article class="project-card glow-card"><h3>Erro ao carregar opções</h3><p>${escapeHtml(opcoesError.message)}</p></article>`;
    return;
  }

  if (!opcoes || !opcoes.length) {
    grid.innerHTML = `<article class="project-card glow-card no-option-image empty-vote-card"><h3>Aguardando opções</h3><p>Adicione as opções desta votação pelo painel ADM.</p></article>`;
    return;
  }

  grid.innerHTML = opcoes.map((opcao) => `
    <article class="project-card ${optionCardClass(opcao)}">
      ${optionImage(opcao)}
      <span class="status voting">OPÇÃO</span>
      <h3>${escapeHtml(opcao.titulo)}</h3>
      <p>${escapeHtml(opcao.descricao || "")}</p>
      <div class="vote-line">
        <span>Votos</span>
        <strong id="votes-${escapeAttr(opcao.id)}">${mostrarRanking ? Number(opcao.votos_count || 0).toLocaleString("pt-BR") : "oculto"}</strong>
      </div>
      <button class="btn small primary vote-btn" data-opcao-id="${escapeAttr(opcao.id)}" data-votacao-id="${escapeAttr(votacao.id)}" ${aberta ? "" : "disabled"}>${aberta ? "Votar" : "Fechada"}</button>
    </article>
  `).join("");

  grid.querySelectorAll(".vote-btn").forEach((btn) => {
    btn.addEventListener("click", async () => {
      await voteOption(btn.dataset.opcaoId, btn.dataset.votacaoId, btn);
    });
  });
}

async function voteOption(opcaoId, votacaoId, button) {
  if (!opcaoId || !votacaoId) return;

  if (!sb()) {
    alert("Supabase não conectado.");
    return;
  }

  if (button) {
    button.disabled = true;
    button.textContent = "Registrando...";
  }

  const { data, error } = await sb().rpc("registrar_voto_opcao", {
    opcao: String(opcaoId),
    votacao: String(votacaoId),
    voter_fingerprint: getBarmyVoterFingerprint(),
  });

  if (error) {
    console.error(error);
    alert(error.message || "Erro ao registrar voto.");
    if (button) {
      button.disabled = false;
      button.textContent = "Votar";
    }
    return;
  }

  const counter = document.getElementById(`votes-${opcaoId}`);
  if (counter && data !== null && data !== undefined) {
    counter.textContent = Number(data).toLocaleString("pt-BR");
  }

  alert("Voto registrado 💜");
  loadVotingOptions();
}

window.voteOption = voteOption;
document.addEventListener("DOMContentLoaded", loadVotingOptions);
