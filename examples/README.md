# Example templates

Open the examples from **Templates → Open example…** in XTemplate Studio. The files use the official [`.xtemplate` v1 format](https://github.com/shardulvs/xtemplate).

## Embedded-image examples

| File | Kind | Demonstrates |
|---|---|---|
| `cover-aurora-atlas.xtemplate` | Cover | Full-bleed embedded image with text and editable colour variables |
| `cover-field-notes.xtemplate` | Cover | Textured editorial cover, image plus individual text and line elements |
| `study-watermark.xtemplate` | Page | Semi-transparent image watermark behind a ruled study page |

Each example is a portable ZIP with the `.xtemplate` extension, containing `template.json` and an `images/` folder. The images are original procedural artwork generated specifically for this repository (no third-party image assets). Source generator: [`scripts/build-image-examples.py`](../scripts/build-image-examples.py). The examples are MIT-licensed as indicated in their metadata.

Run `python3 scripts/build-image-examples.py` to regenerate the three ZIPs deterministically. The generator requires only Python 3 standard-library modules.

## Existing examples

The other `.xtemplate` files remain plain JSON. They continue working unchanged and cover rulings, grids, Cornell pages, daily and weekly planners, music notation, and specialized graph paper. Both JSON and ZIP templates open from the same selector.

**Compatibility:** Image packages require XNotes Android v0.9.3 or newer. Preview rendering may differ slightly from the Android renderer; verify production templates on-device.
