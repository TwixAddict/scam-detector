(function (SD) {
  "use strict";

  const log = document.getElementById("log");
  let passed = 0;
  let failed = 0;

  function check(name, ok, info) {
    const line = document.createElement("div");
    line.className = ok ? "pass" : "fail";
    line.textContent = `${ok ? "✓" : "✗"} ${name}${!ok && info !== undefined ? " — got " + JSON.stringify(info) : ""}`;
    log.append(line);
    ok ? passed++ : failed++;
  }
  const eq = (name, actual, expected) => check(name, actual === expected, actual);
  const ids = (result) => result.findings.map((f) => f.id);
  const RANK = { safe: 0, warning: 1, danger: 2 };

  // ---- domain helpers ----
  eq("registrable: co.uk", SD.registrableDomain("mail.paypal.co.uk"), "paypal.co.uk");
  eq("registrable: brand in subdomain", SD.registrableDomain("paypal.com.secure-login.xyz"), "secure-login.xyz");
  eq("registrable: platform suffix", SD.registrableDomain("paypal-login.web.app"), "paypal-login.web.app");
  eq("punycode decode", SD.toUnicodeHost("xn--pypal-4ve.com"), "pаypal.com");

  const look = (host) => (SD.lookalikeOf(host) || { brand: { brand: null } }).brand.brand;
  eq("lookalike: paypa1.com", look("paypa1.com"), "PayPal");
  eq("lookalike: rnicrosoft.com", look("rnicrosoft.com"), "Microsoft");
  eq("lookalike: amazon-support-billing.com", look("amazon-support-billing.com"), "Amazon");
  eq("lookalike: Cyrillic a (punycode)", look("xn--pypal-4ve.com"), "PayPal");
  eq("lookalike: paypal.co (wrong TLD)", look("paypal.co"), "PayPal");
  eq("lookalike: netflix-billing.top", look("netflix-billing.top"), "Netflix");
  for (const host of ["paypal.com", "www.paypal.com", "pineapple-farm.com", "cooking.com", "hotel-booking.com", "appleinsider.com", "microsoftonline.com", "google.com", "boost.com", "school.be", "coolblue.be"]) {
    eq(`not a lookalike: ${host}`, look(host), null);
  }
  eq("brand in subdomain", (SD.brandInSubdomain("paypal.com.secure-login.xyz") || {}).brand, "PayPal");
  eq("unwrap google redirect", SD.unwrapUrl("https://www.google.com/url?q=https://evil.example/x&sa=D"), "https://evil.example/x");
  eq("unwrap safelinks", SD.unwrapUrl("https://eur01.safelinks.protection.outlook.com/?url=https%3A%2F%2Fevil.example%2Fy&data=1"), "https://evil.example/y");
  eq("domain in link text", SD.domainInText("https://www.paypal.com/signin"), "www.paypal.com");
  eq("file name is not a domain", SD.domainInText("Invoice_2024.pdf"), null);
  eq("brand mention needs whole word", SD.brandsMentioned("ups and downs").length, 0);
  eq("case-sensitive brand", SD.brandsMentioned("Your UPS parcel")[0]?.brand, "UPS");

  // ---- MIME ----
  eq("RFC 2047 header", SD.decodeHeaderWords("=?utf-8?B?SGVsbG8gV8O2cmxk?="), "Hello Wörld");
  eq("RFC 2047 Q header", SD.decodeHeaderWords("=?iso-8859-1?Q?caf=E9_cr=E8me?="), "café crème");
  const paypal = SD.emailFromRaw(SD.SAMPLES.find((s) => s.id === "paypal").raw);
  eq("mime: from address", paypal.from.address, "service@paypa1-secure.co");
  eq("mime: display name", paypal.from.name, "PayPal Service");
  eq("mime: reply-to", paypal.replyTo[0].address, "paypal.resolution.center@outlook.com");
  eq("mime: dmarc", paypal.auth.dmarc, "fail");
  eq("mime: spf", paypal.auth.spf, "softfail");
  eq("mime: html link href", paypal.links[0].href, "http://paypal.com.account-verify.xyz/login?session=8812");
  check("mime: hidden div found", paypal.hiddenText.includes("Lorem ipsum"), paypal.hiddenText.slice(0, 40));
  eq("mime: sender local hour", paypal.senderLocalHour, 3);
  const voicemail = SD.emailFromRaw(SD.SAMPLES.find((s) => s.id === "voicemail").raw);
  eq("mime: attachment name", voicemail.attachments[0]?.name, "Voicemail_0234.html");
  check("mime: attachment content decoded", /type="password"/.test(voicemail.attachments[0]?.content || ""));
  const plain = SD.emailFromRaw("Hello, just checking in about lunch.");
  eq("plain pasted text becomes the body", plain.text, "Hello, just checking in about lunch.");

  // ---- sample emails end to end ----
  const reports = document.getElementById("reports");
  for (const sample of SD.SAMPLES) {
    const result = SD.analyze(SD.emailFromRaw(sample.raw), {});
    const ok = sample.expect === "safe" ? result.level === "safe" : RANK[result.level] >= RANK[sample.expect];
    check(`sample "${sample.id}" is ${sample.expect}${sample.expect === "safe" ? "" : " or worse"} (score ${result.score}: ${ids(result).join(", ")})`, ok, result.level);
    const title = document.createElement("h3");
    title.textContent = sample.label;
    reports.append(title, SD.renderReport(result, { expanded: true, theme: "light" }));
  }
  const paypalResult = SD.analyze(paypal, {});
  for (const id of ["display-name-brand", "lookalike-sender", "auth-fail", "reply-to-mismatch", "link-text-mismatch", "credentials", "urgency", "hidden-text", "fake-banner", "brand-in-subdomain"]) {
    check(`paypal sample flags ${id}`, ids(paypalResult).includes(id), ids(paypalResult));
  }
  check("voicemail flags html attachment + fake reply", ["html-attachment", "odd-attachment-name", "fake-reply"].every((id) => ids(SD.analyze(voicemail, {})).includes(id)), ids(SD.analyze(voicemail, {})));

  // ---- targeted signals ----
  const base = { from: { name: "Shop", address: "news@shop.example" }, subject: "Hello", text: "Hi there", links: [], attachments: [], images: [] };
  const run = (patch, ctx = {}) => SD.analyze(Object.assign({}, base, patch), ctx);
  check("dangerous attachment", ids(run({ attachments: [{ name: "invoice.pdf.exe" }] })).includes("dangerous-attachment"));
  check("double extension", ids(run({ attachments: [{ name: "invoice.pdf.exe" }] })).includes("double-extension"));
  check("RTL override filename", ids(run({ attachments: [{ name: "invoice‮fdp.exe" }] })).includes("bidi-filename"));
  check("macro file", ids(run({ attachments: [{ name: "budget.xlsm" }] })).includes("macro-attachment"));
  check("archive + password", ids(run({ attachments: [{ name: "docs.zip" }], text: "The password is: 4471" })).includes("archive-password"));
  check("@ trick in URL", ids(run({ links: [{ href: "https://paypal.com@evil.example/login", text: "Log in" }] })).includes("userinfo-link"));
  check("IP address link", ids(run({ links: [{ href: "http://192.168.10.5/login", text: "Login" }] })).includes("ip-link"));
  check("javascript: link", ids(run({ links: [{ href: "javascript:alert(1)", text: "Open" }] })).includes("script-link"));
  check("free hosting link", ids(run({ links: [{ href: "https://office-login.web.app/", text: "Open" }] })).includes("free-hosting"));
  check("shortener", ids(run({ links: [{ href: "https://bit.ly/abc", text: "Track parcel" }] })).includes("shortener"));
  check("odd login button", ids(run({ from: { name: "Shop", address: "news@shop.example" }, links: [
    { href: "https://shop.example/a", text: "Home" }, { href: "https://shop.example/b", text: "Deals" },
    { href: "https://shop.example/c", text: "Help" }, { href: "https://shop-account.example/login", text: "Log in to your account" },
  ] })).includes("odd-login-link"));
  check("fake attachment link", ids(run({ links: [{ href: "https://files.example/view", text: "Invoice_8812.pdf" }] })).includes("fake-attachment"));
  check("threat list match", ids(run({ links: [{ href: "https://bad.example/x", text: "x" }] }, { threatMatches: new Set(["https://bad.example/x"]) })).includes("threat-list"));
  check("address in display name", ids(run({ from: { name: "support@paypal.com", address: "x@evil.example" } })).includes("address-in-name"));
  check("freemail organization", ids(run({ from: { name: "KBC Bank Security Department", address: "kbc.sec@gmail.com" } })).includes("display-name-brand"));
  check("freemail HR", ids(run({ from: { name: "HR Department", address: "hr.dept2026@gmail.com" } })).includes("freemail-org"));
  check("known name, new address", ids(run({ from: { name: "Jan Peeters", address: "jan.peeters@gmail.com" } },
    { knownSenders: { "jan.peeters@school.be": "Jan Peeters" } })).includes("known-name-new-address"));
  check("same person, same domain is fine", !ids(run({ from: { name: "Jan Peeters", address: "j.peeters@school.be" } },
    { knownSenders: { "jan.peeters@school.be": "Jan Peeters" } })).includes("known-name-new-address"));
  check("own-domain lookalike", ids(run({ from: { name: "Principal", address: "principal@schooI-be.com" }, userAddress: "me@school-be.com" })).includes("lookalike-sender"));
  check("sextortion", ids(run({ text: "I hacked your device and recorded you on adult websites. Send bitcoin to my bitcoin address or all your contacts get the video." })).includes("sextortion"));
  check("callback scam", ids(run({ from: { name: "Norton", address: "billing@nortn-renew.com" }, text: "Your Norton subscription renewal: we charged $299. Invoice 4471. Call +1 808 555 0199 to cancel." })).includes("callback-scam"));
  check("zero-width split words", ids(run({ text: "Your Pay​Pal acc​ount" })).includes("zero-width"));
  check("mixed scripts in subject", ids(run({ subject: "Your Аpple ID" })).includes("mixed-script"));
  check("embedded password form", ids(run({ forms: { count: 2, hasPassword: true } })).includes("embedded-form"));
  check("trusted sender drops wording signals", run({ text: "URGENT: verify your account within 24 hours" }, { settings: { trustedDomains: ["shop.example"] } }).findings.length === 0);
  const buffett = SD.analyze(SD.emailFromRaw(SD.SAMPLES.find((s) => s.id === "donation").raw), {});
  for (const id of ["celebrity-sender", "advance-fee", "reply-bait", "fake-reply"]) {
    check(`donation sample flags ${id}`, ids(buffett).includes(id), ids(buffett));
  }
  check("'congratulations' alone isn't a scam", run({ text: "Congratulations on your new job! Let's celebrate on Friday." }).level === "safe");
  check("news about millions isn't advance fee", !ids(run({ text: "The city will invest 3 million euros in new bike lanes." })).includes("advance-fee"));
  // ---- odd sender addresses ----
  const english = "Hello, I hope this message finds you well. Please let me know when you have time to talk about it.";
  const odd = (name, address, text = english) => {
    const f = SD.analyze({ ...base, from: { name, address }, text }, {}).findings.find((x) => x.id === "odd-address");
    return f ? f.weight : 0;
  };
  for (const s of ["kd83jf9s", "xkqwvbzt", "a3f9e0c4d1b2", "user84738291"]) check(`random: ${s}`, SD.looksRandom(s));
  for (const s of ["jdoe1987", "lotte.janssens", "noreply", "notifications", "hendrickx", "strengths", "coolcat99", "info2024"]) check(`not random: ${s}`, !SD.looksRandom(s));
  for (const s of ["sPBnAS1x7", "yavewv6wpkvi9e"]) check(`random: ${s}`, SD.looksRandom(s));
  for (const s of ["Lotte.Janssens", "JPeeters", "AWSNotifications", "eBay", "DoNotReply", "JanVanDenBroeck", "web2print"]) check(`not random: ${s}`, !SD.looksRandom(s));
  eq("casino-style address: random local + random domain", odd("een schouderklopje!", "sPBnAS1x7@yavewv6wpkvi9e.com"), 30);
  check("Gmail 'via' another domain is noted", SD.analyze({ ...base, from: { name: "Shop", address: "news@shop.example" }, sentVia: "symbioticsecurityai.com", text: english }, {})
    .findings.some((f) => f.id === "odd-address" && f.detail.includes("via symbioticsecurityai.com")));
  check("streaming brand's own newsletter isn't IPTV spam", run({ from: { name: "Netflix", address: "info@mailer.netflix.com" },
    text: "New this week: 12 movies & series. Watch on Smart TV, Fire Stick, phone and more in 4K quality." }).level === "safe");
  check("a friend's WhatsApp number alone stays green", run({ from: { name: "Lotte Janssens", address: "lotte.janssens@gmail.com" },
    text: "Call or app me later! WhatsApp: +32 470 12 34 56" }).level === "safe");
  check("shop with one 'exclusive offer' isn't hard-sell", !ids(run({ text: "Your exclusive offer: 10% off shoes this weekend." })).includes("hard-sell"));
  check("wa.link link flagged", ids(run({ links: [{ href: "https://wa.link/abc123", text: "Chat with us" }] })).includes("chat-app"));
  check("one casino mention isn't spam", run({ text: "The new casino in Ostend opened last week, the city council said." }).level === "safe");
  eq("Buffett via .jp: two oddities", odd("Warren Buffett", "quick-maiky@zeus.eonet.ne.jp"), 30);
  eq("name + random address", odd("Jessica", "kd83jf9s@hotmail.com"), 30);
  eq("random domain + name mismatch", odd("Mary Collins", "jw@xkqwvbzt.com"), 30);
  eq("normal: name in address", odd("Lotte Janssens", "lotte.janssens@gmail.com"), 0);
  eq("normal: initial + surname", odd("Jan Peeters", "j.peeters@school.be"), 0);
  eq("normal: person via company role address", odd("Sarah Jones", "hello@shop.example"), 0);
  eq("normal: company name in domain", odd("Vinted", "no-reply@vinted.be"), 0);
  eq("normal: brand's own random-looking address", odd("Facebook", "notification+zrdo5af3v@facebookmail.com"), 0);
  eq("normal: Japanese sender writing Japanese", odd("Tanaka Hiroshi", "tanaka@company.co.jp", "こんにちは、来週の会議について連絡します。よろしくお願いします。"), 0);
  eq("one oddity only is a small weight", odd("Lotte Janssens", "coolcat99@gmail.com"), 12);
  check("one oddity alone stays green", run({ from: { name: "Lotte Janssens", address: "coolcat99@gmail.com" }, text: english }).level === "safe");

  // ---- font-size:0 wrappers (the FlixBus false alarm) ----
  for (const [mode, root] of [["live", document.getElementById("fontzero")],
    ["raw source", new DOMParser().parseFromString(document.getElementById("fontzero").outerHTML, "text/html").body]]) {
    const f = SD.extractFromRoot(root, { live: mode === "live" });
    check(`${mode}: text inside a font-size:0 wrapper is visible`, f.text.includes("Dear FlixBus Customer") && !f.hiddenText.includes("Dear FlixBus"), f.hiddenText.slice(0, 40));
    check(`${mode}: dark text inside a white-text wrapper is visible`, f.text.includes("Manage My Booking"), f.text);
    check(`${mode}: text that is itself font-size:0 is still hidden`, f.hiddenText.includes("stuffedword") && !f.text.includes("stuffedword"), f.hiddenText);
  }
  check("app tracker bouncing to the sender's site is fine", !ids(run({ from: { name: "FlixBus", address: "noreply@info.flixbus.com" },
    links: [{ href: "https://app.adjust.com/abc?redirect=https%3A%2F%2Fglobal.flixbus.com%2Fapp", text: "Get the app" }] })).includes("open-redirect"));
  check("redirect back to the sender's own site is fine", !ids(run({ from: { name: "Shop", address: "news@shop.example" },
    links: [{ href: "https://r.mailer.example/c?u=https://www.shop.example/sale", text: "Sale" }] })).includes("open-redirect"));
  check("redirect to a third site is still flagged", ids(run({ from: { name: "Shop", address: "news@shop.example" },
    links: [{ href: "https://r.mailer.example/c?u=https://evil.example/login", text: "Sale" }] })).includes("open-redirect"));
  check("footer Facebook icon isn't a fake logo", !ids(run({ from: { name: "FlixBus", address: "noreply@flixbus.com" },
    images: [{ src: "https://honeycomb.flixbus.com/icons/facebook-icon.png", alt: "Facebook", width: 24, height: 24 }] })).includes("foreign-logo"));
  check("fake PayPal with PayPal logo elsewhere still flagged", ids(run({ from: { name: "PayPal", address: "service@pay-help.example" },
    images: [{ src: "https://cdn.pay-help.example/paypal-logo.png", alt: "PayPal logo", width: 120, height: 40 }] })).includes("foreign-logo"));

  // ---- known companies (the Revolut false alarm) ----
  const revolutText = "Important documents attached. Hi Alex, We've attached our RevPoints terms and conditions for you to download and keep for your reference. " +
    "If you have any questions, you can reach us in the app. These terms explain how you earn and spend points on card payments, partner offers and travel bookings. " +
    "Thanks for being with us and for choosing Revolut for your everyday banking and savings needs across Europe.";
  const revolut = SD.analyze({ ...base, from: { name: "Revolut", address: "no-reply@revolut.com" }, text: revolutText, hiddenText: revolutText,
    links: [{ href: "https://click.revolut.com/f/a/abc123", text: "http://www.iidraudimas.lt" }] }, {});
  eq("real Revolut mail is safe", revolut.level, "safe");
  eq("real Revolut mail marked as known company", revolut.trusted, "known");
  check("own click tracker isn't a link mismatch", !ids(revolut).includes("link-text-mismatch"), ids(revolut));
  check("hidden copy of visible text isn't stuffing", !ids(SD.analyze({ ...base, text: revolutText, hiddenText: revolutText }, {})).includes("hidden-text"));
  check("fake Revolut on Gmail still flagged", ids(run({ from: { name: "Revolut", address: "revolut.support@gmail.com" } })).includes("display-name-brand"));
  check("Revolut lookalike still flagged", ids(run({ from: { name: "Revolut", address: "no-reply@revolut-secure.com" } })).includes("lookalike-sender"));
  check("known company linking somewhere else is still checked", ids(run({ from: { name: "Revolut", address: "no-reply@revolut.com" },
    links: [{ href: "https://evil.example/login", text: "www.revolut.com" }] })).includes("link-text-mismatch"));
  check("unknown sender's own tracker is still checked", ids(run({ from: { name: "Shop", address: "news@shop.example" },
    links: [{ href: "https://click.shop.example/x", text: "www.partner.example" }] })).includes("link-text-mismatch"));
  eq("GitHub is a known company", run({ from: { name: "GitHub", address: "noreply@github.com" }, text: "Urgent: verify your account within 24 hours" }).trusted, "known");

  check("legit brand mail from its own domain", run({ from: { name: "PayPal", address: "service@paypal.com" }, text: "You sent €20 to Lotte." }).level === "safe");
  check("brand from its own subdomain", run({ from: { name: "Netflix", address: "info@mailer.netflix.com" } }).level === "safe");
  check("newsletter tracking link isn't a mismatch", !ids(run({ links: [{ href: "https://click.mailchimp.com/track?u=1", text: "www.shop.example" }] })).includes("link-text-mismatch"));

  // ---- live DOM (fake Gmail markup) ----
  const gmail = SD.ADAPTERS.find((a) => a.id === "gmail");
  const messages = gmail.findMessages();
  eq("gmail adapter finds the message", messages.length, 1);
  if (messages.length) {
    const email = messages[0].extract();
    eq("gmail sender", email.from.address, "security@micros0ft-support.com");
    eq("gmail subject", email.subject, "Action required: verify your account");
    eq("gmail attachment from download_url", email.attachments[0]?.name, "Payment_Remittance.htm");
    check("live hidden text (white on white)", email.hiddenText.includes("football"), email.hiddenText.slice(0, 30));
    check("hidden text not in visible text", !email.text.includes("football"));
    const result = SD.analyze(email, {});
    for (const id of ["display-name-brand", "lookalike-sender", "lookalike-link", "hidden-text", "zero-width", "html-attachment", "credentials"]) {
      check(`gmail fixture flags ${id}`, ids(result).includes(id), ids(result));
    }
    eq("gmail fixture level", result.level, "danger");
    // Render the banner the same way the content script does (shadow DOM above the body).
    const host = document.createElement("div");
    host.className = "scam-detector-banner";
    const shadow = host.attachShadow({ mode: "open" });
    const style = document.createElement("style");
    style.textContent = SD.REPORT_CSS;
    shadow.append(style, SD.renderReport(result, { actions: [{ label: "Trust sender", onClick() {} }, { label: "Dismiss", onClick() {} }], expanded: true }));
    messages[0].anchor.before(host);
  }

  // ---- Gmail fallback: no div.a3s on the page, a message open in the URL ----
  {
    const fixture = document.getElementById("fixture");
    const bodyEl = fixture.querySelector(".a3s");
    bodyEl.classList.remove("a3s");
    fixture.setAttribute("role", "main");
    const oldHash = location.hash;
    history.replaceState(null, "", "#spam/FMfcgzQXJWDsKmnbzQqRtLmPw");
    const found = gmail.findMessages();
    eq("gmail fallback finds the open message", found.length, 1);
    if (found.length) {
      eq("gmail fallback key", found[0].key.startsWith("fallback:"), true);
      const email = found[0].extract();
      eq("gmail fallback sender", email.from?.address, "security@micros0ft-support.com");
      eq("gmail fallback level", SD.analyze(email, {}).level, "danger");
    }
    history.replaceState(null, "", "#none");
    eq("gmail fallback stays quiet with no message open", gmail.findMessages().length, 0);
    history.replaceState(null, "", location.pathname + oldHash);
    bodyEl.classList.add("a3s");
    fixture.removeAttribute("role");
  }

  // ---- translations ----
  for (const lang of ["nl", "fr"]) {
    const missing = Object.keys(SD.MESSAGES.en).filter((k) => !(k in SD.MESSAGES[lang]));
    check(`${lang}: every text is translated`, missing.length === 0, missing.slice(0, 8));
  }
  for (const lang of ["en", "nl", "fr"]) {
    SD.setLanguage(lang);
    const leftovers = [];
    for (const sample of SD.SAMPLES) {
      for (const f of SD.analyze(SD.emailFromRaw(sample.raw), {}).findings) {
        if (/\{\w+\}/.test(f.title + f.detail) || f.title === "" || /\.t$|\.d$/.test(f.title)) leftovers.push(`${sample.id}/${f.id}`);
      }
    }
    check(`${lang}: all sample findings fully filled in`, leftovers.length === 0, leftovers);
  }
  SD.setLanguage("nl");
  const nlResult = SD.analyze(SD.emailFromRaw(SD.SAMPLES.find((s) => s.id === "paypal").raw), {});
  check("nl: finding titles are Dutch", nlResult.findings.some((f) => f.title === "Afzenderdomein bootst PayPal na"), nlResult.findings.map((f) => f.title).slice(0, 3));
  const nlCard = SD.renderReport(nlResult, { actions: [{ label: SD.t("action.close"), onClick() {} }] });
  check("nl: card title is Dutch", nlCard.querySelector(".sd-title").textContent === "Waarschijnlijk oplichting, hoog risico", nlCard.querySelector(".sd-title").textContent);
  SD.setLanguage("fr");
  const frCard = SD.renderReport(SD.analyze(SD.emailFromRaw(SD.SAMPLES.find((s) => s.id === "friend").raw), {}), {});
  check("fr: clean card is French", frCard.querySelector(".sd-title").textContent === "Aucun signal d'alerte", frCard.querySelector(".sd-title").textContent);
  eq("auto picks a supported browser language or English", SD.LANGUAGES.includes(SD.resolveLanguage("auto")), true);
  SD.setLanguage("en");

  const summary = document.getElementById("summary");
  summary.textContent = failed ? `${failed} FAILED, ${passed} passed` : `All ${passed} tests passed`;
  summary.className = failed ? "fail" : "pass";
  document.title = failed ? `FAIL ${failed}/${passed + failed}` : `PASS ${passed}`;
})(globalThis.ScamDetector);
