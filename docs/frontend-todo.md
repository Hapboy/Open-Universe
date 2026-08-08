# Frontend TODO

Running scratchpad for frontend work planned across future sessions — not
started yet unless noted otherwise. Add to this freely; it's not a decision
log (see `DECISIONS.md` for those) or a formal spec, just a place to not
lose track of things between sessions.

## Conventions

- **Done: codebase-wide switch to the `@/*` alias (2026-08-08).** Every
  relative import/re-export/dynamic `import()` under `apps/web/src` and
  `apps/web/app` — 342 occurrences across 93 files, including same-directory
  `./Foo.module.css`-style ones, not just the deep `../../../../` chains —
  now goes through `@/*` (→ `apps/web/src/*`, already declared in
  `tsconfig.json`, previously unused). Done via a one-off codemod (resolves
  each relative specifier against the importing file's own directory,
  rewrites it relative to `src/`; left untouched if it ever resolved outside
  `src/` — none did). Verified: `npm run typecheck`, `npm run lint`, and
  `npm run build` (Turbopack) all clean, confirming Next.js's automatic
  `tsconfig.json`-`paths` resolution actually applies at the bundler level
  and not just for `tsc` — plus a live dev-server reload with no console
  errors.

## Documentation

- **Done: living, user-facing feature guide (2026-08-09).** New
  `docs/features.md` (Russian, matching every other `docs/*.md` and the
  app's own UI language) — covers canvas basics (add/connect/duplicate/
  delete nodes, port types Image/Video/Audio/Text and the strict
  same-type-only connection rule), the full shipped node catalog by
  category, node-specific wiring shapes (`gemini_vision`'s image+query
  pins, Nano Banana's up-to-14 reference images, `text_prompt`'s
  growable pins, per-photo output pins on entities), the preset system
  (save/select, required-fields gating, shared-per-type not per-scene),
  photo gallery + cover-photo mechanics, the Media Library and its
  login gate, Gemini generation history/scrubbing (including that
  scrubbing restores the params that produced that result, and that
  saving history requires login), Timeline's three tabs (Сцены/Сеть
  судеб/Scene Arc) and how a "scene" is really just its `output_scene`
  node, World Map, and what does/doesn't require an account. Built from
  a full codebase research pass (node.ts, graph.ts, GraphContext.tsx,
  PresetsField/PhotoGallerySection/MediaLibrary/NodeCard/Timeline/
  Modals) rather than guessing from memory — deliberately excludes
  implementation details (file paths, library names, backend guard
  internals) since it's written for someone using the app, not building
  it.
    - **Kept up to date via `apps/web/CLAUDE.md`**: added a note there
      (mirroring the existing `backend-bootstrap.md` must-update
      convention) that any PR shipping or changing a user-facing feature
      must update `docs/features.md` in the same pass.

## Media

- **Done: "Choose from library" next to upload buttons (2026-08-06/07).**
  `apps/web/src/ui/components/MediaLibrary/MediaLibrary.tsx` — shared
  `MediaLibraryGrid` (tabs: uploaded/generated, backed by
  `hayverseApiClient.media.list()`) + `MediaPickerButton` (trigger + portal
  modal, single-pick-per-open, hands back `asset.storageKey`). Wired into
  `PhotoGallerySection.tsx` (appends to the photo array) and
  `UtilParams.tsx`'s cover field (`updateNodeParam(..., "coverUrl", ref)`).
  Backend `/media` was scoped to the authenticated owner as part of this
  (see git log — was previously unguarded, any user could list/delete
  anyone's media).
    - **Deliberately not built**: a standalone "browse your whole library"
      modal (there was briefly a Topbar entry + `LibraryModal` for this, since
      reverted). It rendered the exact same `MediaLibraryGrid` with a no-op
      `onSelect` — a browse-only view where clicking a card does nothing is a
      UX dead end, and it added nothing the picker doesn't already show when
      opened from any node. Revisit only if a real "just look, don't pick"
      need shows up — a read-only tab in `ProfileModal` (`Modals.tsx`) would
      be a better home for it than a dedicated Topbar button.

## Testing / Infra

- **Resolved: `apps/api` e2e tests hung indefinitely after passing (fixed
  2026-08-06).** `apps/api/src/app.module.ts`'s `BullModule.forRootAsync`
  used to hand BullMQ an already-instantiated `new Redis(...)` client as
  `connection`. BullMQ only closes connections it creates itself — handing
  it a live instance means it assumes the caller owns the lifecycle and
  never calls `.quit()` on shutdown, so `app.close()` in every e2e spec's
  `afterAll` left that socket open and the whole jest process (and any
  `nest start --watch` dev server) alive forever with 0% CPU and no output.
  This looked exactly like a network/DB hang and cost real time to diagnose
  — worth remembering the symptom (test _assertions_ finish fast; jest
  just never prints/exits because the pipe never closes) if it resurfaces
  elsewhere. Fixed by passing a plain `{ host, port, username, password,
tls, maxRetriesPerRequest }` options object instead of a live client, so
  BullMQ creates and owns (and closes) its own connections. Verified:
  `bun run build`, a clean `bun run start:dev` boot with BullMQ
  initializing and `/health` responding, `media.e2e-spec` alone (10/10,
  ~13s, clean exit), and the full suite (`bun run test:e2e`, 38/38 across 5
  specs, ~15s, clean exit).
    - **Residual, not blocking**: running the _full_ suite together (not
      `media.e2e-spec` alone) still prints "A worker process has failed to
      exit gracefully and has been force exited" once — some other spec
      (auth/pinterest/scenes) has a smaller unrelated teardown leak. The
      overall process still exits fine now (jest force-exits the one worker
      rather than hanging forever), so this doesn't block anything — just
      flagging so it's not mistaken for a regression of the bug above. Worth
      a `--detectOpenHandles` pass whenever someone's touching those specs
      anyway.
    - **Also noted while debugging**: on Windows, stopping the bash task
      running `bun run start:dev`/`nest start --watch` does not kill the
      underlying `node.exe` child — it keeps holding port 4175, so the next
      `start:dev` fails with `EADDRINUSE` until that PID is killed manually
      (`netstat -ano | grep :4175` → `taskkill //F //PID <pid>`). Same
      class of issue as the existing "Dev server process cleanup" note for
      `apps/web`'s dev server, now confirmed on the `apps/api` side too.

## Components

- **Done: shared `Button`/`IconButton` component (2026-08-08).** New
  `ui/components/Button/` and `ui/components/IconButton/` — thin wrappers
  around the existing `.btn`/`.pri`/`.iconBtn` classes from
  `shared.module.css` (no new CSS, `Button.module.css`/`IconButton.module.css`
  just `composes` from it), collapsing the disabled/title plumbing and the
  "swap the icon for `CircleLoader` while busy" pattern that used to be
  hand-rolled at every callsite. Migrated the six files that already
  composed `iconBtn`/`btn`/`pri` from shared — `PhotoGallerySection.tsx`,
  `MediaLibrary.tsx`'s `MediaPickerButton`, `PresetsField.tsx`'s save
  button, `UtilParams.tsx` (cover upload + "add text field"), `Modals.tsx`
  (signup/login/Pinterest connect-disconnect) — and deleted the now-orphaned
  `composes` blocks from each of those CSS modules. Pinterest
  connect/disconnect in `Modals.tsx` picked up a real (not just cosmetic)
  change along the way: `busy` now drives `loading` (spinner), not just
  `disabled` — previously there was no visual feedback at all while the
  request was in flight.
    - **Deliberately not migrated**: `Topbar.tsx` (own separate hand-rolled
      `.iconBtn`/`.tb` styles, not composed from `shared.module.css` — a
      different visual family, not styling drift this component fixes),
      `NodeCard.tsx`'s circular run/wide-toggle buttons (distinct shape,
      not part of the `iconBtn` lineage), `PresetsField.tsx`'s preset-
      selector trigger (`.trigger` composes `btn` but adds its own
      flex/justify overrides `Button` doesn't model). Additive only —
      no forced migration, per the original scoping above.

## Node Editor

- **Undo/redo for the graph editor.** No history support today — GraphContext
  has no `undo`/`redo`, so a mistake (wrong preset click, deleted node,
  overwritten params) is unrecoverable without a manual fix. React Flow's own
  docs cover the standard approach: keep a history stack of past
  `nodes`/`edges` snapshots (or patches) in GraphContext, push on every
  committed change, wire Ctrl+Z/Ctrl+Shift+Z. Worth scoping carefully —
  GraphContext mutates `nodes`/`edges` from a lot of call sites
  (updateNodeParam, setNodePhotos, duplicateNode, connect/disconnect, etc.),
  so the snapshot point needs to be chosen to avoid either missing changes or
  spamming the history with every keystroke.

## Entity Node Params

- **Done: zod schemas + real validation for all 11 entity node types
  (2026-08-08).** `character`/`location`/`mise_en_scene`/`building`/
  `clothing`/`artwork`/`furniture`/`music`/`script`/`storyboard`/`transport`
  each get a schema at `schemas/entities/<type>.schema.ts` — the single
  source of shape, defaults, and validation, replacing three
  previously-separate copies: `NODE_TEMPLATES[type].params` (data/nodes.ts,
  now dropped for these 11 — `NodeTemplate.params` is optional), the
  hand-written `*NodeParams` interfaces (types.ts, deleted — the 3 consumers
  outside
  `EntityParams.tsx` now import the `z.infer` type straight from the schema
  file: `NodeParamsPanel.tsx`, `Timeline/SynapsesCanvas/synapseData.ts`,
  `WorldMap/WorldMap.tsx`), and `shared.tsx`'s hand-rolled `missingSaveFields`
  (now `schema.safeParse` — "well-formed" and "saveable as a preset" are one
  rule instead of two, per the reasoning that prompted this: with
  `mode: "onChange"` an untouched fresh node still shows no error, so making
  `name`/`photos`/`age` genuinely `.min()`-required didn't reintroduce the
  "blank node must stay valid" problem it was originally split out to avoid).
  Deliberately **not** using zod's `.catch()` per field the way the Gemini
  schemas do — `.catch()` swallows validation failures by design (that's
  what it's for), so a `.catch()`'d field can never surface a real error via
  `zodResolver`. Each schema file is strict instead (real `.min()`/`.max()`/
  enum constraints) and exports a separate plain `*Defaults` object
  (`GraphContext.tsx`'s `templateParams`/`createNode` source entity defaults
  from there via a new `ENTITY_PARAM_DEFAULTS` registry —
  `schemas/entities/schemas.ts`). `useNodeParamsForm.ts` now uses `safeParse` +
  falls back to the raw store params for `defaultValues` (a strict schema
  would otherwise throw on mount for a legitimately blank field, e.g. a
  fresh node's `name: ""`) and sets `mode: "onChange"`, which is also what
  actually makes `zodResolver` do anything — previously wired up but inert,
  since nothing here ever calls `handleSubmit` (this note applies to the
  already-shipped Gemini forms too — their `zodResolver` has never actually
  produced an error, both because nothing triggers validation and because
  every field there is `.catch()`-wrapped; **not fixed there in this pass**).
  Select-style fields build their zod union off the exact same `as const`
  array already used for the UI's own options list (`@hayverse/shared`'s
  `LOCATION_WEATHERS`, `HAIRCUT_VALUES`, etc., or a local one like
  `CharacterStyling.tsx`'s `haircutOptions`) — never a separately hand-typed
  default that could drift from the option list.
    - Also fixed as part of this: `core/graph.ts`'s "JSON" output pin and
      `NodeCard.tsx`'s "show JSON" preview both used to spread every param
      unconditionally, including blank/untouched fields. New
      `filledEntityParams(nodeType, params)` (`schemas/entities/schemas.ts`)
      diffs against the type's own defaults and is now used by both —
      confirmed live: a real character node's JSON view went from ~26 keys
      to 4 (`presetId`/`name`/`photos`/`coverPhotoIndex`), plus a genuinely
      stray `photoIdx` key surviving from old data (see next bullet — this
      is exactly the kind of leftover key it documents).
    - Follow-up, not done here: `TextField`/`TextAreaField`/`NumberField`/
      `SelectField` gained an `error?: string` prop + `.error`/`.isInvalid`
      styles (`styles/shared.module.css`) for this; `CoordinateField`/
      `ColorField`/`DropdownWithPreviews`/`DateRangeField`/`RangeField` were
      leftControlled via `Controller`/`useController` but without visual
      error styling — none of their fields currently have a constraint that
      can fail (coordinates/color/haircut-etc. are unconstrained or
      union-with-`""`), so there was nothing to surface yet.
    - **Done, same day:** moved all schema files (entity + the 6
      already-shipped Gemini ones) out of `ui/NodeCard/params/` into a new
      top-level `schemas/entities/` and `schemas/gemini/` — fixes a real
      layering inversion this pass had introduced: `core/graph.ts` and
      `store/contexts/GraphContext.tsx` (below `ui/` in the dependency
      order) had ended up importing from inside `ui/NodeCard/params/
EntityParams/`. Both non-UI files now import from `schemas/` instead.
    - **Done, same day:** an invalid value used to still get written to the
      store immediately (validation was display-only — `mode: "onBlur"`
      only gated the error message, not the commit). `useNodeParamsForm.ts`
      now returns an `isFieldValid(key, value)` check (a direct, synchronous
      `schema.shape[key].safeParse` — independent of RHF's own one-tick-
      delayed validation state) and every entity field's commit is gated on
      it: `field.onChange(v); if (isFieldValid("name", v)) updateNodeParam(...)`.
      Mode is now `"onChange"` too, so both the error and the gate react per
      keystroke, not just on blur — an invalid value never reaches the store
      even momentarily. Confirmed live: clearing a character's name to `""`
      leaves the input showing empty while the node's own JSON output pin
      keeps the last valid name until a valid one is typed again. Most
      fields have no real constraint, so this is a no-op for them — only
      `name`/`photos`/character `age` (the only `.min()`/`.max()`-bearing
      fields today) can ever actually block a commit. **Not applied to
      `GeminiParams.tsx`** — would be dead weight there today, since every
      Gemini schema field is still `.catch()`-wrapped (see above: `.catch()`
      always "succeeds", so `isFieldValid` could never return false for
      them); revisit together with the Gemini strict-schema fast-follow
      already noted above.

- **Done: `_presets`/`photoIdx` legacy-key cleanup (2026-08-08).** Both were
  genuine one-time migration debt (unlike the entity-schema defaulting
  above, which is ordinary ongoing schema-evolution) — `_presets` a stray
  leftover from graphs saved before presets became a shared library
  (`PresetLibraryContext.tsx`), `photoIdx` a dead field name from before
  `FixPresetPhotoIdxKey1785575290163` (which only ever fixed `presets`.
  `snapshot` rows, not scene graph node params — a second, separate copy of
  the same data). Fixed for real this time with a DB migration instead of
  waiting on "confirmed unused": `apps/api/src/database/migrations/
1786204681898-StripLegacyPresetKeys.ts` strips both keys from every node's
  `params` in every scene's `graph` jsonb, and (defensively — already clean
  per the prior migration) from every `presets.snapshot`. Ran against the
  live DB: 2 scenes, 2 affected nodes (the character node that still showed
  `"photoIdx": 3` live, confirmed while testing the entity-schema pass
  above, and one `location` node), 0 presets affected. `shared.tsx`'s
  `BOOKKEEPING_KEYS` is now just `["selectedItem"]` — `usePresetDatabase`'s
  `buildPresetSnapshot` no longer strips the other two, since post-migration
  there's nothing left to strip (no code writes either key anymore).

## Generative Node Params

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

- **Done: applied the same entity-schema pattern to the 6 Gemini types
  (2026-08-08).** `gemini_text`/`vision`/`imagen`/`veo`/`nanobanana`/`lyria`
  each get a schema at `schemas/gemini/<type>.schema.ts` — strict types +
  a separate plain `*Defaults` export, same split as the 11 entity types.
  Every field used to be `.catch(default)`, which swallows validation
  failures by design (`zodResolver` could never produce an error for any of
  them, regardless of `mode`); now plain `z.string()`/`z.number()`/
  `z.boolean()` with a real constraint only where the UI itself already
  implies one — `numberOfImages` (Imagen's select is "1"-"4"),
  `outputCompressionQuality` (0-100, per its own label), and `model`
  (`z.enum()` off each type's own model-id array). Left everything else
  unconstrained rather than inventing bounds the product doesn't actually
  have (most Gemini fields don't need any, same as most entity fields
  didn't) — `aspectRatio`/`resolution`/`personGeneration`/
  `safetyFilterLevel`/`outputMimeType`/`language`/seed/prompt fields stay
  plain strings, not `z.enum()`, unlike entity select fields' `optionalEnum`.
  New `schemas/gemini/schemas.ts` (`GEMINI_PARAM_SCHEMAS`/
  `GEMINI_PARAM_DEFAULTS`) mirrors `schemas/entities/schemas.ts`;
  `GraphContext.tsx`'s `templateParams` now checks both registries.
  `NODE_TEMPLATES.gemini_*.params` dropped from `data/nodes.ts` (6 fewer
  literal blocks). `GeminiParams.tsx`'s every field-commit now gates on
  `isFieldValid` same as `EntityParams.tsx`.
    - **Model-default drift fixed**: `IMAGEN_MODELS`/`VEO_MODELS`/
      `NANO_BANANA_MODELS`/`LYRIA_MODELS` moved from `GeminiParams.tsx`
      into their respective schema files (schema derives its `z.enum()` and
      default from the same array; `GeminiParams.tsx` now imports the array
      back for its `<select>` options) — one array instead of two,
      import direction stays schemas ← ui like the entity pass established.
    - **`gemini_text`/`gemini_vision`'s `model` stays `z.string()`**
      (unconstrained) — no fixed list at schema-definition time, it's
      fetched live via `useGeminiModels`/`geminiApiClient.listModels()`.
      `FALLBACK_MODELS` dropped; `useGeminiModels` now starts from `[]` and
      shows only the node's own stored model (via the existing
      inject-if-missing logic) until the real list resolves. Confirmed live:
      a fresh Gemini Text node showed the correct default
      ("Gemini Flash Latest") immediately, then the full live-fetched model
      list populated around it with no console errors.
    - Verified: `npm run typecheck` and `npm run lint` clean; live in the
      dev server — a Nano Banana node's model `<select>` (`z.enum()`, a real
      constraint) committed a change and survived a re-render (round-tripped
      through the store correctly), a plain `seed` text field still commits
      on blur, no regressions to the existing character/location nodes on
      the same canvas. Didn't get to exercise the invalid-value-rejection
      path itself (nothing in the currently-open scene has a Imagen/Veo node
      to poke `numberOfImages`/`outputCompressionQuality` on) or
      history-scrubbing specifically — worth a follow-up look next time one
      of those node types is on the canvas.
    - **Follow-up done (2026-08-08)**: exercised the invalid-value-rejection
      path live (added an Imagen node, switched to JPEG, typed `150` into
      `outputCompressionQuality`) — confirmed `isFieldValid` correctly
      blocked the store commit (reloading the page showed the persisted
      default `75`, not `150`). That surfaced a real gap though: nothing
      showed the rejection in the UI — the field just silently kept
      whatever was typed with no red border/message, unlike
      `EntityParams.tsx`'s fields. Fixed by wiring `fieldState.error` into
      the same `TextField`'s `error` prop (identical pattern to
      `EntityParams.tsx`) and giving the schema's `.min(0)`/`.max(100)`
      Russian messages (`geminiImagen.schema.ts`) instead of raw zod
      English defaults. Deliberately **not** wired onto `model`/
      `aspectRatio`/`numberOfImages`/etc. — those are all `<select>`-backed
      enums that can't produce an invalid value through the UI in the first
      place (same reason `EntityParams.tsx` doesn't wire error onto its own
      enum dropdowns), so `outputCompressionQuality` is the only Gemini
      field where this was reachable at all.
- **Done: react-hook-form + zod for `gemini_imagen`/`gemini_nanobanana`
  params (2026-08-07).** New `useNodeParamsForm.ts` (RHF form mirroring a
  node's store params, keyed by a zod schema — `geminiImagen.schema.ts`,
  `geminiNanoBanana.schema.ts`), wired into `GeminiParams.tsx` via
  `Controller` for every field in both components (uniform, including the
  select/switch-driven and permanently-`disabled` Enterprise-only ones —
  not just the fields that were actually broken). Fixes the stale-
  `defaultValue`-after-`MediaSlider`-restore bug for real this time. Also
  fixed a related bug found while doing this: a _wired_ prompt pin's actual
  resolved text was never captured into the per-generation params snapshot
  (`graphExecution.ts`'s `persistGeneratedImages` now captures it via
  `edgeInput`), so scrubbing history now shows the prompt that actually
  produced each past generation instead of whatever the upstream node
  currently says.
    - **Follow-up, not done here**: once a backend Vertex proxy exists,
      revisit enabling the currently-`disabled` Enterprise-only fields —
      Imagen's `negativePrompt`/`seed`/`language`/`enhancePrompt`, Veo's
      `seed`/`personGeneration`/`enhancePrompt`/`generateAudio`, NanoBanana's
      `personGeneration`. The `Controller` plumbing for the two node types
      already touched here is already in place; they just need `disabled`
      dropped once there's somewhere for the value to actually go.
    - **Not done here (deliberately out of scope)**: `gemini_text`/
      `gemini_vision`/`gemini_veo`/`gemini_lyria` have no history/slider
      mechanism at all yet, so they weren't touched — see the next bullet
      (now done — the persistence function referenced above was renamed
      `persistGeneratedOutputs` as part of that work).

- **Done: generation-history mechanism for `gemini_text`/`gemini_vision`/
  `gemini_veo`/`gemini_lyria` (2026-08-07).** These 4 had no
  history/slider at all before — each generation just overwrote the last.
  `graphExecution.ts`'s `persistGeneratedImages` (image-only) is now
  `persistGeneratedOutputs`, driven by two lookup tables —
  `HISTORY_OUTPUT_KIND` (`"blob"` for image/video/audio, uploaded via
  `mediaRef.ts`'s already-generic `putGeneratedBlob`; `"text"` for
  text/vision, stored inline as the history "ref" itself, no R2 round-trip)
  and `WIRABLE_FIELD` (per-type `{paramKey, pinIndex}` — generalizes last
  session's wired-prompt-history fix beyond just imagen/nanobanana's
  `prompt`@pin0, since `gemini_vision`'s wirable field is `query`@pin1).
  `NodeCard.tsx` now derives `generatedHistory`/`generatedParamsHistory`/
  `generatedIdx` generically off a new `HISTORY_NODE_TYPES` set
  (`data/nodes.ts`) instead of an image-only gate, and renders by
  `outputKind`: image/video reuse `MediaSlider` (video just needed real
  history threading, no component changes); audio/text use a new plain-flow
  `HistoryNav.tsx` bar (prev/count/next/delete) instead of `MediaSlider`'s
  overlay chrome, which doesn't suit a thin `<audio>` control bar or a
  variable-height text block. `gemini_lyria`'s audio player also moved from
  below the params form to the top of the card, alongside the other 3 kinds
  — deliberate consistency fix, not incidental.
    - The RHF/zod/`Controller` wiring itself for these 4 components' param
      fields is now done too — see the bullet below.

- **Done: react-hook-form + zod for `gemini_text`/`gemini_vision`/
  `gemini_veo`/`gemini_lyria` params (2026-08-07).** Same
  `useNodeParamsForm` + `Controller`-per-field pattern as
  `gemini_imagen`/`gemini_nanobanana`, applied now that these 4 have
  history to restore (previous bullet). New `geminiText.schema.ts`,
  `geminiVision.schema.ts`, `geminiVeo.schema.ts`, `geminiLyria.schema.ts`.
  All 6 Gemini node types now share the identical form/history pattern —
  nothing Gemini-specific left on the old `defaultValue` path. One
  incidental fix along the way: `gemini_veo`'s editable `negativePrompt`
  field was still on the old `defaultValue`/`onBlur` pattern (only its
  disabled Enterprise-only fields had been left alone deliberately) — now
  Controller-wired like everything else, so it no longer goes stale after a
  history restore either. `durationSeconds`' forced-`"8"`-while-disabled
  display (for non-720p resolutions) is preserved exactly as before — a
  computed display value now instead of the old remount-via-`key` trick,
  same visual behavior, no change to the underlying (pre-existing, out of
  scope here) quirk where the stored value isn't itself forced to 8.

- **Done: moved generation bookkeeping out of `params` into a sibling
  `node.data.generation` field (2026-08-08).** `generatedHistory`/
  `generatedIdx`/`generatedParamsHistory`/`lastGeneratedRef` used to live
  inside `node.data.params` alongside real generation inputs, kept apart
  only by `graphExecution.ts`'s `GENERATION_BOOKKEEPING_KEYS` denylist
  filter — now `node.data.generation: { history, idx, paramsHistory }`
  (sibling to `params`, added to the `NodeParams` type alongside the
  existing UI-only flags like `showJsonPreview`), so `params` is _only_
  ever user-facing generation inputs. `GENERATION_BOOKKEEPING_KEYS`/
  `snapshotGenerationParams` deleted outright — `persistGeneratedOutputs`
  just spreads `node.data.params` directly now, nothing to filter.
  `NodeCard.tsx`'s history nav (`onHistoryIndexChange`/`onHistoryDelete`)
  writes the generation object via `setNodeField` (the same generic
  sibling-field setter already used for `showJsonPreview` etc.) instead of
  `updateNodeParams`; the actual snapshot-restore-into-`params` on scrub
  still goes through `updateNodeParams`, since that part is genuinely
  restoring real param values. `GeminiParams.tsx`'s `wiredFieldDisplayValue`
  now takes the node's `generation` object instead of `params`.
    - **No read-time fallback for the old shape** — deliberately, per
      explicit instruction: old scenes are allowed to break, a one-time DB
      migration handles existing data instead of permanent legacy-read
      code. `apps/api/src/database/migrations/
1786204681897-MoveGenerationBookkeepingToSiblingField.ts` moves the 4
      keys out of every history node's `params` into `data.generation` for
      every row in `scenes`. Ran against the live DB: 2 scenes, 1 node
      affected (a `gemini_nanobanana` node with 2 real history entries).
      Verified after running: 0 nodes left with the old keys in `params`, 1
      node with the new `generation` field: exactly as expected. Confirmed
      live in the dev server post-migration — history nav prev/next both
      work, scrubbing correctly restores the historical `prompt` into the
      live params field, index persists back to the DB correctly.
