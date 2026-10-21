# XNotes `.xtemplate` compatibility notes

Source of truth reviewed: `xnotes-android/app/src/main/java/com/xnotes/core/template/TemplateEval.kt` and `TemplateReader.kt` (local October 2026 checkout).

## Critical mismatch: rotation

- XTemplate Studio now ignores `rotate` for non-text geometry in the preview and removes non-text rotation affordances where supported. Existing imported fields remain unmodified for lossless round trips.
- The current XNotes evaluator resolves `rotate` to 90-degree increments (`quarterTurns`) and applies it while generating **text glyph contours**. Other geometric primitives, groups and repeat blocks do not apply this style field to coordinates.
- Text rotation in the preview is rounded to 90-degree increments, matching the evaluator.
- `.xtemplate` does not expose general affine `scale`/`translate` transforms as an Android-compatible node field. The editor's affine matrices must remain internal display/interaction representations; exporting arbitrary SVG matrices would not work.

Do not claim rotated non-text templates match Android rendering until the XNotes format/evaluator adds corresponding behavior or the Studio explicitly bakes transformations into supported primitive coordinates. Baking a rotated group/repeat requires flattening expressions, clipping and geometry and must not silently alter metadata.

`src/core/xnotes-compatibility.js` detects static discrepancies without mutating input. `tests/validate-template.test.js` checks lossless JSON serialization of bundled examples, not Android render parity. Rendering parity requires device/runtime tests using XNotes itself.

## Image packages (XNotes v0.9.3+)

The format now natively supports images in ZIP packages (`template.json` plus embedded PNG, JPEG or WebP files). See the official [specification](https://github.com/shardulvs/xtemplate/blob/master/SPEC.md) and [our image-package guide](IMAGE_PACKAGES.md). Older XNotes readers do not support this. This capability is under development in Studio and was not part of `alpha.6`.
