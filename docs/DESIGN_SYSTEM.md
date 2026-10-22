# XTemplate Studio — interface design standard

The editor uses an **object-first, progressive-disclosure workspace** based on established creative-tool patterns: document hierarchy on the left, direct manipulation in the center, and the properties of the selected object on the right.

## Interaction hierarchy

1. **Layers:** object names and nesting are primary. Expanded metadata appears only for the focused or hovered item. Separate Templates tab opens starting points without crowding the current hierarchy.
2. **Canvas:** one persistent tool rail. Drag objects and their handles on the page. Use Space to pan; the toolbar controls zoom. The right inspector, not a duplicate top toolbar, owns property editing.
3. **Inspector:** **Layout** (X/Y, dimensions, opacity) and **Appearance** come first. **Alignment**, **Expressions & units**, **More properties** and **Advanced options** are opt-in disclosures. Contextual image controls appear before technical fields.
4. **Primary action:** Export is visually distinguished. Secondary actions use low-emphasis outlined buttons; dangerous actions retain an explicit Delete label.
5. **Visual grammar:** consistent 34–36px control targets, eight-pixel corner radius, a 4/8/12/16px spacing scale, shared theme tokens and visible keyboard focus.

## Language

English is the interface language for this iteration. A former language switcher offered incomplete Portuguese coverage, leaving half-translated panels. It has been removed rather than implying reliable localization. The translation source remains in the repo for a future complete locale pass; document content and user-entered template names are never translated.

## Crop image

Cropping now uses **native XNotes v1 group clipping**, not a fake drag operation or destructive rewrite. Clicking *Crop image* converts the selected image to a clipping group with the original image inside. Crop mode allows:

- Move the picture within the frame by dragging it directly on the canvas.
- Resize the crop frame with its handles, changing what is visible without distorting the photo.
- Zoom the picture while preserving its original aspect ratio. The image always covers the frame to avoid blank borders.
- Apply crop to keep the framing, or Cancel / Esc to restore its initial geometry, then return to standard object transforms, or reopen *Edit crop* later. Use **Reset framing** to recenter/recover the original cover fit.

The exported structure is standard `.xtemplate` (`type: "group", clip: true` with a child `type: "image"`). The editor adds `x-studio-crop: true` only as an allowed `x-` metadata extension so it can recognize the pattern on reopen. Original image bytes are preserved in the ZIP; the crop is non-destructive. Unlike Photoshop, it does **not** rotate/straighten the crop or apply bitmap retouching. Verify specific Android renderer behavior before releasing.

## Logo

A new folded-document/monogram symbol replaces the generic X tile. One editable SVG master (`favicon.svg`) is used in the app header and as the source for the Tauri Windows/Linux icon assets. No externally downloaded fonts or logos.

## Validation

Run `npm run check`, `npm test`, `npm run test:browser`, `npm run package`, and `npm run desktop:assets` before review. Visual checks target full desktop (1536×960) and compact desktop (1024×768) widths.

## V3: task-first workspace (21 October 2026)

The next iteration is an applied redesign of the editor's **information architecture**, not an adoption of a mobile component library. It uses the same domain model and existing controls, grouped around jobs that people actually perform, with progressive disclosure and predictable editing feedback.

### External research and design decisions

- [Android / Material: layout and navigation patterns](https://developer.android.com/design/ui/mobile/guides/layout-and-content/layout-and-nav-patterns): consistent destinations, secondary tabs, contextual actions, and adaptive layouts. Applied as three stable regions with explicitly collapsible side panels, rather than copying mobile navigation to a desktop creator.
- [Figma: inspect layer properties](https://help.figma.com/hc/en-us/articles/360039832014-Design-prototype-and-explore-layer-properties-in-the-right-sidebar): left-side document layers and selection-bound properties, avoiding duplicate editors for the same value.
- [NN/g: progressive disclosure](https://www.nngroup.com/articles/progressive-disclosure/): frequent controls exposed immediately, uncommon parameters reachable through one disclosure level.
- [NN/g: design guidelines for complex applications](https://www.nngroup.com/articles/complex-application-design/): reduce clutter without removing advanced capabilities.

### Component boundaries

The editor now uses standalone UI modules rather than extending the monolithic document renderer:

| Module | Responsibility | Guarantee |
|---|---|---|
| `src/ui/inspector-layout.js` | Compose Content, Object settings, Transform, Appearance and Precision blocks based on selected native node | Moves existing DOM controls; never copies an input or changes its ID/binding |
| `src/ui/template-library.js` | Search and categorize example `.xtemplate` files | Uses original `#topExample` select and its change handler |
| `src/ui/insert-menu.js` | Searchable groupings for native element insertion | Preserves every existing `data-add` action and adds direct image insertion |
| `src/ui/workspace-layout.js` | Canvas-focus toggles and Alt+1/Alt+2 shortcuts | Docks retain state and remain reachable at compact desktop widths |
| `src/ui/workspace-v3.css` | Consistent surfaces, spacing, typography, control states and adaptive grids | Styles the existing app; no additional network or framework dependency |

### Inspector information hierarchy

1. **Context:** Content is foremost for text; Image framing and fit are foremost for images; repetition controls are foremost for repeats.
2. **Transform:** X / Y / width / height and relevant rotation; Align to page is expandable, not a permanent first block.
3. **Appearance:** colors, stroke and opacity where supported. Image opacity is brought directly alongside image framing. This preserves the original `transformOpacity` control rather than creating a second slider.
4. **Precision & expressions:** technical expressions live in a clearly labeled disclosure without removing the original editing fields.
5. **Expert native properties:** the official source path for images remains editable in the advanced block, while fit / crop / focus are visible first. All native properties remain accessible.

Multiple-layer selection follows the same vocabulary: Appearance, Transform, Object options. A shared property is edited once and applied to each compatible layer. Selection-side actions and layer hierarchy are preserved.

### Observable interaction criteria

Automated Chromium checks run at **1536 × 960** and **1024 × 768** and verify:

- Dock visibility and accessible pressed states, including keyboard shortcuts and a canvas-only focus view.
- Search and category filters for all example templates, keeping the original dropdown behavior intact.
- Grouped insert actions, including SVG paths, repeat, shapes and image import.
- Context-sensitive inspector sections and unchanged property bindings for text, repeat and rectangle.
- Consistent multi-selection groups, no duplicate editor field IDs and no horizontal overflow.
- Existing canvas, selection, vector editing, crop Apply/Cancel, JSON import/export and ZIP asset roundtrip regressions.

This is a **principles-based Material-inspired design**, not a claim that the application implements or has been certified against the entire Material 3 specification. Android/XNotes rendering parity and formal moderated user research still require independent validation.


## V3.1 — compact typography and phone layout

The inspector now mirrors a familiar Character panel: font family (full width), size, weight and italic on one compact row, followed by alignment and baseline. X/Y/W/H fields use concise labels and inline values to reduce vertical space. Both the Photoshop Character panel and PhotoCraft inspired the control density, but only the official `.xtemplate` v1 fields (`font`, `size`, `weight`, `italic`, `align`, `baseline`) are editable. Kerning, tracking and leading are not represented as supported native features and are deliberately not offered.

On mobile, side panels are exclusive drawers and the canvas is first. Controls remain functional; a static browser build is served from a private LAN address, not the entire repository. For setup, security boundaries and limitations, see [Phone preview](PHONE_PREVIEW.md).

Reference reading:
- [Adobe — Format characters](https://helpx.adobe.com/photoshop/desktop/text-typography/characters-glyphs/format-characters.html)
- [Adobe — Line and character spacing](https://helpx.adobe.com/photoshop/desktop/text-typography/characters-glyphs/adjust-line-and-character-spacing.html)
- [PhotoCraft source and screenshots](https://github.com/photocraft-desktop/photocraft)


## V3.2 — coherent iconography

All major app surfaces now share one curated [Lucide icon system](ICON_SYSTEM.md), including navigation, insert/tools, layer types, contextual properties and crop actions. The visual hierarchy continues to prioritize task grouping and short text labels, with icon-only display reserved for well-labeled compact tools. Tests confirm that dynamic controls receive only one icon and that desktop/phone views retain all actions.


## V3.3 — Character tools, alignment and measured text transforms

The Photoshop-inspired Character panel now places **font family** on its own row, **size/baseline** in equal-width columns, and **Bold/Italic** plus left/center/right alignment in compact icon-button groups. The visible buttons proxy the original `weight`, `italic`, and `align` inputs and dispatch their native change events; they neither invent unsupported XNotes font attributes nor create additional document state. Each icon has accessible text, tooltip and an `aria-pressed` state. Icons remain offline-bundled Lucide SVGs.

All inspector Transform X/Y/W/H numeric fields use consistent two-column baselines, without changing the existing numeric scrubbing semantics. Source image insertion now has exactly one native Lucide icon instead of a legacy SVG under a newly injected icon.

**Text transform bounds** use the actual rendered SVG `getBBox()` projected through the glyph-to-page transform. The selected outline, hit target, rotation stem/handle and numeric inspector X/Y/W/H now share this measured rectangle instead of an approximation based on character count. Empty text retains a small selectable anchor. The text transformation remains constrained by the official format (e.g. 90° rotation steps). Browser regressions cover variable font sizes, typefaces, alignments, baseline positions, 90°/270° rotations and empty strings.

Automated layout assertions check the icon count, text-button baselines, X/Y/W/H column alignment and Character field placement at both desktop and phone widths. The new behavior is covered by `scripts/browser-text-bounds-smoke.mjs` and extended icon/UX tests.
