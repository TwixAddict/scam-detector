(function (SD) {
  "use strict";

  const resultsBox = document.getElementById("results");
  const contextLine = document.getElementById("context");
  const errorLine = document.getElementById("scan-error");

  // Everything the page-scan needs, injected only when the user clicks "Scan this page".
  const SCAN_FILES = [
    "src/core/lists.js", "src/core/i18n.js", "src/core/domain.js", "src/core/phrases.js", "src/core/detector.js",
    "src/core/html.js", "src/core/mime.js", "src/content/adapters.js", "src/content/runner.js",
  ];

  function timeAgo(ts) {
    if (!ts) return SD.t("time.never");
    const minutes = Math.round((Date.now() - ts) / 60000);
    if (minutes < 1) return SD.t("time.now");
    if (minutes < 60) return SD.t("time.min", { n: minutes });
    const hours = Math.round(minutes / 60);
    return hours < 48 ? SD.t("time.hours", { n: hours }) : SD.t("time.days", { n: Math.round(hours / 24) });
  }

  function showResults(results, label) {
    resultsBox.replaceChildren();
    contextLine.textContent = label;
    for (const result of results) {
      const card = SD.renderReport(result, { compact: true, brandLine: false, expanded: results.length === 1 && result.level !== "safe" });
      if (result.subject || result.sender) {
        const meta = document.createElement("p");
        meta.className = "small muted";
        meta.style.margin = "0 12px 8px";
        meta.textContent = [result.sender && result.sender.address, result.subject].filter(Boolean).join(" · ");
        card.querySelector(".sd-head").after(meta);
      }
      resultsBox.append(card);
    }
  }

  function showEmpty(text) {
    resultsBox.replaceChildren();
    const empty = document.createElement("div");
    empty.className = "empty";
    empty.textContent = text;
    resultsBox.append(empty);
  }

  // ---- Is the automatic check running in this Gmail / Outlook tab? ----

  const CONTENT = browser.runtime.getManifest().content_scripts[0];
  const MAIL_PAGE = /^https:\/\/(mail\.google\.com|outlook\.(live|office|office365)\.com)\//;

  function showAutoStatus(kind, text, fixLabel, onFix) {
    const box = document.getElementById("auto-status");
    const button = document.getElementById("auto-fix");
    box.hidden = false;
    box.className = `auto-status ${kind}`;
    document.getElementById("auto-text").textContent = text;
    button.hidden = !fixLabel;
    if (fixLabel) {
      button.textContent = fixLabel;
      button.onclick = onFix;
    }
  }

  async function checkAutomaticMode(tab) {
    if (!tab || !MAIL_PAGE.test(tab.url || "")) return;
    const site = tab.url.includes("mail.google.com") ? "Gmail" : "Outlook";

    if (!(await browser.permissions.contains({ origins: CONTENT.matches }))) {
      showAutoStatus("problem", SD.t("auto.noAccess", { site }), SD.t("auto.allow"), () => {
          // permissions.request must be the first thing the click does.
          browser.permissions.request({ origins: CONTENT.matches }).then(async (granted) => {
            if (!granted) return;
            await browser.runtime.sendMessage({ type: "startInOpenMailTabs" });
            setTimeout(() => checkAutomaticMode(tab), 800);
          });
        });
      return;
    }

    let probe;
    try {
      const [injection] = await browser.scripting.executeScript({
        target: { tabId: tab.id },
        func: () => {
          const SD = globalThis.ScamDetector;
          const adapter = SD && SD.pickAdapter && SD.pickAdapter();
          return {
            running: Boolean(globalThis.__scamDetectorRunning),
            found: adapter ? adapter.findMessages().length : -1,
            messageOpen: /\/[A-Za-z0-9_-]{16,}$/.test(location.hash) || /[?&]view=om\b/.test(location.search),
            counts: [
              "a3s=" + document.querySelectorAll("div.a3s").length,
              "msg=" + document.querySelectorAll("[data-message-id]").length,
              "email=" + document.querySelectorAll("[email]").length,
              "main=" + document.querySelectorAll("[role=main]").length,
            ].join(" "),
          };
        },
      });
      probe = injection && injection.result;
    } catch {
      return;
    }
    if (!probe) return;

    if (!probe.running) {
      showAutoStatus("problem", SD.t("auto.notRunning", { site }), SD.t("auto.start"), async () => {
        await browser.scripting.executeScript({ target: { tabId: tab.id }, files: CONTENT.js });
        setTimeout(() => checkAutomaticMode(tab), 1200);
      });
    } else if (probe.found === 0 && probe.messageOpen && site === "Gmail") {
      showAutoStatus("problem", SD.t("auto.notFound", { site, details: probe.counts }));
    } else {
      showAutoStatus("ok", SD.t("auto.ok", { site }));
    }
  }

  async function activeTab() {
    const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
    return tab;
  }

  async function loadTabResults() {
    const tab = await activeTab();
    const stored = tab ? await browser.runtime.sendMessage({ type: "getTabResults", tabId: tab.id }) : null;
    if (stored && stored.results && stored.results.length) {
      const site = stored.site === "gmail" ? "Gmail" : "Outlook";
      const count = stored.results.length;
      showResults(stored.results, count === 1 ? SD.t("popup.openOne", { site }) : SD.t("popup.openMany", { count, site }));
    } else {
      contextLine.textContent = "";
      showEmpty(SD.t("popup.empty"));
    }
  }

  async function scanPage() {
    errorLine.hidden = true;
    const button = document.getElementById("scan-page");
    button.disabled = true;
    button.textContent = SD.t("popup.scanning");
    try {
      const tab = await activeTab();
      await browser.scripting.executeScript({ target: { tabId: tab.id }, files: SCAN_FILES });
      const [injection] = await browser.scripting.executeScript({
        target: { tabId: tab.id },
        func: () => globalThis.ScamDetector.scanPage(),
      });
      const result = injection && injection.result;
      if (!result) throw new Error(SD.t("popup.noResult"));
      showResults([result], SD.t("popup.scanned", { host: new URL(tab.url).hostname }));
    } catch (err) {
      errorLine.textContent = SD.t("popup.scanError", { error: err.message });
      errorLine.hidden = false;
    } finally {
      button.disabled = false;
      button.textContent = SD.t("popup.scan");
    }
  }

  async function showFeedStatus() {
    const footer = document.getElementById("feed-status");
    const { settings } = await browser.storage.local.get("settings");
    if (settings && settings.threatFeed === false) {
      footer.textContent = SD.t("popup.feedOff");
      return;
    }
    const status = await browser.runtime.sendMessage({ type: "getFeedStatus" });
    footer.textContent = status.count
      ? SD.t("popup.feedCount", { count: status.count.toLocaleString(SD.lang), ago: timeAgo(status.updated) })
      : SD.t("popup.feedNone");
  }

  document.getElementById("scan-page").addEventListener("click", scanPage);
  document.getElementById("open-analyzer").addEventListener("click", () => {
    browser.tabs.create({ url: browser.runtime.getURL("src/analyzer/analyzer.html") });
    window.close();
  });
  document.getElementById("open-options").addEventListener("click", () => {
    browser.runtime.openOptionsPage();
    window.close();
  });

  const style = document.createElement("style");
  style.textContent = SD.REPORT_CSS;
  document.head.append(style);

  // Language first, so everything below is drawn in it.
  browser.storage.local.get("settings").then(({ settings }) => {
    SD.setLanguage(settings && settings.language);
    SD.translatePage();
    loadTabResults();
    activeTab().then(checkAutomaticMode);
    showFeedStatus();
  });
})(globalThis.ScamDetector);
