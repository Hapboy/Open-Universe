# Frontend TODO

Running scratchpad for frontend work planned across future sessions — not
started yet unless noted otherwise. Add to this freely; it's not a decision
log (see `DECISIONS.md` for those) or a formal spec, just a place to not
lose track of things between sessions.

## Node Editor

- **Edge selection sometimes deletes the connected node too, not just the
  edge.** Found while discussing the undo/redo work above (2026-08-10), not
  yet fixed. Root cause: `NodeEditor.tsx`'s `styledNodes` (~line 104) forces
  every node's `selected` flag from `selectedNodeId` on _every_ render, but
  there's no `onEdgeClick` handler on `<ReactFlow>` to clear `selectedNodeId`
  when the user clicks an edge instead of a node. So a previously-selected
  node stays selected (both visually and as far as React Flow's internal
  state is concerned) even after clicking an edge, and `deleteKeyCode`
  deletes everything currently marked selected — both the edge just clicked
  and the stale-selected node. Fix: add an `onEdgeClick` that calls
  `selectNode(null)`, mirroring what `onPaneClick` already does.

- **New node lands in the middle of the graph instead of where you
  double-clicked, once the canvas has been panned.** Found 2026-08-10,
  not yet fixed. `NodeEditor.tsx`'s `onCanvasDoubleClick` correctly converts
  the click into flow-space coordinates via `screenToFlowPosition` and opens
  the NodeBrowser popup right there — that part's fine. But
  `GraphContext.tsx`'s `createNode` (~line 631) clamps the new node's
  position: `{ x: Math.max(0, x), y: Math.max(0, y) }`. Flow-space
  coordinates are relative to the graph's own origin (near where the first
  node was placed), not the screen — going negative is normal and expected
  once you've panned. Double-click anywhere that maps to a negative flow
  coordinate and the clamp silently snaps that axis back to `0`, landing the
  node near the original cluster instead of at the cursor. `git blame`
  traces the clamp to before the double-click-to-place UX existed (likely
  leftover from when nodes were just appended at a fixed spot); it was never
  revisited once `screenToFlowPosition` was wired in and now actively fights
  that feature. Fix: drop the clamp — `Math.max(0, x)`/`Math.max(0, y)` →
  plain `x`/`y`.

## Timeline

- **Ability to collapse/hide the Timeline panel.** Requested 2026-08-10 — it
  eats a fixed chunk of vertical space (`Timeline.module.css`'s
  `.timelineContainer` has no explicit height, but its content adds up to
  roughly 200px: `.mainTimelineArea`'s 116px scene-track view + header +
  controls bar + padding/gaps — around 20% of a typical viewport) with no
  way to reclaim it, unlike the graph canvas below it (`App.tsx`'s `.stage`
  is `flex: 1`, so it already grows/shrinks to fill whatever's left).
  `GraphContext.tsx` already has this exact pattern for three other panels —
  `showMiniMap`/`showMontageMonitor`/`showWorldMap` (booleans + setters,
  ~line 285 onward) — so a `showTimeline`/`setShowTimeline` pair following
  the same shape is the natural fit; `App.tsx`'s `<Timeline />` (line 40)
  would render conditionally on it, same as `WorldMap`/`MontageMonitor`
  already do.
    - **One real wrinkle**: unlike those three, whose toggle buttons live
      _inside_ `Timeline.tsx`'s own `controlsBar` (lines 322-343) — safe,
      since Timeline itself is never the thing being hidden — a
      "hide Timeline" toggle can't live inside Timeline, or hiding it would
      hide the only way to bring it back. Needs a home somewhere that stays
      visible regardless, e.g. `Topbar.tsx` (currently has no view-toggle
      buttons of this kind at all — would be the first).
    - Not scoped further yet: whether collapsing should hide the whole panel
      outright or leave a thin always-visible strip (mirroring
      `editorPaneCollapsed`'s `width: 0%` pattern used for `WorldMap`'s
      split view, `App.module.css` line 30) is an open call — full hide is
      simpler and matches the other three toggles' all-or-nothing behavior.

## Generative Node Params

- **Nano Banana can return multiple images per request, but the backend only
  keeps the first one.** Found 2026-08-10, not yet fixed. Nano Banana
  (`gemini-3.1-flash-image`) has no `numberOfImages`-style config field like
  Imagen — multi-image output is prompt-driven (e.g. asking for several
  variations in one prompt), and the model can return several `inlineData`
  parts in the same candidate's `content.parts`.
  `apps/api/src/ai-gateway/gemini/gemini.service.ts`'s `runNanoBanana`
  (~line 233) uses `.find((p) => p.inlineData)`, which stops at the first
  match and silently drops any additional images the model returns. Fixing
  this for real needs: `.filter()` instead of `.find()` and a return type
  change (`string` → `string[]`) in `runNanoBanana`, the corresponding route
  in `gemini.controller.ts`, and frontend plumbing (`NanoBananaOptions`,
  history/gallery handling in `graphExecution.ts`/`NodeCard.tsx`) to store
  and display more than one result per generation. No product decision yet
  on whether multi-image output is even wanted for this node — currently
  just a silent data-loss risk if a user's prompt happens to ask for
  multiple images.

- **`gemini_vision`'s model dropdown shows every Gemini model, not just
  vision-capable ones — no API to filter by modality.** Checked
  2026-08-08: `GeminiVisionParams` uses the same `useGeminiModels`/
  `geminiApiClient.listModels()` as `GeminiTextParams` (shared module-level
  cache in `client.ts`), and the backend's `listModels`
  (`apps/api/src/ai-gateway/gemini/gemini.service.ts:67-78`) calls Google's
  `models.list()` — confirmed via the `@google/genai` SDK's `Model` type
  (`node_modules/@google/genai/dist/genai.d.ts:9895`) that the response has
  no modality field at all (no `supportsVision`/`inputModalities`), only
  `supportedActions` (action verbs like `generateContent`, already filtered
  on). So there's no server-side way to ask Google for "vision-only" models
  — it's one undifferentiated list for the whole API, same as what Google's
  own AI Studio model picker shows. A user can currently pick a text-only
  model in the Vision node and only find out it doesn't work when
  `generateVision` errors at runtime. Two options if this is worth fixing:
  a hardcoded allowlist/exclusion pattern (cheap, but a hand-maintained list
  that drifts as Google ships new models), or leave as-is and accept the
  runtime-error UX. Not acted on yet — no clear preference expressed either
  way.
