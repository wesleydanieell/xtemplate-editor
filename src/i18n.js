import { translateString } from "./features/translations.js";

let language = "en";
try {
  language = localStorage.getItem("xtemplate-language") === "pt-BR" ? "pt-BR" : "en";
} catch {}
const selector = document.getElementById("languageSelect");
const ignored = "script,style,textarea,code,pre";
let translating = false;

function translateNode(node, target) {
  if (!node) return;
  if (node.nodeType === Node.TEXT_NODE) {
    const value = node.nodeValue;
    if (!value || !value.trim()) return;
    const leading = value.match(/^\s*/)?.[0] || "";
    const trailing = value.match(/\s*$/)?.[0] || "";
    const core = value.slice(leading.length, value.length - trailing.length);
    const translated = translateString(core, target);
    if (translated !== core) node.nodeValue = leading + translated + trailing;
    return;
  }
  if (node.nodeType !== Node.ELEMENT_NODE) return;
  for (const attr of ["title", "aria-label", "placeholder"]) {
    const value = node.getAttribute(attr);
    if (value) {
      const translated = translateString(value, target);
      if (translated !== value) node.setAttribute(attr, translated);
    }
  }
  if (node.matches(ignored)) return;
  if (node instanceof HTMLInputElement && ["button", "submit", "reset"].includes(node.type)) {
    const translated = translateString(node.value, target);
    if (translated !== node.value) node.value = translated;
  }
  for (const child of [...node.childNodes]) translateNode(child, target);
}

function applyLanguage(target) {
  language = target === "pt-BR" ? "pt-BR" : "en";
  translating = true;
  try {
    document.documentElement.lang = language;
    for (const child of [...document.body.childNodes]) translateNode(child, language);
    if (selector) selector.value = language;
    try { localStorage.setItem("xtemplate-language", language); } catch {}
  } finally {
    translating = false;
  }
}

selector?.addEventListener("change", () => applyLanguage(selector.value));
// Translate only newly inserted UI. Attribute mutations are intentionally not
// observed: our own translations must never retrigger translation recursively.
const observer = new MutationObserver(records => {
  if (translating) return;
  translating = true;
  try {
    for (const record of records) {
      if (record.type === "childList") {
        for (const node of record.addedNodes) translateNode(node, language);
      } else if (record.type === "characterData") {
        translateNode(record.target, language);
      }
    }
  } finally {
    translating = false;
  }
});
observer.observe(document.body, { subtree: true, childList: true, characterData: true });
applyLanguage(language);
