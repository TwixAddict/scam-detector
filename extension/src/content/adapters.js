// Webmail adapters: find open messages in the page and turn each into a normalized email.
// Gmail and Outlook class names are obfuscated and change over time, so every lookup
// has fallbacks and nothing breaks if one of them stops matching.
(function (SD) {
  "use strict";

  const FILENAME = /([^\\/:*?"<>|\n]{1,150}\.([a-z0-9]{2,6}))\s*$/i;
  const KNOWN_EXT = (ext) => [SD.DANGEROUS_EXTENSIONS, SD.HTML_EXTENSIONS, SD.MACRO_EXTENSIONS, SD.ARCHIVE_EXTENSIONS, SD.DOCUMENT_EXTENSIONS]
    .some((set) => set.has(ext.toLowerCase()));
  const EMAIL = /[\w.+'-]+@[\w-]+(?:\.[\w-]+)+/;

  function uniqueNames(names) {
    const seen = new Set();
    return names
      .map((n) => (n || "").trim())
      .filter((n) => n && !seen.has(n.toLowerCase()) && seen.add(n.toLowerCase()))
      .map((name) => ({ name }));
  }

  function hashKey(text) {
    let h = 0;
    for (let i = 0; i < text.length; i++) h = (Math.imul(31, h) + text.charCodeAt(i)) | 0;
    return "h" + (h >>> 0).toString(36);
  }

  function precedes(node, target) {
    return Boolean(node.compareDocumentPosition(target) & Node.DOCUMENT_POSITION_FOLLOWING);
  }

  // ------------------------------------------------------------------ Gmail

  const gmail = {
    id: "gmail",
    matches: () => location.hostname === "mail.google.com",

    userAddress() {
      const fromTitle = document.title.match(EMAIL);
      if (fromTitle) return fromTitle[0];
      const account = document.querySelector('a[aria-label*="@"][href*="accounts.google.com"]');
      const m = account && account.getAttribute("aria-label").match(EMAIL);
      return m ? m[0] : null;
    },

    findMessages() {
      if (/[?&]view=om\b/.test(location.search)) return this.findRawView();
      const userAddress = this.userAddress();
      const threadLength = Math.max(1, document.querySelectorAll("[data-message-id], div.adn").length);
      const bodies = document.querySelectorAll("div.a3s");
      if (!bodies.length) return this.findFallback(userAddress);
      return [...bodies]
        .filter((body) => !body.closest("[contenteditable='true']"))
        .map((body) => {
          const container = body.closest("[data-message-id], div.adn, div.h7") || body.parentElement;
          const anchor = body.closest(".ii") || body;
          const id = container.getAttribute("data-message-id") || container.getAttribute("data-legacy-message-id");
          return {
            key: id || hashKey((container.querySelector("[email]")?.getAttribute("email") || "") + body.textContent.slice(0, 400)),
            body,
            anchor,
            ready: () => body.textContent.trim().length > 0 || body.querySelector("img, a"),
            extract: () => {
              const features = SD.extractFromRoot(body, { live: true });
              const senderEl = container.querySelector(".gD[email]") || container.querySelector("[email]");
              // Gmail shows "sender@x.com via other.com" when another domain sent the mail.
              const headerLine = senderEl && (senderEl.closest("h3, td, tr") || senderEl.parentElement);
              const via = headerLine && headerLine.textContent.match(/\bvia\s+((?:[a-z0-9-]+\.)+[a-z]{2,})/i);
              const recipients = [...container.querySelectorAll(".g2[email]")];
              const recipientText = container.querySelector(".hb")?.textContent || "";
              const trimmed = container.querySelector(".ajR, [aria-label='Show trimmed content']");
              return {
                source: "gmail",
                from: senderEl ? { name: senderEl.getAttribute("name") || senderEl.textContent.trim(), address: senderEl.getAttribute("email") } : null,
                replyTo: [],
                sentVia: via ? via[1].toLowerCase() : null,
                subject: document.querySelector("h2.hP")?.textContent.trim() || "",
                attachments: this.attachments(container),
                userAddress,
                threadLength,
                recipientCount: recipients.length,
                undisclosed: /undisclosed/i.test(recipientText),
                ...features,
                hasQuotedThread: features.hasQuotedThread || Boolean(trimmed),
              };
            },
          };
        });
    },

    // If Gmail renames its classes, still check the open message: read the whole reading
    // pane (like the popup's "Scan this page") and put the banner above the sender line.
    findFallback(userAddress) {
      if (!/\/[A-Za-z0-9_-]{16,}$/.test(location.hash)) return []; // no message open
      const main = document.querySelector("[role='main']");
      if (!main) return [];
      const senderEl = main.querySelector("[email]");
      const heading = main.querySelector("h2");
      const anchor = (senderEl && (senderEl.closest("table") || senderEl.parentElement)) ||
        (heading && heading.parentElement) || main.firstElementChild;
      if (!anchor) return [];
      return [{
        key: "fallback:" + location.hash,
        body: main,
        anchor,
        ready: () => main.textContent.trim().length > 50,
        extract: () => ({
          source: "gmail",
          from: senderEl ? { name: senderEl.getAttribute("name") || senderEl.textContent.trim(), address: senderEl.getAttribute("email") } : null,
          replyTo: [],
          subject: heading ? heading.textContent.trim() : "",
          attachments: this.attachments(main),
          userAddress,
          ...SD.extractFromRoot(main, { live: true }),
        }),
      }];
    },

    attachments(container) {
      const names = [];
      for (const node of container.querySelectorAll("[download_url]")) {
        const parts = node.getAttribute("download_url").split(":");
        if (parts.length > 2) names.push(parts[1]);
      }
      for (const node of container.querySelectorAll(".aV3, .aQA span[title], .aZo [title]")) {
        names.push(node.getAttribute("title") || node.textContent);
      }
      for (const node of container.querySelectorAll(".aQH [aria-label]")) {
        const m = node.getAttribute("aria-label").match(FILENAME);
        if (m && KNOWN_EXT(m[2])) names.push(m[1]);
      }
      return uniqueNames(names);
    },

    // Gmail's "Show original" page: the full raw message, including authentication headers.
    findRawView() {
      const pre = document.getElementById("raw_message_text") || document.querySelector(".raw_message_text, pre");
      if (!pre) return [];
      return [{
        key: "raw:" + location.search,
        body: pre,
        anchor: pre,
        ready: () => pre.textContent.length > 50,
        extract: () => ({ ...SD.emailFromRaw(pre.textContent), userAddress: this.userAddress() }),
      }];
    },
  };

  // ------------------------------------------------------------------ Outlook on the web

  const OUTLOOK_BODY = [
    "div[id^='UniqueMessageBody']",
    "div[aria-label='Message body']",
    "div[aria-label='Berichttekst']",
    "div[aria-label='Corps du message']",
    "div[aria-label='Nachrichtentext']",
    "div[role='document']",
  ].join(",");

  const outlook = {
    id: "outlook",
    matches: () => /^outlook\.(live|office|office365)\.com$/.test(location.hostname),

    findMessages() {
      const bodies = [...document.querySelectorAll(OUTLOOK_BODY)]
        .filter((b) => !b.closest("[contenteditable='true']") && !b.isContentEditable)
        // keep the outermost match when selectors nest
        .filter((b, _, all) => !all.some((other) => other !== b && other.contains(b)));
      return bodies.map((body) => {
        const container = body.closest("[role='article']") || body.closest("[data-app-section='ConversationContainer'], [role='main']") || body.parentElement;
        return {
          key: hashKey(this.sender(container, body)?.address + "|" + body.textContent.slice(0, 400)),
          body,
          anchor: body,
          ready: () => body.textContent.trim().length > 0 || body.querySelector("img, a"),
          extract: () => {
            const features = SD.extractFromRoot(body, { live: true });
            const html = body.innerHTML;
            return {
              source: "outlook",
              from: this.sender(container, body),
              replyTo: [],
              subject: this.subject(container, body),
              attachments: this.attachments(container, body),
              threadLength: Math.max(1, document.querySelectorAll(OUTLOOK_BODY).length),
              ...features,
              hasQuotedThread: features.hasQuotedThread || /divRplyFwdMsg|appendonsend/.test(html),
            };
          },
        };
      });
    },

    // Outlook shows "Name <address>" in the header, and puts the address in title attributes.
    sender(container, body) {
      for (const node of container.querySelectorAll("[title*='@'], [aria-label*='@']")) {
        if (!precedes(node, body)) continue;
        const label = node.getAttribute("title") || node.getAttribute("aria-label");
        const m = label.match(EMAIL);
        if (!m) continue;
        const text = node.textContent.trim();
        const name = text && !text.includes("@") ? text : label.replace(m[0], "").replace(/[<>"]|^\s*from:?/gi, "").trim();
        return { name, address: m[0] };
      }
      const range = document.createRange();
      range.setStart(container, 0);
      range.setEndBefore(body);
      const headerText = range.toString().slice(-2000);
      const m = /([^<\n]{1,80}?)\s*<([^<>\s@]+@[^<>\s]+)>/.exec(headerText);
      return m ? { name: m[1].trim(), address: m[2] } : null;
    },

    subject(container, body) {
      const headings = [...document.querySelectorAll("[role='main'] [role='heading'], [role='heading'][aria-level='2']")]
        .filter((h) => precedes(h, body));
      return headings.length ? headings[headings.length - 1].textContent.trim() : "";
    },

    attachments(container, body) {
      const names = [];
      for (const node of container.querySelectorAll("[title], [aria-label]")) {
        if (!precedes(node, body) && !body.contains(node)) continue;
        for (const label of [node.getAttribute("title"), node.getAttribute("aria-label")]) {
          const m = label && label.trim().match(FILENAME);
          if (m && KNOWN_EXT(m[2]) && !/^https?:/i.test(label)) names.push(m[1]);
        }
      }
      return uniqueNames(names);
    },
  };

  // ------------------------------------------------------------------ any other page

  // Used by the popup's "Scan this page" button (any webmail, a forwarded mail, a web page).
  SD.extractFromPage = function () {
    const root = document.querySelector("main, [role='main']") || document.body;
    const features = SD.extractFromRoot(root, { live: true, skipCollapsed: false });
    const fromLine = features.text.match(/^\s*(?:from|van|de|von)\s*:\s*(.{0,80}?)\s*<?([\w.+'-]+@[\w-]+(?:\.[\w-]+)+)>?/im);
    const subjectLine = features.text.match(/^\s*(?:subject|onderwerp|objet|betreff)\s*:\s*(.+)$/im);
    return {
      source: "page",
      from: fromLine ? { name: fromLine[1].replace(/["']/g, "").trim(), address: fromLine[2] } : null,
      replyTo: [],
      subject: subjectLine ? subjectLine[1].trim() : "",
      attachments: [],
      ...features,
    };
  };

  SD.ADAPTERS = [gmail, outlook];
  SD.pickAdapter = () => SD.ADAPTERS.find((a) => a.matches()) || null;
})(globalThis.ScamDetector = globalThis.ScamDetector || {});
