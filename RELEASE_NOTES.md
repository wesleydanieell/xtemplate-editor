# XTemplate Studio — v0.1.0-alpha.7

A new **alpha preview** of the offline visual .xtemplate editor for XNotes Android. This release integrates official image-package support and a substantial canvas/workspace overhaul from PRs **#25–#27**. This is **not a stable release**.

## What's new

### Official format and embedded images
- Read and export standard JSON templates and official ZIP .xtemplate containers (root template.json and embedded PNG/JPEG/WebP assets), without external image hosting.
- Native image insertion, replacement, framing, cover crops, fit and nine-position focus control; preserve image bytes in supported round trips.
- Official kind: page or cover field for templates; quick Page/Cover selector in the document tab.
- Schema, ZIP-integrity and import safety checks; bundled original image-cover and watermark examples.

### Studio interface
- Responsive, canvas-first workspace for desktop and mobile, task-first inspector, compact text, Character, fill/stroke/color, opacity and corner-radius controls.
- Unified Lucide iconography, searchable tools and templates, more usable layer navigation.
- On-page text editing, accurate text painted bounds and transformation handles.
- **File > Import image**, shortcut **Ctrl+I**.

### Smart Selection, scaling and transforms
- **Scale is the default for multi-selection**; press **K** to switch to independent proportional Resize, and K again to return to Scale.
- Figma-inspired Smart Selection in aligned rows/columns: draggable pink dots reorder elements visually without changing their stacking identity; pink interval handles preserve and adjust spacing.
- **Shift + drag** unlocks individual Width or Height scaling. **Ctrl+Shift + drag** changes just one selected item's Width or Height while preserving its neighbors' sizes and the gaps of a compatible Smart Selection.
- Live selection frames, corner controls, Bézier handles and pink markers follow artwork while moving; Undo restores combined operations.
- Expanded vector path/rectangle live corners and more reliable layout guides and transforms.

## Downloads
- **Windows x64:** unsigned NSIS .exe and MSI .msi installers (GitHub Actions build artifacts, attached on success).
- **Linux x86_64:** AppImage (GitHub Actions build, attached on success).
- **Offline portable web app:** .zip with local launcher.

## Compatibility and limitations
- Exports official XNotes-supported .xtemplate attributes; editor-only selection overlays, guides, controls and animations never become native template attributes.
- Embedded image templates require a compatible XNotes build. Test any complex native cropping, path, text and repeat behavior on Android before relying on it.
- The SVG preview is not guaranteed to match the Android renderer pixel-for-pixel, and unsupported expressions may require careful handling.
- This release is **alpha**. Windows installers are unsigned and may trigger SmartScreen; no online sync/cloud backend is included.

## Quality and provenance
- **210 unit tests** passed, complete local Chromium browser suite passed at desktop and mobile breakpoints, including image ZIP roundtrips, Smart Selection, modifier gestures and Undo.
- PRs #25–#27 were CI-checked before merge. Linux/Windows installer builds run separately in GitHub Actions.
- AI-assisted development with automated regression review. Report security concerns via SECURITY.md.
