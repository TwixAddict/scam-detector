#!/usr/bin/env bash
# Assembles the GitHub Pages site in _site/: the pages in docs/ plus the extension's own
# checking code (for the live demo). Used by .github/workflows/pages.yml; also works locally:
#   scripts/build-site.sh && python3 -m http.server -d _site 8000
set -euo pipefail
cd "$(dirname "$0")/.."

rm -rf _site
mkdir -p _site/app/analyzer
cp -r docs/. _site/
cp -r extension/src/core extension/src/ui extension/icons _site/app/
cp extension/src/analyzer/samples.js _site/app/analyzer/
touch _site/.nojekyll
echo "Site built in _site/"
