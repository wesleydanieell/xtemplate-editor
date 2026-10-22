/** Pure completion model for expression and color-token input fields. */
export function variableChoices(params = {}, kind = 'numeric', query = '') {
  const wantsColor = kind === 'color';
  const builtins = wantsColor ? [
    { name: 'ink', label: 'Ink', type: 'color', value: 'Theme ink', builtin: true },
    { name: 'accent', label: 'Accent', type: 'color', value: 'Theme accent', builtin: true },
    { name: 'none', label: 'Transparent', type: 'color', value: 'No paint', builtin: true },
  ] : [];
  const builtin = wantsColor ? [] : [
    { name: 'W', label: 'Current box width', type: 'length', value: 'Box width', builtin: true },
    { name: 'H', label: 'Current box height', type: 'length', value: 'Box height', builtin: true },
    { name: 'i', label: 'Repeat column/index', type: 'integer', value: 'Repeat index', builtin: true },
    { name: 'j', label: 'Repeat row index', type: 'integer', value: 'Repeat row', builtin: true },
    { name: 'pi', label: 'Pi', type: 'number', value: '3.14159…', builtin: true },
  ];
  const custom = Object.entries(params)
    .filter(([, config]) => Boolean(config) && (wantsColor ? config.type === 'color' : ['length', 'number', 'integer'].includes(config.type)))
    .map(([name, config]) => ({ name, label: String(config.label || name), type: config.type, value: String(config.default ?? '—'), builtin: false }));
  const needle = String(query).trim().toLocaleLowerCase();
  const choices = [...builtins, ...custom, ...builtin.filter(({name})=>!Object.hasOwn(params,name))].filter(x =>
    !needle || (builtin.includes(x) ? x.name.toLocaleLowerCase().includes(needle) :
      `${x.name} ${x.label} ${x.type}`.toLocaleLowerCase().includes(needle)));
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

/** Insert an expression into a single-line text string using official
 * `{expression}` interpolation. Replace a partially typed `{var` token when
 * present, but never overwrite unrelated prose or escaped brace literals.
 */
export function completeTextInterpolation(value, caret, name) {
 const current=String(value),index=Math.min(current.length,Math.max(0,Number(caret)||0));
 const prefix=current.slice(0,index),match=prefix.match(/(?:^|[^\{])\{[A-Za-z0-9_]*$/);
 const begin=match?index-(match[0].startsWith('{')?match[0].length:match[0].length-1):index;
 const postfix=current.slice(index);
 const suffix=match?postfix.replace(/^[A-Za-z0-9_]*\}?/,''):postfix;
 const replacement='{'+name+'}';
 return {value:current.slice(0,begin)+replacement+suffix,caret:begin+replacement.length};
}
