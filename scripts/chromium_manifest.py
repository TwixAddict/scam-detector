"""Turns the Firefox manifest into the Chromium one (Chrome, Edge, Brave, Opera, Vivaldi).

Usage: python3 scripts/chromium_manifest.py extension/manifest.json > out/manifest.json

The only differences:
- Chromium runs the background as one service worker instead of a list of scripts.
- Firefox-only settings (add-on ID, data collection declaration) are removed.
"""
import json
import sys

manifest = json.load(open(sys.argv[1], encoding="utf-8"))

manifest["background"] = {"service_worker": "src/background/service-worker.js"}
manifest.pop("browser_specific_settings", None)
manifest["minimum_chrome_version"] = "116"

print(json.dumps(manifest, indent=2, ensure_ascii=False))
