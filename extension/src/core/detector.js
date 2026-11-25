// The scoring engine. Takes a normalized email object (see README) and returns a
// risk score, a level and a list of human-readable findings.
(function (SD) {
  "use strict";

  SD.THRESHOLDS = {
    relaxed: { warning: 40, danger: 75 },
    normal: { warning: 30, danger: 60 },
    strict: { warning: 20, danger: 45 },
  };

  SD.DEFAULT_SETTINGS = {
    gmail: true,
    outlook: true,
    sensitivity: "normal",
    threatFeed: true,
    rememberSenders: true,
    language: "auto",
    trustedDomains: [],
    ownDomains: [],
  };

  const CHAT_APP_HOSTS = ["wa.me", "wa.link", "api.whatsapp.com", "chat.whatsapp.com", "t.me", "telegram.me", "signal.me", "viber.click"];
  const CALLBACK_BRANDS = new Set(["Norton", "McAfee", "Geek Squad", "PayPal", "Microsoft", "Amazon", "Apple", "Coinbase", "eBay"]);
  const INVISIBLE_IN_WORD = /\p{L}[​‌‍⁠﻿]+\p{L}/gu;
  const BIDI_CONTROLS = /[‪-‮⁦-⁩‎‏]/;
  const PHONE = /(?:\+|\b00)?\(?\d[\d\s().\-/]{7,}\d\b/g;
  // $4,750,500.00 / 2.5 million euro / €1.000.000
  const BIG_AMOUNT = /(?:[$€£]|\b(?:usd|eur|gbp)\b)\s?\d{1,3}(?:[,.\s]\d{3}){2,}|\b\d{1,3}(?:[,.\s]\d{3}){2,}(?:[.,]\d{2})?\s?(?:[$€£]|usd|eur|euros?|dollars?|gbp|pounds?)\b|\b\d+(?:[.,]\d+)?\s?(?:million|billion|miljoen|millions|milliards?|millionen)\b/i;
  const SMALL_AMOUNT = /(€|eur|\$|£|usd|gbp)\s?[0-4][.,]\d{2}\b|\b[0-4][.,]\d{2}\s?(€|eur|euro)/i;
  const REPLY_PREFIX = /^\s*(re|fw|fwd|tr|aw|wg|antw|doorst|sv|vs)\s*:/i;
  const EMAIL_IN_TEXT = /[\w.+-]+@([\w-]+(?:\.[\w-]+)+)/;

  function normalizeText(text) {
    return SD.stripInvisible(String(text || "").normalize("NFKC"))
      .replace(/[ \t ]+/g, " ")
      .replace(/\s*\n\s*/g, "\n");
  }

  function hasMixedScripts(text) {
    return (text || "").split(/\s+/).some((word) => /\p{Script=Latin}/u.test(word) && /[\p{Script=Cyrillic}\p{Script=Greek}]/u.test(word));
  }

  function extOf(name) {
    const m = /\.([a-z0-9]{1,12})\s*$/i.exec(name || "");
    return m ? m[1].toLowerCase() : "";
  }

  function quote(list, max = 3) {
    return list.slice(0, max).map((s) => `"${s}"`).join(", ");
  }

  class Findings {
    constructor() {
      this.items = [];
    }
    // titleKey/detailKey are translation keys (see i18n.js); params fill their {placeholders}.
    add(id, category, weight, titleKey, detailKey, params = {}, strong = false) {
      if (weight <= 0) return;
      const title = SD.t(titleKey, params);
      const detail = detailKey ? SD.t(detailKey, params) : "";
      const existing = this.items.find((f) => f.id === id);
      if (existing) {
        existing.weight = Math.max(existing.weight, weight);
        if (detail && !existing.detail.includes(detail)) existing.detail += " " + detail;
        return;
      }
      this.items.push({ id, category, weight, title, detail: detail || "", strong });
    }
  }

  // ---------------------------------------------------------------- sender & headers

  function checkSender(email, ctx, out) {
    const from = email.from;
    if (!from || !from.address) return;
    const name = (from.name || "").trim();
    const domain = SD.domainOfAddress(from.address);
    const reg = SD.registrableDomain(domain);
    const freemail = SD.FREEMAIL_DOMAINS.has(domain) || SD.FREEMAIL_DOMAINS.has(reg);

    const claimed = SD.brandsMentioned(name);
    let impersonating = false;
    for (const brand of claimed) {
      if (freemail || !SD.brandOwnsHost(brand, domain)) {
        impersonating = true;
        out.add("display-name-brand", "sender", 45, "displayNameBrand.t", "displayNameBrand.d",
          { brand: brand.brand, name, address: from.address, domains: brand.domains.slice(0, 2).join(SD.t("or")) }, true);
        break;
      }
    }

    checkAddressOddities(email, ctx, out, { name, domain, reg, freemail, claimed });

    const famous = SD.FAMOUS_NAMES.find((n) => name.toLowerCase().includes(n.toLowerCase()));
    const surname = famous && famous.split(" ").pop().toLowerCase();
    if (famous && !reg.includes(surname)) {
      out.add("celebrity-sender", "sender", 25, "celebrity.t", "celebrity.d", { famous, name, domain }, true);
    }

    const look = SD.lookalikeOf(domain, ctx.ownDomains);
    if (look) {
      out.add("lookalike-sender", "sender", 50, "lookalikeSender.t", "lookalikeSender.d",
        { brand: look.brand.brand, domain: SD.toUnicodeHost(domain), reason: look.reason }, true);
    } else if (domain.split(".").some((l) => l.startsWith("xn--"))) {
      out.add("punycode-sender", "sender", 20, "punycodeSender.t", "punycodeSender.d", { domain, unicode: SD.toUnicodeHost(domain) });
    }

    if (freemail && !impersonating && SD.PHRASES.orgWords.some((re) => re.test(name))) {
      out.add("freemail-org", "sender", 15, "freemailOrg.t", "freemailOrg.d", { name, reg });
    }

    const emailInName = name.match(EMAIL_IN_TEXT);
    if (emailInName && SD.registrableDomain(emailInName[1].toLowerCase()) !== reg) {
      out.add("address-in-name", "sender", 30, "addressInName.t", "addressInName.d", { shown: emailInName[0], address: from.address }, true);
    }

    if (BIDI_CONTROLS.test(name) || BIDI_CONTROLS.test(email.subject || "")) {
      out.add("bidi-trick", "html", 25, "bidi.t", "bidi.d");
    } else if (hasMixedScripts(name) || hasMixedScripts(email.subject)) {
      out.add("mixed-script", "html", 20, "mixedScript.t", "mixedScript.d");
    }

    if (ctx.ownDomains.length && !ctx.ownDomains.some((d) => SD.hostMatches(domain, d))) {
      const mentionsOwn = ctx.ownDomains.find((d) => name.toLowerCase().includes(d));
      if (mentionsOwn) {
        out.add("own-domain-name", "sender", 30, "ownDomain.t", "ownDomain.d", { own: mentionsOwn, domain }, true);
      }
    }

    // Known-contact checks need the local sender history.
    const known = ctx.knownSenders || {};
    const address = from.address.toLowerCase();
    if (ctx.settings.rememberSenders && !known[address]) {
      // Only personal names ("Jan Peeters"), not "Support" or "Google", and only across domains.
      const personName = /\S\s+\S/.test(name) && !SD.PHRASES.orgWords.some((re) => re.test(name)) && !claimed.length;
      const lowerName = name.toLowerCase();
      const sameName = personName && Object.entries(known).find(([addr, n]) =>
        n && n.toLowerCase() === lowerName && SD.registrableDomain(SD.domainOfAddress(addr)) !== reg);
      if (sameName) {
        out.add("known-name-new-address", "sender", 35, "knownName.t", "knownName.d", { name, old: sameName[0], address: from.address }, true);
      }
      if (Object.keys(known).length >= 20) {
        out.add("first-time-sender", "context", 5, "firstTime.t", "firstTime.d");
      }
    }

    for (const reply of email.replyTo || []) {
      const replyDomain = SD.domainOfAddress(reply.address);
      if (!replyDomain || SD.registrableDomain(replyDomain) === reg) continue;
      const replyFree = SD.FREEMAIL_DOMAINS.has(replyDomain);
      out.add("reply-to-mismatch", "sender", replyFree ? 25 : 20, "replyTo.t", "replyTo.d",
        { reply: reply.address, free: replyFree ? SD.t("replyTo.free") : "", domain });
    }

    if (email.returnPath) {
      const rpDomain = SD.domainOfAddress(email.returnPath);
      if (rpDomain && SD.registrableDomain(rpDomain) !== reg && !SD.hostInList(rpDomain, SD.CLICK_TRACKERS) && !/amazonses|sendgrid|mailgun|mandrill|sparkpost|mcsv|rsgsv|bounce/.test(rpDomain)) {
        out.add("return-path-mismatch", "sender", 4, "returnPath.t", "returnPath.d", { rp: rpDomain });
      }
    }

    return { domain, reg, freemail, claimed };
  }

  // ---------------------------------------------------------------- odd-looking sender addresses

  // Addresses that send on behalf of a company, where the display name is a person.
  const ROLE_LOCALS = /^(info|hello|hi|hey|contact|team|news|newsletter|no-?reply|donotreply|support|sales|marketing|office|admin|mail|service|notifications?|updates?|mailer|members?|community|feedback|billing|orders?|events?)$/;

  // Country domains whose own language uses another alphabet: .jp mail written only in English is odd.
  const TLD_SCRIPTS = {
    jp: /[\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Han}]/u, cn: /\p{Script=Han}/u, tw: /\p{Script=Han}/u,
    hk: /\p{Script=Han}/u, kr: /\p{Script=Hangul}/u, ru: /\p{Script=Cyrillic}/u, by: /\p{Script=Cyrillic}/u,
    ua: /\p{Script=Cyrillic}/u, kz: /\p{Script=Cyrillic}/u, bg: /\p{Script=Cyrillic}/u, gr: /\p{Script=Greek}/u,
    th: /\p{Script=Thai}/u, il: /\p{Script=Hebrew}/u, sa: /\p{Script=Arabic}/u, ae: /\p{Script=Arabic}/u,
    eg: /\p{Script=Arabic}/u, ir: /\p{Script=Arabic}/u,
  };

  // "kd83jf9s", "xkqwvbz", "a3f9e0c4d1b2": strings no person or company would pick.
  // Case is only meaningful in the part before the @; names use it as "JanPeeters", "JPeeters", "eBay".
  const NAME_LIKE_CASE = /^[A-Z]{0,3}[a-z]*(?:[._-]?[A-Z]?[a-z]+)*[._-]?\d*$/;

  SD.looksRandom = function (text) {
    const original = (text || "").replace(/[^A-Za-z0-9._-]/g, "");
    const s = original.toLowerCase().replace(/[^a-z0-9]/g, "");
    if (s.length < 7) return false;
    if (/[a-z]/.test(original) && /[A-Z]/.test(original) && !NAME_LIKE_CASE.test(original)) return true; // "sPBnAS1x7"
    if ((s.match(/[a-z][0-9](?=[a-z])/g) || []).length >= 2) return true; // "yavewv6wpkvi9e"
    const letters = s.replace(/[0-9]/g, "");
    const digits = s.length - letters.length;
    const switches = (s.match(/[a-z](?=[0-9])|[0-9](?=[a-z])/g) || []).length;
    if (digits >= 3 && letters.length >= 3 && switches >= 4) return true;
    if (/^[0-9a-f]{12,}$/.test(s) && digits >= 3) return true;
    if (/[0-9]{6,}/.test(s)) return true;
    if (/[bcdfghjklmnpqrstvwxz]{6,}/.test(letters)) return true;
    if (letters.length >= 8 && (letters.match(/[aeiouy]/g) || []).length / letters.length < 0.1) return true;
    return false;
  };

  function plainLetters(text) {
    return text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z]/g, "");
  }

  function checkAddressOddities(email, ctx, out, { name, domain, reg, freemail, claimed }) {
    if (!freemail && SD.brandForHost(domain)) return; // a real brand's own domain
    const address = email.from.address.toLowerCase();
    const local = address.split("@")[0].split("+")[0];
    const originalLocal = email.from.address.split("@")[0].split("+")[0];
    const oddities = [];

    if (SD.looksRandom(originalLocal)) oddities.push(SD.t("odd.random", { local: originalLocal }));
    const label = reg.split(".")[0];
    if (!freemail && !label.startsWith("xn--") && SD.looksRandom(label)) {
      oddities.push(SD.t("odd.randomDomain", { reg }));
    }

    // A person's name that appears nowhere in the address: "Warren Buffett <quick-maiky@zeus.eonet.ne.jp>".
    const words = name.split(/\s+/).filter(Boolean);
    const personLike = words.length >= 1 && words.length <= 4 && words.every((w) => /^\p{L}[\p{L}'.-]*$/u.test(w)) &&
      /^\p{Lu}/u.test(name) && !claimed.length && !SD.PHRASES.orgWords.some((re) => re.test(name));
    if (personLike && !ROLE_LOCALS.test(local)) {
      const hay = plainLetters(local + domain);
      const parts = words.map(plainLetters).filter((w) => w.length >= 3);
      if (parts.length && !parts.some((p) => hay.includes(p))) {
        oddities.push(SD.t("odd.name", { name, address }));
      }
    }

    // Gmail's "via other-domain.com": the mail was sent through a different domain than the From address.
    if (email.sentVia && SD.registrableDomain(email.sentVia) !== reg && !SD.hostInList(email.sentVia, SD.CLICK_TRACKERS)) {
      oddities.push(SD.t("odd.via", { via: email.sentVia }));
    }

    const tld = SD.tldOf(domain);
    const script = TLD_SCRIPTS[tld];
    const latinLetters = (ctx.text.match(/\p{Script=Latin}/gu) || []).length;
    if (script && latinLetters >= 40 && !script.test(ctx.text)) {
      oddities.push(SD.t("odd.country", { tld, country: SD.t("country." + tld) }));
    }

    if (!oddities.length) return;
    const list = oddities.join("; ");
    const detail = list[0].toUpperCase() + list.slice(1) + ".";
    if (oddities.length === 1) {
      out.add("odd-address", "sender", 12, "odd.one.t", "odd.detail", { list: detail });
    } else {
      out.add("odd-address", "sender", 30, "odd.many.t", "odd.detail", { list: detail + SD.t("odd.many.suffix") }, true);
    }
  }

  function checkAuth(email, out) {
    const auth = email.auth;
    if (!auth) return;
    const bad = (v) => v === "fail" || v === "softfail" || v === "permerror";
    const parts = [];
    if (auth.spf) parts.push(`SPF ${auth.spf}`);
    if (auth.dkim) parts.push(`DKIM ${auth.dkim}`);
    if (auth.dmarc) parts.push(`DMARC ${auth.dmarc}`);
    const summary = parts.join(", ");
    if (auth.dmarc === "fail" || auth.compauth === "fail") {
      out.add("auth-fail", "sender", 45, "authDmarc.t", "authDmarc.d",
        { summary, domain: email.from ? SD.domainOfAddress(email.from.address) : SD.t("authClaimed") }, true);
    } else if (bad(auth.spf) && (bad(auth.dkim) || !auth.dkim || auth.dkim === "none")) {
      out.add("auth-fail", "sender", 35, "authSpfDkim.t", "authSpfDkim.d", { summary }, true);
    } else if (auth.dkim === "fail") {
      out.add("auth-weak", "sender", 15, "authDkim.t", "authDkim.d", { summary });
    } else if (bad(auth.spf)) {
      out.add("auth-weak", "sender", 10, "authSpf.t", "authSpf.d", { summary });
    } else if ([auth.spf, auth.dkim, auth.dmarc].every((v) => !v || v === "none" || v === "neutral")) {
      out.add("auth-none", "sender", 10, "authNone.t", "authNone.d");
    }
  }

  // ---------------------------------------------------------------- links

  function checkLinks(email, ctx, out, senderInfo) {
    const links = email.links || [];
    const claimedBrands = senderInfo ? senderInfo.claimed : [];
    const httpLinks = [];
    const seen = { shortener: new Set(), tld: new Set(), free: new Set(), redirect: new Set() };

    for (const link of links) {
      const rawHref = (link.href || "").trim();
      if (!rawHref || rawHref.startsWith("#") || /^(mailto|tel|sms|cid):/i.test(rawHref)) continue;
      const text = SD.stripInvisible(link.text || "").trim();
      const shortText = text.length > 60 ? text.slice(0, 57) + "…" : text;

      if (/^\s*(javascript|data|vbscript):/i.test(rawHref)) {
        out.add("script-link", "links", 35, "scriptLink.t", "scriptLink.d", { scheme: rawHref.split(":")[0] }, true);
        continue;
      }
      const href = SD.unwrapUrl(rawHref);
      const url = SD.parseUrl(href);
      if (!url || !/^https?:$/.test(url.protocol)) continue;
      const host = url.hostname.toLowerCase();
      const reg = SD.registrableDomain(host);
      const tracker = SD.hostInList(host, SD.CLICK_TRACKERS);
      httpLinks.push({ link, url, host, reg, text });

      if (ctx.threatMatches && (ctx.threatMatches.has(rawHref) || ctx.threatMatches.has(href))) {
        out.add("threat-list", "links", 60, "threat.t", "threat.d", { host }, true);
      }

      // A known company's own click tracker (click.revolut.com) isn't hiding anything.
      const senderBrand = ctx.trustedSender && SD.brandForHost(ctx.trustedSender);
      const ownTracker = tracker || Boolean(ctx.trustedSender) && (reg === SD.registrableDomain(ctx.trustedSender) ||
        Boolean(senderBrand && SD.brandOwnsHost(senderBrand, host)));
      const textHost = SD.domainInText(text);
      if (textHost && SD.registrableDomain(textHost) !== reg) {
        const textBrand = SD.brandForHost(textHost);
        const sameOwner = textBrand && SD.brandOwnsHost(textBrand, host);
        if (!sameOwner && !ownTracker) {
          out.add("link-text-mismatch", "links", 45, "linkMismatch.t", "linkMismatch.d", { text: shortText, host }, true);
        } else if (!sameOwner && ownTracker) {
          out.add("tracked-link-text", "links", 3, "tracked.t", "tracked.d", { text: shortText, reg });
        }
      } else if (!textHost && text) {
        const textBrands = SD.brandsMentioned(text);
        const loginish = SD.PHRASES.loginWords.some((re) => re.test(text));
        const brand = textBrands.find((b) => !SD.brandOwnsHost(b, host));
        if (brand && loginish && !tracker) {
          out.add("brand-link-elsewhere", "links", 25, "brandLink.t", "brandLink.d", { brand: brand.brand, text: shortText, host });
        }
      }

      const look = SD.lookalikeOf(host, ctx.ownDomains);
      if (look) {
        out.add("lookalike-link", "links", 45, "lookalikeLink.t", "lookalikeLink.d",
          { brand: look.brand.brand, host: SD.toUnicodeHost(host), reason: look.reason }, true);
      } else {
        const subBrand = SD.brandInSubdomain(host);
        if (subBrand) {
          out.add("brand-in-subdomain", "links", 25, "subBrand.t", "subBrand.d", { brand: subBrand.brand, host, reg });
        } else if (host.split(".").some((l) => l.startsWith("xn--"))) {
          out.add("punycode-link", "links", 20, "punycodeLink.t", "punycodeLink.d", { host, unicode: SD.toUnicodeHost(host) });
        }
      }

      if (!SD.brandForHost(host) && !tracker) {
        const pathBrand = SD.BRANDS.find((b) => b.domains.some((d) => {
          const label = d.split(".")[0];
          return label.length >= 5 && url.pathname.toLowerCase().split(/[/._-]/).includes(label);
        }));
        if (pathBrand && SD.PHRASES.loginWords.some((re) => re.test(url.pathname + url.search))) {
          out.add("brand-in-path", "links", 15, "pathBrand.t", "pathBrand.d", { brand: pathBrand.brand, path: host + url.pathname.slice(0, 60) });
        }
      }

      if (CHAT_APP_HOSTS.some((d) => SD.hostMatches(host, d))) {
        out.add("chat-app", "links", 15, "chat.t", "chatLink.d", { host });
      }
      if (SD.isIpHost(host)) {
        out.add("ip-link", "links", 20, "ip.t", "ip.d", { host });
      }
      if (url.username || /^https?:\/\/[^/]*@/i.test(href)) {
        out.add("userinfo-link", "links", 30, "userinfo.t", "userinfo.d", { href: href.slice(0, 70), host }, true);
      }
      if (SD.SHORTENERS.has(host) || SD.SHORTENERS.has(reg)) {
        seen.shortener.add(host);
        out.add("shortener", "links", 10, "shortener.t", "shortener.d", { list: [...seen.shortener].join(", ") });
      }
      const redirect = SD.redirectTarget(url);
      // Bouncing back to the sender's own website (app-download trackers do this) is harmless.
      const toSender = redirect && senderInfo && !senderInfo.freemail && SD.registrableDomain(redirect.hostname) === senderInfo.reg;
      if (redirect && !tracker && !toSender) {
        seen.redirect.add(redirect.hostname);
        out.add("open-redirect", "links", 10, "redirect.t", "redirect.d", { host, list: [...seen.redirect].join(", ") });
      }
      const tld = SD.tldOf(host);
      if (SD.SUSPICIOUS_TLDS.has(tld)) {
        seen.tld.add(reg);
        out.add("suspicious-tld", "links", Math.min(10, 4 + 3 * seen.tld.size), "tld.t", "tld.d", { list: [...seen.tld].join(", ") });
      }
      const encoded = (href.match(/%[0-9a-f]{2}/gi) || []).length;
      if (href.length > 250 && encoded > 25) {
        out.add("obfuscated-link", "links", 8, "obfuscated.t", "obfuscated.d", { length: href.length, encoded });
      }
      const freeHost = SD.urlInList(url, SD.FREE_HOSTING);
      if (freeHost) {
        seen.free.add(host);
        out.add("free-hosting", "links", 15, "freeHost.t", "freeHost.d", { list: [...seen.free].join(", ") });
      }
      if (url.protocol === "http:" && SD.PHRASES.loginWords.some((re) => re.test(text))) {
        out.add("http-login", "links", 12, "httpLogin.t", "httpLogin.d", { text: shortText, host });
      }
      const fakeFile = /\.(pdf|docx?|xlsx?|pptx?|zip|rar|7z)\s*$/i.test(text) ||
        (link.imageAlt && /\b(pdf|attachment|document|invoice|file)\b/i.test(link.imageAlt));
      if (fakeFile && !/\.(pdf|docx?|xlsx?|pptx?|zip|rar|7z)$/i.test(url.pathname)) {
        out.add("fake-attachment", "links", 20, "fakeAttachment.t", "fakeAttachment.d", { text: shortText || link.imageAlt, host });
      }
    }

    // Shared docs are normal, but "sign in to view this document" is a classic lure.
    const sharedDoc = httpLinks.find((l) => SD.urlInList(l.url, SD.SHARED_DOCUMENT_HOSTS));
    if (sharedDoc && SD.PHRASES.sharedDocumentLure.some((re) => re.test(ctx.text))) {
      out.add("shared-doc-lure", "links", 15, "sharedDoc.t", "sharedDoc.d", { host: sharedDoc.host });
    }

    // All links go to one site, except the button that matters.
    if (httpLinks.length >= 3) {
      const counts = {};
      for (const l of httpLinks) counts[l.reg] = (counts[l.reg] || 0) + 1;
      const domains = Object.keys(counts);
      if (domains.length === 2) {
        const odd = httpLinks.find((l) => counts[l.reg] === 1);
        const main = domains.find((d) => counts[d] > 1);
        if (odd && main && SD.PHRASES.loginWords.some((re) => re.test(odd.text)) && !SD.hostInList(odd.host, SD.CLICK_TRACKERS)) {
          out.add("odd-login-link", "links", 30, "oddLogin.t", "oddLogin.d", { main, text: odd.text.slice(0, 50), host: odd.host }, true);
        }
      }
    }
    return httpLinks;
  }

  // ---------------------------------------------------------------- attachments

  function checkAttachments(email, ctx, out) {
    const files = email.attachments || [];
    const archives = [];
    for (const file of files) {
      const rawName = file.name || "";
      const name = SD.stripInvisible(rawName);
      const ext = extOf(name);
      const parts = name.toLowerCase().split(".");

      if (BIDI_CONTROLS.test(rawName)) {
        out.add("bidi-filename", "attachments", 45, "bidiFile.t", "bidiFile.d", { name }, true);
      }
      if (SD.DANGEROUS_EXTENSIONS.has(ext)) {
        out.add("dangerous-attachment", "attachments", 55, "dangerous.t", "dangerous.d", { name, ext }, true);
      } else if (SD.HTML_EXTENSIONS.has(ext)) {
        let detail = SD.t("htmlAtt.d", { name });
        let weight = 40;
        if (file.content && /<form|type=["']?password|atob\(|eval\(|fromCharCode|window\.location|\.submit\(/i.test(file.content)) {
          detail += SD.t("htmlAtt.script");
          weight = 50;
        }
        out.add("html-attachment", "attachments", weight, "htmlAtt.t", "odd.detail", { list: detail }, true);
        if (/voice|audio|fax|remit|payment|invoice|scan|doc|statement|receipt|order|po[-_ ]?\d/i.test(name)) {
          out.add("odd-attachment-name", "attachments", 10, "oddAttName.t", "oddAttName.d", { name });
        }
      } else if (SD.MACRO_EXTENSIONS.has(ext)) {
        out.add("macro-attachment", "attachments", 25, "macro.t", "macro.d", { name });
      } else if (SD.ARCHIVE_EXTENSIONS.has(ext)) {
        archives.push(name);
      }
      if (parts.length >= 3) {
        const inner = parts[parts.length - 2];
        if (SD.DOCUMENT_EXTENSIONS.has(inner) && inner !== ext && !SD.DOCUMENT_EXTENSIONS.has(ext) && !SD.ARCHIVE_EXTENSIONS.has(ext)) {
          out.add("double-extension", "attachments", 20, "double.t", "double.d", { name, inner, ext });
        }
      }
    }
    if (archives.length && SD.PHRASES.archivePassword.some((re) => re.test(ctx.text))) {
      out.add("archive-password", "attachments", 25, "archivePw.t", "archivePw.d", { list: quote(archives) });
    }
  }

  // ---------------------------------------------------------------- content

  function checkContent(email, ctx, out, senderInfo, httpLinks) {
    const text = ctx.text;
    const hits = (category) => SD.matchPhrases(category, text);

    const urgency = hits("urgency");
    if (urgency.length) {
      out.add("urgency", "content", [0, 10, 18, 25][Math.min(urgency.length, 3)], "urgency.t", "urgency.d", { list: quote(urgency) }, urgency.length >= 2);
    }
    const creds = hits("credentials");
    if (creds.length) {
      out.add("credentials", "content", creds.length >= 2 ? 30 : 25, "credentials.t", "credentials.d", { list: quote(creds) }, true);
    }
    const payment = hits("payment");
    if (payment.length) {
      out.add("payment-method", "content", 20, "payment.t", "payment.d", { list: quote(payment) }, true);
    }
    const greeting = hits("genericGreeting");
    const local = ctx.userAddress ? ctx.userAddress.split("@")[0] : null;
    if (greeting.length) {
      out.add("generic-greeting", "content", 8, "greeting.t", "greeting.d", { first: quote(greeting, 1) });
    } else if (local && local.length >= 3 && new RegExp(`^\\s*(dear|hello|hi|beste|cher|chère|hallo)\\s+${local.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "im").test(text)) {
      out.add("generic-greeting", "content", 8, "greetingLocal.t", "greetingLocal.d", { local });
    }
    const tooGood = hits("tooGood");
    const advanceFee = hits("advanceFee");
    const bigAmount = text.match(BIG_AMOUNT);
    if (bigAmount && (advanceFee.length || tooGood.length)) {
      out.add("advance-fee", "content", 30, "advanceFee.t", "advanceFee.d", { list: quote([bigAmount[0].trim(), ...advanceFee, ...tooGood]) }, true);
    } else if (tooGood.length || advanceFee.length) {
      const all = [...tooGood, ...advanceFee];
      out.add("too-good", "content", all.length >= 2 ? 20 : 12, "tooGood.t", "tooGood.d", { list: quote(all) });
    }
    // Exempt a real brand's own mail (e.g. a streaming service announcing new series).
    const brandSender = senderInfo && !senderInfo.freemail && SD.brandForHost(senderInfo.domain);
    const iptv = brandSender ? [] : hits("iptv");
    if (iptv.length >= 2) {
      out.add("iptv", "content", 30, "iptv.t", "iptv.d", { list: quote(iptv) }, true);
    }
    const hardSell = hits("hardSell");
    if (hardSell.length >= 2) {
      out.add("hard-sell", "content", 10, "hardSell.t", "hardSell.d", { list: quote(hardSell) });
    }
    const chatApp = hits("chatApp");
    if (chatApp.length) {
      out.add("chat-app", "content", 15, "chat.t", "chatText.d", { first: quote(chatApp, 1) });
    }

    const gambling = hits("gambling");
    if (gambling.length >= 2) {
      out.add("gambling", "content", 25, "gambling.t", "gambling.d", { list: quote(gambling) }, true);
    } else if (gambling.length === 1) {
      out.add("gambling", "content", 8, "gamblingOne.t", "gamblingOne.d", { list: quote(gambling) });
    }
    const replyBait = hits("replyBait");
    if (replyBait.length && httpLinks.length === 0) {
      out.add("reply-bait", "content", 10, "replyBait.t", "replyBait.d", { first: quote(replyBait, 1) });
    }
    const refund = hits("refund");
    if (refund.length) out.add("refund", "content", 10, "refund.t", "refund.d", { list: quote(refund) });
    const government = hits("government");
    if (government.length && (refund.length || creds.length)) {
      out.add("government-lure", "content", 15, "govLure.t", "govLure.d", { list: quote(government) });
    }
    const secrecy = hits("secrecy");
    if (secrecy.length) {
      out.add("secrecy", "content", 15, "secrecy.t", "secrecy.d", { list: quote(secrecy) });
    }
    const banner = hits("fakeBanner");
    if (banner.length) {
      out.add("fake-banner", "content", 15, "fakeBanner.t", "fakeBanner.d", { first: quote(banner, 1) });
    }
    const delivery = hits("delivery");
    if (delivery.length) {
      const fee = SMALL_AMOUNT.test(text);
      out.add("delivery-fee", "content", fee ? 22 : 12, fee ? "deliveryFee.t" : "deliveryParcel.t", "delivery.d",
        { list: quote(delivery), fee: fee ? SD.t("delivery.feeSuffix") : "" });
    }
    const sextortion = hits("sextortion");
    if (sextortion.length >= 2) {
      out.add("sextortion", "content", payment.length ? 45 : 35, "sextortion.t", "sextortion.d", { list: quote(sextortion) }, true);
    }
    const bec = hits("bec");
    if (bec.length) {
      out.add("bec", "content", 25, "bec.t", "bec.d", { list: quote(bec) }, true);
    }

    // Callback scams: fake invoice + well-known brand + a phone number, often with no link at all.
    const phones = (text.match(PHONE) || []).filter((p) => {
      const digits = p.replace(/\D/g, "");
      return digits.length >= 9 && digits.length <= 15 && !/^(19|20)\d{6}$/.test(digits);
    });
    const callAction = hits("callAction");
    const bodyBrands = SD.brandsMentioned(text).filter((b) => CALLBACK_BRANDS.has(b.brand));
    const senderOwnsBrand = senderInfo && bodyBrands.some((b) => SD.brandOwnsHost(b, senderInfo.domain) && !senderInfo.freemail);
    if (phones.length && bodyBrands.length && hits("invoice").length && !senderOwnsBrand) {
      out.add("callback-scam", "content", 30, "callback.t", "callback.d", { brand: bodyBrands[0].brand, phone: phones[0].trim() }, true);
    } else if (phones.length && callAction.length && httpLinks.length === 0) {
      out.add("phone-cta", "content", 10, "phoneCta.t", "phoneCta.d", { phone: phones[0].trim() });
    }

    const qr = hits("qr");
    if (qr.length && (email.images || []).length) {
      out.add("qr-code", "content", 12, "qr.t", "qr.d");
    }

    const subject = email.subject || "";
    if (REPLY_PREFIX.test(subject) && !email.hasQuotedThread && (email.threadLength || 1) <= 1 &&
        !SD.PHRASES.quoteMarkers.some((re) => re.test(text))) {
      out.add("fake-reply", "context", 10, "fakeReply.t", "fakeReply.d", { prefix: subject.match(REPLY_PREFIX)[0] });
    }
    return { urgency };
  }

  // ---------------------------------------------------------------- HTML tricks

  function checkHtml(email, ctx, out, senderInfo) {
    const hidden = SD.stripInvisible(email.hiddenText || "").replace(/\s+/g, " ").trim();
    const novel = novelHiddenWords(hidden, ctx.text);
    // Newsletters hide a short "preheader" (preview line), and responsive emails hide a copy of
    // their own text for the other screen size. Only flag lots of hidden text you can't see anywhere.
    if (novel.length >= 35 && novel.join(" ").length >= 250) {
      out.add("hidden-text", "html", 30, "hidden.t", "hidden.d", { chars: novel.join(" ").length, start: novel.slice(0, 14).join(" ") }, true);
    }

    const rawText = String(email.text || "") + " " + (email.subject || "") + " " + (email.from?.name || "");
    const broken = rawText.match(INVISIBLE_IN_WORD) || [];
    if (broken.length >= 2) {
      const example = rawText.slice(Math.max(0, rawText.search(INVISIBLE_IN_WORD) - 6)).split(/\s/)[0];
      out.add("zero-width", "html", 20, "zeroWidth.t", "zeroWidth.d", { count: broken.length, example: SD.stripInvisible(example) });
    }

    const visible = (ctx.text || "").replace(/\s+/g, "");
    const bigImages = (email.images || []).filter((img) => !(img.width && img.height) || img.width * img.height >= 40000);
    if (visible.length < 80 && bigImages.length >= 1) {
      out.add("image-only", "html", 15, "imageOnly.t", "imageOnly.d");
    }

    // Only for brands the email claims to be: a footer "Facebook" icon on a shop's own server is normal.
    if (senderInfo && senderInfo.claimed.length) {
      for (const img of email.images || []) {
        const src = SD.parseUrl(img.src);
        if (!src || !/^https?:$/.test(src.protocol)) continue;
        const file = decodeURIComponent(src.pathname.split("/").pop() || "");
        const brands = SD.brandsMentioned(`${img.alt || ""} ${file.replace(/[-_.]/g, " ")}`);
        const brand = brands.find((b) => senderInfo.claimed.includes(b) && !SD.brandOwnsHost(b, src.hostname) && !SD.brandOwnsHost(b, senderInfo.domain));
        if (brand && /logo|brand|header|icon/i.test(`${img.alt} ${file}`)) {
          out.add("foreign-logo", "html", 8, "foreignLogo.t", "foreignLogo.d", { brand: brand.brand, host: src.hostname });
          break;
        }
      }
    }

    if (email.forms && email.forms.count) {
      out.add("embedded-form", "html", email.forms.hasPassword ? 45 : 25, "form.t", email.forms.hasPassword ? "formPw.d" : "formFields.d", {}, email.forms.hasPassword);
    }

    if (email.rawHtml && /<script\b|atob\(|eval\(|data:text\/html;base64|document\.write\(\s*(unescape|atob)|String\.fromCharCode\(/i.test(email.rawHtml)) {
      out.add("obfuscated-html", "html", 20, "obfuscatedHtml.t", "obfuscatedHtml.d");
    }
  }

  // Hidden words that aren't part of a run of three words also visible in the message.
  function novelHiddenWords(hidden, visibleText) {
    const words = (text) => text.toLowerCase().split(/[^\p{L}\p{N}']+/u).filter(Boolean);
    const hiddenWords = words(hidden);
    const visible = words(SD.stripInvisible(visibleText || ""));
    const shingles = new Set();
    for (let i = 0; i + 2 < visible.length; i++) shingles.add(visible.slice(i, i + 3).join(" "));
    const covered = new Array(hiddenWords.length).fill(false);
    for (let i = 0; i + 2 < hiddenWords.length; i++) {
      if (shingles.has(hiddenWords.slice(i, i + 3).join(" "))) covered[i] = covered[i + 1] = covered[i + 2] = true;
    }
    return hiddenWords.filter((w, i) => !covered[i] && /\p{L}{2,}/u.test(w));
  }

  function checkContext(email, out, urgency) {
    if (email.undisclosed) {
      out.add("undisclosed", "context", 10, "undisclosed.t", "undisclosed.d");
    } else if ((email.recipientCount || 0) >= 25) {
      out.add("mass-recipients", "context", 8, "massRecipients.t", "massRecipients.d", { count: email.recipientCount });
    }
    if (email.senderLocalHour != null && urgency.length) {
      const h = email.senderLocalHour;
      const weekend = email.senderLocalDay === 0 || email.senderLocalDay === 6;
      if (h < 6 || h >= 22 || weekend) {
        out.add("odd-hours", "context", 5, "oddHours.t", weekend ? "oddHoursWeekend.d" : "oddHours.d", { hour: String(h).padStart(2, "0") });
      }
    }
  }

  // ---------------------------------------------------------------- entry point

  SD.analyze = function (email, ctx = {}) {
    const settings = Object.assign({}, SD.DEFAULT_SETTINGS, ctx.settings || {});
    const ownDomains = [...(settings.ownDomains || [])];
    const userDomain = SD.domainOfAddress(email.userAddress || "");
    if (userDomain && !SD.FREEMAIL_DOMAINS.has(userDomain) && !ownDomains.includes(userDomain)) ownDomains.push(userDomain);

    // Known companies (brand list + trusted list) and the user's own trusted domains.
    const fromDomain = email.from ? SD.domainOfAddress(email.from.address) : "";
    const freemailSender = SD.FREEMAIL_DOMAINS.has(fromDomain) || SD.FREEMAIL_DOMAINS.has(SD.registrableDomain(fromDomain));
    const userTrusted = Boolean(fromDomain) && settings.trustedDomains.some((d) => SD.hostMatches(fromDomain, d.trim().toLowerCase()));
    const knownCompany = Boolean(fromDomain) && !freemailSender &&
      Boolean(SD.brandForHost(fromDomain) || SD.TRUSTED_SENDER_DOMAINS.some((d) => SD.hostMatches(fromDomain, d)));

    const run = {
      trustedSender: userTrusted || knownCompany ? fromDomain : null,
      settings,
      ownDomains: ownDomains.map((d) => d.toLowerCase().trim()).filter(Boolean),
      knownSenders: ctx.knownSenders || {},
      threatMatches: ctx.threatMatches || new Set(),
      userAddress: email.userAddress || null,
      text: normalizeText(`${email.subject || ""}\n${email.text || ""}`),
    };

    const out = new Findings();
    const senderInfo = checkSender(email, run, out);
    checkAuth(email, out);
    const httpLinks = checkLinks(email, run, out, senderInfo);
    checkAttachments(email, run, out);
    const { urgency } = checkContent(email, run, out, senderInfo, httpLinks);
    checkHtml(email, run, out, senderInfo);
    checkContext(email, out, urgency);

    let findings = out.items;
    const trusted = userTrusted ? "you" : knownCompany ? "known" : false;
    const authFailed = findings.some((f) => f.id === "auth-fail");
    if (trusted && !authFailed) {
      // A trusted sender's wording is not suspicious, but its links and files still get checked.
      findings = findings.filter((f) => f.category === "links" || f.category === "attachments");
    }

    findings.sort((a, b) => b.weight - a.weight);
    const score = Math.min(100, findings.reduce((sum, f) => sum + f.weight, 0));
    const t = SD.THRESHOLDS[settings.sensitivity] || SD.THRESHOLDS.normal;
    const level = score >= t.danger ? "danger" : score >= t.warning ? "warning" : "safe";
    return {
      score,
      level,
      findings,
      trusted,
      sender: email.from || null,
      subject: email.subject || "",
      summary: findings.length ? findings[0].title : SD.t("summary.none"),
    };
  };

})(globalThis.ScamDetector = globalThis.ScamDetector || {});
