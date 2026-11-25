// Watches Gmail / Outlook for opened messages, analyzes each one and shows a banner above it.
(function (SD) {
  "use strict";

  const adapter = SD.pickAdapter();
  // The background also injects this file into Gmail tabs that were open before install;
  // the flag stops it from running twice in the same page.
  if (!adapter || globalThis.__scamDetectorRunning) return;
  globalThis.__scamDetectorRunning = true;

  const results = new Map(); // message key -> result
  const pending = new Set();
  const dismissed = new Set();
  let settings = SD.DEFAULT_SETTINGS;
  let timer = null;

  function bannerFor(anchor) {
    const prev = anchor.previousElementSibling;
    return prev && prev.classList.contains("scam-detector-banner") ? prev : null;
  }

  function placeBanner(message, result) {
    const existing = bannerFor(message.anchor);
    // Every checked email gets a card (green when it passed), so you can see it was checked.
    const visible = !dismissed.has(message.key);
    if (!visible) {
      if (existing) existing.remove();
      return;
    }
    const theme = SD.mailboxTheme(message.anchor);
    if (existing && existing.dataset.key === message.key && existing.dataset.score === String(result.score) &&
        existing.dataset.theme === theme) return;

    const actions = [];
    const domain = result.sender && SD.domainOfAddress(result.sender.address);
    if (domain && result.level !== "safe" && !result.trusted) {
      actions.push({
        label: SD.t("action.trust"),
        onClick: async () => {
          const ok = confirm(SD.t("action.trustConfirm", { domain }));
          if (!ok) return;
          const current = await SD.loadSettings();
          await SD.saveSettings({ trustedDomains: [...new Set([...current.trustedDomains, domain])] });
        },
      });
    }
    actions.push({
      label: SD.t("action.close"),
      onClick: () => {
        dismissed.add(message.key);
        bannerFor(message.anchor)?.remove();
      },
    });

    insertCard(message, String(result.score), theme, SD.renderReport(result, { actions, theme }));
  }

  // Puts a card (in its own shadow root, so Gmail's CSS can't touch it) right above the email.
  function insertCard(message, scoreTag, theme, card) {
    bannerFor(message.anchor)?.remove();
    const host = document.createElement("div");
    host.className = "scam-detector-banner";
    host.dataset.key = message.key;
    host.dataset.score = scoreTag;
    host.dataset.theme = theme;
    const shadow = host.attachShadow({ mode: "open" });
    const style = document.createElement("style");
    style.textContent = SD.REPORT_CSS;
    shadow.append(style, card);
    message.anchor.before(host);
  }

  async function scan() {
    timer = null;
    if (!settings[adapter.id]) return;
    const messages = adapter.findMessages();
    for (const message of messages) {
      if (!message.ready()) continue;
      const cached = results.get(message.key);
      if (cached) {
        placeBanner(message, cached);
        continue;
      }
      if (pending.has(message.key)) continue;
      pending.add(message.key);
      if (!dismissed.has(message.key)) {
        const theme = SD.mailboxTheme(message.anchor);
        insertCard(message, "checking", theme, SD.renderChecking({ theme }));
      }
      try {
        const result = await SD.runAnalysis(message.extract());
        results.set(message.key, result);
        placeBanner(message, result);
      } catch (err) {
        console.warn("[Scam Detector] analysis failed", err);
        bannerFor(message.anchor)?.remove();
      } finally {
        pending.delete(message.key);
      }
    }
    reportToToolbar(messages);
  }

  // Lets the toolbar badge and popup show what's on screen right now.
  let lastReport = "";
  function reportToToolbar(messages) {
    const visible = messages.map((m) => results.get(m.key)).filter(Boolean);
    const signature = visible.map((r) => r.score + r.subject).join("|");
    if (signature === lastReport) return;
    lastReport = signature;
    browser.runtime.sendMessage({ type: "pageResults", site: adapter.id, results: visible }).catch(() => {});
  }

  function schedule() {
    if (!timer) timer = setTimeout(scan, 500);
  }

  let observing = false;
  async function start() {
    settings = await SD.loadSettings();
    SD.setLanguage(settings.language);
    if (!settings[adapter.id] || observing) return;
    observing = true;
    new MutationObserver(schedule).observe(document.body, { childList: true, subtree: true });
    // Switching the mailbox theme mostly changes classes and stylesheets near the top of the page.
    new MutationObserver(schedule).observe(document.documentElement, { attributes: true, attributeFilter: ["class", "style"] });
    new MutationObserver(schedule).observe(document.head, { childList: true });
    new MutationObserver(schedule).observe(document.body, { attributes: true, attributeFilter: ["class", "style"] });
    window.addEventListener("hashchange", schedule);
    schedule();
  }

  browser.storage.onChanged.addListener((changes, area) => {
    if (area !== "local" || !changes.settings) return;
    // Settings affect scoring, so re-analyze everything on screen.
    results.clear();
    for (const banner of document.querySelectorAll(".scam-detector-banner")) banner.remove();
    SD.loadSettings().then((s) => {
      SD.setLanguage(s.language);
      const wasEnabled = settings[adapter.id];
      settings = s;
      if (!wasEnabled && s[adapter.id]) start();
      else if (s[adapter.id]) schedule();
    });
  });

  start();
})(globalThis.ScamDetector);
