# Chrome Web Store and Microsoft Edge Add-ons listing

The Chromium package is `dist/scam-detector-<version>-chromium.zip` (made by `scripts/build.sh`). The same zip works for:

- **Chrome Web Store**: also where Brave, Opera and Vivaldi users install from.
- **Microsoft Edge Add-ons**: free to publish.

Images in this folder: `screenshot-1.png` to `screenshot-3.png` (1280×800), `promo-tile-440x280.png`, and the 128×128 icon at `extension/icons/icon-128.png`.

The listing **description** and **summary** are the same as for Firefox: copy them from [AMO-LISTING.md](AMO-LISTING.md) (English, Dutch and French).

## Chrome Web Store: "Store listing" tab

| Field | Value |
|---|---|
| Title | Scam Detector (taken from the package) |
| Summary | taken from the package: "Warns about phishing and scam emails in Gmail and Outlook, checked on your own device. Open-source school project." |
| Description | the English description from AMO-LISTING.md |
| Category | Privacy & Security (or Tools, if your category list doesn't have it) |
| Language | English (add Dutch and French under "Add localized listing" if you like) |
| Store icon | `extension/icons/icon-128.png` |
| Screenshots | `store/screenshot-1.png`, `screenshot-2.png`, `screenshot-3.png` |
| Small promo tile | `store/promo-tile-440x280.png` |
| Official URL / Homepage | https://twixaddict.github.io/scam-detector/ |
| Support URL | https://github.com/TwixAddict/scam-detector/issues |

## Chrome Web Store: "Privacy" tab

**Single purpose**
> Scam Detector has one purpose: warning users about phishing and scam emails. It checks the email that is open in Gmail or Outlook on the web and shows a warning card above it explaining what looks suspicious. It is an open-source school project: https://github.com/TwixAddict/scam-detector

**Permission justifications** (one box per permission):

| Permission | Justification to paste |
|---|---|
| storage | Saves the user's settings, an optional local list of known senders (used to detect impostors who copy a known name; can be turned off and cleared), and the downloaded public phishing link list. Everything stays on the user's device. |
| alarms | Refreshes the public OpenPhish phishing link list every 6 hours. |
| activeTab | Used only when the user clicks "Scan this page" in the popup, to check the page they are looking at once. |
| scripting | Injects the checker for "Scan this page", and starts the checker in Gmail/Outlook tabs that were already open when the extension was installed. |
| Host permissions | mail.google.com, outlook.live.com, outlook.office.com and outlook.office365.com: to read the open email in the page and show the warning card above it. openphish.com: to download the public phishing link list. No other sites. |

**Remote code**: select **No, I am not using remote code**. All JavaScript is in the package; the OpenPhish list is plain data (a list of URLs), not code.

**Data usage**: tick **none** of the data types. The extension reads email content in the page only to analyze it locally and never transmits, stores remotely or sells it. Then tick the three certifications:
- I do not sell or transfer user data to third parties, outside of the approved use cases
- I do not use or transfer user data for purposes that are unrelated to my item's single purpose
- I do not use or transfer user data to determine creditworthiness or for lending purposes

**Privacy policy URL**: https://twixaddict.github.io/scam-detector/privacy.html

## Chrome Web Store: notes for the reviewer (if asked, or in "Test instructions")

> Open-source school project: https://github.com/TwixAddict/scam-detector. No minified, bundled or remote code.
> To test without a Gmail account: click the toolbar button → "Check email source…" → "Load an example…" (10 examples: 8 scams, 2 normal emails). In Gmail or Outlook on the web, a card appears above any opened email.

## Microsoft Edge Add-ons (Partner Center)

The Edge form asks for the same things with slightly different names:

| Edge field | Use |
|---|---|
| Package | `scam-detector-<version>-chromium.zip` |
| Availability | Public, all markets |
| Category | Productivity (Edge has no security category) |
| Privacy policy | Required: "Yes", URL https://twixaddict.github.io/scam-detector/privacy.html |
| Website / Support | https://twixaddict.github.io/scam-detector/ and https://github.com/TwixAddict/scam-detector/issues |
| Description, short description | from AMO-LISTING.md |
| Logo | `store/icon-512.png` (Edge asks for 300×300 or larger; the 512 version works) |
| Screenshots | `store/screenshot-1.png` to `screenshot-3.png` |
| Small promotional tile | `store/promo-tile-440x280.png` |
| Notes for certification | the reviewer notes above |
