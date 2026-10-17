/** Pure completion model for expression and color-token input fields. */
export function variableChoices(params = {}, kind = 'numeric', query = '') {
  const wantsColor = kind === 'color';
  const builtins = wantsColor ? [
    { name: 'ink', label: 'Ink', type: 'color', value: 'Theme ink', builtin: true },
    { name: 'accent', label: 'Accent', type: 'color', value: 'Theme accent', builtin: true },
    { name: 'none', label: 'Transparent', type: 'color', value: 'No paint', builtin: true },
  ] : [];
  const custom = Object.entries(params)
    .filter(([, config]) => Boolean(config) && (wantsColor ? config.type === 'color' : ['length', 'number', 'integer'].includes(config.type)))
    .map(([name, config]) => ({ name, label: String(config.label || name), type: config.type, value: String(config.default ?? '—'), builtin: false }));
  const needle = String(query).trim().toLocaleLowerCase();
  const choices = [...builtins, ...custom].filter(x => !needle || `${x.name} ${x.label} ${x.type}`.toLocaleLowerCase().includes(needle));
  return choices.sort((a, b) => Number(b.name.toLocaleLowerCase().startsWith(needle)) - Number(a.name.toLocaleLowerCase().startsWith(needle))).slice(0, 12);
}

/** Replace only the expression token adjacent to the caret. */
export function completeExpression(value, caret, name) {
  const current = String(value);
  const index = Math.min(current.length, Math.max(0, Number(caret) || 0));
  const isName = ch => /[A-Za-z0-9_]/.test(ch);
  let from = index, to = index;
  while (from > 0 && isName(current[from - 1])) from--;
  while (to < current.length && isName(current[to])) to++;
  return { value: current.slice(0, from) + name + current.slice(to), caret: from + name.length };
}
