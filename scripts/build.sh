#!/usr/bin/env bash
# Builds the zip you upload to Firefox Add-ons (addons.mozilla.org).
# Usage (from anywhere):  scripts/build.sh
set -euo pipefail
cd "$(dirname "$0")/.."

python3 scripts/check.py

version=$(python3 -c 'import json; print(json.load(open("extension/manifest.json"))["version"])')
out="dist/scam-detector-${version}.zip"
mkdir -p dist
rm -f "$out"
# manifest.json must sit at the root of the zip, so zip from inside the folder.
(cd extension && zip -r -X -q "../$out" . -x '.*' -x '*/.*')
echo "Built $out ($(du -h "$out" | cut -f1))"
