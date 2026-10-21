# Development and testing

XTemplate Studio is a local, offline editor. The portable app uses standard browser JavaScript and no runtime dependencies; Tauri 2 packages it for Linux and Windows.

## Running locally

```bash
./start.sh                  # Linux: local web server, http://127.0.0.1:8765
# or
python3 -m http.server 8765 --bind 127.0.0.1
```

Always serve the project over localhost rather than opening `index.html` with `file://`, because it loads ES modules and example templates. Stop the `start.sh`-managed server with `./stop.sh`.

## Tests

```bash
npm ci
npm run check
npm test
npm run test:browser
npm run package
```

The unit tests cover expression parsing, document structure, transforms, constraints, native geometry, validation and template limits. The Chromium smoke test (`scripts/browser-smoke.mjs`) exercises selection, snapping, nested/repeated elements, Pen, properties, variables, import/export and the UI. Use `XTEMPLATE_BROWSER_PATH=/path/to/chromium` if browser auto-detection fails.

Template validation follows XNotes limits, including a 1 MiB document size, 32 levels of nesting and 10,000 nodes. Browser rendering is an approximation and cannot replace on-device verification in XNotes Android.

## Desktop builds

```bash
npm run desktop:build           # Linux / AppImage (Tauri prerequisites required)
npm run desktop:build:windows   # Windows / NSIS + MSI (MSVC, Windows SDK, WebView2)
```

GitHub Actions runs [Checks](../.github/workflows/ci.yml), [Windows installers](../.github/workflows/windows.yml) and [Linux AppImage](../.github/workflows/appimage.yml) on relevant pushes and PRs. Alpha tags trigger [release packaging](../.github/workflows/release.yml), attaching the portable ZIP and desktop installers.

## Source map

- `app.js`, `index.html`, `styles.css`: editor orchestration, interface and styles.
- `src/core/`: template validation, expressions, history, selection and tree operations.
- `src/features/`: geometry, snapping, repeat layout, alignment, inspector, vector and Pen tools.
- `tests/`, `scripts/browser-smoke.mjs`: unit and real-browser regression coverage.
- `examples/`: bundled XNotes-compatible example templates.
- `docs/VECTOR_TOOLS.md`, `docs/XNOTES_COMPATIBILITY.md`, `docs/GUIA-XTEMPLATE.md`: format and feature details.

## Updating README screenshots

With the local web server running and Chromium available, run:

```bash
node scripts/capture-readme-images.mjs
```

Requires `ffmpeg` for WebP conversion. The script imports **an in-memory demo cover**, captures three real UI states and writes optimized files to `docs/images/`. It does not alter user documents or publish anything. Review image content and sizes before committing.

## Release readiness

- Run all checks and inspect exported `.xtemplate` files in the XNotes Android app.
- Confirm `package.json`, lockfile, Tauri versions and release notes agree.
- Verify CI results and all release assets before announcing a published version.
- Keep unfinished features in separate PRs; describe AI assistance in contributed changes.

For coding practices and reporting issues, see [CONTRIBUTING.md](../CONTRIBUTING.md) and [SECURITY.md](../SECURITY.md).

## Official-format validation and image examples

The pinned upstream [`.xtemplate` v1 schema](spec/README.md) is compiled to self-contained browser ES modules by `npm run schema:build`. Commit the generated `src/core/official-schema-validator.js` whenever its source schema changes; the shipped application requires no schema-validator dependency or network access. Local tests compare it with AJV and verify the browser uses it.

The image-backed examples are reproducible without external artwork or Python packages:

```bash
python3 scripts/build-image-examples.py
npm test
npm run test:browser
```

See [image editor workflow](IMAGE_PACKAGES.md) for native crop/fit/position semantics and [examples](../examples/README.md) for the demo designs.
