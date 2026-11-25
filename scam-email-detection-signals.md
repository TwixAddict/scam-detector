# Scam Email Detection Signals

A reference list of phishing and scam email signals for a browser extension that detects them, grouped by where each signal lives, with notes on how to detect it.

**★ = strong signal.** These often justify a warning on their own. The rest work best as small weights in a combined score.

---

## 1. Sender and headers

- ★ **Display name doesn't match the domain.** The name says "Apple Support" but the address is `@gmail.com` or an unrelated domain.
  - *Detect:* keep a map of brand names to their real domains. Flag a brand name paired with any domain not on its list.
- ★ **Lookalike domain.** Examples: `paypa1.com`, `rnicrosoft.com` (rn looks like m), `amazon-support-billing.com`, or Cyrillic letters standing in for Latin ones.
  - *Detect:* Levenshtein distance or a confusables/homoglyph table (Unicode TR39) checked against a list of top brands, plus a check for punycode (`xn--`).
- ★ **Failed email authentication.** SPF, DKIM or DMARC shows `fail`, `softfail` or `none`.
  - *Detect:* parse the `Authentication-Results` header. In Gmail it sits behind "Show original," or you can read it through the Gmail API. Outlook web exposes it through its add-in API (Office.js).
- **Reply-To differs from From.** You reply to `ceo.office@protonmail.com`, not the domain the mail came from.
- **Return-Path or envelope sender on a different domain** than the From address.
- **Free-mail provider claiming to be an organization.** A "bank" or "HR department" writing from Gmail, Outlook.com or Yahoo.
- **Newly registered sender domain.** Domains less than about 30 days old are high risk.
  - *Detect:* WHOIS/RDAP lookup on a backend, cached.
- **First-time sender** pretending to be someone you know or deal with often.
  - *Detect:* compare against the user's past correspondents, kept locally.
- **Display name contains an email address**, e.g. `"support@paypal.com" <x@evil.ru>`.
- **Sender impersonates a colleague or your own domain** (CEO fraud), especially from an external address.
- **Odd `Received` chain**: unexpected countries or hops, or a mismatch with the claimed sender's usual infrastructure.

---

## 2. Links and URLs

- ★ **Visible link text doesn't match the real destination.** The text says `https://paypal.com/login`, the href goes somewhere else.
  - *Detect:* compare the anchor text domain to the href domain.
- ★ **URL is on a threat list.**
  - *Detect:* Google Safe Browsing API, PhishTank, OpenPhish, URLhaus. Check only hashes or prefixes if you care about privacy.
- **Brand name in a subdomain or path, not the registered domain**, e.g. `paypal.com.secure-login.xyz` or `evil.com/paypal/`.
  - *Detect:* pull out the registrable domain with the Public Suffix List.
- **Raw IP address** used as the host.
- **URL shorteners or open redirects** (bit.ly, t.co, `google.com/url?q=`, ad-click redirect chains).
  - *Detect:* expand the link on a backend, or flag it as unresolved.
- **Suspicious TLDs** that are cheap and heavily abused (`.xyz`, `.top`, `.icu`, `.zip`, `.mov` and others). Give this a light weight only.
- **Very long or obfuscated URLs**: lots of encoded characters, `@` in the URL (`https://paypal.com@evil.com`), several redirect parameters.
- **Links to free hosting or form builders**: Google Forms, Firebase, Netlify, Weebly, `*.web.app`, IPFS gateways, Cloudflare `workers.dev`, shared documents on SharePoint or OneDrive asking you to log in.
- **Plain HTTP** on a page that asks for credentials.
- **Every link goes to one domain except the main "log in" button**, which goes somewhere else.
- **QR codes in the body or an image** ("quishing").
  - *Detect:* decode QR images with jsQR and run the result through the same URL checks.
- **`data:` or `javascript:` URIs** in links.

---

## 3. Attachments

- ★ **Dangerous file types**: `.exe`, `.scr`, `.js`, `.vbs`, `.hta`, `.iso`, `.img`, `.lnk`, `.msi`, `.bat`, `.ps1`.
- ★ **HTML or SVG attachments.** These are a very common carrier for credential-phishing pages that run locally.
- **Double extensions**: `invoice.pdf.exe`, `scan.docx.html`.
- **Macro-enabled Office files**: `.docm`, `.xlsm`, `.pptm`.
- **Password-protected archives with the password in the body.** This is done to get past scanners.
- **Fake attachments**: an image styled to look like a PDF or file preview that is really a link.
- **Attachment name doesn't fit the context**, e.g. `Voicemail_0234.html` or `Payment_Remittance.htm`.

---

## 4. Content and language

- ★ **Urgency or threats**: "within 24 hours," "account suspended," "final notice," "legal action," "unauthorized login."
  - *Detect:* weighted keyword or phrase lists in several languages (e.g. English, French, Dutch, German for Belgium), or a small text classifier.
- ★ **Credential or payment requests**: "verify your password," "confirm your card details," "update billing information."
- ★ **Unusual payment methods**: gift cards, crypto, wire transfer, "change of bank details."
- **Generic greeting**: "Dear Customer," "Dear User," or the email's local part used as a name ("Dear jsmith").
- **Too good to be true**: prizes, lottery wins, refunds, inheritance, "unclaimed funds," job offers you never applied for.
- **Secrecy or isolation**: "keep this confidential," "don't tell anyone," "I'm in a meeting, just reply by email."
- **Spelling and grammar mistakes, odd phrasing, mixed languages.** This signal is weaker now that scammers use AI to write. Give it a low weight.
- **Mismatch between brand and content**: a Microsoft logo with a DHL subject line, or a service the user probably doesn't use.
- **Fake thread markers**: `RE:` or `FWD:` in the subject with no earlier conversation.
- **Fake security banners**, e.g. text in the body saying "This email was scanned and verified safe."
- **Package delivery or customs fees**, a very common lure in Europe (bpost, PostNL, DHL, "customs fee of €1.99").
- **Tax or government impersonation**, e.g. FOD Financiën / SPF Finances, itsme, or "refund available."
- **Sextortion or "I hacked your camera"**, often quoting an old leaked password and demanding Bitcoin.
- **Fake invoices or subscription renewals** (Norton, McAfee, Geek Squad, PayPal) that list a phone number to call. These are callback scams with no link to check.
- **Phone numbers as the call to action** instead of links. Pair this with the brand-impersonation check.

---

## 5. HTML and technical tricks

- ★ **Hidden text** (zero font size, `display:none`, white on white) stuffed with harmless words to fool spam filters.
  - *Detect:* compare the computed styles in the rendered DOM.
- **Zero-width characters** (U+200B, U+200C, U+FEFF) breaking up words like "Pay​Pal" so keyword filters miss them.
- **Mostly one big image** with little real text, so the message can't be read by filters.
- **Brand logos loaded from domains the brand doesn't own.**
  - *Detect:* check `img src` domains when the alt text or filename mentions a brand.
- **Embedded forms** in the email body asking for input.
- **Tracking pixels** from unusual domains. Weak on its own, since legitimate marketing does this too.
- **Unicode tricks in the subject or sender name**: right-to-left override (U+202E), lookalike characters.
- **Base64-encoded or heavily obfuscated HTML** in the body.

---

## 6. Context and behavior

- **Business email compromise patterns**: requests to change payroll details, pay an urgent invoice, or buy gift cards "for a client."
- **Out-of-hours sending** combined with urgency.
- **The user has no relationship with the claimed brand.** This needs local history and should be opt-in.
- **Mass "undisclosed recipients"** or a huge To/CC list of strangers.
- **Reply chain hijacking**: a real old thread continued by a slightly different address.

---

## Practical tips for building the extension

- **Scoring beats binary rules.** Give each signal a weight and add them up. A strong signal (failed DMARC plus brand impersonation) can push a message over the threshold by itself. Weak ones (bad grammar, a `.xyz` TLD) should only count together.
- **Where to read data.** Gmail and Outlook web render the email in a DOM you can read from a content script, but headers aren't visible by default. You'll need the Gmail API (OAuth) or Outlook's Office.js add-in API to get `Authentication-Results`, or else accept DOM-only signals.
- **DOMs change often.** Gmail's class names are obfuscated and shift over time. Libraries like InboxSDK or gmail.js absorb a lot of that churn.
- **Privacy.** Process locally wherever you can. For URL reputation, use hash-prefix lookups (Safe Browsing Update API) rather than sending full URLs. Say clearly in your listing what leaves the device. The Chrome Web Store reviews email-reading extensions strictly.
- **Explain the warning.** "This claims to be PayPal but was sent from paypa1-secure.co" teaches people far more than "Risk score: 82."
- **Test data.** Use public phishing corpora (e.g. the Nazario phishing corpus, PhishTank feeds) plus your own legitimate mail, so you can measure false positives. Those are what get extensions uninstalled.
- **Start small.** The ★ items alone (lookalike domain, display-name/domain mismatch, link text vs. href, auth failures, threat-list URLs, dangerous attachments) will catch a large share of real phishing with few false positives.
