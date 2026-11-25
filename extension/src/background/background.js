// Background: downloads public phishing feeds and answers "is this URL listed?" locally,
// and keeps the toolbar badge in sync with what the content script found.
(function (SD) {
  "use strict";

  // OpenPhish's free community feed (it redirects to a CORS-enabled GitHub copy).
  // URLhaus retired its anonymous downloads in 2026 and now needs an API key.
  const FEEDS = [{ id: "openphish", url: "https://openphish.com/feed.txt" }];
  const REFRESH_MINUTES = 6 * 60;
  const MAX_FEED_URLS = 150000;
  const BADGE = {
    danger: { text: "!", color: "#A32D2D" },
    warning: { text: "?", color: "#854F0B" },
    safe: { text: "", color: "#3B6D11" },
  };

  let index = null; // { urls: Set, hosts: Set }

  // Compare URLs without scheme, fragment or trailing slash.
  function normalize(raw) {
    const url = SD.parseUrl(raw);
    if (!url || !/^https?:$/.test(url.protocol)) return null;
    const path = url.pathname.replace(/\/+$/, "");
    return (url.hostname + path + url.search).toLowerCase();
  }

  function isSharedHost(host) {
    return SD.SHARED_PLATFORM_HOSTS.has(host) ||
      SD.FREE_HOSTING.includes(host) ||
      SD.hostInList(host, SD.SHARED_DOCUMENT_HOSTS);
  }

  function buildIndex(urls) {
    const built = { urls: new Set(), hosts: new Set() };
    for (const raw of urls) {
      const key = normalize(raw);
      if (!key) continue;
      built.urls.add(key);
      const host = key.split("/")[0].split("?")[0];
      if (!isSharedHost(host)) built.hosts.add(host);
    }
    return built;
  }

  async function getIndex() {
    if (index) return index;
    const { threatFeed } = await browser.storage.local.get("threatFeed");
    index = buildIndex((threatFeed && threatFeed.urls) || []);
    return index;
  }

  async function refreshFeeds() {
    const urls = [];
    const counts = {};
    const errors = [];
    for (const feed of FEEDS) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 30000);
        const response = await fetch(feed.url, { signal: controller.signal, credentials: "omit", cache: "no-store" });
        clearTimeout(timeout);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const lines = (await response.text()).split(/\r?\n/).map((l) => l.trim()).filter((l) => /^https?:\/\//i.test(l));
        counts[feed.id] = lines.length;
        urls.push(...lines);
      } catch (err) {
        errors.push(`${feed.id}: ${err.message || err}`);
      }
    }
    const { threatFeed: previous } = await browser.storage.local.get("threatFeed");
    // Keep the old list if every download failed.
    const keep = !urls.length && previous && previous.urls;
    const threatFeed = {
      urls: keep ? previous.urls : urls.slice(0, MAX_FEED_URLS),
      counts: keep ? previous.counts : counts,
      updated: keep ? previous.updated : Date.now(),
      lastAttempt: Date.now(),
      error: errors.join("; ") || null,
    };
    await browser.storage.local.set({ threatFeed });
    index = buildIndex(threatFeed.urls);
    return feedStatus(threatFeed);
  }

  function feedStatus(threatFeed) {
    return {
      count: threatFeed && threatFeed.urls ? threatFeed.urls.length : 0,
      counts: (threatFeed && threatFeed.counts) || {},
      updated: (threatFeed && threatFeed.updated) || null,
      error: (threatFeed && threatFeed.error) || null,
    };
  }

  async function checkUrls(urls) {
    const { settings } = await browser.storage.local.get("settings");
    if (settings && settings.threatFeed === false) return [];
    const idx = await getIndex();
    if (!idx.urls.size) return [];
    return urls.filter((raw) => {
      const key = normalize(raw);
      if (!key) return false;
      const host = key.split("/")[0].split("?")[0];
      return idx.urls.has(key) || idx.hosts.has(host);
    });
  }

  // ---- per-tab results and badge (storage.session survives the background unloading) ----

  async function setTabResults(tabId, payload) {
    await browser.storage.session.set({ ["tab:" + tabId]: payload });
    const levels = payload.results.map((r) => r.level);
    const worst = levels.includes("danger") ? "danger" : levels.includes("warning") ? "warning" : "safe";
    const badge = BADGE[worst];
    await browser.action.setBadgeText({ tabId, text: badge.text });
    await browser.action.setBadgeBackgroundColor({ tabId, color: badge.color });
  }

  async function getTabResults(tabId) {
    const key = "tab:" + tabId;
    const stored = await browser.storage.session.get(key);
    return stored[key] || null;
  }

  browser.runtime.onMessage.addListener((message, sender) => {
    switch (message && message.type) {
      case "checkUrls":
        return checkUrls(message.urls || []).then((matches) => ({ matches }));
      case "pageResults":
        if (sender.tab) {
          return setTabResults(sender.tab.id, { site: message.site, results: message.results, url: sender.tab.url, at: Date.now() });
        }
        return undefined;
      case "getTabResults":
        return getTabResults(message.tabId);
      case "refreshFeeds":
        return refreshFeeds();
      case "startInOpenMailTabs":
        return startInOpenMailTabs();
      case "getFeedStatus":
        return browser.storage.local.get("threatFeed").then(({ threatFeed }) => feedStatus(threatFeed));
      default:
        return undefined;
    }
  });

  browser.tabs.onUpdated.addListener((tabId, changeInfo) => {
    if (changeInfo.status === "loading") browser.storage.session.remove("tab:" + tabId);
  });
  browser.tabs.onRemoved.addListener((tabId) => browser.storage.session.remove("tab:" + tabId));

  browser.alarms.onAlarm.addListener(async (alarm) => {
    if (alarm.name !== "refresh-feeds") return;
    const { settings, threatFeed } = await browser.storage.local.get(["settings", "threatFeed"]);
    if (settings && settings.threatFeed === false) return;
    const fresh = threatFeed && threatFeed.lastAttempt && Date.now() - threatFeed.lastAttempt < (REFRESH_MINUTES - 10) * 60000;
    if (!fresh) refreshFeeds();
  });

  async function setup() {
    const { settings } = await browser.storage.local.get("settings");
    if (!settings) await browser.storage.local.set({ settings: SD.DEFAULT_SETTINGS });
    browser.alarms.create("refresh-feeds", { periodInMinutes: REFRESH_MINUTES, delayInMinutes: 1 });
  }

  // ---- Gmail / Outlook access ----

  const CONTENT = browser.runtime.getManifest().content_scripts[0];
  SD.MAIL_ORIGINS = CONTENT.matches;

  function hasMailAccess() {
    return browser.permissions.contains({ origins: SD.MAIL_ORIGINS });
  }

  // Content scripts only start in pages loaded after the extension, so a Gmail tab that was
  // already open would show nothing until reloaded. Start the checker in those tabs directly.
  async function startInOpenMailTabs() {
    if (!(await hasMailAccess())) return;
    const tabs = await browser.tabs.query({ url: SD.MAIL_ORIGINS });
    for (const tab of tabs) {
      browser.scripting.executeScript({ target: { tabId: tab.id }, files: CONTENT.js }).catch(() => {});
    }
  }

  browser.permissions.onAdded.addListener(startInOpenMailTabs);

  browser.runtime.onInstalled.addListener(async (details) => {
    await setup();
    startInOpenMailTabs();
    if (details.reason === "install") {
      const { settings } = await browser.storage.local.get("settings");
      if (settings.threatFeed) refreshFeeds();
      // Some Firefox-based browsers don't grant site access at install; Settings has the button.
      if (!(await hasMailAccess())) browser.runtime.openOptionsPage();
    }
  });
  browser.runtime.onStartup.addListener(setup);
})(globalThis.ScamDetector);
