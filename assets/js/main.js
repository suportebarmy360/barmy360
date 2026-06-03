function unlockProjects() {
  const input = document.getElementById("projectPassword");
  const err = document.getElementById("projectError");
  const answer = (input?.value || "").trim().toLowerCase();

  if (["brigadeiro", "brigadeiros"].includes(answer)) {
    localStorage.setItem("barmy360_projects_unlocked", "yes");
    showProjects();
  } else if (err) {
    err.textContent = "Resposta incorreta. Tente novamente.";
  }
}

function lockProjects() {
  localStorage.removeItem("barmy360_projects_unlocked");
  location.reload();
}

function showProjects() {
  document.getElementById("projectGate")?.classList.add("hidden");
  document.getElementById("projectContent")?.classList.remove("hidden");
}

function updateCountdowns() {
  document.querySelectorAll(".mini-count").forEach((card) => {
    const target = new Date(card.dataset.date).getTime();
    const diff = target - Date.now();
    const out = card.querySelector(".count-result");

    if (!out) return;

    if (diff <= 0) {
      out.textContent = "Chegou o dia!";
      return;
    }

    const d = Math.floor(diff / 86400000);
    const h = Math.floor((diff % 86400000) / 3600000);
    const m = Math.floor((diff % 3600000) / 60000);

    out.textContent = `${d} dias, ${h}h e ${m}min`;
  });
}

document.addEventListener("DOMContentLoaded", () => {
  if (localStorage.getItem("barmy360_projects_unlocked") === "yes") {
    showProjects();
  }

  updateCountdowns();
  setInterval(updateCountdowns, 60000);
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
