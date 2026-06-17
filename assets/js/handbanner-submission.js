let hbUser = null;

function isGoogleUser(user) {
  return (
    user?.app_metadata?.provider === "google" ||
    (user?.identities || []).some((i) => i.provider === "google")
  );
}

function showLogin() {
  document.getElementById("hbLoginCard")?.classList.remove("hidden");
  document.getElementById("hbFormCard")?.classList.add("hidden");
}

function showForm(user) {
  document.getElementById("hbLoginCard")?.classList.add("hidden");
  document.getElementById("hbFormCard")?.classList.remove("hidden");

  const email = document.getElementById("hbEmail");
  if (email && user?.email) email.value = user.email;
}

async function hbLoginGoogle() {
  const msg = document.getElementById("hbLoginMsg");

  if (!window.BARMY360_SUPABASE) {
    if (msg) msg.textContent = "Supabase não conectado.";
    return;
  }

  if (msg) msg.textContent = "Redirecionando para o Google...";

  const redirectTo = `${window.location.origin}${window.location.pathname}`;

  const { error } = await BARMY360_SUPABASE.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo,
      queryParams: {
        access_type: "offline",
        prompt: "select_account",
      },
    },
  });

  if (error && msg) {
    msg.textContent = "Erro ao abrir login Google: " + error.message;
  }
}

async function hbInit() {
  showLogin();

  if (!window.BARMY360_SUPABASE) return;

  const form = document.getElementById("hbSubmissionForm");
  if (form && !form.dataset.bound) {
    form.addEventListener("submit", hbSubmit);
    form.dataset.bound = "true";
  }

  const { data: sessionData, error: sessionError } =
    await BARMY360_SUPABASE.auth.getSession();

  if (sessionError) {
    console.error("Erro ao buscar sessão:", sessionError);
  }

  hbUser = sessionData?.session?.user || null;

  if (!hbUser) {
    const { data: userData, error: userError } =
      await BARMY360_SUPABASE.auth.getUser();

    if (userError) {
      console.error("Erro ao buscar usuário:", userError);
    }

    hbUser = userData?.user || null;
  }

  if (hbUser && isGoogleUser(hbUser)) {
    showForm(hbUser);
  } else {
    hbUser = null;
    showLogin();
  }
}

async function hbSubmit(e) {
  e.preventDefault();

  const msg = document.getElementById("hbFormMsg");

  if (!window.BARMY360_SUPABASE || !hbUser || !isGoogleUser(hbUser)) {
    if (msg) msg.textContent = "Entre com Google antes de enviar.";
    showLogin();
    return;
  }

  if (msg) msg.textContent = "Verificando limite de envios...";

  const { count, error: countError } = await BARMY360_SUPABASE
    .from("handbanner_art_submissions")
    .select("id", { count: "exact", head: true })
    .eq("user_id", hbUser.id);

  if (countError) {
    if (msg) msg.textContent = "Erro ao verificar limite: " + countError.message;
    return;
  }

  if ((count || 0) >= 3) {
    if (msg) msg.textContent = "Limite de 3 envios por conta atingido.";
    return;
  }

  const row = {
    user_id: hbUser.id,
    google_email: hbUser.email || "",
    full_name: document.getElementById("hbFullName").value.trim(),
    social_handle: document.getElementById("hbSocial").value.trim(),
    contact_email: document.getElementById("hbEmail").value.trim(),
    cloud_link: document.getElementById("hbCloudLink").value.trim(),
    term_agreement_link: "",
    minor_authorization_link: document
      .getElementById("hbMinorAuthorizationLink")
      .value.trim(),
    agree_term: document.getElementById("hbAgreeTerm").checked,
    agree_minor: document.getElementById("hbAgreeMinor").checked,
    agree_rules: document.getElementById("hbAgreeRules").checked,
    observation: document.getElementById("hbObservation").value.trim(),
  };

  if (msg) msg.textContent = "Enviando...";

  const { error } = await BARMY360_SUPABASE
    .from("handbanner_art_submissions")
    .insert(row);

  if (error) {
    if (msg) msg.textContent = "Erro ao enviar: " + error.message;
    return;
  }

  e.target.reset();

  const email = document.getElementById("hbEmail");
  if (email && hbUser.email) email.value = hbUser.email;

  if (msg) msg.textContent = "Envio registrado com sucesso 💜";
}

document.addEventListener("DOMContentLoaded", hbInit);
