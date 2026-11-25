// Domain and URL helpers: registrable domains, punycode, homoglyph skeletons, lookalike checks.
(function (SD) {
  "use strict";

  const IPV4 = /^\d{1,3}(\.\d{1,3}){3}$/;
  const NUMERIC_HOST = /^(0x[0-9a-f]+|\d+)$/i; // http://3232235777/ style hosts

  SD.parseUrl = function (raw) {
    try {
      return new URL(String(raw).trim());
    } catch {
      return null;
    }
  };

  SD.isIpHost = function (host) {
    if (!host) return false;
    return IPV4.test(host) || host.startsWith("[") || NUMERIC_HOST.test(host);
  };

  // "mail.paypal.co.uk" -> "paypal.co.uk". Approximates the Public Suffix List with a
  // short list of multi-label suffixes; good enough for brand comparison.
  SD.registrableDomain = function (host) {
    if (!host) return "";
    host = host.toLowerCase().replace(/\.$/, "");
    if (SD.isIpHost(host)) return host;
    const labels = host.split(".");
    if (labels.length <= 2) return host;
    for (let take = 3; take >= 2; take--) {
      const suffix = labels.slice(-take).join(".");
      if (SD.MULTI_PART_SUFFIXES.has(suffix) && labels.length > take) {
        return labels.slice(-(take + 1)).join(".");
      }
    }
    return labels.slice(-2).join(".");
  };

  SD.domainOfAddress = function (address) {
    if (!address) return "";
    const at = address.lastIndexOf("@");
    return at === -1 ? "" : address.slice(at + 1).toLowerCase().replace(/[>\s]/g, "");
  };

  SD.tldOf = function (host) {
    const parts = (host || "").split(".");
    return parts[parts.length - 1].toLowerCase();
  };

  // Does `host` equal `domain` or sit underneath it?
  SD.hostMatches = function (host, domain) {
    host = (host || "").toLowerCase();
    domain = domain.toLowerCase();
    return host === domain || host.endsWith("." + domain);
  };

  SD.hostInList = function (host, list) {
    return list.some((entry) => {
      const [entryHost] = entry.split("/");
      return SD.hostMatches(host, entryHost);
    });
  };

  // Matches entries like "docs.google.com/forms" against a full URL.
  SD.urlInList = function (url, list) {
    const hostPath = (url.hostname + url.pathname).toLowerCase();
    return list.find((entry) => {
      if (!entry.includes("/")) return SD.hostMatches(url.hostname, entry);
      return hostPath.startsWith(entry) || hostPath.includes("." + entry);
    });
  };

  // ---- Punycode (RFC 3492) decoding, enough to turn xn-- labels back into Unicode ----

  function decodePunycodeLabel(input) {
    const base = 36, tMin = 1, tMax = 26, skew = 38, damp = 700;
    let n = 128, i = 0, bias = 72;
    const output = [];
    let basic = input.lastIndexOf("-");
    if (basic < 0) basic = 0;
    for (let j = 0; j < basic; j++) output.push(input.charCodeAt(j));
    const adapt = (delta, numPoints, firstTime) => {
      delta = firstTime ? Math.floor(delta / damp) : delta >> 1;
      delta += Math.floor(delta / numPoints);
      let k = 0;
      while (delta > ((base - tMin) * tMax) >> 1) {
        delta = Math.floor(delta / (base - tMin));
        k += base;
      }
      return k + Math.floor(((base - tMin + 1) * delta) / (delta + skew));
    };
    const digit = (cp) =>
      cp - 48 < 10 ? cp - 22 : cp - 65 < 26 ? cp - 65 : cp - 97 < 26 ? cp - 97 : base;
    for (let idx = basic > 0 ? basic + 1 : 0; idx < input.length; ) {
      const oldi = i;
      for (let w = 1, k = base; ; k += base) {
        if (idx >= input.length) throw new Error("bad punycode");
        const d = digit(input.charCodeAt(idx++));
        if (d >= base) throw new Error("bad punycode");
        i += d * w;
        const t = k <= bias ? tMin : k >= bias + tMax ? tMax : k - bias;
        if (d < t) break;
        w *= base - t;
      }
      const len = output.length + 1;
      bias = adapt(i - oldi, len, oldi === 0);
      n += Math.floor(i / len);
      i %= len;
      output.splice(i++, 0, n);
    }
    return String.fromCodePoint(...output);
  }

  SD.toUnicodeHost = function (host) {
    return (host || "")
      .split(".")
      .map((label) => {
        if (!label.toLowerCase().startsWith("xn--")) return label;
        try {
          return decodePunycodeLabel(label.slice(4).toLowerCase());
        } catch {
          return label;
        }
      })
      .join(".");
  };

  // ---- Homoglyph skeleton: collapse lookalike characters to one canonical form ----

  // Maps lookalike characters to Latin but keeps separators: "paypa1-secure" -> "paypal-secure".
  function unconfuse(text) {
    let out = "";
    for (const ch of (text || "").normalize("NFKC").toLowerCase()) {
      out += SD.CONFUSABLES[ch] ?? ch;
    }
    return out.replace(/rn/g, "m").replace(/vv/g, "w");
  }

  SD.skeleton = function (text) {
    return unconfuse(text).replace(/cl/g, "d").replace(/[-_.]/g, "");
  };

  SD.levenshtein = function (a, b) {
    if (a === b) return 0;
    if (Math.abs(a.length - b.length) > 3) return 99;
    let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
    for (let i = 1; i <= a.length; i++) {
      const cur = [i];
      for (let j = 1; j <= b.length; j++) {
        const cost = a[i - 1] === b[j - 1] ? 0 : 1;
        cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + cost);
      }
      prev = cur;
    }
    return prev[b.length];
  };

  // ---- Brand lookups ----

  function escapeRegex(text) {
    return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }

  // Precompile one regex per brand for name matching in free text.
  const brandMatchers = SD.BRANDS.map((b) => {
    const insensitive = (b.names || []).map(escapeRegex);
    const sensitive = (b.caseSensitiveNames || []).map(escapeRegex);
    return {
      brand: b,
      ci: insensitive.length ? new RegExp(`(^|[^\\p{L}\\p{N}])(${insensitive.join("|")})(?=$|[^\\p{L}\\p{N}])`, "iu") : null,
      cs: sensitive.length ? new RegExp(`(^|[^\\p{L}\\p{N}])(${sensitive.join("|")})(?=$|[^\\p{L}\\p{N}])`, "u") : null,
    };
  });

  // Returns every brand mentioned by name in `text`.
  SD.brandsMentioned = function (text) {
    if (!text) return [];
    const clean = SD.stripInvisible(text).normalize("NFKC");
    return brandMatchers
      .filter((m) => (m.ci && m.ci.test(clean)) || (m.cs && m.cs.test(clean)))
      .map((m) => m.brand);
  };

  SD.brandOwnsHost = function (brand, host) {
    return brand.domains.some((d) => SD.hostMatches(host, d));
  };

  SD.brandForHost = function (host) {
    return SD.BRANDS.find((b) => SD.brandOwnsHost(b, host)) || null;
  };

  // The "main" label of a brand domain: paypal.com -> paypal, amazon.co.uk -> amazon.
  function mainLabel(domain) {
    const reg = SD.registrableDomain(domain);
    return reg.split(".")[0];
  }

  const brandLabels = [];
  for (const b of SD.BRANDS) {
    const seen = new Set();
    for (const d of b.domains) {
      const label = mainLabel(d);
      if (label.length >= 4 && !seen.has(label)) {
        seen.add(label);
        brandLabels.push({ brand: b, label, skeleton: SD.skeleton(label) });
      }
    }
  }

  const RISK_WORDS = [
    "secure", "security", "login", "logon", "signin", "verify", "verification", "account", "support",
    "billing", "update", "service", "services", "help", "helpdesk", "auth", "wallet", "pay", "payment",
    "id", "team", "alert", "notice", "online", "web", "app", "mail", "customer", "client", "refund",
    "delivery", "track", "tracking", "parcel", "confirm", "unlock", "recovery", "center", "centre",
    "portal", "official", "info", "access", "check", "safe", "protect", "invoice", "store", "shop",
  ];

  // Detects domains that imitate a known brand. Returns { brand, reason } or null.
  // `extraTargets` lets callers add the user's own organization domains.
  SD.lookalikeOf = function (host, extraTargets = []) {
    if (!host || SD.isIpHost(host)) return null;
    const reg = SD.registrableDomain(host);
    const unicodeReg = SD.toUnicodeHost(reg);
    const label = unicodeReg.split(".")[0];
    const labelSkeleton = SD.skeleton(label);
    if (SD.brandForHost(host)) return null;

    const targets = brandLabels.concat(
      extraTargets.map((d) => ({ brand: { brand: d, domains: [d] }, label: mainLabel(d), skeleton: SD.skeleton(mainLabel(d)) }))
    );

    for (const t of targets) {
      if (t.brand.domains.some((d) => SD.hostMatches(host, d))) return null;
    }

    for (const t of targets) {
      const generic = GENERIC_LABELS.has(t.label);
      if (label === t.label) {
        if (generic) continue;
        // Same name, different TLD: paypal.co vs paypal.com
        return { brand: t.brand, reason: SD.t("look.sameName", { label: t.label, brand: t.brand.brand }) };
      }
      if (labelSkeleton === t.skeleton) {
        return { brand: t.brand, reason: SD.t("look.homoglyph", { label: t.label, domain: unicodeReg }) };
      }
      if (generic) continue;
      if (t.label.length >= 6 && label[0] === t.label[0]) {
        const distance = SD.levenshtein(labelSkeleton, t.skeleton);
        const allowed = t.label.length >= 9 ? 2 : 1;
        if (distance > 0 && distance <= allowed) {
          return { brand: t.brand, reason: SD.t("look.misspelling", { label: t.label }) };
        }
      }
      if (embedsBrand(label, t.label) || embedsBrand(unconfuse(label), t.label)) {
        const disguised = !label.includes(t.label);
        return { brand: t.brand, reason: SD.t(disguised ? "look.embeddedDisguised" : "look.embedded", { label: t.label }) };
      }
    }
    return null;
  };

  // Brand names that are also everyday words; only exact homoglyph tricks count for these.
  const GENERIC_LABELS = new Set([
    "office", "outlook", "windows", "belgium", "booking", "chase", "azure", "skype", "teams",
    "bestbuy", "itsme", "telenet", "steamstatic", "bstatic", "muscache", "media-amazon",
  ]);

  // "amazon-support-billing" or "paypalsecure" embed a brand; "pineapple-farm" doesn't.
  function embedsBrand(label, brandLabel) {
    if (brandLabel.length < 4 || label === brandLabel || !label.includes(brandLabel)) return false;
    return label.split("-").some((token) => {
      if (token === brandLabel) return true;
      if (!token.startsWith(brandLabel) && !token.endsWith(brandLabel)) return false;
      const rest = token.replace(brandLabel, "").replace(/\d+/g, "");
      return rest === "" || RISK_WORDS.includes(rest);
    });
  }

  // paypal.com.secure-login.xyz -> PayPal (brand in the subdomain, not the registrable domain).
  SD.brandInSubdomain = function (host) {
    const reg = SD.registrableDomain(host);
    if (host === reg || SD.brandForHost(host)) return null;
    const sub = host.slice(0, host.length - reg.length - 1);
    const subLabels = sub.split(/[.-]/);
    for (const t of brandLabels) {
      if (!GENERIC_LABELS.has(t.label) && subLabels.includes(t.label)) return t.brand;
    }
    return null;
  };

  // Removes the redirect wrappers that webmail and security gateways add, so we judge the real link.
  SD.unwrapUrl = function (href) {
    let current = href;
    for (let depth = 0; depth < 4; depth++) {
      const url = SD.parseUrl(current);
      if (!url) return current;
      const host = url.hostname.toLowerCase();
      let next = null;
      if (host.endsWith("safelinks.protection.outlook.com")) next = url.searchParams.get("url");
      else if (/^(www\.)?google\.[a-z.]+$/.test(host) && url.pathname === "/url") next = url.searchParams.get("q") || url.searchParams.get("url");
      else if (host === "urldefense.com" && url.pathname.startsWith("/v3/__")) {
        const m = current.match(/\/v3\/__(.+?)__;/);
        next = m ? m[1] : null;
      } else if (host === "urldefense.proofpoint.com") {
        const u = url.searchParams.get("u");
        next = u ? u.replace(/-/g, "%").replace(/_/g, "/") : null;
        if (next) next = decodeURIComponent(next);
      }
      if (!next) return current;
      current = next;
    }
    return current;
  };

  // Query parameters that carry another URL (open redirects / ad-click chains).
  SD.redirectTarget = function (url) {
    for (const [, value] of url.searchParams) {
      const v = value.trim();
      if (/^https?:\/\//i.test(v) || /^https?%3a/i.test(v)) {
        const target = SD.parseUrl(/%3a/i.test(v.slice(0, 8)) ? decodeURIComponent(v) : v);
        if (target && SD.registrableDomain(target.hostname) !== SD.registrableDomain(url.hostname)) {
          return target;
        }
      }
    }
    return null;
  };

  // Pulls a domain out of link text like "https://paypal.com/login" or "www.paypal.com".
  SD.domainInText = function (text) {
    const clean = SD.stripInvisible(text || "").trim();
    if (!clean || clean.length > 300) return null;
    const m = clean.match(/^(?:https?:\/\/)?((?:[a-z0-9¡-￿-]+\.)+[a-z¡-￿]{2,})(?::\d+)?(?:[/?#]\S*)?$/i);
    if (!m) return null;
    const host = m[1].toLowerCase();
    const tld = SD.tldOf(host);
    // "Invoice.pdf" and "index.html" aren't domains (but "paypal.com" is, even though .com is also a file type).
    const explicit = /^(https?:\/\/|www\.)/i.test(clean);
    const fileLike = tld !== "com" && [SD.DOCUMENT_EXTENSIONS, SD.HTML_EXTENSIONS, SD.DANGEROUS_EXTENSIONS, SD.ARCHIVE_EXTENSIONS].some((set) => set.has(tld));
    if (!explicit && fileLike) return null;
    const asUrl = SD.parseUrl("http://" + host);
    return asUrl ? asUrl.hostname : null;
  };

  SD.stripInvisible = function (text) {
    return String(text || "").replace(/[​-‏⁠-⁤﻿­‪-‮⁦-⁩]/g, "");
  };
})(globalThis.ScamDetector = globalThis.ScamDetector || {});
