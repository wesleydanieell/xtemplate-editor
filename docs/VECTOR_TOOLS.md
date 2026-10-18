# Native vector tools (experimental)

These tools edit only attributes supported by the XNotes Android `TemplateReader`.
They are available in the **Element** inspector after selecting the relevant node in **Structure**.

## Unified Pen tool (P)

The sidebar now contains one **Pen** tool instead of separate Line, Polygon and Bézier buttons.
Select one of **Line**, **Polyline**, **Polygon**, or **SVG Path** in the nearby mode picker.
The Pen creates XNotes-native `line`, `polyline`, `polygon`, or `path` nodes. It never adds SVG-only
transformation attributes. Click to place anchors; press **Enter** or double-click to finish
Polyline, Polygon or SVG Path, and **Escape** to cancel. Line finishes on the second click.
Polygon can also close by clicking its first node. Click-and-drag during SVG Path creation to
place Bézier tangent handles. **Click the latest Bézier anchor again** to reset only
its **outgoing** handle for the next segment, preserving the curve you just drew.
**Shift** constrains the new segment to 45° directions.

After creation the editor switches to **V / Selection**, with the new vector element's node mode
available automatically. Click an existing Polygon, Polyline or compatible Path with the matching
Pen mode to switch to node editing. Existing nodes can also be selected normally using V.

**Delete deletes the entire selected element**, using the regular confirmation dialog.
**Backspace deletes explicitly selected polygon/polyline vertices**, or the segment ending at a
selected SVG Path anchor where safe. Backspace with no selected vertex does not delete geometry.
Arrow keys nudge the selected vertex/control point: default 0.5 units, Shift 5, Alt 0.1.
For Polygon/Polyline these are millimeters; for SVG Path they are native viewBox units.

## Polygon and Polyline

Select a polygon or polyline, then choose **Edit points**. Drag anchors directly on the canvas,
Shift-click anchors to multi-select, double-click an edge to insert a midpoint, or edit individual
coordinates in the inspector. Buttons support insertion, removal (respecting minimum point count),
reverse ordering, alignment, distribution and regular polygon presets. **Backspace** removes explicitly selected vertices, while **Delete** deletes the entire element.
**Escape** exits
point-editing mode. All gestures integrate with Undo/Redo, recording one change per completed drag.

The native JSON property remains `points`, a list of coordinate pairs, with optional native expressions.
Unchanged expressions are preserved. Before dragging points with expressions, the editor requires
confirmation because the changed coordinates will be replaced by absolute `mm` literals. Other points
retain their expressions. The visual editor does not silently bake the entire geometry.

Nested `group` coordinates are evaluated using the parent container. Editing a polyline/polygon under
`repeat` changes the *shared source node*, so all repeated copies change, not only the selected copy.
Currently the first repeated instance provides the coordinate context for expression baking.

## Hatch

Select a Hatch from Structure and use the **Hatch quick controls** at the **top of Element**.
Click **Adjust on canvas** to edit angle (gold), spacing (green), or offset (blue) using
labeled, separate handles. The inspector also exposes sliders, native orientation presets
and spacing presets; extended/less common attributes remain in Advanced Options.
Hold **Shift** while dragging the angle handle for 15-degree snapping.
The editor writes the native `angle`, `period`, and `offset` fields; `extend` remains available in
Advanced Options. Imported expressions are not overwritten by dragging without confirmation.

## SVG Path (safe subset)

The visual node editor accepts **absolute, explicitly named** `M`, `L`, `C`, `Q`, and `Z` commands
in a single contour. It exposes anchors and Bézier control points, direct coordinate editing,
line insertion, safe segment deletion, nudge controls and opening/closing the contour.
After finishing with **Enter**, cubic segments show independent **incoming** and
**outgoing** handles attached to the relevant anchors. A collapsed handle is
shown with an approximately 20px editor-only offset marker so it can still be
grabbed even when the current zoom is small. **Orange means incoming; blue means
outgoing.** The offset marker does not move the actual geometry or change exported
values; dragging it changes only that curve's native `d` control point. Intermediate anchors have two
handles when adjoining cubic segments exist; open-path endpoints only have the
control points defined by their neighboring segment in XNotes SVG syntax.
Moving a point replaces only its original numeric
tokens, preserving other commands, whitespace and values.

XNotes Android additionally understands relative commands, `H`, `V`, `S`, `T` and `A` (elliptical
arcs), including complex contours. The Studio intentionally keeps those paths **read-only in the
visual tool** and leaves the original `d` property editable in Advanced Options. It does not
silently normalize arcs or convert shapes into paths. Editing multiple contours and advanced
Bézier segment conversion remain planned work.

## Compatibility and limitations

- Do not use SVG `transform` fields in `.xtemplate`: XNotes currently applies `rotate` only to text glyphs.
- Android `SvgPathData.parse` reads native `C` into `VectorSeg.Cubic(c1,c2,end)`, and
  `TemplateEval.path` scales/positions the resulting contours using native `viewBox`,
  `x/y/w/h` and `aspect`. Both tangent coordinates are therefore exportable without
  extensions. The **handles themselves are an editor-only UI**, not visible in XNotes.
  Android flattens cubics into segments for rendering, so exact browser pixel-for-pixel
  raster parity is not expected. On-device visual comparison remains to be completed.
- Geometry is rendered using browser SVG for previews. Parity with Android's clipping,
  fill rules and expression evaluator still needs device-level comparison tests.
- For smooth large-template editing, optimization of Hatch/repeat rendering is still planned.
- The tools do not introduce any new JSON keys or template format extensions.
