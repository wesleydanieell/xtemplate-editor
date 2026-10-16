import test from "node:test";
import assert from "node:assert/strict";
import { pairs, translateString } from "../src/features/translations.js";

test("translation source labels are unique to keep reverse translation deterministic", () => {
  const keys = pairs.map(([source]) => source);
  assert.equal(new Set(keys).size, keys.length, "duplicate source strings overwrite dictionary entries");
});

test("known labels translate in both directions", () => {
  assert.equal(translateString("Undo", "pt-BR"), "Desfazer");
  assert.equal(translateString("Desfazer", "en"), "Undo");
  assert.equal(translateString("ALIGN TO PAGE", "pt-BR"), "ALINHAR À PÁGINA");
  assert.equal(translateString("ALINHAR À PÁGINA", "en"), "ALIGN TO PAGE");
  assert.equal(translateString("Use color #4f7cff", "pt-BR"), "Usar a cor #4f7cff");
  assert.equal(translateString("Usar a cor #4f7cff", "en"), "Use color #4f7cff");
});

test("dynamic cursor and document counters track the selected language", () => {
  assert.equal(translateString("Line 4, column 9", "pt-BR"), "Linha 4, coluna 9");
  assert.equal(translateString("Linha 4, coluna 9", "en"), "Line 4, column 9");
  assert.equal(translateString("4 nodes", "pt-BR"), "4 nós");
  assert.equal(translateString("4 nós", "en"), "4 nodes");
  assert.equal(translateString("4 elements", "pt-BR"), "4 elementos");
  assert.equal(translateString("2 selected · 4 elements", "pt-BR"), "2 selecionados · 4 elementos");
});

test("unknown strings are returned unchanged instead of being partially corrupted", () => {
  assert.equal(translateString("Some custom template value", "pt-BR"), "Some custom template value");
  assert.equal(translateString("custom color token", "en"), "custom color token");
});
