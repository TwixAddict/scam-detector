# Firefox Add-ons (AMO) listing

Copy these into the fields on [addons.mozilla.org/developers](https://addons.mozilla.org/developers/) when you submit. The package is `dist/scam-detector-<version>-firefox.zip` (made by `scripts/build.sh`). Images are in this folder: `icon-512.png` and `screenshot-1.png` to `screenshot-3.png` (1280×800).

## Basic fields

| Field | Value |
|---|---|
| Name | Scam Detector |
| Add-on URL (slug) | `scam-detector-school` (if taken, pick another and update `docs/index.html`, see PUBLISHING.md) |
| Categories | Privacy & Security |
| Tags | phishing, scam, email, gmail, outlook, security, privacy, spam |
| Support website | https://github.com/TwixAddict/scam-detector/issues |
| Homepage | https://twixaddict.github.io/scam-detector/ |
| License | MIT License |
| Privacy policy | Paste the text from `docs/privacy.html` (or link to https://twixaddict.github.io/scam-detector/privacy.html) |
| This add-on is experimental | Leave unticked (it's stable), or tick it if your teacher prefers |
| Requires payment | No |

## Summary (max 250 characters)

**English**
> Warns you about phishing and scam emails in Gmail and Outlook, and explains why in plain language. Everything is checked on your own device. An open-source school project.

**Nederlands**
> Waarschuwt je voor phishing- en oplichtingsmails in Gmail en Outlook, en legt in gewone taal uit waarom. Alles wordt op je eigen toestel gecontroleerd. Een open-source schoolproject.

**Français**
> Vous avertit des e-mails d'hameçonnage et d'arnaque dans Gmail et Outlook, et explique pourquoi en langage clair. Tout est vérifié sur votre appareil. Un projet scolaire open source.

## Description

**English**

> Scam Detector puts a clear card above every email you open in Gmail or Outlook on the web:
>
> • **Red: likely scam.** Don't click, don't reply.
> • **Orange: suspicious.** Check before you act.
> • **Green: nothing found.**
>
> Every warning explains *why*, in plain language: "Claims to be bpost, but isn't sent by bpost", "A link shows one address but goes to another", "Promises you a large sum of money".
>
> **What it checks (more than 70 warning signs)**
> • Sender: brand names on the wrong address, lookalike domains (paypa1.com), random-looking addresses, failed SPF/DKIM/DMARC
> • Links: misleading link text, known phishing links (public OpenPhish list, checked locally), shorteners, free hosting, WhatsApp/Telegram contact requests
> • Attachments: programs, web pages sent as files, double extensions (invoice.pdf.exe), macro files
> • Wording: urgency, password and card requests, gift cards and crypto, parcel fees, fake invoices, blackmail, casino and pirate-TV spam
> • Tricks: hidden text and invisible characters meant to fool spam filters
>
> **Also included**
> • Check an email's full source (paste or drop an .eml file) to see the sender checks that webmail hides
> • "Scan this page" for any other webmail
> • English, Dutch and French; light and dark mode that follow your mailbox
>
> **Privacy**
> Your emails are analyzed on your own computer and never uploaded. No data collection, no tracking, no account. The only download is the public OpenPhish list of phishing links, which you can turn off.
>
> **A school project, open source**
> Scam Detector was made as a school project. The full source code is public at https://github.com/TwixAddict/scam-detector, so anyone can check what it does. It is not affiliated with Google, Microsoft or any brand it mentions. No checker catches every scam: a green card means "nothing obvious found", not a guarantee.

**Nederlands**

> Scam Detector zet een duidelijke kaart boven elke mail die je opent in Gmail of Outlook op het web:
>
> • **Rood: waarschijnlijk oplichting.** Niet klikken, niet antwoorden.
> • **Oranje: verdacht.** Controleer eerst.
> • **Groen: niets gevonden.**
>
> Elke waarschuwing legt in gewone taal uit *waarom*: "Doet zich voor als bpost, maar komt niet van bpost", "Een link toont het ene adres maar gaat naar een ander".
>
> Meer dan 70 waarschuwingssignalen: valse afzenders, nagemaakte domeinnamen, misleidende links, gevaarlijke bijlagen, druk om snel te handelen, vragen om wachtwoorden of betaalgegevens, pakketfraude, valse facturen, casino- en IPTV-spam, verborgen tekst.
>
> **Privacy:** je mails worden op je eigen computer gecontroleerd en nooit verstuurd. Geen tracking, geen account.
>
> **Een open-source schoolproject:** Scam Detector werd gemaakt als schoolproject. De volledige broncode staat op https://github.com/TwixAddict/scam-detector. Niet verbonden met Google, Microsoft of de merken die het vermeldt.

## Notes to reviewer

> Scam Detector is an open-source school project: https://github.com/TwixAddict/scam-detector
>
> **No build step, no minified or remote code.** The uploaded files are exactly the files in the `extension/` folder of the repository. The zip is made with `scripts/build.sh`.
>
> **How to test without a Gmail account:** click the toolbar button → "Check email source…" → pick an example in "Load an example…". The 10 examples include 8 scams and 2 normal emails. For webmail, open any email in Gmail or Outlook on the web; a card appears above the message.
>
> **Permissions:**
> • Host access to mail.google.com, outlook.live.com, outlook.office.com, outlook.office365.com: the content script reads the open email in the page and inserts the warning card (in a shadow root). Email content is never sent anywhere.
> • Host access to openphish.com: the background script downloads the public OpenPhish phishing URL list every 6 hours (it redirects to a CORS-enabled copy on raw.githubusercontent.com). Links are matched locally. This can be turned off in Settings.
> • storage: settings, an optional local list of known senders (to detect impersonation; can be turned off and cleared), and the phishing list.
> • alarms: the 6-hour list refresh.
> • activeTab + scripting: only for the user-initiated "Scan this page" button in the popup, and to start the checker in Gmail/Outlook tabs that were already open when the extension was installed.
>
> **Data collection:** none (`data_collection_permissions: none`). No analytics, no remote code, no eval, no innerHTML with page content (all email-derived text is set with textContent).
