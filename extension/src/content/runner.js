// Glue between the pure detector and the extension: settings, sender history, threat feed.
(function (SD) {
  "use strict";

  const MAX_KNOWN_SENDERS = 5000;
  let writeQueue = Promise.resolve();

  SD.loadSettings = async function () {
    const { settings } = await browser.storage.local.get("settings");
    return Object.assign({}, SD.DEFAULT_SETTINGS, settings || {});
  };

  SD.saveSettings = async function (patch) {
    const current = await SD.loadSettings();
    await browser.storage.local.set({ settings: Object.assign(current, patch) });
  };

  // Sender history stays in this browser's extension storage and never leaves the device.
  SD.rememberSender = function (from) {
    writeQueue = writeQueue.then(async () => {
      const { knownSenders = {} } = await browser.storage.local.get("knownSenders");
      const address = from.address.toLowerCase();
      if (knownSenders[address] === (from.name || "")) return;
      delete knownSenders[address]; // re-insert so the newest entries survive trimming
      knownSenders[address] = from.name || "";
      const keys = Object.keys(knownSenders);
      for (const old of keys.slice(0, Math.max(0, keys.length - MAX_KNOWN_SENDERS))) delete knownSenders[old];
      await browser.storage.local.set({ knownSenders });
    }).catch(() => {});
    return writeQueue;
  };

  async function threatMatchesFor(email) {
    const urls = new Set();
    for (const link of email.links || []) {
      if (!link.href) continue;
      urls.add(link.href);
      urls.add(SD.unwrapUrl(link.href));
    }
    if (!urls.size) return new Set();
    try {
      const reply = await browser.runtime.sendMessage({ type: "checkUrls", urls: [...urls] });
      return new Set((reply && reply.matches) || []);
    } catch {
      return new Set();
    }
  }

  SD.runAnalysis = async function (email, { remember = true } = {}) {
    const settings = await SD.loadSettings();
    SD.setLanguage(settings.language);
    const { knownSenders = {} } = await browser.storage.local.get("knownSenders");
    const threatMatches = settings.threatFeed ? await threatMatchesFor(email) : new Set();
    const result = SD.analyze(email, { settings, knownSenders, threatMatches });
    if (remember && settings.rememberSenders && email.from && email.from.address && result.level !== "danger") {
      SD.rememberSender(email.from);
    }
    return result;
  };

  // Entry point for the popup's "Scan this page" (injected with scripting.executeScript).
  SD.scanPage = async function () {
    const result = await SD.runAnalysis(SD.extractFromPage(), { remember: false });
    return { ...result, source: "page", url: location.href };
  };
})(globalThis.ScamDetector = globalThis.ScamDetector || {});
