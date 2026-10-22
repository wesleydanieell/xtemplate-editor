# Studio iconography (UI V3.2)

The entire application uses **Lucide static SVGs** under the ISC license, not remote fonts, emojis, independent mixed pictogram sets or an icon CDN. `npm run icons:build` selects and embeds the 75 vector icons used by the editor, generating `src/ui/icon-data.js` from the dev-time `lucide-static` dependency. The shipped browser/Tauri app has **no runtime dependency** on Lucide or internet access.

## Rules

1. **Icon + label** for navigational and destructive controls. Icons alone are used only when a command has an explicit accessible name and tooltip (drawing tools, undo/redo, disclosure buttons).
2. **One consistent grid:** 24×24 source, 16px interface size, 18–20px tool size, 1.8 stroke, rounded caps/joins. The current color follows the semantic state rather than individual type-specific colors.
3. **One icon per control:** the legacy toolbar SVGs, unicode symbols and numeric glyphs are replaced; never layer new symbols on top of old ones.
4. **Meaning by location:** panel/navigation icons; structural layer-type icons; document and import/export actions; content/typography, image/crop and transform/appearance/advanced; grouped insert menu; and contextual actions.
5. **Preserve interaction:** `src/ui/icons.js` decorates existing native buttons rather than cloning controls or changing callback bindings. Dynamically rendered layer rows and inspector sections use the same icon dictionary.
6. **Accessible and mobile:** icons are marked `aria-hidden`/`focusable=false`. User-facing text and original button `aria-label`/`title` remain the source of meaning. Mobile drawer and tool interactions retain tap targets.

## Implementation

| File | Role |
|---|---|
| `scripts/build-icons.mjs` | Maintains the explicit icon whitelist and generates deterministic assets from upstream Lucide. |
| `src/ui/icon-data.js` | Generated, bundled vector path data. |
| `src/ui/icons.js` | Shared DOM icon component, placement map and observation for dynamically rendered editors. |
| `src/ui/icon-system.css` | Shared color, stroke, size, button and responsive rules. |
| `scripts/browser-icon-smoke.mjs` | E2E test of icon presence, labels, layer types and responsiveness at 1440px and 390px. |

## References

- [Lucide](https://lucide.dev) (ISC; consistent stroke iconography)
- [Figma Help — Layers and right-sidebar properties](https://help.figma.com/hc/en-us/articles/360039832014-Design-prototype-and-explore-layer-properties-in-the-right-sidebar)
- [Adobe Photoshop — Tools overview](https://helpx.adobe.com/photoshop/using/tools.html)

Icon density is deliberately limited in property inputs: X, Y, W, H and numeric controls remain textual for quick scanning. Avoid irrelevant decoration, icon-only destructive actions, or confusing ambiguous symbols.


### V3.3 UI cleanup

The image insertion canvas tool now has a single SVG, with a regression test that rejects legacy/new icon overlap. Bold, Italic and Align left/center/right use the same Lucide visual grammar as other editor actions and update the underlying native text properties. On/off state is visible via the segmented button and announced through `aria-pressed`.
