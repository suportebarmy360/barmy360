const sb = () => window.BARMY360_SUPABASE;
const LS_POSTS = "barmy360_posts";
const LS_PROJECTS = "barmy360_projects";
const LS_SITE = "barmy360_site_settings";
const LS_HELP = "barmy360_help_items";
const LS_STREAM = "barmy360_stream_items";
const LS_VOTACOES = "barmy360_votacoes";
const LS_OPCOES = "barmy360_opcoes_votacao";
const LS_PHRASES = "barmy360_phrase_submissions";


function val(id) {
  return document.getElementById(id)?.value?.trim() || "";
}

function setMsg(id, msg) {
  const el = document.getElementById(id);
  if (el) el.textContent = msg;
}


async function uploadImageToField(fileInputId, targetInputId, msgId) {
  const input = document.getElementById(fileInputId);
  const target = document.getElementById(targetInputId);
  const file = input?.files?.[0];

  if (!file) return;
  if (!target) return;
  if (!sb()) {
    setMsg(msgId, "Supabase não conectado. Confira assets/js/config.js.");
    return;
  }

  try {
    setMsg(msgId, "Enviando imagem...");
    const ext = (file.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "");
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "-").slice(0, 80);
    const path = `${targetInputId}/${Date.now()}-${Math.random().toString(16).slice(2)}-${safeName || "imagem." + ext}`;

    const { error: uploadError } = await sb().storage
      .from("barmy360-images")
      .upload(path, file, { cacheControl: "3600", upsert: false });

    if (uploadError) {
      setMsg(msgId, "Erro no upload: " + uploadError.message + " — rode o SQL de storage do ZIP.");
      return;
    }

    const { data } = sb().storage.from("barmy360-images").getPublicUrl(path);
    target.value = data.publicUrl;
    setMsg(msgId, "Imagem enviada e URL preenchida.");
  } catch (err) {
    console.error(err);
    setMsg(msgId, "Erro no upload: " + (err.message || err));
  }
}

window.uploadImageToField = uploadImageToField;

async function uploadImagesToTextarea(fileInputId, targetTextareaId, msgId) {
  const input = document.getElementById(fileInputId);
  const target = document.getElementById(targetTextareaId);
  const files = Array.from(input?.files || []);

  if (!files.length || !target) return;
  if (!sb()) {
    setMsg(msgId, "Supabase não conectado. Confira assets/js/config.js.");
    return;
  }

  const urls = [];
  try {
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      setMsg(msgId, `Enviando foto adicional ${i + 1}/${files.length}...`);
      const ext = (file.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "");
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "-").slice(0, 80);
      const path = `${targetTextareaId}/${Date.now()}-${i}-${Math.random().toString(16).slice(2)}-${safeName || "imagem." + ext}`;
      const { error: uploadError } = await sb().storage
        .from("barmy360-images")
        .upload(path, file, { cacheControl: "3600", upsert: false });
      if (uploadError) {
        setMsg(msgId, "Erro no upload: " + uploadError.message + " — rode o SQL de storage do ZIP.");
        return;
      }
      const { data } = sb().storage.from("barmy360-images").getPublicUrl(path);
      urls.push(data.publicUrl);
    }
    const existing = target.value.trim();
    target.value = [existing, ...urls].filter(Boolean).join("\n");
    input.value = "";
    setMsg(msgId, `${urls.length} foto(s) adicional(is) enviada(s).`);
  } catch (err) {
    console.error(err);
    setMsg(msgId, "Erro no upload: " + (err.message || err));
  }
}

window.uploadImagesToTextarea = uploadImagesToTextarea;

function escapeHtml(v) {
  return String(v || "").replace(/[&<>'"]/g, (c) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "'": "&#39;",
    '"': "&quot;",
  }[c]));
}

async function adminLogin() {
  const email = val("adminEmail");
  const password = document.getElementById("adminPassword")?.value || "";
  const msg = document.getElementById("loginMsg");

  if (!email || !password) {
    msg.textContent = "Preencha e-mail e senha.";
    return;
  }

  if (!sb()) {
    msg.textContent = "Supabase não conectado. Confira assets/js/config.js.";
    return;
  }

  const { error } = await sb().auth.signInWithPassword({ email, password });

  if (error) {
    console.error("Erro Supabase Auth:", error);
    msg.textContent = "Erro no login: " + error.message;
    return;
  }

  document.getElementById("loginArea").classList.add("hidden");
  document.getElementById("dashboardArea").classList.remove("hidden");
  loadAdminData();
}

async function adminLogout() {
  if (sb()) await sb().auth.signOut();
  location.reload();
}

function showAdminTab(name, btn) {
  document
    .querySelectorAll(".admin-tab-panel")
    .forEach((p) => p.classList.add("hidden"));

  document.getElementById("tab-" + name)?.classList.remove("hidden");

  document.querySelectorAll(".tab").forEach((t) => t.classList.remove("active"));
  btn?.classList.add("active");
}

async function savePost() {
  const post = {
    title: val("postTitle"),
    content: val("postContent"),
    author: val("postAuthor") || "ADM",
    image_url: val("postImage"),
    link_url: val("postLinkUrl"),
    link_label: val("postLinkLabel"),
  };

  if (!post.title || !post.content) {
    return setMsg("postMsg", "Preencha título e texto.");
  }

  if (sb()) {
    const { error } = await sb().from("community_posts").insert(post);
    if (error) return setMsg("postMsg", "Erro: " + error.message);
  } else {
    const arr = JSON.parse(localStorage.getItem(LS_POSTS) || "[]");
    arr.push({ ...post, created_at: new Date().toISOString() });
    localStorage.setItem(LS_POSTS, JSON.stringify(arr));
  }

  setMsg("postMsg", "Aviso publicado.");
  ["postTitle", "postContent", "postAuthor", "postImage", "postLinkUrl", "postLinkLabel"].forEach((id) => {
    document.getElementById(id).value = "";
  });
  loadAdminData();
}

async function saveProject() {
  const project = {
    title: val("projectTitle"),
    description: val("projectDescription"),
    details: val("projectDetails"),
    image_url: val("projectImage"),
    status: val("projectStatus"),
    voting_open: !!document.getElementById("projectVotingOpen")?.checked,
  };

  if (!project.title) {
    return setMsg("projectMsg", "Preencha o título do projeto.");
  }

  const id = val("projectId");

  if (sb()) {
    const query = id
      ? sb().from("projects").update(project).eq("id", id)
      : sb().from("projects").insert(project);

    const { error } = await query;
    if (error) return setMsg("projectMsg", "Erro: " + error.message);
  } else {
    let arr = JSON.parse(localStorage.getItem(LS_PROJECTS) || "[]");
    if (id) arr = arr.map((p) => (String(p.id) === String(id) ? { ...p, ...project } : p));
    else arr.push({ ...project, id: Date.now(), votes_count: 0 });
    localStorage.setItem(LS_PROJECTS, JSON.stringify(arr));
  }

  setMsg("projectMsg", "Projeto salvo.");
  clearProjectForm();
  loadAdminData();
}

async function toggleVoting(id, open) {
  if (sb()) {
    await sb()
      .from("projects")
      .update({ voting_open: open, status: open ? "em_votacao" : "fechado" })
      .eq("id", id);
  } else {
    let arr = JSON.parse(localStorage.getItem(LS_PROJECTS) || "[]");
    arr = arr.map((p) =>
      String(p.id) === String(id)
        ? { ...p, voting_open: open, status: open ? "em_votacao" : "fechado" }
        : p
    );
    localStorage.setItem(LS_PROJECTS, JSON.stringify(arr));
  }

  loadAdminData();
}

async function deleteProject(id) {
  if (!confirm("Excluir este projeto?")) return;

  if (sb()) {
    await sb().from("projects").delete().eq("id", id);
  } else {
    const arr = JSON.parse(localStorage.getItem(LS_PROJECTS) || "[]").filter(
      (p) => String(p.id) !== String(id)
    );
    localStorage.setItem(LS_PROJECTS, JSON.stringify(arr));
  }

  loadAdminData();
}

function editProject(p) {
  document.getElementById("projectId").value = p.id;
  document.getElementById("projectTitle").value = p.title || "";
  document.getElementById("projectDescription").value = p.description || "";
  document.getElementById("projectDetails").value = p.details || "";
  document.getElementById("projectImage").value = p.image_url || "";
  document.getElementById("projectStatus").value = p.status || "em_votacao";
  document.getElementById("projectVotingOpen").checked = !!p.voting_open;
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function clearProjectForm() {
  ["projectId", "projectTitle", "projectDescription", "projectDetails", "projectImage"].forEach(
    (id) => {
      const el = document.getElementById(id);
      if (el) el.value = "";
    }
  );
  const open = document.getElementById("projectVotingOpen");
  if (open) open.checked = true;
}


function slugifyAdmin(value) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function projectVotingKeyAdmin(p) {
  const titleSlug = slugifyAdmin(p?.title || p?.titulo || p?.id);
  const explicitKey = String(p?.project_key || "").trim();
  const type = String(p?.project_type || "").toLowerCase().trim();
  if (type === "frases" || explicitKey === "handbanner-frases" || String(p?.id || "") === "handbanner-frases") return "handbanner-frases";
  if (type === "artes" || explicitKey === "handbanner-artes" || String(p?.id || "") === "handbanner-artes") return "handbanner-artes";
  if (explicitKey) return explicitKey;
  if (titleSlug.includes("ocean")) return "ocean-roxo";
  if (titleSlug.includes("mensagem")) return "mensagem-final";
  return String(p?.id || titleSlug || "projeto");
}

function simpleVoteSelectedKey() {
  return val("simpleVoteProject") || "handbanner-frases";
}

function renderSimpleProjectSelect(projects, votacoes, opcoes) {
  const select = document.getElementById("simpleVoteProject");
  if (!select) return;

  const base = [
    { key: "handbanner-frases", label: "Hand Banner - Envio de frases" },
    { key: "handbanner-artes", label: "Hand Banner - Envio de artes" },
  ];

  const dynamic = (projects || []).map((p) => ({
    key: projectVotingKeyAdmin(p),
    label: p.title || p.titulo || "Projeto",
  }));

  const seen = new Set();
  const items = [...base, ...dynamic].filter((item) => {
    if (!item.key || seen.has(item.key)) return false;
    seen.add(item.key);
    return true;
  });

  const current = select.value;
  select.innerHTML = items
    .map((item) => `<option value="${escapeHtml(item.key)}">${escapeHtml(item.label)} — ${escapeHtml(item.key)}</option>`)
    .join("");
  if (current && items.some((i) => i.key === current)) select.value = current;

  renderSimpleProjectOptions(votacoes || [], opcoes || []);
}

function currentSimpleVotacao(votacoes) {
  const key = simpleVoteSelectedKey();
  return (votacoes || []).find((v) => String(v.project_key || "") === String(key));
}

function renderSimpleProjectOptions(votacoes, opcoes) {
  const list = document.getElementById("simpleProjectOptionsList");
  if (!list) return;
  const v = currentSimpleVotacao(votacoes);
  const msg = document.getElementById("simpleVoteMsg");
  if (!v) {
    list.innerHTML = `<p>Salve a votação deste projeto antes de adicionar opções.</p>`;
    return;
  }
  const rows = (opcoes || []).filter((o) => String(o.votacao_id) === String(v.id));
  list.innerHTML = rows.length
    ? rows.map((o) => `<article class="mini-admin-item">
        <strong>${escapeHtml(o.titulo || "Opção")}</strong>
        <p>${escapeHtml(o.descricao || "")}</p>
        <small>${Number(o.votos_count || o.votos || 0).toLocaleString("pt-BR")} votos</small>
        ${(o.imagem_url || o.imagem) && String(o.imagem_url || o.imagem).startsWith("http") ? `<img class="admin-thumb" src="${escapeHtml(o.imagem_url || o.imagem)}" alt="">` : ""}
        <div class="admin-actions"><button class="btn small outline" onclick="deleteOpcao('${escapeHtml(o.id)}')">Excluir</button></div>
      </article>`).join("")
    : `<p>Nenhuma opção cadastrada neste projeto ainda.</p>`;
}

function manageProjectVoting(p) {
  const key = projectVotingKeyAdmin(p);
  showAdminTab("projects", document.querySelector("[onclick*=\"projects\"]"));
  const select = document.getElementById("simpleVoteProject");
  if (select) select.value = key;
  const title = document.getElementById("simpleVoteTitle");
  if (title && !title.value) title.value = `Votação - ${p.title || "Projeto"}`;
  const desc = document.getElementById("simpleVoteDescription");
  if (desc && !desc.value) desc.value = p.description || "Escolha sua opção favorita.";
  loadSimpleProjectVoting();
  document.querySelector(".voting-manager-card")?.scrollIntoView({ behavior: "smooth", block: "start" });
}

async function loadSimpleProjectVoting() {
  const key = simpleVoteSelectedKey();
  const [votacoes, opcoes] = await Promise.all([getVotacoesAdmin(), getOpcoesAdmin()]);
  const v = votacoes.find((item) => String(item.project_key || "") === String(key));
  if (!v) {
    setMsg("simpleVoteMsg", "Ainda não existe votação para este projeto. Preencha e clique em Salvar votação deste projeto.");
    renderSimpleProjectOptions([], []);
    return;
  }
  const title = document.getElementById("simpleVoteTitle");
  const desc = document.getElementById("simpleVoteDescription");
  const status = document.getElementById("simpleVoteStatus");
  const phase = document.getElementById("simpleVotePhase");
  const ranking = document.getElementById("simpleVoteRanking");
  if (title) title.value = v.titulo || "";
  if (desc) desc.value = v.descricao || "";
  if (status) status.value = v.status || "aberta";
  if (phase) phase.value = v.fase || "fase1";
  if (ranking) ranking.checked = v.mostrar_ranking !== false;
  setMsg("simpleVoteMsg", "Votação carregada para edição.");
  renderSimpleProjectOptions(votacoes, opcoes);
}

async function saveSimpleProjectVoting() {
  const key = simpleVoteSelectedKey();
  const item = {
    titulo: val("simpleVoteTitle") || `Votação - ${key}`,
    descricao: val("simpleVoteDescription") || "Escolha sua opção favorita.",
    fase: val("simpleVotePhase") || "fase1",
    status: val("simpleVoteStatus") || "aberta",
    mostrar_ranking: !!document.getElementById("simpleVoteRanking")?.checked,
    project_key: key,
  };

  if (sb()) {
    const { data: existing, error: findError } = await sb().from("votacoes").select("id").eq("project_key", key).limit(1);
    if (findError) return setMsg("simpleVoteMsg", "Erro: " + findError.message);
    const query = existing && existing.length
      ? sb().from("votacoes").update(item).eq("id", existing[0].id).select().single()
      : sb().from("votacoes").insert(item).select().single();
    const { error } = await query;
    if (error) return setMsg("simpleVoteMsg", "Erro: " + error.message + " — confira se rodou o SQL novo do ZIP.");
  } else {
    let arr = JSON.parse(localStorage.getItem(LS_VOTACOES) || "[]");
    const idx = arr.findIndex((v) => String(v.project_key || "") === String(key));
    if (idx >= 0) arr[idx] = { ...arr[idx], ...item };
    else arr.push({ ...item, id: Date.now(), created_at: new Date().toISOString() });
    localStorage.setItem(LS_VOTACOES, JSON.stringify(arr));
  }
  setMsg("simpleVoteMsg", "Votação salva para este projeto.");
  loadAdminData();
}

async function saveSimpleOption() {
  const key = simpleVoteSelectedKey();
  let votacoes = await getVotacoesAdmin();
  let votacao = votacoes.find((v) => String(v.project_key || "") === String(key));
  if (!votacao) {
    await saveSimpleProjectVoting();
    votacoes = await getVotacoesAdmin();
    votacao = votacoes.find((v) => String(v.project_key || "") === String(key));
  }
  if (!votacao) return setMsg("simpleOptionMsg", "Crie/salve a votação deste projeto primeiro.");

  const item = {
    votacao_id: votacao.id,
    titulo: val("simpleOptionTitle"),
    imagem_url: val("simpleOptionImage"),
    imagem: val("simpleOptionImage"),
    descricao: val("simpleOptionDescription"),
    votos_count: 0,
    votos: 0,
  };
  if (!item.titulo) return setMsg("simpleOptionMsg", "Preencha o nome/frase da opção.");

  if (sb()) {
    const { error } = await sb().from("opcoes_votacao").insert(item);
    if (error) return setMsg("simpleOptionMsg", "Erro: " + error.message);
  } else {
    const arr = JSON.parse(localStorage.getItem(LS_OPCOES) || "[]");
    arr.push({ ...item, id: Date.now() + Math.random() });
    localStorage.setItem(LS_OPCOES, JSON.stringify(arr));
  }
  ["simpleOptionTitle", "simpleOptionImage", "simpleOptionDescription"].forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.value = "";
  });
  setMsg("simpleOptionMsg", "Opção adicionada ao projeto.");
  loadAdminData();
}

async function saveVotacao() {
  const item = {
    titulo: val("votacaoTitulo"),
    descricao: val("votacaoDescricao"),
    fase: val("votacaoFase") || "fase1",
    status: val("votacaoStatus") || "aberta",
    mostrar_ranking: !!document.getElementById("votacaoMostrarRanking")?.checked,
    project_key: (val("votacaoProjectKeyCustom") || val("votacaoProjectKey") || "handbanner").toLowerCase(),
  };

  if (!item.titulo) {
    return setMsg("votacaoMsg", "Preencha o título da votação.");
  }

  const id = val("votacaoId");

  if (sb()) {
    const query = id
      ? sb().from("votacoes").update(item).eq("id", id)
      : sb().from("votacoes").insert(item);

    const { error } = await query;
    if (error) return setMsg("votacaoMsg", "Erro: " + error.message);
  } else {
    let arr = JSON.parse(localStorage.getItem(LS_VOTACOES) || "[]");
    if (id) arr = arr.map((v) => (String(v.id) === String(id) ? { ...v, ...item } : v));
    else arr.push({ ...item, id: Date.now(), created_at: new Date().toISOString() });
    localStorage.setItem(LS_VOTACOES, JSON.stringify(arr));
  }

  setMsg("votacaoMsg", "Votação salva.");
  clearVotacaoForm();
  loadAdminData();
}

function clearVotacaoForm() {
  ["votacaoId", "votacaoTitulo", "votacaoDescricao", "votacaoProjectKeyCustom"].forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.value = "";
  });
}

function editVotacao(v) {
  document.getElementById("votacaoId").value = v.id;
  document.getElementById("votacaoTitulo").value = v.titulo || "";
  document.getElementById("votacaoDescricao").value = v.descricao || "";
  document.getElementById("votacaoFase").value = v.fase || "fase1";
  document.getElementById("votacaoStatus").value = v.status || "aberta";
  document.getElementById("votacaoMostrarRanking").checked = v.mostrar_ranking !== false;
  const knownKeys = ["handbanner"];
  const pk = v.project_key || "handbanner";
  document.getElementById("votacaoProjectKey").value = knownKeys.includes(pk) ? pk : "outro";
  document.getElementById("votacaoProjectKeyCustom").value = knownKeys.includes(pk) ? "" : pk;
  showAdminTab("votacoes", document.querySelector("[onclick*=\"votacoes\"]"));
  window.scrollTo({ top: 0, behavior: "smooth" });
}

async function deleteVotacao(id) {
  if (!confirm("Excluir esta votação e todas as opções dela?")) return;

  if (sb()) {
    await sb().from("votacoes").delete().eq("id", id);
  } else {
    localStorage.setItem(
      LS_VOTACOES,
      JSON.stringify(
        JSON.parse(localStorage.getItem(LS_VOTACOES) || "[]").filter(
          (v) => String(v.id) !== String(id)
        )
      )
    );
    localStorage.setItem(
      LS_OPCOES,
      JSON.stringify(
        JSON.parse(localStorage.getItem(LS_OPCOES) || "[]").filter(
          (o) => String(o.votacao_id) !== String(id)
        )
      )
    );
  }

  loadAdminData();
}

async function saveOpcaoVotacao() {
  const item = {
    votacao_id: val("opcaoVotacaoId"),
    titulo: val("opcaoTitulo"),
    imagem_url: val("opcaoImagem"),
    descricao: val("opcaoDescricao"),
  };

  if (!item.votacao_id) return setMsg("opcaoMsg", "Crie/seleciona uma votação primeiro.");
  if (!item.titulo) return setMsg("opcaoMsg", "Preencha o título/frase da opção.");

  if (sb()) {
    const { error } = await sb().from("opcoes_votacao").insert(item);
    if (error) return setMsg("opcaoMsg", "Erro: " + error.message);
  } else {
    const arr = JSON.parse(localStorage.getItem(LS_OPCOES) || "[]");
    arr.push({ ...item, id: Date.now() + Math.random(), votos_count: 0 });
    localStorage.setItem(LS_OPCOES, JSON.stringify(arr));
  }

  setMsg("opcaoMsg", "Opção adicionada.");
  ["opcaoTitulo", "opcaoImagem", "opcaoDescricao"].forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.value = "";
  });
  loadAdminData();
}

async function saveOpcoesLote() {
  const votacao_id = val("opcaoVotacaoId");
  const raw = val("opcoesLote");

  if (!votacao_id) return setMsg("opcaoMsg", "Selecione uma votação primeiro.");
  if (!raw) return setMsg("opcaoMsg", "Cole as opções no campo em lote.");

  const rows = raw
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [titulo, imagem_url, descricao] = line.split("|").map((p) => p?.trim() || "");
      return { votacao_id, titulo, imagem_url, imagem: imagem_url, descricao, votos_count: 0, votos: 0 };
    })
    .filter((r) => r.titulo);

  if (!rows.length) return setMsg("opcaoMsg", "Nenhuma opção válida encontrada.");

  if (sb()) {
    const { error } = await sb().from("opcoes_votacao").insert(rows);
    if (error) return setMsg("opcaoMsg", "Erro: " + error.message);
  } else {
    const arr = JSON.parse(localStorage.getItem(LS_OPCOES) || "[]");
    rows.forEach((r, i) => arr.push({ ...r, id: Date.now() + i, votos_count: 0 }));
    localStorage.setItem(LS_OPCOES, JSON.stringify(arr));
  }

  document.getElementById("opcoesLote").value = "";
  setMsg("opcaoMsg", rows.length + " opções adicionadas.");
  loadAdminData();
}


async function uploadHandbannerFiles() {
  const votacao_id = val("opcaoVotacaoId");
  const fileInput = document.getElementById("handbannerFiles");
  const titleBox = document.getElementById("handbannerTitles");
  const files = Array.from(fileInput?.files || []);
  const titles = (titleBox?.value || "")
    .split("\n")
    .map((t) => t.trim())
    .filter(Boolean);

  if (!sb()) return setMsg("uploadMsg", "Supabase não conectado.");
  if (!votacao_id) return setMsg("uploadMsg", "Selecione uma votação primeiro.");
  if (!files.length) return setMsg("uploadMsg", "Selecione as imagens.");

  setMsg("uploadMsg", `Enviando ${files.length} imagem(ns)...`);

  const rows = [];

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const safeName = file.name
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9._-]/g, "-")
      .toLowerCase();

    const ext = safeName.includes(".") ? safeName.split(".").pop() : "jpg";
    const path = `${votacao_id}/${Date.now()}-${i + 1}-${safeName || "handbanner." + ext}`;

    const { error: uploadError } = await sb()
      .storage
      .from("handbanners")
      .upload(path, file, {
        cacheControl: "3600",
        upsert: false
      });

    if (uploadError) {
      console.error(uploadError);
      setMsg("uploadMsg", `Erro ao enviar ${file.name}: ${uploadError.message}`);
      return;
    }

    const { data: publicData } = sb()
      .storage
      .from("handbanners")
      .getPublicUrl(path);

    rows.push({
      votacao_id,
      titulo: titles[i] || file.name.replace(/\.[^/.]+$/, ""),
      imagem_url: publicData.publicUrl,
      imagem: publicData.publicUrl,
      descricao: "",
      votos_count: 0,
      votos: 0
    });

    setMsg("uploadMsg", `Enviadas ${i + 1}/${files.length} imagem(ns)...`);
  }

  const { error } = await sb().from("opcoes_votacao").insert(rows);

  if (error) {
    console.error(error);
    return setMsg("uploadMsg", "Imagens enviadas, mas erro ao cadastrar opções: " + error.message);
  }

  fileInput.value = "";
  if (titleBox) titleBox.value = "";

  setMsg("uploadMsg", `${rows.length} handbanner(s) enviados e cadastrados.`);
  loadAdminData();
}


async function deleteOpcao(id) {
  if (!confirm("Excluir esta opção?")) return;

  if (sb()) {
    await sb().from("opcoes_votacao").delete().eq("id", id);
  } else {
    const arr = JSON.parse(localStorage.getItem(LS_OPCOES) || "[]").filter(
      (o) => String(o.id) !== String(id)
    );
    localStorage.setItem(LS_OPCOES, JSON.stringify(arr));
  }

  loadAdminData();
}


async function saveHelpItem() {
  const item = {
    section_key: val("helpSection") || "outros",
    title: val("helpTitle"),
    content: val("helpContent"),
    image_url: val("helpImage"),
    extra_images: val("helpExtraImages"),
    link_url: val("helpLinkUrl"),
    link_label: val("helpLinkLabel"),
    position: Number(val("helpPosition") || 0),
  };

  if (!item.title) return setMsg("helpMsg", "Preencha pelo menos o título do bloco.");
  const id = val("helpId");

  if (sb()) {
    const query = id
      ? sb().from("help_items").update(item).eq("id", id)
      : sb().from("help_items").insert(item);
    const { error } = await query;
    if (error) return setMsg("helpMsg", "Erro: " + error.message);
  } else {
    let arr = JSON.parse(localStorage.getItem(LS_HELP) || "[]");
    if (id) arr = arr.map((h) => String(h.id) === String(id) ? { ...h, ...item } : h);
    else arr.push({ ...item, id: Date.now(), created_at: new Date().toISOString() });
    localStorage.setItem(LS_HELP, JSON.stringify(arr));
  }

  setMsg("helpMsg", "Bloco do BARMY Ajuda salvo.");
  clearHelpForm();
  loadAdminData();
}

function editHelpItem(h) {
  document.getElementById("helpId").value = h.id || "";
  document.getElementById("helpTitle").value = h.title || "";
  document.getElementById("helpContent").value = h.content || "";
  document.getElementById("helpImage").value = h.image_url || h.image || "";
  document.getElementById("helpExtraImages").value = h.extra_images || h.extra_image_urls || h.gallery_images || "";
  document.getElementById("helpLinkUrl").value = h.link_url || "";
  document.getElementById("helpLinkLabel").value = h.link_label || "";
  document.getElementById("helpSection").value = h.section_key || "outros";
  document.getElementById("helpPosition").value = h.position || 0;
  showAdminTab("ajuda", document.querySelector("[onclick*=\"ajuda\"]"));
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function clearHelpForm() {
  ["helpId", "helpTitle", "helpContent", "helpImage", "helpExtraImages", "helpLinkUrl", "helpLinkLabel", "helpPosition"].forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.value = "";
  });
  const section = document.getElementById("helpSection");
  if (section) section.value = "mapa";
}

async function deleteHelpItem(id) {
  if (!confirm("Excluir este bloco do BARMY Ajuda?")) return;

  if (sb()) {
    const { error } = await sb().from("help_items").delete().eq("id", id);
    if (error) return alert("Erro: " + error.message);
  } else {
    const arr = JSON.parse(localStorage.getItem(LS_HELP) || "[]").filter((h) => String(h.id) !== String(id));
    localStorage.setItem(LS_HELP, JSON.stringify(arr));
  }
  loadAdminData();
}

async function getHelpAdmin() {
  if (sb()) {
    const { data } = await sb().from("help_items").select("*").order("position", { ascending: true }).order("created_at", { ascending: true });
    return data || [];
  }
  return JSON.parse(localStorage.getItem(LS_HELP) || "[]").sort((a, b) => Number(a.position || 0) - Number(b.position || 0));
}


async function saveStreamItem() {
  const item = {
    section_key: val("streamSection") || "outros",
    title: val("streamTitle"),
    description: val("streamDescription"),
    content: val("streamContent"),
    image_url: val("streamImage"),
    link_url: val("streamLinkUrl"),
    link_label: val("streamLinkLabel"),
    position: Number(val("streamPosition") || 0),
  };

  if (!item.title) return setMsg("streamMsg", "Preencha pelo menos o título do bloco.");
  const id = val("streamId");

  if (sb()) {
    const query = id
      ? sb().from("stream_items").update(item).eq("id", id)
      : sb().from("stream_items").insert(item);
    const { error } = await query;
    if (error) return setMsg("streamMsg", "Erro: " + error.message);
  } else {
    let arr = JSON.parse(localStorage.getItem(LS_STREAM) || "[]");
    if (id) arr = arr.map((h) => String(h.id) === String(id) ? { ...h, ...item } : h);
    else arr.push({ ...item, id: Date.now(), created_at: new Date().toISOString() });
    localStorage.setItem(LS_STREAM, JSON.stringify(arr));
  }

  setMsg("streamMsg", "Bloco do Stream salvo.");
  clearStreamForm();
  loadAdminData();
}

function editStreamItem(h) {
  document.getElementById("streamId").value = h.id || "";
  document.getElementById("streamTitle").value = h.title || "";
  document.getElementById("streamDescription").value = h.description || "";
  document.getElementById("streamContent").value = h.content || "";
  document.getElementById("streamImage").value = h.image_url || h.image || "";
  document.getElementById("streamLinkUrl").value = h.link_url || "";
  document.getElementById("streamLinkLabel").value = h.link_label || "";
  document.getElementById("streamSection").value = h.section_key || "outros";
  document.getElementById("streamPosition").value = h.position || 0;
  showAdminTab("stream", document.querySelector("[onclick*=\"stream\"]"));
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function clearStreamForm() {
  ["streamId", "streamTitle", "streamDescription", "streamContent", "streamImage", "streamLinkUrl", "streamLinkLabel", "streamPosition"].forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.value = "";
  });
  const section = document.getElementById("streamSection");
  if (section) section.value = "playlists";
}

async function deleteStreamItem(id) {
  if (!confirm("Excluir este bloco do Stream?")) return;

  if (sb()) {
    const { error } = await sb().from("stream_items").delete().eq("id", id);
    if (error) return alert("Erro: " + error.message);
  } else {
    const arr = JSON.parse(localStorage.getItem(LS_STREAM) || "[]").filter((h) => String(h.id) !== String(id));
    localStorage.setItem(LS_STREAM, JSON.stringify(arr));
  }
  loadAdminData();
}

async function getStreamAdmin() {
  if (sb()) {
    const { data } = await sb().from("stream_items").select("*").order("position", { ascending: true }).order("created_at", { ascending: true });
    return data || [];
  }
  return JSON.parse(localStorage.getItem(LS_STREAM) || "[]").sort((a, b) => Number(a.position || 0) - Number(b.position || 0));
}

async function saveSiteSettings() {
  const s = {
    id: 1,
    launch_mode: val("siteLaunchMode") || "open",
    launch_at: val("siteLaunchAt") || "2026-06-05T20:00:00-03:00",
    hero_title: val("siteHeroTitle"),
    hero_text: val("siteHeroText"),
    hero_image: val("siteHeroImage"),
    contact_email: val("siteContactEmail"),
    handbanner_art_enabled: !!document.getElementById("hbArtEnabled")?.checked,
    handbanner_art_title: val("hbArtTitle") || "Enviar arte do Hand Banner",
    handbanner_art_text: val("hbArtText") || "Envie sua arte seguindo o edital e o manual de submissão.",
  };
  localStorage.setItem(LS_SITE, JSON.stringify(s));
  if (sb()) {
    const { error } = await sb().from("site_settings").upsert(s);
    if (error) return setMsg("siteMsg", "Erro: " + error.message);
  }
  setMsg("siteMsg", "Alterações salvas.");
}

async function getPostsAdmin() {
  if (sb()) {
    const { data } = await sb()
      .from("community_posts")
      .select("*")
      .order("created_at", { ascending: false });
    return data || [];
  }

  return JSON.parse(localStorage.getItem(LS_POSTS) || "[]").reverse();
}

async function getProjectsAdmin() {
  if (sb()) {
    const { data } = await sb()
      .from("projects")
      .select("*")
      .order("created_at", { ascending: false });
    return data || [];
  }

  return JSON.parse(localStorage.getItem(LS_PROJECTS) || "[]");
}

async function getVotacoesAdmin() {
  if (sb()) {
    const { data } = await sb()
      .from("votacoes")
      .select("*")
      .order("created_at", { ascending: false });
    return data || [];
  }

  return JSON.parse(localStorage.getItem(LS_VOTACOES) || "[]");
}

async function getOpcoesAdmin() {
  if (sb()) {
    const { data } = await sb()
      .from("opcoes_votacao")
      .select("*")
      .order("votos_count", { ascending: false });
    return data || [];
  }

  return JSON.parse(localStorage.getItem(LS_OPCOES) || "[]");
}

function renderVotacaoSelect(votacoes) {
  const select = document.getElementById("opcaoVotacaoId");
  if (!select) return;

  select.innerHTML = votacoes.length
    ? votacoes
        .map((v) => `<option value="${v.id}">${escapeHtml(v.titulo)} — ${escapeHtml(v.fase || "")}</option>`)
        .join("")
    : `<option value="">Crie uma votação primeiro</option>`;
}


let cachedPhrases = [];
async function loadPhraseSubmissions() {
  const list = document.getElementById("adminPhraseList");
  if (!list) return;
  let rows = [];
  if (sb()) {
    const { data, error } = await sb().from("phrase_submissions").select("*").order("created_at", { ascending: false }).limit(5000);
    if (error) {
      list.innerHTML = `<div class="admin-item"><strong>Erro</strong><p>${escapeHtml(error.message)}</p></div>`;
      return;
    }
    rows = data || [];
  } else {
    rows = JSON.parse(localStorage.getItem(LS_PHRASES) || "[]").reverse();
  }
  cachedPhrases = rows;
  document.getElementById("phraseMsg") && (document.getElementById("phraseMsg").textContent = rows.length + " frase(s) carregada(s).");
  list.innerHTML = rows.length ? rows.map((r) => `<div class="admin-item">
    <strong>${escapeHtml(r.phrase || "Frase")}</strong>
    <p>${escapeHtml(r.phrase_explanation || "Sem explicação")}</p><p>${escapeHtml(r.author_name || "Sem nome")} ${r.social_handle ? "• " + escapeHtml(r.social_handle) : ""} ${r.contact_email ? "• " + escapeHtml(r.contact_email) : ""}</p>
    <small>${escapeHtml(new Date(r.created_at || Date.now()).toLocaleString("pt-BR"))}</small>
  </div>`).join("") : `<div class="admin-item"><strong>Nenhuma frase enviada ainda.</strong><p>Quando o formulário público for usado, as frases aparecem aqui.</p></div>`;
}
function downloadPhrasesCsv() {
  const rows = cachedPhrases || [];
  const header = ["frase", "explicacao", "nome", "arroba", "email", "data"];
  const csv = [header.join(";")].concat(rows.map((r) => [r.phrase, r.phrase_explanation, r.author_name, r.social_handle, r.contact_email, r.created_at].map((v) => `"${String(v || "").replace(/"/g, '""')}"`).join(";"))).join("\n");
  const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "frases-hand-banner-barmy360.csv";
  a.click();
  URL.revokeObjectURL(url);
}

async function loadAdminData() {
  const [posts, projects, votacoes, opcoes, helpItems, streamItems] = await Promise.all([
    getPostsAdmin(),
    getProjectsAdmin(),
    getVotacoesAdmin(),
    getOpcoesAdmin(),
    getHelpAdmin(),
    getStreamAdmin(),
  ]);

  const postsList = document.getElementById("adminPostsList");
  if (postsList) {
    postsList.innerHTML = posts.length
      ? posts
          .map(
            (p) =>
              `<article class="mini-admin-item"><strong>${escapeHtml(p.title)}</strong>${p.image_url ? `<img class="admin-thumb" src="${escapeHtml(p.image_url)}" alt="">` : ""}<p>${escapeHtml(
                p.content
              )}</p><small>${escapeHtml(p.author || "ADM")}</small></article>`
          )
          .join("")
      : "<p>Nenhum aviso publicado.</p>";
  }

  const projectsList = document.getElementById("adminProjectsList");
  if (projectsList) {
    projectsList.innerHTML = projects.length
      ? projects
          .map(
            (p) => `<article class="mini-admin-item">
              <strong>${escapeHtml(p.title)}</strong>
              <p>${escapeHtml(p.description || "")}</p>
              <small>${Number(p.votes_count || 0).toLocaleString("pt-BR")} votos • ${
              p.voting_open ? "aberto" : "fechado"
            }</small>
              <div class="admin-actions">
                <button class="btn small outline" onclick='editProject(${JSON.stringify(p).replace(/'/g, "&#39;")})'>Editar projeto</button>
                <button class="btn small primary" onclick='manageProjectVoting(${JSON.stringify(p).replace(/'/g, "&#39;")})'>Gerenciar votação</button>
                <button class="btn small outline" onclick="toggleVoting('${p.id}', ${!p.voting_open})">${
              p.voting_open ? "Fechar" : "Abrir"
            }</button>
                <button class="btn small outline" onclick="deleteProject('${p.id}')">Excluir</button>
              </div>
            </article>`
          )
          .join("")
      : "<p>Nenhum projeto cadastrado ainda.</p>";
  }

  renderVotacaoSelect(votacoes);
  renderSimpleProjectSelect(projects, votacoes, opcoes);

  const votacoesList = document.getElementById("adminVotacoesList");
  if (votacoesList) {
    votacoesList.innerHTML = votacoes.length
      ? votacoes
          .map((v) => {
            const total = opcoes.filter((o) => String(o.votacao_id) === String(v.id)).length;
            return `<article class="mini-admin-item">
              <strong>${escapeHtml(v.titulo)}</strong>
              <p>${escapeHtml(v.descricao || "")}</p>
              <small>${escapeHtml(v.fase || "")} • ${escapeHtml(v.status || "")} • ${total} opções</small>
              <div class="admin-actions">
                <button class="btn small outline" onclick='editVotacao(${JSON.stringify(v).replace(/'/g, "&#39;")})'>Editar</button>
                <button class="btn small outline" onclick="deleteVotacao('${v.id}')">Excluir</button>
              </div>
            </article>`;
          })
          .join("")
      : "<p>Nenhuma votação criada. Crie a votação Hand Banner - Fase 1 aqui.</p>";
  }

  const opcoesList = document.getElementById("adminOpcoesList");
  if (opcoesList) {
    opcoesList.innerHTML = opcoes.length
      ? opcoes
          .map(
            (o) => `<article class="mini-admin-item">
              <strong>${escapeHtml(o.titulo)}</strong>
              <p>${escapeHtml(o.descricao || "")}</p>
              <small>${Number(o.votos_count || o.votos || 0).toLocaleString("pt-BR")} votos</small>${(o.imagem_url || o.imagem) ? `<img class="admin-thumb" src="${escapeHtml(o.imagem_url || o.imagem)}" alt="">` : ""}
              <div class="admin-actions">
                <button class="btn small outline" onclick="deleteOpcao('${o.id}')">Excluir</button>
              </div>
            </article>`
          )
          .join("")
      : "<p>Nenhuma opção cadastrada ainda.</p>";
  }

  const helpList = document.getElementById("adminHelpList");
  if (helpList) {
    helpList.innerHTML = helpItems.length
      ? helpItems.map((h) => `<article class="mini-admin-item">
          <strong>${escapeHtml(h.title)}</strong>
          <p>${escapeHtml(h.content || "")}</p>${(h.extra_images || h.extra_image_urls || h.gallery_images) ? `<small>📸 Fotos adicionais cadastradas</small>` : ""}
          <small>${escapeHtml(h.section_key || "outros")} • ordem ${Number(h.position || 0)}</small>
          ${(h.image_url || h.image) && String(h.image_url || h.image).startsWith("http") ? `<img class="admin-thumb" src="${escapeHtml(h.image_url || h.image)}" alt="">` : ""}
          <div class="admin-actions">
            <button class="btn small outline" onclick='editHelpItem(${JSON.stringify(h).replace(/'/g, "&#39;")})'>Editar</button>
            <button class="btn small outline" onclick="deleteHelpItem('${h.id}')">Excluir</button>
          </div>
        </article>`).join("")
      : "<p>Nenhum bloco cadastrado. Salve os blocos do BARMY Ajuda aqui.</p>";
  }
  const streamList = document.getElementById("adminStreamList");
  if (streamList) streamList.innerHTML = streamItems.length ? streamItems.map((h) => `<article class="mini-admin-item"><strong>${escapeHtml(h.title)}</strong><p>${escapeHtml(h.description || h.content || "")}</p><div class="admin-actions"><button class="btn small outline" onclick='editStreamItem(${JSON.stringify(h).replace(/'/g, "&#39;")})'>Editar</button><button class="btn small outline" onclick="deleteStreamItem('${h.id}')">Excluir</button></div></article>`).join("") : "<p>Nenhum bloco cadastrado. Salve os blocos de Stream aqui.</p>";
}

document.addEventListener("DOMContentLoaded", async () => {
  document.getElementById("simpleVoteProject")?.addEventListener("change", loadSimpleProjectVoting);
  if (!sb()) return;

  const { data } = await sb().auth.getSession();
  if (data?.session) {
    document.getElementById("loginArea")?.classList.add("hidden");
    document.getElementById("dashboardArea")?.classList.remove("hidden");
    loadAdminData();
  }
});


// ===== Ajustes finais: upload genérico, docs/cronogramas e exclusão de post =====
const LS_DOCS = "barmy360_site_documents";

async function uploadFileToField(fileInputId, targetInputId, msgId) {
  const input = document.getElementById(fileInputId);
  const target = document.getElementById(targetInputId);
  const file = input?.files?.[0];
  if (!file || !target) return;
  if (!sb()) return setMsg(msgId, "Supabase não conectado. Confira assets/js/config.js.");
  try {
    setMsg(msgId, "Enviando arquivo...");
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "-").slice(0, 100);
    const path = `docs/${Date.now()}-${Math.random().toString(16).slice(2)}-${safeName}`;
    const { error } = await sb().storage.from("barmy360-images").upload(path, file, { cacheControl: "3600", upsert: false });
    if (error) return setMsg(msgId, "Erro no upload: " + error.message + " — confira o bucket barmy360-images.");
    const { data } = sb().storage.from("barmy360-images").getPublicUrl(path);
    target.value = data.publicUrl;
    setMsg(msgId, "Arquivo enviado e link preenchido.");
  } catch (err) {
    setMsg(msgId, "Erro no upload: " + (err.message || err));
  }
}
window.uploadFileToField = uploadFileToField;

async function deletePost(id) {
  if (!confirm("Excluir esta postagem?")) return;
  if (sb()) {
    const { error } = await sb().from("community_posts").delete().eq("id", id);
    if (error) return alert("Erro: " + error.message);
  } else {
    const arr = JSON.parse(localStorage.getItem(LS_POSTS) || "[]").filter((p) => String(p.id) !== String(id));
    localStorage.setItem(LS_POSTS, JSON.stringify(arr));
  }
  loadAdminData();
}

async function getSiteDocumentsAdmin() {
  if (sb()) {
    const { data } = await sb().from("site_documents").select("*").order("position", { ascending: true }).order("created_at", { ascending: true });
    return data || [];
  }
  return JSON.parse(localStorage.getItem(LS_DOCS) || "[]").sort((a,b)=>Number(a.position||0)-Number(b.position||0));
}
async function saveSiteDocument() {
  const item = {
    title: val("docTitle"),
    description: val("docDescription"),
    file_url: val("docFileUrl"),
    download_url: val("docDownloadUrl") || val("docFileUrl"),
    cover_image: val("docCoverImage"),
    image_url: val("docCoverImage"),
    category: val("docCategory") || "documento",
    position: Number(val("docPosition") || 0),
  };
  if (!item.title) return setMsg("docMsg", "Preencha o título do documento.");
  const id = val("docId");
  if (sb()) {
    const query = id ? sb().from("site_documents").update(item).eq("id", id) : sb().from("site_documents").insert(item);
    const { error } = await query;
    if (error) return setMsg("docMsg", "Erro: " + error.message + " — rode o SQL final do ZIP.");
  } else {
    let arr = JSON.parse(localStorage.getItem(LS_DOCS) || "[]");
    if (id) arr = arr.map((d)=>String(d.id)===String(id)?{...d,...item}:d);
    else arr.push({...item, id: Date.now(), created_at: new Date().toISOString()});
    localStorage.setItem(LS_DOCS, JSON.stringify(arr));
  }
  setMsg("docMsg", "Documento salvo.");
  clearSiteDocumentForm();
  loadAdminData();
}
function editSiteDocument(d) {
  document.getElementById("docId").value = d.id || "";
  document.getElementById("docTitle").value = d.title || "";
  document.getElementById("docDescription").value = d.description || "";
  document.getElementById("docFileUrl").value = d.file_url || d.link_url || "";
  document.getElementById("docDownloadUrl").value = d.download_url || d.file_url || d.link_url || "";
  document.getElementById("docCoverImage").value = d.cover_image || d.image_url || "";
  document.getElementById("docCategory").value = d.category || "documento";
  document.getElementById("docPosition").value = d.position || 0;
  showAdminTab("docs", document.querySelector("[onclick*=docs]"));
  window.scrollTo({top:0, behavior:"smooth"});
}
function clearSiteDocumentForm() {
  ["docId","docTitle","docDescription","docFileUrl","docDownloadUrl","docCoverImage","docPosition"].forEach(id=>{ const el=document.getElementById(id); if(el) el.value=""; });
  const cat=document.getElementById("docCategory"); if(cat) cat.value="documento";
}
async function deleteSiteDocument(id) {
  if (!confirm("Excluir este documento?")) return;
  if (sb()) {
    const { error } = await sb().from("site_documents").delete().eq("id", id);
    if (error) return alert("Erro: " + error.message);
  } else {
    const arr = JSON.parse(localStorage.getItem(LS_DOCS) || "[]").filter((d)=>String(d.id)!==String(id));
    localStorage.setItem(LS_DOCS, JSON.stringify(arr));
  }
  loadAdminData();
}
async function renderDocsAdmin() {
  const list = document.getElementById("adminDocsList");
  if (!list) return;
  const docs = await getSiteDocumentsAdmin();
  list.innerHTML = docs.length ? docs.map((d)=>`<article class="mini-admin-item">
    <strong>${escapeHtml(d.title || "Documento")}</strong>
    ${(d.cover_image||d.image_url) ? `<img class="admin-thumb" src="${escapeHtml(d.cover_image||d.image_url)}" alt="">` : ""}
    <p>${escapeHtml(d.description || "")}</p>
    <small>${escapeHtml(d.category || "documento")} • ordem ${Number(d.position || 0)}</small>
    <div class="admin-actions">
      ${(d.file_url||d.link_url) ? `<a class="btn small primary" href="${escapeHtml(d.file_url||d.link_url)}" target="_blank" rel="noopener">Ler</a>` : ""}
      ${(d.download_url||d.file_url||d.link_url) ? `<a class="btn small outline" href="${escapeHtml(d.download_url||d.file_url||d.link_url)}" download>Baixar</a>` : ""}
      <button class="btn small outline" onclick='editSiteDocument(${JSON.stringify(d).replace(/'/g,"&#39;")})'>Editar</button>
      <button class="btn small outline" onclick="deleteSiteDocument('${escapeHtml(d.id)}')">Excluir</button>
    </div>
  </article>`).join("") : "<p>Nenhum documento cadastrado ainda.</p>";
}

const __oldLoadAdminData = loadAdminData;
loadAdminData = async function() {
  await __oldLoadAdminData();
  await renderDocsAdmin();
  const postsList = document.getElementById("adminPostsList");
  if (postsList) {
    const posts = await getPostsAdmin();
    postsList.innerHTML = posts.length ? posts.map((p)=>`<article class="mini-admin-item"><strong>${escapeHtml(p.title)}</strong>${p.image_url ? `<img class="admin-thumb" src="${escapeHtml(p.image_url)}" alt="">` : ""}<p>${escapeHtml(p.content)}</p>${p.link_url ? `<a class="btn small primary" href="${escapeHtml(p.link_url)}" target="_blank" rel="noopener">${escapeHtml(p.link_label || "Abrir link")}</a>` : ""}<small>${escapeHtml(p.author || "ADM")}</small><div class="admin-actions"><button class="btn small outline" onclick="deletePost('${escapeHtml(p.id)}')">Excluir</button></div></article>`).join("") : "<p>Nenhum aviso publicado.</p>";
  }
};


/* ===== BARMY360 v2 - lançamento, solos e artes ===== */
async function loadSiteSettingsAdmin(){
  let s={};
  if(sb()){ try{ const {data}=await sb().from('site_settings').select('*').eq('id',1).maybeSingle(); if(data) s=data; }catch(e){} }
  if(!Object.keys(s).length){ try{s=JSON.parse(localStorage.getItem(LS_SITE)||'{}')}catch(e){} }
  const set=(id,v)=>{const el=document.getElementById(id); if(el && v!==undefined && v!==null) el.value=v};
  set('siteLaunchMode', s.launch_mode || 'open'); set('siteLaunchAt', s.launch_at || '2026-06-05T20:00:00-03:00'); set('siteHeroTitle', s.hero_title||''); set('siteHeroText', s.hero_text||''); set('siteHeroImage', s.hero_image||''); set('siteContactEmail', s.contact_email||'projeto.barmy360@gmail.com'); set('hbArtTitle', s.handbanner_art_title||'Enviar arte do Hand Banner'); set('hbArtText', s.handbanner_art_text||'Envie sua arte seguindo o edital e o manual de submissão.'); const hbChk=document.getElementById('hbArtEnabled'); if(hbChk) hbChk.checked=!!s.handbanner_art_enabled;
}
const LS_SOLOS_ADMIN='barmy360_solo_members';
function defaultSolosAdmin(){return ['RM','Jin','SUGA','j-hope','Jimin','V','Jung Kook'].map((name,i)=>({id:String(i+1),member_name:name,title:name,description:'Projeto individual em breve.',status:'planejamento',image_url:'💜',cover_image:'💜',position:i+1}))}
async function getSolosAdmin(){ if(sb()){ const {data}=await sb().from('solo_members').select('*').order('position',{ascending:true}); return data && data.length ? data : defaultSolosAdmin(); } const a=JSON.parse(localStorage.getItem(LS_SOLOS_ADMIN)||'[]'); return a.length?a:defaultSolosAdmin(); }
function clearSoloForm(){ ['soloId','soloMember','soloTitle','soloDescription','soloCoverImage','soloImage','soloPosition'].forEach(id=>{const el=document.getElementById(id); if(el) el.value=''}); const st=document.getElementById('soloStatus'); if(st) st.value='planejamento'; }
function editSolo(m){ document.getElementById('soloId').value=m.id||''; document.getElementById('soloMember').value=m.member_name||''; document.getElementById('soloTitle').value=m.title||m.member_name||''; document.getElementById('soloDescription').value=m.description||''; document.getElementById('soloCoverImage').value=m.cover_image||m.image_url||''; document.getElementById('soloImage').value=m.image_url||m.cover_image||''; document.getElementById('soloStatus').value=m.status||'planejamento'; document.getElementById('soloPosition').value=m.position||''; }
async function saveSoloMember(){ const row={member_name:val('soloMember'), title:val('soloTitle')||val('soloMember'), description:val('soloDescription'), cover_image:val('soloCoverImage')||val('soloImage')||'💜', image_url:val('soloImage')||val('soloCoverImage')||'💜', status:val('soloStatus')||'planejamento', position:Number(val('soloPosition')||0)}; if(!row.member_name) return setMsg('soloMsg','Preencha o nome do membro.'); const id=val('soloId'); if(sb()){ const q=id?sb().from('solo_members').update(row).eq('id',id):sb().from('solo_members').insert(row); const {error}=await q; if(error) return setMsg('soloMsg','Erro: '+error.message); } else { let arr=JSON.parse(localStorage.getItem(LS_SOLOS_ADMIN)||'[]'); if(id) arr=arr.map(x=>String(x.id)===String(id)?{...x,...row}:x); else arr.push({...row,id:Date.now()}); localStorage.setItem(LS_SOLOS_ADMIN,JSON.stringify(arr)); } setMsg('soloMsg','Membro salvo.'); clearSoloForm(); loadSolosAdminList(); }
async function deleteSoloMember(id){ if(!confirm('Excluir este card solo?')) return; if(sb()){ const {error}=await sb().from('solo_members').delete().eq('id',id); if(error) return alert(error.message); } else { let arr=JSON.parse(localStorage.getItem(LS_SOLOS_ADMIN)||'[]').filter(x=>String(x.id)!==String(id)); localStorage.setItem(LS_SOLOS_ADMIN,JSON.stringify(arr)); } loadSolosAdminList(); }
async function loadSolosAdminList(){ const el=document.getElementById('adminSolosList'); if(!el) return; const rows=await getSolosAdmin(); el.innerHTML=rows.map(m=>{ const cover=m.cover_image||m.image_url||''; const img=(String(cover).startsWith('http')||String(cover).startsWith('assets/')) ? `<img class="admin-thumb" src="${escapeHtml(cover)}" alt="">` : ''; return `<article class="mini-admin-item"><strong>${escapeHtml(m.title||m.member_name)}</strong>${img}<p>${escapeHtml(m.description||'')}</p><small>${escapeHtml(m.status||'planejamento')} • capa do card ${cover?'ok':'não definida'}</small><div class="admin-actions"><button class="btn small outline" onclick='editSolo(${JSON.stringify(m).replace(/'/g,'&#39;')})'>Editar</button><button class="btn small outline" onclick="deleteSoloMember('${escapeHtml(m.id)}')">Excluir</button></div></article>`}).join(''); }

async function saveHandbannerArtSettings(){
  let s={};
  try{s=JSON.parse(localStorage.getItem(LS_SITE)||'{}')}catch(e){}
  const patch={
    id:1,
    handbanner_art_enabled: !!document.getElementById('hbArtEnabled')?.checked,
    handbanner_art_title: val('hbArtTitle') || 'Enviar arte do Hand Banner',
    handbanner_art_text: val('hbArtText') || 'Envie sua arte seguindo o edital e o manual de submissão.'
  };
  s={...s,...patch};
  localStorage.setItem(LS_SITE, JSON.stringify(s));
  if(sb()){ const {error}=await sb().from('site_settings').upsert(s); if(error) return setMsg('hbAdminMsg','Erro: '+error.message+' — rode o SQL atualizado do ZIP.'); }
  setMsg('hbAdminMsg','Configuração salva.');
}
async function loadHandbannerSubmissions(){ const el=document.getElementById('adminHBSubmissionsList'); if(!el) return; if(!sb()){ el.innerHTML='<p>Supabase não conectado.</p>'; return; } const {data,error}=await sb().from('handbanner_art_submissions').select('*').order('created_at',{ascending:false}).limit(1000); if(error){ el.innerHTML=`<p>${escapeHtml(error.message)}</p>`; return; } const rows=data||[]; document.getElementById('hbAdminMsg') && (document.getElementById('hbAdminMsg').textContent=rows.length+' envio(s).'); el.innerHTML=rows.length?rows.map(r=>`<article class="mini-admin-item"><strong>${escapeHtml(r.full_name||'Sem nome')}</strong><p>${escapeHtml(r.social_handle||'')} • ${escapeHtml(r.contact_email||r.google_email||'')}</p><p><a class="btn small primary" href="${escapeHtml(r.cloud_link||'#')}" target="_blank">Abrir pasta</a></p><small>${escapeHtml(new Date(r.created_at||Date.now()).toLocaleString('pt-BR'))}</small></article>`).join(''):'<p>Nenhum envio ainda.</p>'; }
const __oldLoadAdminDataV2 = loadAdminData;
loadAdminData = async function(){ await __oldLoadAdminDataV2(); await loadSiteSettingsAdmin(); await loadSolosAdminList(); await loadHandbannerSubmissions(); };

/* ===== ADM Projetos Individuais por membro - 2026-06-11 ===== */
const LS_SOLO_PROJECTS_ADMIN = "barmy360_solo_projects";

async function refreshSoloProjectMemberOptions(selectedId = "") {
  const select = document.getElementById("soloProjectMember");
  if (!select) return;
  const members = await getSolosAdmin();
  select.innerHTML = members.map((m) => `<option value="${escapeHtml(m.id)}">${escapeHtml(m.title || m.member_name || 'Membro')}</option>`).join("");
  if (selectedId) select.value = selectedId;
}

async function getSoloProjectsAdmin() {
  if (sb()) {
    const { data } = await sb().from("solo_projects").select("*").order("position", { ascending: true }).order("created_at", { ascending: true });
    return data || [];
  }
  return JSON.parse(localStorage.getItem(LS_SOLO_PROJECTS_ADMIN) || "[]").sort((a, b) => Number(a.position || 0) - Number(b.position || 0));
}

function clearSoloProjectForm() {
  ["soloProjectId", "soloProjectTitle", "soloProjectDescription", "soloProjectImage", "soloProjectLink", "soloProjectPosition"].forEach((id) => { const el = document.getElementById(id); if (el) el.value = ""; });
  const st = document.getElementById("soloProjectStatus"); if (st) st.value = "planejamento";
}

function editSoloProject(p) {
  document.getElementById("soloProjectId").value = p.id || "";
  document.getElementById("soloProjectMember").value = p.solo_member_id || "";
  document.getElementById("soloProjectTitle").value = p.title || "";
  document.getElementById("soloProjectDescription").value = p.description || "";
  document.getElementById("soloProjectImage").value = p.image_url || "";
  document.getElementById("soloProjectLink").value = p.link_url || "";
  document.getElementById("soloProjectStatus").value = p.status || "planejamento";
  document.getElementById("soloProjectPosition").value = p.position || "";
}

async function saveSoloProject() {
  const row = {
    solo_member_id: val("soloProjectMember"),
    title: val("soloProjectTitle"),
    description: val("soloProjectDescription"),
    image_url: val("soloProjectImage") || "✨",
    cover_image: val("soloProjectImage") || "✨",
    link_url: val("soloProjectLink"),
    status: val("soloProjectStatus") || "planejamento",
    position: Number(val("soloProjectPosition") || 0),
  };
  if (!row.solo_member_id) return setMsg("soloProjectMsg", "Selecione o membro.");
  if (!row.title) return setMsg("soloProjectMsg", "Preencha o título do projeto.");
  const id = val("soloProjectId");
  if (sb()) {
    const q = id ? sb().from("solo_projects").update(row).eq("id", id) : sb().from("solo_projects").insert(row);
    const { error } = await q;
    if (error) return setMsg("soloProjectMsg", "Erro: " + error.message + " — rode o SQL atualizado do ZIP.");
  } else {
    let arr = JSON.parse(localStorage.getItem(LS_SOLO_PROJECTS_ADMIN) || "[]");
    if (id) arr = arr.map((x) => String(x.id) === String(id) ? { ...x, ...row } : x);
    else arr.push({ ...row, id: Date.now() });
    localStorage.setItem(LS_SOLO_PROJECTS_ADMIN, JSON.stringify(arr));
  }
  setMsg("soloProjectMsg", "Projeto do membro salvo.");
  clearSoloProjectForm();
  await loadSoloProjectsAdminList();
}

async function deleteSoloProject(id) {
  if (!confirm("Excluir este projeto individual?")) return;
  if (sb()) {
    const { error } = await sb().from("solo_projects").delete().eq("id", id);
    if (error) return alert(error.message);
  } else {
    const arr = JSON.parse(localStorage.getItem(LS_SOLO_PROJECTS_ADMIN) || "[]").filter((x) => String(x.id) !== String(id));
    localStorage.setItem(LS_SOLO_PROJECTS_ADMIN, JSON.stringify(arr));
  }
  await loadSoloProjectsAdminList();
}

async function loadSoloProjectsAdminList() {
  await refreshSoloProjectMemberOptions(document.getElementById("soloProjectMember")?.value || "");
  const el = document.getElementById("adminSoloProjectsList");
  if (!el) return;
  const [projects, members] = await Promise.all([getSoloProjectsAdmin(), getSolosAdmin()]);
  const memberName = (id) => (members.find((m) => String(m.id) === String(id)) || {}).title || (members.find((m) => String(m.id) === String(id)) || {}).member_name || "Membro";
  el.innerHTML = projects.length ? projects.map((p) => `<article class="mini-admin-item">
    <strong>${escapeHtml(p.title || 'Projeto')}</strong>
    ${(p.cover_image||p.image_url) && (String(p.cover_image||p.image_url).startsWith('http')||String(p.cover_image||p.image_url).startsWith('assets/')) ? `<img class="admin-thumb" src="${escapeHtml(p.cover_image||p.image_url)}" alt="">` : ''}
    <p>${escapeHtml(p.description || '')}</p>
    <small>${escapeHtml(memberName(p.solo_member_id))} • ${escapeHtml(p.status || 'planejamento')} • ordem ${Number(p.position || 0)}</small>
    <div class="admin-actions">
      ${p.link_url ? `<a class="btn small primary" href="${escapeHtml(p.link_url)}" target="_blank" rel="noopener">Abrir</a>` : ''}
      <button class="btn small outline" onclick='editSoloProject(${JSON.stringify(p).replace(/'/g, "&#39;")})'>Editar</button>
      <button class="btn small outline" onclick="deleteSoloProject('${escapeHtml(p.id)}')">Excluir</button>
    </div>
  </article>`).join("") : "<p>Nenhum projeto individual cadastrado ainda.</p>";
}

const __oldLoadAdminDataSolosProjects = loadAdminData;
loadAdminData = async function(){ await __oldLoadAdminDataSolosProjects(); await loadSoloProjectsAdminList(); };

/* ===== Correções finais ADM / contador / status - 2026-06-11 ===== */
function projectStatusLabelAdmin(status){
  const map = {
    fase_envio: "Em fase de envio",
    analise: "Em análise",
    planejamento: "Em planejamento",
    em_votacao: "Em votação",
    aprovado: "Em colaboração",
    finalizado: "Finalizado",
    nao_aprovado: "Não aprovado"
  };
  return map[status] || status || "Em planejamento";
}
function projectStatusSelectAdmin(p){
  const statuses = ["fase_envio","analise","planejamento","em_votacao","aprovado","finalizado","nao_aprovado"];
  return `<select class="admin-inline-select" onchange="updateProjectStatus('${escapeHtml(p.id)}', this.value)">${statuses.map(s=>`<option value="${s}" ${String(p.status||'')===s?'selected':''}>${projectStatusLabelAdmin(s)}</option>`).join("")}</select>`;
}
async function updateProjectStatus(id, status){
  const patch = { status, voting_open: status === "em_votacao" };
  if(sb()){
    const { error } = await sb().from("projects").update(patch).eq("id", id);
    if(error) return alert("Erro ao alterar status: " + error.message);
  } else {
    let arr = JSON.parse(localStorage.getItem(LS_PROJECTS) || "[]");
    arr = arr.map(p => String(p.id) === String(id) ? { ...p, ...patch } : p);
    localStorage.setItem(LS_PROJECTS, JSON.stringify(arr));
  }
  setMsg("projectMsg", "Status atualizado.");
  await loadAdminData();
}
async function toggleVoting(id, open){
  const patch = { voting_open: !!open, status: open ? "em_votacao" : "finalizado" };
  if(sb()){
    const { error } = await sb().from("projects").update(patch).eq("id", id);
    if(error) return alert("Erro ao abrir/fechar projeto: " + error.message);
    try {
      const projects = await getProjectsAdmin();
      const p = projects.find(x => String(x.id) === String(id));
      const key = p ? projectVotingKeyAdmin(p) : "";
      if(key) await sb().from("votacoes").update({ status: open ? "aberta" : "fechada" }).eq("project_key", key);
    } catch(e) {}
  } else {
    let arr = JSON.parse(localStorage.getItem(LS_PROJECTS) || "[]");
    arr = arr.map(p => String(p.id) === String(id) ? { ...p, ...patch } : p);
    localStorage.setItem(LS_PROJECTS, JSON.stringify(arr));
    let vs = JSON.parse(localStorage.getItem(LS_VOTACOES) || "[]");
    const proj = arr.find(p => String(p.id) === String(id));
    const key = proj ? projectVotingKeyAdmin(proj) : "";
    vs = vs.map(v => String(v.project_key || "") === String(key) ? { ...v, status: open ? "aberta" : "fechada" } : v);
    localStorage.setItem(LS_VOTACOES, JSON.stringify(vs));
  }
  setMsg("projectMsg", open ? "Projeto aberto para votação." : "Projeto fechado/finalizado.");
  await loadAdminData();
}
const __barmyOldSaveProject = saveProject;
saveProject = async function(){
  const status = val("projectStatus") || "planejamento";
  const open = document.getElementById("projectVotingOpen");
  if(open) open.checked = status === "em_votacao" ? true : !!open.checked;
  await __barmyOldSaveProject();
};
async function renderProjectsAdminFunctional(){
  const projectsList = document.getElementById("adminProjectsList");
  if(!projectsList) return;
  const projects = await getProjectsAdmin();
  projectsList.innerHTML = projects.length ? projects.map((p)=>`<article class="mini-admin-item admin-project-row">
    <div class="admin-project-main">
      <strong>${escapeHtml(p.title || "Projeto")}</strong>
      ${p.image_url && String(p.image_url).startsWith("http") ? `<img class="admin-thumb" src="${escapeHtml(p.image_url)}" alt="">` : ""}
      <p>${escapeHtml(p.description || "")}</p>
      <small>${Number(p.votes_count || 0).toLocaleString("pt-BR")} votos • ${p.voting_open ? "votação aberta" : "votação fechada"}</small>
    </div>
    <div class="admin-status-box">
      <label>Status do projeto</label>
      ${projectStatusSelectAdmin(p)}
    </div>
    <div class="admin-actions">
      <button class="btn small outline" onclick='editProject(${JSON.stringify(p).replace(/'/g,"&#39;")})'>Editar</button>
      <button class="btn small primary" onclick='manageProjectVoting(${JSON.stringify(p).replace(/'/g,"&#39;")})'>Votação</button>
      <button class="btn small outline" onclick="toggleVoting('${escapeHtml(p.id)}', ${!p.voting_open})">${p.voting_open ? "Fechar votação" : "Abrir votação"}</button>
      <button class="btn small outline" onclick="deleteProject('${escapeHtml(p.id)}')">Excluir</button>
    </div>
  </article>`).join("") : "<p>Nenhum projeto cadastrado ainda.</p>";
}
const __barmyLoadAdminFinal = loadAdminData;
loadAdminData = async function(){
  await __barmyLoadAdminFinal();
  await renderProjectsAdminFunctional();
  const mode = document.getElementById("siteLaunchMode"); if(mode && !mode.value) mode.value = "open";
};

const __barmyLoadSiteSettingsAdminFinal = loadSiteSettingsAdmin;
loadSiteSettingsAdmin = async function(){
  await __barmyLoadSiteSettingsAdminFinal();
  const mode=document.getElementById('siteLaunchMode'); if(mode && (!mode.value || mode.value==='locked')) mode.value='open';
  const email=document.getElementById('siteContactEmail'); if(email && !email.value) email.value='projeto.barmy360@gmail.com';
};

/* ===== Ajustes Projetos Individuais / ADM organizado - 2026-06-17 ===== */
function barmySoloStatusOptions(selected = '') {
  const statuses = [
    ['em_breve', 'Em breve'],
    ['planejamento', 'Em planejamento'],
    ['em_colaboracao', 'Em colaboração'],
    ['fase_envio', 'Em fase de envio'],
    ['em_votacao', 'Em votação'],
    ['finalizado', 'Finalizado']
  ];
  return statuses.map(([value, label]) => `<option value="${value}" ${String(selected || '') === value ? 'selected' : ''}>${label}</option>`).join('');
}

function barmyNormalizeSoloStatus(value) {
  const v = String(value || '').toLowerCase().trim();
  if (v === 'aprovado' || v === 'colaboracao' || v === 'em colaboração' || v === 'em-colaboracao') return 'em_colaboracao';
  if (v === 'breve' || v === 'em breve' || v === 'em-breve') return 'em_breve';
  if (v === 'em planejamento' || v === 'em-planejamento') return 'planejamento';
  return v || 'planejamento';
}

function barmyFillSoloStatusSelects() {
  const soloStatus = document.getElementById('soloStatus');
  if (soloStatus) soloStatus.innerHTML = barmySoloStatusOptions(soloStatus.value || 'planejamento');
  const soloProjectStatus = document.getElementById('soloProjectStatus');
  if (soloProjectStatus) soloProjectStatus.innerHTML = barmySoloStatusOptions(soloProjectStatus.value || 'planejamento');
}

function barmySoloLabel(status) {
  const map = {
    em_breve: 'Em breve',
    planejamento: 'Em planejamento',
    em_colaboracao: 'Em colaboração',
    fase_envio: 'Em fase de envio',
    em_votacao: 'Em votação',
    finalizado: 'Finalizado'
  };
  return map[barmyNormalizeSoloStatus(status)] || 'Em planejamento';
}

async function saveSoloPageSettings() {
  const patch = {
    id: 1,
    solo_page_kicker: val('soloPageKicker') || 'PROJETOS INDIVIDUAIS',
    solo_page_title: val('soloPageTitle') || 'Projetos por membro',
    solo_page_text: val('soloPageText') || 'Espaço reservado para projetos individuais.'
  };

  let local = {};
  try { local = JSON.parse(localStorage.getItem(LS_SITE) || '{}'); } catch(e) {}
  localStorage.setItem(LS_SITE, JSON.stringify({ ...local, ...patch }));

  if (sb()) {
    const { error } = await sb().from('site_settings').upsert(patch);
    if (error) return setMsg('soloPageMsg', 'Erro: ' + error.message + ' — rode o SQL de atualização dos Projetos Individuais.');
  }
  setMsg('soloPageMsg', 'Textos da página salvos.');
}

window.saveSoloPageSettings = saveSoloPageSettings;

const __barmySoloLoadSettings = loadSiteSettingsAdmin;
loadSiteSettingsAdmin = async function(){
  await __barmySoloLoadSettings();
  const s = (() => { try { return JSON.parse(localStorage.getItem(LS_SITE) || '{}'); } catch(e) { return {}; } })();
  let remote = {};
  if (sb()) { try { const { data } = await sb().from('site_settings').select('*').eq('id',1).maybeSingle(); remote = data || {}; } catch(e) {} }
  const data = { ...s, ...remote };
  const set = (id, value) => { const el = document.getElementById(id); if (el) el.value = value || ''; };
  set('soloPageKicker', data.solo_page_kicker || 'PROJETOS INDIVIDUAIS');
  set('soloPageTitle', data.solo_page_title || 'Projetos por membro');
  set('soloPageText', data.solo_page_text || 'Espaço reservado para projetos individuais.');
  barmyFillSoloStatusSelects();
};

const __barmyOldClearSoloForm = clearSoloForm;
clearSoloForm = function(){
  __barmyOldClearSoloForm();
  barmyFillSoloStatusSelects();
  const st = document.getElementById('soloStatus'); if (st) st.value = 'planejamento';
};

editSolo = function(m){
  document.getElementById('soloId').value = m.id || '';
  document.getElementById('soloMember').value = m.member_name || '';
  document.getElementById('soloTitle').value = m.title || m.member_name || '';
  document.getElementById('soloDescription').value = m.description || '';
  document.getElementById('soloCoverImage').value = m.cover_image || m.image_url || '';
  document.getElementById('soloImage').value = m.image_url || m.cover_image || '';
  barmyFillSoloStatusSelects();
  document.getElementById('soloStatus').value = barmyNormalizeSoloStatus(m.status || 'planejamento');
  document.getElementById('soloPosition').value = m.position || '';
  document.getElementById('tab-solos')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
};

saveSoloMember = async function(){
  const row = {
    member_name: val('soloMember'),
    title: val('soloTitle') || val('soloMember'),
    description: val('soloDescription'),
    cover_image: val('soloCoverImage') || val('soloImage') || '💜',
    image_url: val('soloImage') || val('soloCoverImage') || '💜',
    status: barmyNormalizeSoloStatus(val('soloStatus') || 'planejamento'),
    position: Number(val('soloPosition') || 0)
  };
  if (!row.member_name) return setMsg('soloMsg','Preencha o nome do membro.');
  const id = val('soloId');
  if (sb()) {
    const q = id ? sb().from('solo_members').update(row).eq('id', id) : sb().from('solo_members').insert(row);
    const { error } = await q;
    if (error) return setMsg('soloMsg','Erro: '+error.message+' — rode o SQL atualizado.');
  } else {
    let arr = JSON.parse(localStorage.getItem(LS_SOLOS_ADMIN) || '[]');
    if (id) arr = arr.map(x => String(x.id) === String(id) ? { ...x, ...row } : x);
    else arr.push({ ...row, id: Date.now() });
    localStorage.setItem(LS_SOLOS_ADMIN, JSON.stringify(arr));
  }
  setMsg('soloMsg','Membro salvo.');
  clearSoloForm();
  await loadSolosAdminList();
  await loadSoloProjectsAdminList();
};

loadSolosAdminList = async function(){
  const el = document.getElementById('adminSolosList');
  if (!el) return;
  const rows = await getSolosAdmin();
  el.innerHTML = rows.length ? rows.map(m => {
    const cover = m.cover_image || m.image_url || '';
    const img = (String(cover).startsWith('http') || String(cover).startsWith('assets/')) ? `<img class="admin-thumb" src="${escapeHtml(cover)}" alt="">` : `<div class="admin-thumb-placeholder">${escapeHtml(cover || '💜')}</div>`;
    return `<article class="mini-admin-item admin-media-item">
      ${img}
      <div class="admin-media-body">
        <strong>${escapeHtml(m.title || m.member_name)}</strong>
        <p>${escapeHtml(m.description || '')}</p>
        <small>${escapeHtml(barmySoloLabel(m.status))} • ordem ${Number(m.position || 0)}</small>
        <div class="admin-actions"><button class="btn small outline" onclick='editSolo(${JSON.stringify(m).replace(/'/g,'&#39;')})'>Editar</button><button class="btn small outline" onclick="deleteSoloMember('${escapeHtml(m.id)}')">Excluir</button></div>
      </div>
    </article>`;
  }).join('') : '<p>Nenhum membro cadastrado ainda.</p>';
};

const __barmyOldClearSoloProjectForm = clearSoloProjectForm;
clearSoloProjectForm = function(){
  __barmyOldClearSoloProjectForm();
  barmyFillSoloStatusSelects();
  const st = document.getElementById('soloProjectStatus'); if (st) st.value = 'planejamento';
};

editSoloProject = function(p){
  document.getElementById('soloProjectId').value = p.id || '';
  document.getElementById('soloProjectMember').value = p.solo_member_id || '';
  document.getElementById('soloProjectTitle').value = p.title || '';
  document.getElementById('soloProjectDescription').value = p.description || '';
  document.getElementById('soloProjectImage').value = p.cover_image || p.image_url || '';
  document.getElementById('soloProjectLink').value = p.link_url || '';
  barmyFillSoloStatusSelects();
  document.getElementById('soloProjectStatus').value = barmyNormalizeSoloStatus(p.status || 'planejamento');
  document.getElementById('soloProjectPosition').value = p.position || '';
  document.getElementById('soloProjectTitle')?.focus();
};

saveSoloProject = async function(){
  const row = {
    solo_member_id: val('soloProjectMember'),
    title: val('soloProjectTitle'),
    description: val('soloProjectDescription'),
    image_url: val('soloProjectImage') || '✨',
    cover_image: val('soloProjectImage') || '✨',
    link_url: val('soloProjectLink'),
    status: barmyNormalizeSoloStatus(val('soloProjectStatus') || 'planejamento'),
    position: Number(val('soloProjectPosition') || 0)
  };
  if (!row.solo_member_id) return setMsg('soloProjectMsg', 'Selecione o membro.');
  if (!row.title) return setMsg('soloProjectMsg', 'Preencha o título do projeto.');
  const id = val('soloProjectId');
  if (sb()) {
    const q = id ? sb().from('solo_projects').update(row).eq('id', id) : sb().from('solo_projects').insert(row);
    const { error } = await q;
    if (error) return setMsg('soloProjectMsg', 'Erro: ' + error.message + ' — rode o SQL atualizado.');
  } else {
    let arr = JSON.parse(localStorage.getItem(LS_SOLO_PROJECTS_ADMIN) || '[]');
    if (id) arr = arr.map(x => String(x.id) === String(id) ? { ...x, ...row } : x);
    else arr.push({ ...row, id: Date.now() });
    localStorage.setItem(LS_SOLO_PROJECTS_ADMIN, JSON.stringify(arr));
  }
  setMsg('soloProjectMsg', 'Projeto do membro salvo.');
  clearSoloProjectForm();
  await loadSoloProjectsAdminList();
};

loadSoloProjectsAdminList = async function(){
  await refreshSoloProjectMemberOptions(document.getElementById('soloProjectMember')?.value || '');
  const el = document.getElementById('adminSoloProjectsList');
  if (!el) return;
  const [projects, members] = await Promise.all([getSoloProjectsAdmin(), getSolosAdmin()]);
  const memberName = (id) => {
    const m = members.find(x => String(x.id) === String(id));
    return m?.title || m?.member_name || 'Membro';
  };
  el.innerHTML = projects.length ? projects.map(p => {
    const cover = p.cover_image || p.image_url || '';
    const img = (String(cover).startsWith('http') || String(cover).startsWith('assets/')) ? `<img class="admin-thumb" src="${escapeHtml(cover)}" alt="">` : `<div class="admin-thumb-placeholder">${escapeHtml(cover || '✨')}</div>`;
    return `<article class="mini-admin-item admin-media-item">
      ${img}
      <div class="admin-media-body">
        <strong>${escapeHtml(p.title || 'Projeto')}</strong>
        <p>${escapeHtml(p.description || '')}</p>
        <small>${escapeHtml(memberName(p.solo_member_id))} • ${escapeHtml(barmySoloLabel(p.status))} • ordem ${Number(p.position || 0)}</small>
        <div class="admin-actions">
          ${p.link_url ? `<a class="btn small primary" href="${escapeHtml(p.link_url)}" target="_blank" rel="noopener">Abrir</a>` : ''}
          <button class="btn small outline" onclick='editSoloProject(${JSON.stringify(p).replace(/'/g, "&#39;")})'>Editar</button>
          <button class="btn small outline" onclick="deleteSoloProject('${escapeHtml(p.id)}')">Excluir</button>
        </div>
      </div>
    </article>`;
  }).join('') : '<p>Nenhum projeto individual cadastrado ainda.</p>';
};

// Status geral de projetos: aprovado passa a ser exibido como colaboração.
projectStatusLabelAdmin = function(status){
  const map = {
    fase_envio: 'Em fase de envio',
    analise: 'Em análise',
    planejamento: 'Em planejamento',
    em_breve: 'Em breve',
    em_votacao: 'Em votação',
    aprovado: 'Em colaboração',
    em_colaboracao: 'Em colaboração',
    finalizado: 'Finalizado',
    nao_aprovado: 'Não aprovado'
  };
  return map[status] || status || 'Em planejamento';
};
projectStatusSelectAdmin = function(p){
  const statuses = ['em_breve','planejamento','em_colaboracao','fase_envio','analise','em_votacao','finalizado','nao_aprovado'];
  const current = barmyNormalizeSoloStatus(p.status || 'planejamento');
  return `<select class="admin-inline-select" onchange="updateProjectStatus('${escapeHtml(p.id)}', this.value)">${statuses.map(s=>`<option value="${s}" ${String(current)===s?'selected':''}>${projectStatusLabelAdmin(s)}</option>`).join('')}</select>`;
};

document.addEventListener('DOMContentLoaded', barmyFillSoloStatusSelects);
