#!/usr/bin/env bash
# Builds the packages for both browser families from the same source (extension/):
#   dist/scam-detector-<version>-firefox.zip   upload to addons.mozilla.org
#   dist/scam-detector-<version>-chromium.zip  upload to the Chrome Web Store / Edge Add-ons
#   dist/chromium/                              unpacked, for "Load unpacked" in chrome://extensions
# Usage (from anywhere):  scripts/build.sh
set -euo pipefail
cd "$(dirname "$0")/.."

python3 scripts/check.py

version=$(python3 -c 'import json; print(json.load(open("extension/manifest.json"))["version"])')
firefox_zip="dist/scam-detector-${version}-firefox.zip"
chromium_zip="dist/scam-detector-${version}-chromium.zip"
mkdir -p dist
rm -rf "$firefox_zip" "$chromium_zip" dist/chromium

# Firefox: the folder as-is (the Chromium service worker entry file isn't needed).
(cd extension && zip -r -X -q "../$firefox_zip" . -x '.*' -x '*/.*' -x 'src/background/service-worker.js')

# Chromium: same files, generated manifest.
cp -r extension dist/chromium
python3 scripts/chromium_manifest.py extension/manifest.json > dist/chromium/manifest.json
(cd dist/chromium && zip -r -X -q "../../$chromium_zip" . -x '.*' -x '*/.*')

echo "Built $firefox_zip ($(du -h "$firefox_zip" | cut -f1))"
echo "Built $chromium_zip ($(du -h "$chromium_zip" | cut -f1)), unpacked copy in dist/chromium/"
