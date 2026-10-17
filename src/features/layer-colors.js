/** Editor-only layer marker colors; never mutate the .xtemplate schema. */
export const LAYER_COLORS = Object.freeze(['#e87979','#f5b971','#e7d977','#77c6a3','#76b8e9','#ac93ea','#e68ec4']);
export function validLayerColor(value) {
  return typeof value === 'string' && /^#[0-9a-f]{6}$/i.test(value) ? value.toLowerCase() : null;
}
export function readLayerColors(data) {
  if (!data || typeof data !== 'object' || Array.isArray(data)) return {};
  const cleaned = {};
  for (const [key,value] of Object.entries(data)) {
    if (!/^items(?:\.[0-9]+(?:\.children\.[0-9]+)*)$/.test(key)) continue;
    const color = validLayerColor(value);
    if (color) cleaned[key] = color;
  }
  return cleaned;
}
