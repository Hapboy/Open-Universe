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

## Timeline / Scenes

- **On reload, if your last-active (or `?scene=`-linked) scene isn't the
  first one in the list, the canvas/Timeline briefly show the _first_ scene
  before swapping to the real one.** Found 2026-08-16 while fixing the
  "Сцен пока нет" flash (see `GraphContext.tsx`'s `seedFromPrefetched`/mount
  effect). That fix seeds `sceneGraphs`/`nodes`/`edges`/`activeSceneId`
  synchronously from `page.tsx`'s server-prefetched scene list so the
  Timeline never renders "no scenes yet" on first paint — but the seed
  always picks `prefetched[0].id` as a placeholder active scene, since the
  real choice (`?scene=` URL param, then `hv_active_scene_id` in
  localStorage, see `resolveActiveSceneId`) needs browser APIs unavailable
  during SSR/first hydration. The mount effect re-resolves the real scene
  and swaps to it via `loadSceneIntoState` right after mount — but if that
  resolved scene differs from `scenes[0]`, the user visibly sees scene 1's
  canvas for one moment before the swap, trading the old "flash to empty"
  bug for a "flash to the wrong scene" one whenever they aren't already on
  the first scene. Not fixed yet — no clean way to resolve `?scene=`/
  localStorage server-side (Next server components don't see localStorage,
  and would need the URL forwarded some other way), so a real fix likely
  means either accepting the first-scene flash only for that one case, or
  finding a different way to make the real active-scene choice available
  synchronously (e.g. reading `?scene=` from `page.tsx`'s own server-side
  `searchParams`, though that still leaves localStorage's own stored id
  unresolved server-side).

## Generative Node Params

- ~~**Nano Banana can return multiple images per request, but the backend only
  keeps the first one.**~~ — fixed 2026-08-17: `runNanoBanana` now
  `.filter()`s every `inlineData` part and returns `string[]`; the route
  answers `{ dataUrl, dataUrls }` (singular kept for the window where
  `apps/web` has deployed but `apps/api` hasn't been `railway up`'d);
  `appendGenerationHistoryMany` appends all of them to one history stream in a
  single store write. The standalone node's extras travel on a
  `multiOutputs` side channel (`core/graph.ts`) since a pin can only carry one
  value — downstream edges still get the first image. Deliberately _not_
  added: a "generate N" fan-out of parallel requests; multi-image stays
  whatever the model chooses to return for a prompt.

- **A downstream edge always gets the first generated image, even when the
  history slider is parked on another variant.** Surfaced 2026-08-17 by the
  multi-image work above, but it predates it (a re-run has always left
  `resolved` holding the newest result regardless of where the slider sits).
  Fixing it means making `resolved` follow `currentHistoryRef` rather than the
  raw run output — i.e. re-resolving downstream consumers on every scrub,
  which is a real change to when the graph recomputes. Left alone until
  someone actually wants "park on variant 3, then run the scene with it".

- **Generation is character-only among entity types — for now.** The intent
  is that the «Генерация» section eventually exists **everywhere photos can be
  uploaded or picked**: every entity node rendering `PhotoGallerySection`
  (location, clothing, building, furniture, art, transport, …) should get the
  same block — nano-banana fields, own history, «Принять в фото» — not just
  character. The pieces are per-type by design (`photoGen` slice +
  `characterVisualKeys` + `ENTITY_GENERATION_NODE_TYPES`/`ENTITY_VISUAL_KEYS`
  registration), so each addition is mostly declaring that type's visual keys
  and a prompt subject, then adding it to `ENTITY_GENERATION_NODE_TYPES`.
  Character shipped first as the proving ground; the remaining decision is
  ordering and per-type prompt wording, not whether to do it.

- **`photoMeta`-style tags.** `EntityPhoto` carries `caption` + `role`
  (`PHOTO_ROLES`); a freeform `tags: string[]` would slot in without another
  migration if a taxonomy ever earns its keep. Skipped for now — nothing
  consumes tags, and they need autocomplete UI to be usable.

- **The thumbnail strip doesn't scroll a newly added photo into view.**
  `PhotoGallerySection.module.css`'s `.thumbnailsList` is
  `max-height: 100px; overflow-y: auto`, so past ~2 rows a freshly added photo
  lands out of sight even though the cover/preview does update.

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

## Redesign — Claude Design pipeline

Not started — **blocked on Vahan supplying visual references.** Once they
land, run in order:

1. Draft a design direction from the references using the `frontend-design`
   skill's process: a compact plan (4-6 named colors, 2 typefaces, a layout
   concept, one signature element), checked against generic-AI-design
   defaults before anything gets built. Present the plan for approval first.
2. Pick 2-3 pilot components to prove the pipeline before touching the whole
   registry — candidates: Button, SelectField, one entity card. Self-
   contained, no context providers needed, so they're safe to preview in
   isolation.
3. Build isolated preview HTML for the pilots (variants/states shown per
   card, first-line `<!-- @dsCard group="…" -->` marker).
4. `DesignSync`: `create_project` (first sync only — creates the design-
   system project) → `finalize_plan` → `write_files`, pushing the pilots to
   claude.ai/design.
5. Review/tweak visually in claude.ai/design.
6. Read back whatever changed and port it into the real components
   (`apps/web/src/ui/components/`, CSS Modules/TSX) — the repo stays the
   source of truth, not Claude Design.
7. Once the pilots are approved, roll the same direction through the rest of
   the component registry incrementally — never a wholesale replace
   (`DesignSync`'s own constraint, not just a preference).

Tooling already in place: `frontend-design@claude-plugins-official` enabled
at project scope (`.claude/settings.json`, 2026-08-24); `DesignSync` account
access confirmed live (`list_projects` succeeded, zero projects yet — the
first project gets created at step 4). Figma MCP is also available this
session but out of scope for this repo — earmarked for a different future
project that already has Figma files.

Explicitly deferred from this pass: a skin/theming system (swappable color/
type/spacing tokens for multiple visual identities). Only layouts are in
scope for now — see the next section.

## Layout variants — headless component architecture (pilot: Character node)

Not started — independent of the redesign pipeline above, can begin any
time. **Goal:** support rendering the same node/entity as multiple
structurally different layouts (e.g. today's compact graph card vs. a full
inspector panel/drawer) without forking logic per layout. This is _not_
about skinning/theming (tokens/colors) — that's the separate, deferred axis
noted above.

**Why Character first:** it touches both layers that need splitting — the
generic node shell (`NodeCard.tsx`) and a type-specific params form
(`CharacterParams` in `EntityParams.tsx`) — so it's representative of the
refactor the other 22 node types will eventually need.

Current coupling to undo:

- `NodeCard.tsx` mixes React Flow wiring (`Handle`/`Position`/
  `useUpdateNodeInternals`), graph-context data fetching (`useGraphContext`,
  `useNarrativeContext`, `useGenerationHistory`), and the actual card JSX
  (header, ports, media slider, history nav, menu) in one component. There's
  no seam to render the same node's data in a non-card shape.
- `CharacterParams` (and the other `*Params` functions in
  `EntityParams.tsx`) already separate field _bindings_ from JSX via
  `useNodeParamsForm` (`control`/`isFieldValid`, react-hook-form-ish) — but
  the visual arrangement of fields (grouping, order, stacked layout) is
  hardcoded in the same function that owns the bindings.

Tasks:

1. Extract a headless `useNodeCardData(id)` hook out of `NodeCard.tsx` —
   everything currently pulled from context plus derived state (`resolved`,
   connected entities, running state, actions like `runNode`/
   `duplicateNode`/`deleteNode`/`renameNode`/`updateNodeParam`) with zero
   JSX. `NodeCard.tsx` becomes one _consumer_ of it (today's React Flow
   card), not the owner of the logic.
2. Do the same for a single params form: split `useNodeParamsForm`'s output
   (field bindings/validity) from field _layout_. Introduce a small field-
   descriptor shape (label, control type, validation) that a layout
   component renders — so "CharacterParams the data contract" and
   "CharacterParams the stacked-form JSX" become two separate things.
3. Build one alternate layout for Character only (e.g. an inspector-panel/
   drawer variant) consuming the same two headless hooks, to prove the split
   actually decouples logic from presentation before generalizing.
4. Once proven on Character, roll the same `useNodeCardData` + field-
   descriptor split through the other entity types that already share
   `useNodeParamsForm` (Location, Clothing, Building, Artwork, Furniture,
   Music, Script, Storyboard, Transport) — mechanical once the pattern
   exists.
5. No layout-selection UI/registry yet — out of scope until there are ≥2
   real layouts to actually choose between. Don't build the switcher
   speculatively ahead of that.
