# XNotes `.xtemplate` compatibility notes

Source of truth reviewed: `xnotes-android/app/src/main/java/com/xnotes/core/template/TemplateEval.kt` and `TemplateReader.kt` (local October 2026 checkout).

## Critical mismatch: rotation

- XTemplate Studio renders arbitrary `rotate` on non-text SVG nodes, groups, and repeated blocks. This is **editor-only** visual behavior.
- The current XNotes evaluator resolves `rotate` to 90-degree increments (`quarterTurns`) and applies it while generating **text glyph contours**. Other geometric primitives, groups and repeat blocks do not apply this style field to coordinates.
- Text angles other than multiples of 90 degrees therefore differ between the editor preview and XNotes.
- `.xtemplate` does not expose general affine `scale`/`translate` transforms as an Android-compatible node field. The editor's affine matrices must remain internal display/interaction representations; exporting arbitrary SVG matrices would not work.

Do not claim rotated non-text templates match Android rendering until the XNotes format/evaluator adds corresponding behavior or the Studio explicitly bakes transformations into supported primitive coordinates. Baking a rotated group/repeat requires flattening expressions, clipping and geometry and must not silently alter metadata.

`src/core/xnotes-compatibility.js` detects static discrepancies without mutating input. `tests/validate-template.test.js` checks lossless JSON serialization of bundled examples, not Android render parity. Rendering parity requires device/runtime tests using XNotes itself.
