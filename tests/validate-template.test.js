import test from "node:test";
import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import { validateTemplate } from "../src/core/validate-template.js";

const valid = () => ({ xtemplate: 1, items: [] });

test("accepts the minimal valid template", () => {
  assert.equal(validateTemplate(valid()), true);
});

test("validates every shipped example", async () => {
  const dir = new URL("../examples/", import.meta.url);
  const files = (await readdir(dir)).filter(name => name.endsWith(".xtemplate"));
  assert.ok(files.length >= 1, "expected example templates to exist");
  for (const file of files) {
    const parsed = JSON.parse(await readFile(new URL(file, dir), "utf8"));
    assert.equal(validateTemplate(parsed), true, file);
  }
});

test("rejects invalid root shapes and missing required fields", () => {
  assert.throws(() => validateTemplate(null), /raiz/);
  assert.throws(() => validateTemplate([]), /raiz/);
  assert.throws(() => validateTemplate({ items: [] }), /xtemplate/);
  assert.throws(() => validateTemplate({ xtemplate: 1, items: {} }), /items/);
});

test("rejects malformed child collections and non-object nodes", () => {
  assert.throws(() => validateTemplate({ ...valid(), items: [null] }), /nó que não é objeto/);
  assert.throws(() => validateTemplate({ ...valid(), items: [{ type: "group", children: {} }] }), /children/);
});

test("enforces the nesting limit", () => {
  let node = { type: "rect" };
  for (let i = 0; i < 33; i += 1) node = { type: "group", children: [node] };
  assert.throws(() => validateTemplate({ ...valid(), items: [node] }), /limite 32/);
});

test("enforces the node count limit", () => {
  assert.equal(validateTemplate({ ...valid(), items: Array.from({ length: 10_000 }, () => ({ type: "rect" })) }), true);
  assert.throws(() => validateTemplate({ ...valid(), items: Array.from({ length: 10_001 }, () => ({ type: "rect" })) }), /10.000 nós/);
});

test("measures UTF-8 bytes rather than JavaScript character count", () => {
  assert.throws(() => validateTemplate({ ...valid(), name: "🧭".repeat(270_000) }), /1 MiB/);
});
