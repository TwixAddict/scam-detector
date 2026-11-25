(function (SD) {
  "use strict";

  const form = document.getElementById("settings");
  const savedLine = document.getElementById("saved");
  const LIST_FIELDS = ["trustedDomains", "ownDomains"];

  function parseDomains(text) {
    return [...new Set(text.split(/[\s,;]+/).map((d) => d.trim().toLowerCase().replace(/^@/, "").replace(/^https?:\/\//, "").replace(/\/.*$/, "")).filter(Boolean))];
  }

  async function load() {
    const { settings } = await browser.storage.local.get("settings");
    const values = Object.assign({}, SD.DEFAULT_SETTINGS, settings || {});
    SD.setLanguage(values.language);
    SD.translatePage();
    for (const element of form.elements) {
      if (!element.name || !(element.name in values)) continue;
      if (element.type === "checkbox") element.checked = Boolean(values[element.name]);
      else if (LIST_FIELDS.includes(element.name)) element.value = values[element.name].join("\n");
      else element.value = values[element.name];
    }
    showFeedStatus();
    showSenderCount();
  }

  let savedTimer = null;
  async function save() {
    const settings = {};
    for (const element of form.elements) {
      if (!element.name) continue;
      if (element.type === "checkbox") settings[element.name] = element.checked;
      else if (LIST_FIELDS.includes(element.name)) settings[element.name] = parseDomains(element.value);
      else settings[element.name] = element.value;
    }
    await browser.storage.local.set({ settings });
    if (SD.resolveLanguage(settings.language) !== SD.lang) {
      SD.setLanguage(settings.language);
      SD.translatePage();
      showFeedStatus();
      showSenderCount();
    }
    savedLine.textContent = SD.t("opt.saved");
    clearTimeout(savedTimer);
    savedTimer = setTimeout(() => (savedLine.textContent = ""), 1500);
  }

  async function showFeedStatus() {
    const status = await browser.runtime.sendMessage({ type: "getFeedStatus" });
    const line = document.getElementById("feed-status");
    if (!status.count) {
      line.textContent = status.error ? SD.t("opt.feedNoneErr", { error: status.error }) : SD.t("opt.feedNone");
      return;
    }
    const parts = Object.entries(status.counts).map(([id, n]) => `${id}: ${n.toLocaleString()}`).join(", ");
    line.textContent = SD.t("opt.feedStatus", { count: status.count.toLocaleString(SD.lang), parts, date: new Date(status.updated).toLocaleString(SD.lang) }) +
      (status.error ? SD.t("opt.feedProblem", { error: status.error }) : "");
  }

  async function showSenderCount() {
    const { knownSenders = {} } = await browser.storage.local.get("knownSenders");
    document.getElementById("sender-count").textContent = SD.t("opt.senderCount", { count: Object.keys(knownSenders).length.toLocaleString(SD.lang) });
  }

  const MAIL_ORIGINS = browser.runtime.getManifest().content_scripts[0].matches;
  async function showAccess() {
    document.getElementById("access").hidden = await browser.permissions.contains({ origins: MAIL_ORIGINS });
  }
  document.getElementById("grant-access").addEventListener("click", () => {
    browser.permissions.request({ origins: MAIL_ORIGINS }).then(showAccess);
  });
  showAccess();

  form.addEventListener("change", save);
  form.addEventListener("submit", (e) => e.preventDefault());

  document.getElementById("refresh-feeds").addEventListener("click", async (event) => {
    const button = event.currentTarget;
    button.disabled = true;
    button.textContent = SD.t("opt.updating");
    await browser.runtime.sendMessage({ type: "refreshFeeds" });
    await showFeedStatus();
    button.disabled = false;
    button.textContent = SD.t("opt.update");
  });

  document.getElementById("clear-senders").addEventListener("click", async () => {
    if (!confirm(SD.t("opt.forgetConfirm"))) return;
    await browser.storage.local.remove("knownSenders");
    showSenderCount();
  });

  load();
})(globalThis.ScamDetector);
