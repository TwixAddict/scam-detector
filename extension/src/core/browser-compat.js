// Firefox names the extension API `browser`; Chromium (Chrome, Edge, Brave, Opera) names it `chrome`.
// Both return promises in Manifest V3, so giving them one name is enough for this extension.
if (typeof globalThis.browser === "undefined" && typeof globalThis.chrome !== "undefined") {
  globalThis.browser = globalThis.chrome;
}
