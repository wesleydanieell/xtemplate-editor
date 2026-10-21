# Images in .xtemplate (XNotes v0.9.3+)

The official [.xtemplate specification](https://github.com/shardulvs/xtemplate/blob/master/SPEC.md) supports native `image` elements and portable image packages. XTemplate Studio's image editing is available in the development branch; it is **not** in the published `alpha.6` binary.

## How to create a cover with pictures

1. Open **File → New template** and choose **Cover** as its kind.
2. Click the **Image** button on the canvas toolbar or **Insert → Image from file…**.
3. Select a PNG, JPEG or WebP. The editor adds an `image` element in Structure.
4. Drag the image, resize via its handles or edit **X / Y / Width / Height**, **Image fit** (`contain`, `cover`, `stretch`), **Image position** and **Opacity** in the Element inspector. **Replace image…** substitutes the selected image without changing its size/placement.
5. Arrange images behind a header, footer, shapes or text in Structure. For a watermark, lower its opacity, and put it behind the other content.
6. **File → Export template** writes a ZIP package with the `.xtemplate` extension, containing `template.json` and the used assets under `images/`.

For templates without images, the export remains plain JSON with the **same `.xtemplate` extension**.

## Example image node

```json
{
  "type": "image",
  "src": "images/watermark.webp",
  "x": "0mm",
  "y": "0mm",
  "w": "100%",
  "h": "100%",
  "fit": "cover",
  "position": "center",
  "opacity": 0.2
}
```

Images are embedded; no network fetches, base64 strings or external file paths are exported. Multiple nodes may reuse the same image entry. Importing and re-exporting a package preserves original image bytes.

## Limits and compatibility

- ZIP package size: **16 MiB**; template JSON: **1 MiB**; individual image maximum dimension: **8192 pixels**.
- The ZIP parser supports standard stored or DEFLATE entries, verifies CRC32, rejects unsafe paths and missing/unsupported referenced images, and applies decompression-size limits.
- The editor displays images with SVG's `preserveAspectRatio` as an approximation of the official rules. Rendering fidelity depends on XNotes Android's actual renderer; test templates in **XNotes v0.9.3 or newer**.
- Images aren't available to earlier XNotes versions. Exporting plain JSON with an image reference but no packaged bytes is rejected.
- Existing open documents and imported image assets are held in memory until you open another template or close the app. Export before replacing them.

## Checking compatibility

Run `npm test` for official JSON Schema checks and package edge cases, followed by `npm run test:browser` to exercise the real UI in Chromium (including import, image editing, ZIP export and asset byte preservation).
