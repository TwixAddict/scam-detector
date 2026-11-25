// A small MIME parser for raw email source (.eml, Gmail "Show original", Outlook "View source").
// It only needs to be good enough to find headers, bodies and attachment names.
(function (SD) {
  "use strict";

  const MAX_DEPTH = 8;
  const MAX_ATTACHMENT_TEXT = 200000;

  function decodeBytes(bytes, charset) {
    try {
      return new TextDecoder(charset || "utf-8").decode(bytes);
    } catch {
      return new TextDecoder("utf-8").decode(bytes);
    }
  }

  function base64ToBytes(text) {
    const clean = text.replace(/[^A-Za-z0-9+/=]/g, "");
    try {
      const bin = atob(clean.slice(0, clean.length - (clean.length % 4)));
      const bytes = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
      return bytes;
    } catch {
      return new Uint8Array();
    }
  }

  function quotedPrintableToBytes(text, isHeader = false) {
    if (isHeader) text = text.replace(/_/g, " ");
    text = text.replace(/=\r?\n/g, "");
    const bytes = [];
    for (let i = 0; i < text.length; i++) {
      const ch = text[i];
      if (ch === "=" && /^[0-9A-Fa-f]{2}$/.test(text.substr(i + 1, 2))) {
        bytes.push(parseInt(text.substr(i + 1, 2), 16));
        i += 2;
      } else {
        const code = ch.charCodeAt(0);
        if (code < 128) bytes.push(code);
        else for (const b of new TextEncoder().encode(ch)) bytes.push(b);
      }
    }
    return new Uint8Array(bytes);
  }

  // RFC 2047: =?utf-8?B?...?= and =?iso-8859-1?Q?...?=
  SD.decodeHeaderWords = function (value) {
    return String(value || "")
      .replace(/(=\?[^?]+\?[bBqQ]\?[^?]*\?=)\s+(?==\?)/g, "$1")
      .replace(/=\?([^?*]+)(?:\*[^?]*)?\?([bBqQ])\?([^?]*)\?=/g, (_, charset, enc, data) => {
        const bytes = enc.toUpperCase() === "B" ? base64ToBytes(data) : quotedPrintableToBytes(data, true);
        return decodeBytes(bytes, charset);
      });
  };

  function splitHeadersAndBody(text) {
    const idx = text.search(/\n\n/);
    if (idx === -1) return { headerText: text, body: "" };
    return { headerText: text.slice(0, idx), body: text.slice(idx + 2) };
  }

  function parseHeaderBlock(headerText) {
    const headers = [];
    for (const line of headerText.split("\n")) {
      if (/^[ \t]/.test(line) && headers.length) {
        headers[headers.length - 1].value += " " + line.trim();
      } else {
        const m = /^([!-9;-~]+):\s?(.*)$/.exec(line);
        if (m) headers.push({ name: m[1].toLowerCase(), value: m[2] });
      }
    }
    return headers;
  }

  const header = (headers, name) => {
    const h = headers.find((x) => x.name === name);
    return h ? h.value : "";
  };

  // "text/html; charset=utf-8; name*=UTF-8''f%C3%A9.html" -> { value, params }
  function parseParams(value) {
    const parts = [];
    let current = "";
    let quoted = false;
    for (const ch of value || "") {
      if (ch === '"') quoted = !quoted;
      if (ch === ";" && !quoted) {
        parts.push(current);
        current = "";
      } else current += ch;
    }
    parts.push(current);
    const params = {};
    const continued = {};
    for (const part of parts.slice(1)) {
      const eq = part.indexOf("=");
      if (eq === -1) continue;
      let key = part.slice(0, eq).trim().toLowerCase();
      let val = part.slice(eq + 1).trim().replace(/^"(.*)"$/, "$1");
      const ext = /^(.+?)\*(\d+)?(\*)?$/.exec(key);
      if (ext) {
        key = ext[1];
        if (ext[3] || (!ext[2] && key)) {
          const m = /^([^']*)'[^']*'(.*)$/.exec(val);
          try {
            val = m ? decodeURIComponent(m[2]) : decodeURIComponent(val);
          } catch { /* keep as is */ }
        }
        continued[key] = (continued[key] || "") + val;
        continue;
      }
      params[key] = SD.decodeHeaderWords(val);
    }
    Object.assign(params, continued);
    return { value: parts[0].trim().toLowerCase(), params };
  }

  function parseAddressList(value) {
    const list = [];
    let current = "";
    let quoted = false;
    let angle = 0;
    for (const ch of value || "") {
      if (ch === '"') quoted = !quoted;
      if (!quoted && ch === "<") angle++;
      if (!quoted && ch === ">") angle--;
      if (ch === "," && !quoted && angle <= 0) {
        list.push(current);
        current = "";
      } else current += ch;
    }
    list.push(current);
    return list
      .map((entry) => {
        const decoded = SD.decodeHeaderWords(entry).trim();
        if (!decoded) return null;
        const m = /^(.*?)\s*<([^>]*)>\s*$/.exec(decoded);
        if (m) return { name: m[1].replace(/^"|"$/g, "").replace(/\\"/g, '"').trim(), address: m[2].trim() };
        const bare = /[^\s<>"]+@[^\s<>"]+/.exec(decoded);
        return bare ? { name: "", address: bare[0] } : { name: decoded, address: "" };
      })
      .filter(Boolean);
  }

  function parsePart(text, depth, out) {
    const { headerText, body } = splitHeadersAndBody(text);
    const headers = parseHeaderBlock(headerText);
    const type = parseParams(header(headers, "content-type") || "text/plain");
    const disposition = parseParams(header(headers, "content-disposition"));
    const encoding = header(headers, "content-transfer-encoding").trim().toLowerCase();

    if (type.value.startsWith("multipart/") && type.params.boundary && depth < MAX_DEPTH) {
      const boundary = "--" + type.params.boundary;
      const chunks = body.split(boundary);
      for (const chunk of chunks.slice(1)) {
        if (chunk.startsWith("--")) break;
        parsePart(chunk.replace(/^[ \t]*\n/, ""), depth + 1, out);
      }
      return;
    }

    // 7bit/8bit bodies are already text; only encoded bodies need a charset decode.
    const encoded = encoding === "base64" || encoding === "quoted-printable";
    const bytes = encoding === "base64" ? base64ToBytes(body)
      : encoding === "quoted-printable" ? quotedPrintableToBytes(body)
      : null;
    const decode = (limit) => (encoded ? decodeBytes(limit ? bytes.slice(0, limit) : bytes, type.params.charset) : limit ? body.slice(0, limit) : body);
    const filename = disposition.params.filename || type.params.name || "";
    const isAttachment = disposition.value === "attachment" || (filename && !/^text\/(plain|html)$/.test(type.value)) ||
      (filename && disposition.value !== "inline");

    if (isAttachment || type.value === "message/rfc822") {
      const att = { name: filename || (type.value === "message/rfc822" ? "attached-message.eml" : "unnamed"), contentType: type.value, size: encoded ? bytes.length : body.length };
      if (/html|svg|xml|javascript/.test(type.value) || /\.(html?|svg|shtml|xhtml)$/i.test(filename)) {
        att.content = decode(MAX_ATTACHMENT_TEXT);
      }
      out.attachments.push(att);
      return;
    }
    if (type.value === "text/html") out.html.push(decode());
    else if (type.value === "text/plain" || !type.value) out.text.push(decode());
    else if (type.value.startsWith("image/")) out.inlineImages++;
  }

  function parseAuth(headers) {
    const results = headers.filter((h) => h.name === "authentication-results").map((h) => h.value);
    const arc = headers.filter((h) => h.name === "arc-authentication-results").map((h) => h.value);
    const source = results[0] || arc[0] || "";
    const pick = (re) => {
      const m = re.exec(source);
      return m ? m[1].toLowerCase() : null;
    };
    let spf = pick(/\bspf=(\w+)/i);
    if (!spf) {
      const received = header(headers, "received-spf");
      const m = /^\s*(\w+)/.exec(received);
      if (m) spf = m[1].toLowerCase();
    }
    const auth = {
      spf,
      dkim: pick(/\bdkim=(\w+)/i),
      dmarc: pick(/\bdmarc=(\w+)/i),
      compauth: pick(/\bcompauth=(\w+)/i),
    };
    return Object.values(auth).some(Boolean) ? auth : null;
  }

  function parseDate(value) {
    const m = /(?:(Mon|Tue|Wed|Thu|Fri|Sat|Sun),\s*)?\d{1,2}\s+\w{3}\s+\d{2,4}\s+(\d{1,2}):(\d{2})/i.exec(value || "");
    if (!m) return { hour: null, day: null };
    const days = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
    return { hour: parseInt(m[2], 10), day: m[1] ? days.indexOf(m[1].toLowerCase()) : null };
  }

  function linksFromPlainText(text) {
    const matches = text.match(/\bhttps?:\/\/[^\s<>"')\]]+/gi) || [];
    return matches.slice(0, 300).map((href) => ({ href, text: href, title: "", imageAlt: "" }));
  }

  SD.parseRawEmail = function (raw) {
    const text = String(raw || "").replace(/\r\n?/g, "\n").replace(/^\s+/, "");
    const looksLikeHeaders = /^[!-9;-~]+:[ \t]/.test(text);
    const out = { html: [], text: [], attachments: [], inlineImages: 0 };
    let headers = [];
    if (looksLikeHeaders) {
      headers = parseHeaderBlock(splitHeadersAndBody(text).headerText);
      parsePart(text, 0, out);
    } else {
      out.text.push(text); // just a pasted body
    }
    return { headers, ...out };
  };

  // Raw source -> the normalized email object that SD.analyze() expects.
  SD.emailFromRaw = function (raw) {
    const parsed = SD.parseRawEmail(raw);
    const h = (name) => header(parsed.headers, name);
    const from = parseAddressList(h("from"))[0] || null;
    const to = parseAddressList(h("to"));
    const cc = parseAddressList(h("cc"));
    const returnPath = (h("return-path").match(/<([^>]*)>/) || [null, h("return-path").trim()])[1] || null;
    const date = parseDate(h("date"));

    const html = parsed.html.join("\n");
    const plain = parsed.text.join("\n");
    let features;
    if (html && typeof DOMParser !== "undefined") {
      const doc = new DOMParser().parseFromString(html, "text/html");
      features = SD.extractFromRoot(doc.body || doc.documentElement, { live: false });
    } else {
      features = {
        text: plain,
        hiddenText: "",
        links: linksFromPlainText(plain),
        images: [],
        forms: { count: 0, hasPassword: false },
        hasQuotedThread: /^>/m.test(plain),
      };
    }

    return {
      source: "raw",
      from,
      replyTo: parseAddressList(h("reply-to")).filter((a) => a.address),
      returnPath,
      to,
      subject: SD.decodeHeaderWords(h("subject")),
      senderLocalHour: date.hour,
      senderLocalDay: date.day,
      recipientCount: to.length + cc.length,
      undisclosed: /undisclosed/i.test(h("to")),
      auth: parseAuth(parsed.headers),
      attachments: parsed.attachments,
      rawHtml: html || null,
      headers: parsed.headers,
      ...features,
    };
  };
})(globalThis.ScamDetector = globalThis.ScamDetector || {});
