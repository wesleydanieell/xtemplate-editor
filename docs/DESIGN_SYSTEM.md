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
- Finish cropping and return to standard object transforms, or reopen *Edit crop* later. Use **Reset framing** to recenter/recover the original cover fit.

The exported structure is standard `.xtemplate` (`type: "group", clip: true` with a child `type: "image"`). The editor adds `x-studio-crop: true` only as an allowed `x-` metadata extension so it can recognize the pattern on reopen. Original image bytes are preserved in the ZIP; the crop is non-destructive. Unlike Photoshop, it does **not** rotate/straighten the crop or apply bitmap retouching. Verify specific Android renderer behavior before releasing.

## Logo

A new folded-document/monogram symbol replaces the generic X tile. One editable SVG master (`favicon.svg`) is used in the app header and as the source for the Tauri Windows/Linux icon assets. No externally downloaded fonts or logos.

## Validation

Run `npm run check`, `npm test`, `npm run test:browser`, `npm run package`, and `npm run desktop:assets` before review. Visual checks target full desktop (1536×960) and compact desktop (1024×768) widths.
