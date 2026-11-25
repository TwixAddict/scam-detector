// Chromium entry point. Chromium runs an extension's background as a single service worker,
// so this file loads the same scripts that Firefox lists under "background" in manifest.json.
// scripts/check.py makes sure the two lists stay the same.
importScripts(
  "../core/browser-compat.js",
  "../core/lists.js",
  "../core/i18n.js",
  "../core/domain.js",
  "../core/phrases.js",
  "../core/detector.js",
  "background.js"
);
