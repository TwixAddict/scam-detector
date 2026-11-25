// Live demo on the website: the extension's own detector, run on a pasted email.
(function (SD) {
  "use strict";

  const raw = document.getElementById("raw");
  const result = document.getElementById("result");
  const sampleSelect = document.getElementById("sample");
  const langSelect = document.getElementById("lang");

  const style = document.createElement("style");
  style.textContent = SD.REPORT_CSS;
  document.head.append(style);

  function fillSamples() {
    sampleSelect.length = 1;
    for (const sample of SD.SAMPLES) {
      const option = document.createElement("option");
      option.value = sample.id;
      option.textContent = SD.t("sample." + sample.id);
      sampleSelect.append(option);
    }
  }

  function check() {
    const text = raw.value.trim();
    if (!text) {
      result.replaceChildren(Object.assign(document.createElement("div"), { className: "empty", textContent: SD.t("an.pasteFirst") }));
      return;
    }
    const analysis = SD.analyze(SD.emailFromRaw(text), {});
    result.replaceChildren(SD.renderReport(analysis, { expanded: true, brandLine: false }));
  }

  function heroCard() {
    const parcel = SD.SAMPLES.find((s) => s.id === "parcel");
    const card = SD.renderReport(SD.analyze(SD.emailFromRaw(parcel.raw), {}), {
      actions: [{ label: SD.t("action.close"), onClick() {} }],
    });
    document.getElementById("hero-card").replaceChildren(card);
  }

  sampleSelect.addEventListener("change", () => {
    const sample = SD.SAMPLES.find((s) => s.id === sampleSelect.value);
    if (!sample) return;
    raw.value = sample.raw;
    check();
  });
  langSelect.addEventListener("change", () => {
    SD.setLanguage(langSelect.value);
    const selected = sampleSelect.value;
    fillSamples();
    sampleSelect.value = selected;
    heroCard();
    if (raw.value.trim()) check();
  });
  document.getElementById("check").addEventListener("click", check);

  langSelect.value = SD.setLanguage("auto");
  fillSamples();
  heroCard();
})(globalThis.ScamDetector);
