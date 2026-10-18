# Native vector tools (experimental)

These tools edit only attributes supported by the XNotes Android `TemplateReader`.
They are available in the **Element** inspector after selecting the relevant node in **Structure**.

## Polygon and Polyline

Select a polygon or polyline, then choose **Edit points**. Drag anchors directly on the canvas,
Shift-click anchors to multi-select, double-click an edge to insert a midpoint, or edit individual
coordinates in the inspector. Buttons support insertion, removal (respecting minimum point count),
reverse ordering, alignment, distribution and regular polygon presets. **Delete** removes the
selected vertex rather than the entire element while point editing is active. **Escape** exits
point-editing mode. All gestures integrate with Undo/Redo, recording one change per completed drag.

The native JSON property remains `points`, a list of coordinate pairs, with optional native expressions.
Unchanged expressions are preserved. Before dragging points with expressions, the editor requires
confirmation because the changed coordinates will be replaced by absolute `mm` literals. Other points
retain their expressions. The visual editor does not silently bake the entire geometry.

Nested `group` coordinates are evaluated using the parent container. Editing a polyline/polygon under
`repeat` changes the *shared source node*, so all repeated copies change, not only the selected copy.
Currently the first repeated instance provides the coordinate context for expression baking.

## Hatch

Select a Hatch from Structure and click **Edit hatch on canvas** to adjust its angle, period, or
offset. The inspector also exposes sliders, native orientation presets and spacing presets.
Hold **Shift** while dragging the angle handle for 15-degree snapping.
The editor writes the native `angle`, `period`, and `offset` fields; `extend` remains available in
Advanced Options. Imported expressions are not overwritten by dragging without confirmation.

## SVG Path (safe subset)

The visual node editor accepts **absolute, explicitly named** `M`, `L`, `C`, `Q`, and `Z` commands
in a single contour. It exposes anchors and Bézier control points, direct coordinate editing,
line insertion and opening/closing the contour. Moving a point replaces only its original numeric
tokens, preserving other commands, whitespace and values.

XNotes Android additionally understands relative commands, `H`, `V`, `S`, `T` and `A` (elliptical
arcs), including complex contours. The Studio intentionally keeps those paths **read-only in the
visual tool** and leaves the original `d` property editable in Advanced Options. It does not
silently normalize arcs or convert shapes into paths. Editing multiple contours and advanced
Bézier segment conversion remain planned work.

## Compatibility and limitations

- Do not use SVG `transform` fields in `.xtemplate`: XNotes currently applies `rotate` only to text glyphs.
- Geometry is rendered using browser SVG for previews. Parity with Android's clipping, fill rules,
  expression evaluator and path parser still needs device-level comparison tests.
- For smooth large-template editing, optimization of Hatch/repeat rendering is still planned.
- The tools do not introduce any new JSON keys or template format extensions.
