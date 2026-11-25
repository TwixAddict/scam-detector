"""Pre-release checks for the extension folder. Run from the repository root: python3 scripts/check.py

Catches what Firefox Add-ons (AMO) review commonly rejects: a broken manifest, files that are
referenced but missing, and unsafe code patterns (innerHTML, eval, remote scripts).
"""
import json
import os
import re
import sys

EXT = "extension"
problems = []


def fail(message):
    problems.append(message)


manifest = json.load(open(os.path.join(EXT, "manifest.json"), encoding="utf-8"))

for key in ("manifest_version", "name", "version", "description", "browser_specific_settings"):
    if key not in manifest:
        fail(f"manifest.json: missing {key}")
if not re.fullmatch(r"\d+(\.\d+){0,3}", manifest.get("version", "")):
    fail("manifest.json: version must be numbers and dots, e.g. 1.0.0")
if len(manifest.get("description", "")) > 132:
    fail("manifest.json: description is longer than 132 characters")
gecko = manifest.get("browser_specific_settings", {}).get("gecko", {})
if not gecko.get("id"):
    fail("manifest.json: browser_specific_settings.gecko.id is required for AMO")
if "data_collection_permissions" not in gecko:
    fail("manifest.json: gecko.data_collection_permissions is required for new AMO submissions")

# Every file the manifest points at must exist.
referenced = list(manifest.get("background", {}).get("scripts", []))
for cs in manifest.get("content_scripts", []):
    referenced += cs.get("js", []) + cs.get("css", [])
referenced += list(manifest.get("icons", {}).values())
referenced += list(manifest.get("action", {}).get("default_icon", {}).values())
referenced += [manifest.get("action", {}).get("default_popup", ""), manifest.get("options_ui", {}).get("page", "")]
for path in filter(None, referenced):
    if not os.path.isfile(os.path.join(EXT, path)):
        fail(f"manifest.json references a missing file: {path}")

# The Chromium service worker must load exactly the scripts Firefox lists as background scripts.
sw_path = os.path.join(EXT, "src", "background", "service-worker.js")
if os.path.isfile(sw_path):
    imported = re.findall(r'"([^"]+\.js)"', open(sw_path, encoding="utf-8").read())
    as_manifest = [os.path.normpath(os.path.join("src/background", p)) for p in imported]
    if as_manifest != manifest.get("background", {}).get("scripts", []):
        fail("src/background/service-worker.js doesn't import the same scripts as manifest.json background.scripts")
else:
    fail("missing src/background/service-worker.js (needed for the Chromium build)")

# Every local script, stylesheet and image in the HTML pages must exist; nothing may load from the web.
for root, _, files in os.walk(EXT):
    for name in files:
        path = os.path.join(root, name)
        if name.endswith(".html"):
            html = open(path, encoding="utf-8").read()
            for ref in re.findall(r'(?:src|href)="([^"]+)"', html):
                if ref.startswith(("http://", "https://", "//")):
                    if re.search(r'<script[^>]+src="' + re.escape(ref), html) or re.search(r'<link[^>]+href="' + re.escape(ref), html):
                        fail(f"{path}: loads remote code {ref}")
                    continue
                if ref.startswith(("#", "mailto:")):
                    continue
                if not os.path.isfile(os.path.normpath(os.path.join(root, ref))):
                    fail(f"{path}: missing {ref}")
        if name.endswith((".js", ".html", ".css", ".json")):
            # Chrome refuses files that aren't valid UTF-8 or contain Unicode "noncharacters" (e.g. U+FFFF).
            try:
                text = open(path, "rb").read().decode("utf-8")
            except UnicodeDecodeError:
                fail(f"{path}: not valid UTF-8")
                continue
            bad = next((i for i, c in enumerate(text) if 0xFDD0 <= ord(c) <= 0xFDEF or (ord(c) & 0xFFFE) == 0xFFFE), None)
            if bad is not None:
                fail(f"{path}:{text.count(chr(10), 0, bad) + 1}: contains a Unicode noncharacter (write it as a \\u escape)")
        if name.endswith(".js"):
            code = open(path, encoding="utf-8").read()
            for pattern, why in [
                (r"\.innerHTML\s*=", "innerHTML assignment"),
                (r"\.outerHTML\s*=", "outerHTML assignment"),
                (r"insertAdjacentHTML", "insertAdjacentHTML"),
                (r"document\.write\(", "document.write"),
                (r"(?<![.\w])eval\(", "eval"),
                (r"new Function\(", "new Function"),
                (r"setTimeout\(\s*['\"]", "setTimeout with a string"),
            ]:
                for match in re.finditer(pattern, code):
                    line = code.count("\n", 0, match.start()) + 1
                    # Detector regexes mention eval( as text to *find* it in emails; those are fine.
                    context = code[code.rfind("\n", 0, match.start()) + 1: code.find("\n", match.start())]
                    if "/" in context and ("test(" in context or "RegExp" in context or re.search(r"/[^/]*" + re.escape(match.group(0)), context)):
                        continue
                    fail(f"{path}:{line}: {why}")
        if name.startswith(".") or name.endswith((".map", ".orig", ".rej", "~")):
            fail(f"{path}: stray file that shouldn't be shipped")

if problems:
    print("Problems found:")
    for p in problems:
        print("  -", p)
    sys.exit(1)
print(f"OK: {manifest['name']} {manifest['version']} passes the pre-release checks")
