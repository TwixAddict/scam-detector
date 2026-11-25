(function (SD) {
  "use strict";

  const raw = document.getElementById("raw");
  const output = document.getElementById("output");
  const facts = document.getElementById("facts");
  const samples = document.getElementById("samples");
  const inputCard = document.querySelector(".input-card");

  function address(a) {
    if (!a) return "";
    return a.name ? `${a.name} <${a.address}>` : a.address;
  }

  function showFacts(email) {
    const rows = [
      [SD.t("fact.from"), address(email.from)],
      [SD.t("fact.replyTo"), (email.replyTo || []).map(address).join(", ")],
      [SD.t("fact.returnPath"), email.returnPath],
      [SD.t("fact.subject"), email.subject],
      [SD.t("fact.auth"), email.auth ? ["spf", "dkim", "dmarc"].map((k) => `${k.toUpperCase()} ${email.auth[k] || "—"}`).join(" · ") : SD.t("fact.authNone")],
      [SD.t("fact.links"), String((email.links || []).filter((l) => /^https?:/i.test(l.href)).length)],
      [SD.t("fact.attachments"), (email.attachments || []).map((a) => a.name).join(", ") || SD.t("fact.none")],
    ].filter(([, value]) => value);
    facts.replaceChildren();
    for (const [label, value] of rows) {
      const dt = document.createElement("dt");
      dt.textContent = label;
      const dd = document.createElement("dd");
      dd.textContent = value;
      facts.append(dt, dd);
    }
    facts.hidden = false;
  }

  async function analyze() {
    const text = raw.value.trim();
    if (!text) {
      output.className = "empty";
      output.textContent = SD.t("an.pasteFirst");
      facts.hidden = true;
      return;
    }
    const email = SD.emailFromRaw(text);
    const result = await SD.runAnalysis(email, { remember: false });
    output.className = "";
    output.replaceChildren(SD.renderReport(result, { expanded: true, brandLine: false }));
    showFacts(email);
  }

  async function loadFile(file) {
    if (!file) return;
    raw.value = await file.text();
    analyze();
  }

  function fillSamples() {
    for (const sample of SD.SAMPLES) {
      const option = document.createElement("option");
      option.value = sample.id;
      option.textContent = SD.t("sample." + sample.id);
      samples.append(option);
    }
  }
  samples.addEventListener("change", () => {
    const sample = SD.SAMPLES.find((s) => s.id === samples.value);
    if (!sample) return;
    raw.value = sample.raw;
    analyze();
  });

  document.getElementById("analyze").addEventListener("click", analyze);
  document.getElementById("file").addEventListener("change", (e) => loadFile(e.target.files[0]));
  raw.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) analyze();
  });
  inputCard.addEventListener("dragover", (e) => {
    e.preventDefault();
    inputCard.classList.add("dragging");
  });
  inputCard.addEventListener("dragleave", () => inputCard.classList.remove("dragging"));
  inputCard.addEventListener("drop", (e) => {
    e.preventDefault();
    inputCard.classList.remove("dragging");
    loadFile(e.dataTransfer.files[0]);
  });

  const style = document.createElement("style");
  style.textContent = SD.REPORT_CSS;
  document.head.append(style);

  SD.loadSettings().then((settings) => {
    SD.setLanguage(settings.language);
    SD.translatePage();
    fillSamples();
  });
})(globalThis.ScamDetector);
