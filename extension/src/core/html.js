// Turns an email body (a DOM element) into the features the detector needs:
// visible text, hidden text, links, images and form fields.
// `live: true` uses computed styles (rendered webmail); otherwise only inline styles
// are available (a document built with DOMParser from raw email source).
(function (SD) {
  "use strict";

  const SKIP_TAGS = new Set(["SCRIPT", "STYLE", "HEAD", "TITLE", "NOSCRIPT", "TEMPLATE", "META", "LINK"]);
  const BLOCK_TAGS = new Set(["P", "DIV", "BR", "TR", "LI", "H1", "H2", "H3", "H4", "H5", "H6", "TABLE", "BLOCKQUOTE", "SECTION", "ARTICLE", "HEADER", "FOOTER", "UL", "OL", "PRE", "HR", "CENTER"]);
  const MAX_NODES = 25000;

  // Quoted history that the webmail UI itself collapses; hiding it is not the sender's trick.
  const WEBMAIL_COLLAPSED = ".gmail_quote, .gmail_extra, .adL, .im, blockquote, #divRplyFwdMsg, [id*='appendonsend']";

  function parseColor(value) {
    const m = /rgba?\(([\d.]+),\s*([\d.]+),\s*([\d.]+)(?:,\s*([\d.]+))?\)/.exec(value || "");
    if (!m) return null;
    return { r: +m[1], g: +m[2], b: +m[3], a: m[4] === undefined ? 1 : +m[4] };
  }

  const NAMED = { white: "#ffffff", black: "#000000", "#fff": "#ffffff", "#000": "#000000" };
  function parseStaticColor(value) {
    if (!value) return null;
    let v = value.trim().toLowerCase();
    v = NAMED[v] || v;
    let m = /^#([0-9a-f]{6})$/.exec(v);
    if (m) return { r: parseInt(m[1].slice(0, 2), 16), g: parseInt(m[1].slice(2, 4), 16), b: parseInt(m[1].slice(4, 6), 16), a: 1 };
    m = /^#([0-9a-f]{3})$/.exec(v);
    if (m) return { r: parseInt(m[1][0] + m[1][0], 16), g: parseInt(m[1][1] + m[1][1], 16), b: parseInt(m[1][2] + m[1][2], 16), a: 1 };
    return parseColor(v);
  }

  function nearlySame(a, b) {
    if (!a || !b) return false;
    return Math.abs(a.r - b.r) + Math.abs(a.g - b.g) + Math.abs(a.b - b.b) < 24;
  }

  function hasOwnText(el) {
    for (const n of el.childNodes) if (n.nodeType === 3 && n.nodeValue.trim().length > 1) return true;
    return false;
  }

  // ---- live (computed-style) hidden check ----

  function liveBackground(el) {
    for (let node = el; node && node.nodeType === 1; node = node.parentElement) {
      const cs = getComputedStyle(node);
      if (cs.backgroundImage && cs.backgroundImage !== "none") return null; // text over an image: can't judge
      const bg = parseColor(cs.backgroundColor);
      if (bg && bg.a > 0.5) return bg;
    }
    return { r: 255, g: 255, b: 255, a: 1 };
  }

  // Returns "box" when the element and everything inside it is hidden, "text" when only its own
  // text is unreadable (tiny or same colour as the background), or false.
  // Font size and colour are "text" only: email templates often set font-size:0 on a wrapper to
  // remove gaps between columns and give the text inside a normal size again.
  function liveHidden(el) {
    const cs = getComputedStyle(el);
    if (cs.display === "none" || cs.visibility === "hidden" || cs.visibility === "collapse") return "box";
    if (parseFloat(cs.opacity) < 0.05) return "box";
    if (/hidden|clip/.test(cs.overflow) && (parseFloat(cs.height) <= 1 || parseFloat(cs.width) <= 1 || cs.maxHeight === "0px")) return "box";
    if (cs.clip === "rect(0px, 0px, 0px, 0px)" || /inset\(50%/.test(cs.clipPath)) return "box";
    if (parseFloat(cs.textIndent) < -500) return "box";
    if (cs.position === "absolute" && (parseFloat(cs.left) < -500 || parseFloat(cs.top) < -500)) return "box";
    if (hasOwnText(el)) {
      if (parseFloat(cs.fontSize) < 2) return "text";
      const color = parseColor(cs.color);
      if (color && color.a < 0.1) return "text";
      if (nearlySame(color, liveBackground(el))) return "text";
    }
    return false;
  }

  // ---- static (inline-style) hidden check ----

  function styleOf(el) {
    return (el.getAttribute("style") || "").toLowerCase().replace(/\s+/g, "");
  }

  function staticBackground(el) {
    for (let node = el; node && node.nodeType === 1; node = node.parentElement) {
      const style = styleOf(node);
      if (/background-image|background:url/.test(style)) return null;
      const m = /background(?:-color)?:([^;!]+)/.exec(style);
      const bg = parseStaticColor(m ? m[1] : node.getAttribute("bgcolor"));
      if (bg) return bg;
    }
    return { r: 255, g: 255, b: 255, a: 1 };
  }

  function staticHidden(el) {
    if (el.hasAttribute("hidden")) return "box";
    const style = styleOf(el);
    if (!style && el.tagName !== "FONT") return false;
    if (/display:none|visibility:hidden|mso-hide:all/.test(style)) return "box";
    if (/(^|;)opacity:0(\.0\d*)?(;|$)/.test(style)) return "box";
    if (/overflow:hidden/.test(style) && /(max-height|height|width):0(px)?(;|$|!)/.test(style)) return "box";
    if (/text-indent:-\d{3,}/.test(style)) return "box";
    if (hasOwnText(el)) {
      if (/font-size:0*(\.\d+)?(px|pt|em|rem|%)?(;|$|!)/.test(style) || /font-size:[01](px|pt)/.test(style)) return "text";
      const m = /(?:^|;)color:([^;!]+)/.exec(style);
      const color = parseStaticColor(m ? m[1] : el.getAttribute("color"));
      if (color && nearlySame(color, staticBackground(el))) return "text";
    }
    return false;
  }

  function collectText(root, isHidden, skipSelector) {
    const visible = [];
    const hidden = [];
    let count = 0;
    // boxHidden: this element and all its children are hidden. textHidden: only its own text is.
    const visit = (node, boxHidden, textHidden) => {
      for (const child of node.childNodes) {
        if (++count > MAX_NODES) return;
        if (child.nodeType === 3) {
          (textHidden ? hidden : visible).push(child.nodeValue);
        } else if (child.nodeType === 1) {
          if (SKIP_TAGS.has(child.tagName)) continue;
          if (skipSelector && child.matches(skipSelector)) continue;
          const state = boxHidden ? "box" : isHidden(child);
          const childBox = state === "box";
          const sep = BLOCK_TAGS.has(child.tagName) ? "\n" : child.tagName === "TD" ? " " : "";
          const bucket = childBox ? hidden : visible;
          if (sep) bucket.push(sep);
          visit(child, childBox, Boolean(state));
          if (sep) bucket.push(sep);
        }
      }
    };
    visit(root, false, false);
    const clean = (parts) => parts.join("").replace(/[ \t ]+/g, " ").replace(/\n\s*\n+/g, "\n").trim();
    return { text: clean(visible), hiddenText: clean(hidden) };
  }

  // Webmail proxies remote images; recover the original address.
  SD.unwrapImageUrl = function (src) {
    if (!src) return "";
    const hash = src.indexOf("#http");
    if (/googleusercontent\.com/.test(src) && hash !== -1) return src.slice(hash + 1);
    const url = SD.parseUrl(src);
    if (url && /outlook\.(live|office|office365)\.com$/.test(url.hostname)) {
      return url.searchParams.get("url") || url.searchParams.get("u") || src;
    }
    return src;
  };

  SD.extractFromRoot = function (root, { live = false, skipCollapsed = live } = {}) {
    const isHidden = live ? liveHidden : staticHidden;
    const { text, hiddenText } = collectText(root, isHidden, skipCollapsed ? WEBMAIL_COLLAPSED : null);

    const links = [...root.querySelectorAll("a[href], area[href]")].slice(0, 500).map((a) => {
      const img = a.querySelector("img");
      return {
        href: a.getAttribute("originalsrc") || a.getAttribute("href") || "",
        text: (live ? a.innerText : a.textContent || "").trim(),
        title: a.getAttribute("title") || "",
        imageAlt: img ? img.getAttribute("alt") || "" : "",
      };
    });

    const images = [...root.querySelectorAll("img")].slice(0, 200).map((img) => ({
      src: SD.unwrapImageUrl(img.getAttribute("originalsrc") || img.getAttribute("src") || img.getAttribute("data-src") || ""),
      alt: img.getAttribute("alt") || "",
      width: live ? img.width : parseInt(img.getAttribute("width"), 10) || 0,
      height: live ? img.height : parseInt(img.getAttribute("height"), 10) || 0,
    }));

    const fields = [...root.querySelectorAll("form, input:not([type=hidden]), textarea, select")];
    const forms = {
      count: fields.length,
      hasPassword: Boolean(root.querySelector("input[type=password]")),
    };

    const hasQuotedThread = Boolean(root.querySelector("blockquote, .gmail_quote, #divRplyFwdMsg, [id*='appendonsend'], .moz-cite-prefix, #OLK_SRC_BODY_SECTION, .yahoo_quoted"));

    return { text, hiddenText, links, images, forms, hasQuotedThread };
  };
})(globalThis.ScamDetector = globalThis.ScamDetector || {});
