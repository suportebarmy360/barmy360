// Envio de artes do Hand Banner sem login Google.
// Limite: até 3 envios por aparelho/navegador usando device_id salvo no localStorage.

const HB_DEVICE_KEY = "barmy360_handbanner_art_device_id";

function hbGetDeviceId() {
  let id = localStorage.getItem(HB_DEVICE_KEY);
  if (!id) {
    id = "device_" + Date.now().toString(36) + "_" + Math.random().toString(36).slice(2, 12);
    localStorage.setItem(HB_DEVICE_KEY, id);
  }
  return id;
}

function hbSetMsg(id, text) {
  const el = document.getElementById(id);
  if (el) el.textContent = text || "";
}

function hbShowForm() {
  document.getElementById("hbLoginCard")?.classList.add("hidden");
  document.getElementById("hbFormCard")?.classList.remove("hidden");
}

function hbValidateUrl(value) {
  try {
    const url = new URL(value);
    return ["http:", "https:"].includes(url.protocol);
  } catch (_) {
    return false;
  }
}

async function hbInit() {
  hbShowForm();

  const form = document.getElementById("hbSubmissionForm");
  if (form && !form.dataset.bound) {
    form.addEventListener("submit", hbSubmit);
    form.dataset.bound = "true";
  }

  const deviceId = hbGetDeviceId();
  const hint = document.getElementById("hbDeviceHint");
  if (hint) hint.textContent = "Limite: até 3 envios neste aparelho/navegador.";

  if (window.BARMY360_SUPABASE) {
    try {
      const { count } = await BARMY360_SUPABASE
        .from("handbanner_art_submissions")
        .select("id", { count: "exact", head: true })
        .eq("device_id", deviceId);

      if (typeof count === "number") {
        hbSetMsg("hbFormMsg", `${count}/3 envio(s) usados neste aparelho.`);
      }
    } catch (_) {
      // Se RLS bloquear a contagem direta, a validação final ainda acontece na função RPC.
    }
  }
}

async function hbSubmit(e) {
  e.preventDefault();

  const msgId = "hbFormMsg";
  const submitBtn = e.target.querySelector('button[type="submit"]');

  if (!window.BARMY360_SUPABASE) {
    hbSetMsg(msgId, "Supabase não conectado. Confira assets/js/config.js.");
    return;
  }

  const deviceId = hbGetDeviceId();
  const fullName = document.getElementById("hbFullName")?.value.trim() || "";
  const social = document.getElementById("hbSocial")?.value.trim() || "";
  const email = document.getElementById("hbEmail")?.value.trim() || "";
  const cloudLink = document.getElementById("hbCloudLink")?.value.trim() || "";
  const minorLink = document.getElementById("hbMinorAuthorizationLink")?.value.trim() || "";
  const agreeTerm = !!document.getElementById("hbAgreeTerm")?.checked;
  const agreeMinor = !!document.getElementById("hbAgreeMinor")?.checked;
  const agreeRules = !!document.getElementById("hbAgreeRules")?.checked;
  const observation = document.getElementById("hbObservation")?.value.trim() || "";

  if (!fullName || !social || !email || !cloudLink) {
    hbSetMsg(msgId, "Preencha nome, rede social, e-mail e link da arte.");
    return;
  }

  if (!hbValidateUrl(cloudLink)) {
    hbSetMsg(msgId, "Cole um link válido do Drive/Nuvem começando com http ou https.");
    return;
  }

  if (minorLink && !hbValidateUrl(minorLink)) {
    hbSetMsg(msgId, "O link do termo de menor precisa começar com http ou https.");
    return;
  }

  if (!agreeTerm || !agreeMinor || !agreeRules) {
    hbSetMsg(msgId, "Marque todos os termos obrigatórios antes de enviar.");
    return;
  }

  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.textContent = "Enviando...";
  }
  hbSetMsg(msgId, "Verificando limite e enviando...");

  const payload = {
    p_device_id: deviceId,
    p_full_name: fullName,
    p_social_handle: social,
    p_contact_email: email,
    p_cloud_link: cloudLink,
    p_minor_authorization_link: minorLink,
    p_agree_term: agreeTerm,
    p_agree_minor: agreeMinor,
    p_agree_rules: agreeRules,
    p_observation: observation,
  };

  const { data, error } = await BARMY360_SUPABASE.rpc(
    "registrar_envio_arte_handbanner",
    payload
  );

  if (submitBtn) {
    submitBtn.disabled = false;
    submitBtn.textContent = "Enviar arte";
  }

  if (error) {
    console.error(error);
    hbSetMsg(msgId, error.message || "Erro ao enviar. Confira o SQL do Supabase.");
    return;
  }

  e.target.reset();
  hbSetMsg(msgId, `Envio registrado com sucesso 💜 (${Number(data || 1)}/3 neste aparelho)`);
}

// Mantém compatibilidade caso algum botão antigo ainda chame hbLoginGoogle.
async function hbLoginGoogle() {
  hbShowForm();
  hbSetMsg("hbFormMsg", "O login Google foi removido. O limite agora é de 3 envios por aparelho/navegador.");
}

document.addEventListener("DOMContentLoaded", hbInit);
