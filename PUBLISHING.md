# Publishing Scam Detector

Everything is prepared; these are the steps that need your accounts. Do them in this order.

## 0. Check the names used in the links

The links in this project assume:

- GitHub repository: **github.com/TwixAddict/scam-detector**
- Website: **twixaddict.github.io/scam-detector**
- Firefox Add-ons page: **addons.mozilla.org/firefox/addon/scam-detector-school**

If you use a different GitHub account or repository name, or AMO gives you another add-on URL, replace them everywhere in one go (from the repository root):

```bash
grep -rl "TwixAddict/scam-detector\|twixaddict.github.io\|scam-detector-school" --exclude-dir=.git . | xargs sed -i "s#TwixAddict/scam-detector#NEWNAME/NEWREPO#g; s#twixaddict.github.io/scam-detector#newname.github.io/newrepo#g; s#scam-detector-school#new-amo-slug#g"
```

The add-on ID in `extension/manifest.json` (`scam-detector@twixaddict.github.io`) can stay as it is: it only has to be unique, and it can never change after the first upload.

## 1. GitHub repository

1. On github.com, create a new **public** repository called `scam-detector`. Don't add a README, license or .gitignore: they're already here.
2. Push this folder (it's already a git repository with a first commit):
   ```bash
   git remote add origin https://github.com/TwixAddict/scam-detector.git
   git push -u origin main
   ```
3. On GitHub: **Settings → Pages → Build and deployment → Source: GitHub Actions**. The "Website" workflow then publishes the site after every push. Check the **Actions** tab; the site appears at https://twixaddict.github.io/scam-detector/ within a minute or two.
4. Optional: **Settings → General → About**: add the website link and the topics `firefox-extension`, `phishing`, `school-project`.

## 2. Firefox Add-ons (addons.mozilla.org)

1. Build the package: `scripts/build.sh` → `dist/scam-detector-1.0.0.zip`.
2. Go to https://addons.mozilla.org/developers/ and sign in with a Mozilla account (two-step authentication is required for developers).
3. **Submit a New Add-on** → **On this site** (listed publicly) → upload the zip.
   - "Do you need to submit source code?" → **No**: the code isn't minified or bundled; the zip contains the source as-is.
4. Fill in the listing with the text in [store/AMO-LISTING.md](store/AMO-LISTING.md): name, summary, description, categories, support site, license (MIT), privacy policy, and the **notes to reviewer**.
5. Upload the images from `store/`: `icon-512.png` as the icon (if asked) and `screenshot-1.png` to `screenshot-3.png`.
6. Submit. Mozilla reviews new add-ons; this usually takes from a few hours to a few days. You'll get an email.
7. After approval, check the add-on's URL. If it isn't `scam-detector-school`, run the replace command from step 0 and push.

## 3. Release on GitHub

Tag the version that was submitted, so the zip is also downloadable from GitHub:

```bash
git tag v1.0.0
git push origin v1.0.0
```

The "Release" workflow builds the zip and creates the GitHub release.

## Later versions

1. Change `"version"` in `extension/manifest.json` (e.g. `1.0.1`). AMO rejects an upload with a version it has already seen.
2. Run the tests (`test/tests.html`) and `scripts/build.sh`.
3. On AMO: your add-on → **Upload New Version** → the new zip.
4. Commit, then `git tag v1.0.1 && git push origin main v1.0.1`.
