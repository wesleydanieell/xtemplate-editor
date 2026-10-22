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


## V3.4 — direct-on-canvas text editing and reliable visual geometry

- Text selection and transform handles use actual rendered SVG glyph bounds. Four corner resize handles (with additional side handles when the text is tall enough) are available, and resizing scales the supported `size` attribute proportionally while preserving the opposite visual corner; it does **not** save unsupported width/height fields.
- The native x/y model remains the text's authored anchor; the inspector's X/Y/W/H describe the actual painted bounding rectangle. `align` repositions the rendered text around that anchor, with separate tested start/middle/end controls.
- Double-click text to edit directly on the canvas. A light inline input follows the glyph bounds/anchor and responds to actual keystrokes; Done/Enter applies, Cancel/Esc restores, and a single Undo reverts the committed edit. Clicking a specific part of the text positions the caret near the click rather than always selecting all.
- `Edit on canvas` in the Content section makes direct editing discoverable. On phones, using it closes the Properties drawer so the keyboard and inline text are unobstructed.
- Split Editor now uses a bundled Lucide two-column icon, explicit pressed state, and an icon-only accessible control on narrow phone screens.
- Browser tests now cover visual alignment, glyph-based width controls, pointer resizing, inline editing and Undo, and phone-sized direct editing.


### V3.5 — precision and alignment corrections

Confirmed bugs fixed: text's Align-to-page buttons were using glyph bounding-box coordinates as authored anchor coordinates; the correct implementation translates the anchor by the measured painted-frame delta. On compact glyphs, eight oversized invisible transform targets blocked almost every click, preventing real double-click editing. Short text now exposes just the four corner targets, with 14px screen-constant hit regions.

Text editing is available by double click/tap, Enter on selected text, Edit on canvas in Properties, or clicking existing text with the Text tool. Dragged text scales its native font size proportionally and the pointer-up event uses the exact final cursor position; magnetic snapping is reduced to 3px for text and may be bypassed with Alt. Alignment-to-page uses the actual painted rectangle even for right/center anchored and 90° rotated text; Character paragraph alignment keeps the authored anchor stable. Browser tests include genuine pointer clicks, six page alignment actions, rotated 150% zoom, touch double-tap and non-destructive native template export.

## V3.5 — immediate text creation and explicit page placement

Clicking a blank location with the **Text (T)** tool now creates a native empty text node **and immediately focuses the in-place editor**. Type, then press Enter or Done; Esc or Cancel restores the original content. Canceling an entirely new text creation additionally removes the unused empty layer through Undo. Clicking existing text with the Text tool continues to open editing rather than inserting a duplicate node. This resolves the formerly confusing intermediate `Novo texto` placeholder.

The Character panel now makes two different native actions explicit: **Text anchor** changes how text is distributed around its existing authored X coordinate (`start`, `middle`, `end`), whereas **Place on page** uses the existing document-level alignment commands to move the *painted glyph bounds* left/center/right or top/middle/bottom. The latter preserves native group-relative coordinates and supports undo; it is distinct from alignment within a text box (which the current `.xtemplate` v1 text format does not represent).

Browser regression coverage performs actual pointer clicks on a blank canvas, verifies immediate keyboard focus and persisted text on Enter, and tests left-to-right positioning of glyphs through the Character panel without inventing unsupported attributes. Use `Ctrl+Shift+R` to bypass cached editor assets in the development browser; for LAN clients the staged `dist-web` must be regenerated with `npm run desktop:assets`.


## V3.6 — genuine SVG in-place text editing

The former fixed-position HTML `textarea` with a background, border, and Done/Cancel popup has been removed entirely. The editor now inserts a temporary, transparent **SVG `foreignObject` / HTML `contenteditable`** directly next to the actual text glyph in the same SVG group and transformation. The original glyph is hidden only while typing and restored upon completion; this gives native caret, text selection, paste and IME inside the actual page rather than a floating panel. The `foreignObject` inherits the glyph transform, respects its font family, weight, size, color and start/center/end anchor, and grows without changing the authored anchor. The click-to-caret position is computed from the SVG's per-character coordinates, including rotations.

Press **Enter** to apply, **Escape** to cancel, or click elsewhere to apply. A single undo step reverses a committed change. Existing templates, native `text` attributes, JSON/ZIP import/export and editable layer data remain unchanged. No `foreignObject` is exported; it is only an editor UI node.

Automated browser checks reject the former floating editor shell and textarea, verify transparent editing directly under `#paper`, and exercise typing, cancellation, Undo, page placement, rotation/zoom, and mobile double-tap.


## V3.7 — Character button layout

The Style controls (Bold/Italic) and Text anchor controls (start/center/end) now occupy **two equal vertical columns** in the same Character row, each with its own label on top and equally tall segmented buttons below. The width of Properties is unchanged. Place on page retains its separate full-width group. The layout uses a single `.character-compact-actions` wrapper and `minmax(0, 1fr)` to prevent overflow; mobile touch targets remain 44 px high. Automated desktop/mobile checks verify equal column widths, matching heading and button baselines, no button overflow, and working Bold/anchor edits.


## V3.8 — centered Element/Variables navigation and contextual variable completion

The Element and Variables tab contents are centered as complete groups (label and any icon) on desktop and phone. In the inspector, the duplicate `Suggestions…` dropdowns below Stroke/Fill and all persistent `.value-field-hint` subrows are removed. Hover titles retain measurement-format help; the shared keyboard-accessible variable picker opens on **focus or click** on compatible property inputs, without consuming layout height.

The completion classifier is explicit: color-token fields (`stroke`/`fill`) offer `ink`, `accent`, `none` and declared color parameters; numeric expression properties (geometry, radii, spacing, count, text size, angles, opacity and text index) offer compatible parameters plus official `W`, `H`, `i`, `j` and `pi`; text-content fields insert `{parameter}` interpolation. Dynamic advanced, repeated, Hatch and compatible multi-selection property inputs carry their actual property key so the same completion rules apply. The popup never suggests variables for enums, asset paths, SVG commands, or disabled/nonnumeric controls, which would be misleading or non-exportable.

Color pickers and the Variable creation form remain intact; variable-type help in that form is a type explanation, not a duplicate value suggestion. Existing ArrowUp/Down, Enter/Tab, Esc and pointer selection behaviors of the popup are preserved.
