# Frontend TODO

Running scratchpad for frontend work planned across future sessions — not
started yet unless noted otherwise. Add to this freely; it's not a decision
log (see `DECISIONS.md` for those) or a formal spec, just a place to not
lose track of things between sessions.

## Node Editor

- ~~Edge selection sometimes deletes the connected node too~~ — fixed
  2026-08-16: added `onEdgeClick` on `<ReactFlow>` in `NodeEditor.tsx` that
  calls `selectNode(null)`, mirroring `onPaneClick`.

- ~~New node lands in the middle of the graph instead of where you
  double-clicked, once the canvas has been panned~~ — fixed 2026-08-16:
  dropped the `Math.max(0, x)`/`Math.max(0, y)` clamp in `GraphContext.tsx`'s
  `createNode`, now just `{ x, y }`.

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
