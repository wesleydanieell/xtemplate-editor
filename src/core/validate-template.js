/**
 * Validation shared by the visual editor, JSON editor and file import/export.
 * Keep limits aligned with XNotes' TemplateReader.
 */
export const TEMPLATE_LIMITS = Object.freeze({
  maxBytes: 1024 * 1024,
  maxDepth: 32,
  maxNodes: 10_000,
});

export function validateTemplate(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("A raiz do arquivo precisa ser um objeto JSON.");
  }
  if (typeof value.xtemplate !== "number" || !Number.isFinite(value.xtemplate)) {
    throw new Error('Campo obrigatório ausente ou inválido: "xtemplate".');
  }
  if (!Array.isArray(value.items)) {
    throw new Error('Campo obrigatório ausente: "items".');
  }

  // The app exports indented JSON, so validate the size of the actual output form.
  const serialized = JSON.stringify(value, null, 2) + "\n";
  if (new TextEncoder().encode(serialized).byteLength > TEMPLATE_LIMITS.maxBytes) {
    throw new Error("O arquivo excede 1 MiB, limite do XNotes.");
  }

  let nodes = 0;
  function walk(items, depth) {
    if (depth > TEMPLATE_LIMITS.maxDepth) {
      throw new Error("Estrutura aninhada demais (limite 32).");
    }
    for (const node of items) {
      nodes += 1;
      if (nodes > TEMPLATE_LIMITS.maxNodes) {
        throw new Error("O template excede 10.000 nós.");
      }
      if (!node || typeof node !== "object" || Array.isArray(node)) {
        throw new Error("Há um nó que não é objeto.");
      }
      if (["group", "repeat"].includes(node.type)) {
        if (node.children !== undefined && !Array.isArray(node.children)) {
          throw new Error("A propriedade children precisa ser uma lista.");
        }
        walk(node.children || [], depth + 1);
      }
    }
  }

  walk(value.items, 0);
  return true;
}
