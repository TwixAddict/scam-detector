// Renders a detector result as a warning card. Used inside webmail (in a shadow root),
// in the popup and on the analyzer page. All email-derived text goes through textContent.
(function (SD) {
  "use strict";

  // Dark variant of the palette, used for dark mailboxes ("dark") or a dark browser ("auto").
  const DARK_VARS = `
    --red: #F09595; --red-bg: #2A2A28; --red-soft: #4A2222;
    --orange: #E9B467; --orange-bg: #2A2A28; --orange-soft: #47341A;
    --green: #A6CF7C; --green-bg: #2A2A28; --green-soft: #2E3F1E;
    --blue: #7FB2E8; --blue-soft: #1D3550;
    --card: #2A2A28; --text: #DAD8D0; --title: #F4F3EE; --muted: #A9A79F; --line: #3D3D3A;
    --btn-bg: transparent; --btn-hover: #353532;`;

  // Palette: red = danger, orange = doubt/warning, green = safe, blue = buttons/links/busy,
  // grey = text, borders and cards. Each colour has a light background partner.
  SD.REPORT_CSS = `
    .sd-report {
      --red: #A32D2D; --red-bg: #FCEBEB; --red-soft: rgba(163,45,45,.12);
      --orange: #854F0B; --orange-bg: #FAEEDA; --orange-soft: rgba(133,79,11,.12);
      --green: #3B6D11; --green-bg: #EAF3DE; --green-soft: rgba(59,109,17,.12);
      --blue: #185FA5; --blue-bg: #E6F1FB; --blue-soft: rgba(24,95,165,.12);
      --grey: #444441; --grey-bg: #F1EFE8;
      --card: #FFFFFF; --text: #444441; --title: #2C2C2A; --muted: #6E6D66; --line: rgba(68,68,65,.18);
      --btn-bg: #FFFFFF; --btn-hover: #F1EFE8;
      font: 14px/1.45 system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
      color: var(--text); background: var(--card); border: 1px solid var(--line); border-radius: 14px;
      margin: 8px 0 14px; padding: 14px 16px; text-align: left;
    }
    .sd-report.sd-theme-dark { ${DARK_VARS} }
    @media (prefers-color-scheme: dark) { .sd-report.sd-theme-auto { ${DARK_VARS} } }
    .sd-danger { background: var(--red-bg); border-color: color-mix(in srgb, var(--red) 28%, transparent); --tone: var(--red); --tone-soft: var(--red-soft); }
    .sd-warning { background: var(--orange-bg); border-color: color-mix(in srgb, var(--orange) 28%, transparent); --tone: var(--orange); --tone-soft: var(--orange-soft); }
    .sd-safe { background: var(--green-bg); border-color: color-mix(in srgb, var(--green) 28%, transparent); --tone: var(--green); --tone-soft: var(--green-soft); }
    .sd-checking { --tone: var(--blue); --tone-soft: var(--blue-soft); }

    .sd-head { display: flex; align-items: center; gap: 12px; }
    .sd-badge { flex: none; width: 40px; height: 40px; border-radius: 50%; display: grid; place-items: center;
      background: var(--tone-soft); color: var(--tone); }
    .sd-badge svg { width: 22px; height: 22px; }
    .sd-headline { flex: 1; min-width: 0; overflow-wrap: anywhere; }
    .sd-title { font-weight: 700; font-size: 15px; color: var(--title); }
    .sd-danger .sd-title, .sd-warning .sd-title, .sd-safe .sd-title { color: var(--tone); }
    .sd-theme-dark .sd-title { color: var(--title) !important; }
    @media (prefers-color-scheme: dark) { .sd-theme-auto .sd-title { color: var(--title) !important; } }
    .sd-sub { color: var(--muted); font-size: 13px; }

    .sd-reasons { list-style: none; margin: 12px 0 0; padding: 0; display: grid; gap: 6px; }
    .sd-reason { display: grid; grid-template-columns: 18px 1fr; column-gap: 8px; align-items: start; }
    .sd-mark { width: 16px; height: 16px; margin-top: 2px; color: var(--tone); }
    .sd-rtitle { color: var(--title); }
    .sd-rdetail { grid-column: 2; margin: 2px 0 4px; color: var(--muted); font-size: 13px; overflow-wrap: anywhere; }
    .sd-collapsed .sd-rdetail, .sd-collapsed .sd-extra { display: none; }

    .sd-note { margin: 12px 0 0; font-size: 13px; color: var(--text); }
    .sd-foot { margin: 6px 0 0; font-size: 12px; color: var(--muted); }
    .sd-collapsed .sd-foot { display: none; }

    .sd-actions { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 12px; }
    .sd-head .sd-actions { margin: 0 0 0 auto; }
    .sd-btn { font: inherit; font-size: 13px; cursor: pointer; color: var(--title); background: var(--btn-bg);
      border: 1px solid var(--line); border-radius: 8px; padding: 4px 12px; transition: background-color .15s; }
    .sd-btn:hover { background: var(--btn-hover); }
    .sd-btn:active { transform: scale(.97); }
    .sd-btn:focus-visible { outline: 2px solid var(--blue); outline-offset: 2px; }

    .sd-spinner { animation: sd-spin .9s linear infinite; transform-origin: 50% 50%; }
    @keyframes sd-spin { to { transform: rotate(360deg); } }
    @media (prefers-reduced-motion: reduce) { .sd-spinner { animation: none; } }
    .sd-compact { padding: 12px 14px; }
    .sd-report [hidden] { display: none !important; }
  `;

  // Stroke icons (24x24), drawn with currentColor.
  const ICONS = {
    danger: ["M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z", "M12 9v4", "M12 17h.01"],
    warning: ["M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20z", "M12 8v4", "M12 16h.01"],
    safe: ["M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z", "m9 12 2 2 4-4"],
    cross: ["M18 6 6 18", "m6 6 12 12"],
    dot: ["M12 12h.01"],
    check: ["M20 6 9 17l-5-5"],
    spinner: ["M21 12a9 9 0 1 1-6.2-8.6"],
  };

  function icon(name, className) {
    const ns = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(ns, "svg");
    svg.setAttribute("viewBox", "0 0 24 24");
    svg.setAttribute("fill", "none");
    svg.setAttribute("stroke", "currentColor");
    svg.setAttribute("stroke-width", name === "dot" ? "6" : "2.2");
    svg.setAttribute("stroke-linecap", "round");
    svg.setAttribute("stroke-linejoin", "round");
    svg.setAttribute("aria-hidden", "true");
    if (className) svg.setAttribute("class", className);
    for (const d of ICONS[name]) {
      const path = document.createElementNS(ns, "path");
      path.setAttribute("d", d);
      svg.append(path);
    }
    return svg;
  }

  const COLLAPSED_REASONS = 3;

  function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function button(label, onClick) {
    const btn = el("button", "sd-btn", label);
    btn.type = "button";
    btn.addEventListener("click", onClick);
    return btn;
  }

  function header(level, title, subtitle, badgeIcon) {
    const head = el("div", "sd-head");
    const badge = el("span", "sd-badge");
    badge.append(badgeIcon || icon(level));
    const headline = el("div", "sd-headline");
    headline.append(el("div", "sd-title", title), el("div", "sd-sub", subtitle));
    head.append(badge, headline);
    return head;
  }

  // actions: [{ label, onClick }]. Options: { expanded, compact, theme: "auto"|"light", brandLine }
  SD.renderReport = function (result, { actions = [], expanded = false, compact = false, theme = "auto", brandLine = true } = {}) {
    const level = result.level;
    const findings = result.findings;
    const root = el("section", `sd-report sd-${level} sd-theme-${theme}${compact ? " sd-compact" : ""}`);
    root.setAttribute("role", level === "danger" ? "alert" : "status");

    const title = SD.t(level === "safe" ? (findings.length ? "card.lowRisk" : "card.safe") : `card.${level}`);
    const signs = findings.length === 1 ? SD.t("card.signs.one") : SD.t("card.signs.many", { count: findings.length });
    const subtitle = findings.length
      ? `${signs} · ${SD.t("card.score", { score: result.score })}`
      : SD.t("card.scoreClean", { score: result.score });
    const head = header(level, title, subtitle);
    root.append(head);

    const buttons = el("div", "sd-actions");
    for (const action of actions) buttons.append(button(action.label, action.onClick));

    // A clean email gets a single compact row.
    if (!findings.length) {
      head.append(buttons);
      return root;
    }

    const list = el("ul", "sd-reasons");
    findings.forEach((f, i) => {
      const item = el("li", `sd-reason${i >= COLLAPSED_REASONS ? " sd-extra" : ""}`);
      item.append(icon(level === "safe" ? "dot" : "cross", "sd-mark"), el("span", "sd-rtitle", f.title));
      if (f.detail) item.append(el("p", "sd-rdetail", f.detail));
      list.append(item);
    });
    const note = el("p", "sd-note", SD.t(`card.advice.${level}`));
    const foot = el("p", "sd-foot", result.trusted === "known"
      ? SD.t("card.foot.known")
      : result.trusted
        ? SD.t("card.foot.you")
        : brandLine ? SD.t("card.foot.brand") : "");

    const setExpanded = (open) => {
      root.classList.toggle("sd-collapsed", !open);
      note.hidden = !open && level === "safe";
      const why = SD.t(`card.why.${level}`);
      toggle.textContent = open ? SD.t("card.less") : findings.length > COLLAPSED_REASONS ? `${why} (${findings.length})` : why;
      toggle.setAttribute("aria-expanded", String(open));
    };
    const toggle = button("", () => setExpanded(root.classList.contains("sd-collapsed")));
    buttons.prepend(toggle);

    root.append(list, note);
    if (foot.textContent) root.append(foot);
    root.append(buttons);
    setExpanded(expanded);
    return root;
  };

  function luminance(color) {
    const m = /rgba?\(([\d.]+),\s*([\d.]+),\s*([\d.]+)(?:,\s*([\d.]+))?\)/.exec(color || "");
    if (!m || (m[4] !== undefined && +m[4] < 0.5)) return null; // missing or (mostly) transparent
    return (0.2126 * m[1] + 0.7152 * m[2] + 0.0722 * m[3]) / 255;
  }

  // Light or dark, judged from the mailbox around `node` (not from the browser setting):
  // the first solid background behind the email, or else the colour of the mailbox's text.
  SD.mailboxTheme = function (node) {
    for (let el = node && node.parentElement; el; el = el.parentElement) {
      const lum = luminance(getComputedStyle(el).backgroundColor);
      if (lum !== null) return lum < 0.45 ? "dark" : "light";
    }
    const textLum = luminance(getComputedStyle(node && node.parentElement || document.body).color);
    return textLum !== null && textLum > 0.6 ? "dark" : "light";
  };

  // Shown in webmail while an email is being checked (usually a fraction of a second).
  SD.renderChecking = function ({ theme = "auto" } = {}) {
    const root = el("section", `sd-report sd-checking sd-compact sd-theme-${theme}`);
    root.setAttribute("role", "status");
    root.append(header("checking", SD.t("card.checking"), SD.t("card.checkingSub"), icon("spinner", "sd-spinner")));
    return root;
  };
})(globalThis.ScamDetector = globalThis.ScamDetector || {});
