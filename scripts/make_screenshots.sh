#!/usr/bin/env bash
# Captures the store screenshots (1280x800) and the Chrome Web Store promo tile (440x280) with headless Firefox.
# Usage (from anywhere):  scripts/make_screenshots.sh
set -euo pipefail
cd "$(dirname "$0")/.."

port=8799
python3 -m http.server "$port" --bind 127.0.0.1 >/dev/null 2>&1 &
server=$!
profile=$(mktemp -d)
trap 'kill $server; rm -rf "$profile"' EXIT
sleep 1

for shot in 1 2 3; do
  firefox --headless --no-remote --profile "$profile" --window-size=1280,800 \
    --screenshot "$PWD/store/screenshot-$shot.png" "http://127.0.0.1:$port/store/screenshots.html?shot=$shot" >/dev/null 2>&1
  echo "store/screenshot-$shot.png"
done

# Chrome Web Store small promo tile
firefox --headless --no-remote --profile "$profile" --window-size=440,280 \
  --screenshot "$PWD/store/promo-tile-440x280.png" "http://127.0.0.1:$port/store/promo-tile.html" >/dev/null 2>&1
echo "store/promo-tile-440x280.png"
