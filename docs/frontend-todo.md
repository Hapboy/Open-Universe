# Frontend TODO

Running scratchpad for frontend work planned across future sessions — not
started yet unless noted otherwise. Add to this freely; it's not a decision
log (see `DECISIONS.md` for those) or a formal spec, just a place to not
lose track of things between sessions.

## Conventions

- **`@/*` → `apps/web/src/*` path alias exists in `tsconfig.json` but is
  unused everywhere (`grep -r 'from "@/'` → zero hits).** Surfaced
  2026-08-08 by the deep `../../../../schemas/entities/...`-style relative
  imports the entity-schema work produced. Decided to leave the codebase
  as-is (all-relative) for now rather than mix import styles mid-session —
  revisit as its own deliberate pass (either just the newest deep-relative
  files, or a full codebase-wide switch) rather than doing it piecemeal.

## Documentation

- **Add a living, user-facing feature guide — doesn't exist yet.** Everything
  in `docs/` today is dev-facing: `DESIGN.md` is concept + a forward-looking
  node catalog (its "Каталог нод" section is a planned A/B/C classification,
  not a "here's what's actually shipped" reference — don't conflate the
  two), `DECISIONS.md` is an ADR-lite why-log, `backend-bootstrap.md`/
  `frontend-todo.md`/`api-testing-guide.md` are all build-status/planning
  docs for whoever's coding, not for someone just trying to use the app.
  Requested 2026-08-08: a doc (e.g. `docs/features.md` or
  `docs/user-guide.md`) explaining what the shipped app actually does and
  how, from a user's perspective — e.g. generative nodes (`gemini_*`) keep a
  browsable per-node generation history/slider; which node output pins can
  wire into which input pins (port types — Image/Video/Audio/Text — and any
  node-specific wiring rules like `gemini_vision`'s image-pin-plus-query-pin
  shape); the preset system (save an entity node's params as a reusable
  preset, select it back later); the photo-gallery/cover-photo mechanics;
  Timeline/Scenes vs the node graph; anything else a new user would need
  explained to use the app, not to build it.
    - **Must be kept continuously up to date** — not a one-time write. The
      practical way to make that actually happen across sessions rather than
      rotting like a stale README: add a line to `apps/web/CLAUDE.md`
      instructing that shipping or changing a user-facing feature means
      updating this doc in the same pass, the same way `backend-bootstrap.md`
      is already treated as a must-check/must-update status doc rather than
      a write-once one.

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

- **Shared `Button`/`IconButton` component — no such component exists today.**
  Every callsite hand-writes a native `<button className={styles.btn}>` /
  `.pri` / `.iconBtn}>`, e.g. `PhotoGallerySection.tsx`, `UtilParams.tsx`,
  `PresetsField.tsx`, `Modals.tsx`, `Topbar.tsx`, the new
  `MediaLibrary.tsx`'s `MediaPickerButton` — dozens of sites across
  `NodeCard/params/*` alone. Visual consistency is already handled a
  different way (`.btn`/`.pri`/`.iconBtn` defined once in
  `styles/shared.module.css`, every component's CSS Module does
  `composes: iconBtn from ".../shared.module.css"`), so this isn't a
  styling-drift problem — it's repeated _behavioral_ JSX: `disabled`/`title`
  plumbing, and the "swap the icon for `CircleLoader` while busy" pattern
  duplicated at every icon-button-with-an-async-action (e.g.
  `PhotoGallerySection`'s generate button, `MediaPickerButton`). A thin
  wrapper (`<Button loading={...} icon="ti-wand">`) would collapse that
  duplication without touching the existing CSS Module/`composes` setup.
  Standalone cleanup, not blocking on anything — worth doing whenever, low
  risk since it's additive (existing raw `<button>` usages don't need to
  migrate all at once).

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
    - Follow-up, not done here: the same `.catch()`-defaults-can-never-error
      issue applies to `gemini_imagen`/`veo`/`nanobanana`/`lyria`'s schemas
      (their `model` default also duplicates a literal from
      `GeminiParams.tsx`'s `IMAGEN_MODELS`/etc. arrays instead of deriving
      from them — the same drift risk this pass avoided for entity types).
      Revisit both once real Gemini-side validation is wanted; `gemini_text`/
      `gemini_vision`'s `model` field can't take the strict-enum approach at
      all since their model list is fetched at runtime
      (`GeminiParams.tsx`'s `useGeminiModels`), not a fixed set — that hook's
      `FALLBACK_MODELS` should also just go away in favor of leaving the
      select empty/loading until `listModels()` resolves, rather than
      showing a fake static list first.
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

- **Follow-up: clean up `shared.tsx`'s `BOOKKEEPING_KEYS` legacy fields
  (`_presets`, `photoIdx`) once confirmed unused.** `usePresetDatabase`'s
  `buildPresetSnapshot` strips these from every preset snapshot: `_presets`
  is a stray leftover key from graphs saved before presets became a shared
  library (`PresetLibraryContext.tsx`), `photoIdx` is a dead field name from
  a since-fixed backend migration (`FixPresetPhotoIdxKey`) — every entity
  type uses `coverPhotoIndex` now. Both are genuine one-time migration debt
  (unlike the entity-schema defaulting above, which is ordinary ongoing
  schema-evolution handling, not legacy cruft) — worth actually deleting the
  stripping logic once it's confirmed no real saved scene in the backend
  still carries either key. **Confirmed still live** while testing the
  above: a real character node's own params still carry `"photoIdx": 3`
  today. Needs its own check against real data before removing the strip.

## Generative Node Params

- **Next up: apply the same entity-schema pattern to the 6 Gemini types
  (`gemini_text`/`vision`/`imagen`/`veo`/`nanobanana`/`lyria`).** Direct
  continuation of the 2026-08-08 entity-params work below — same fix, same
  reasoning, just applied to the group that was explicitly left out of that
  pass. Use `schemas/entities/*.schema.ts` (e.g. `character.schema.ts`) as
  the template; the 6 files to change are `schemas/gemini/*.schema.ts` +
  `ui/NodeCard/params/GeminiParams.tsx`. Concretely:
    1. **Split each Gemini schema into strict + defaults**, same as entities.
       Every field in every Gemini schema is currently `.catch(default)` —
       which means `zodResolver` can _never_ produce an error for any of
       them, ever, regardless of `mode` (`.catch()` swallows the failure
       before it reaches the resolver — this is the exact bug already
       logged under "Entity Node Params" below). Fix: make the schema
       strict (real `.min()`/`.max()`/enum constraints where they make
       sense — most Gemini fields probably don't need any, same as most
       entity fields didn't), and export a separate plain `*Defaults`
       object for `useNodeParamsForm`'s `defaultValues` fallback and for
       `GraphContext.tsx`'s `templateParams`/`createNode` (mirroring
       `ENTITY_PARAM_DEFAULTS`/`ENTITY_PARAM_SCHEMAS` in
       `schemas/entities/schemas.ts` — add a `GEMINI_PARAM_SCHEMAS`/
       `GEMINI_PARAM_DEFAULTS` registry alongside it, or a sibling
       `schemas/gemini/schemas.ts`).
    2. **Drop `NODE_TEMPLATES.gemini_*.params`** once the schema owns
       defaults, same as the 11 entity types — `NodeTemplate.params` is
       already optional, this is just removing 6 more literal blocks from
       `data/nodes.ts` and pointing `templateParams()` at the new Gemini
       registry the same way it already checks `ENTITY_PARAM_DEFAULTS`.
    3. **Wire the `isFieldValid` autosave gate into `GeminiParams.tsx`**,
       same as every field in `EntityParams.tsx` now does:
       `field.onChange(v); if (isFieldValid("key", v)) updateNodeParam(...)`.
       Currently skipped there on purpose since it'd have been a no-op
       against the old `.catch()`-everywhere schemas — step 1 above is what
       makes this meaningful. `useNodeParamsForm.ts` itself needs no
       changes (`mode: "onChange"` and `isFieldValid` are already generic).
    4. **Fix the Gemini model-default drift** flagged below: each
       `.catch("some-model-id")` currently re-types a literal that already
       exists once in `GeminiParams.tsx`'s `IMAGEN_MODELS`/`VEO_MODELS`/
       `NANO_BANANA_MODELS`/`LYRIA_MODELS` arrays — same "don't duplicate a
       known constant" principle applied to the entity enum fields
       (`optionalEnum` off `@hayverse/shared`'s `as const` arrays). Derive
       the default from the array instead of retyping it.
    5. **`gemini_text`/`gemini_vision`'s `model` field is different** — no
       fixed list exists at schema-definition time, it's fetched live via
       `useGeminiModels`/`geminiApiClient.listModels()`. Can't use a strict
       `z.enum()` there; leave `model: z.string()` (unconstrained) for
       those two. Also drop `FALLBACK_MODELS`
       (`GeminiParams.tsx:46-50`) per the earlier note — leave the select
       empty/loading until the real list resolves instead of showing a
       static fake one first.
    6. Verify the same way the entity pass was verified: `npm run
typecheck`, live in the dev server — confirm a fresh Gemini node's
       defaults are unchanged, clear a field with a real constraint (if any
       get added) and confirm the store keeps the last valid value while
       the input shows the invalid one, confirm history-scrubbing
       (`generatedHistory`/`generatedParamsHistory`) still works since that
       depends on `graphExecution.ts` reading the same params shape.
    - Related, can fold in or do separately: "snapshotting can switch from
      denylisting `GENERATION_BOOKKEEPING_KEYS` to picking only each
      schema's known keys" (already noted further down) becomes trivial
      once every Gemini type has a real schema to read keys from.

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
    - Still open: snapshotting can switch from denylisting the 4 bookkeeping
      keys (`GENERATION_BOOKKEEPING_KEYS` in `graphExecution.ts`) to picking
      only each schema's known keys — self-maintaining, since a schema
      change automatically changes what gets snapshotted without a second
      list to keep in sync.

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

- **Move generation bookkeeping out of `params` into a sibling field
  (after the above).** `generatedHistory`/`generatedIdx`/
  `generatedParamsHistory`/`lastGeneratedRef` currently live inside
  `node.data.params` alongside real generation inputs, only kept apart by
  the denylist/allowlist filter above — do this once the RHF/zod +
  schema-driven pick work has landed, not before, since at that point the
  "what counts as a real param" boundary is already schema-defined and the
  move is mostly relocation rather than also inventing the boundary.
  Restructure to `node.data.generation: { history, idx, paramsHistory }`
  (sibling to `params`, not nested in it) so `params` is _only_ ever
  user-facing generation inputs — no filtering needed to snapshot it, no
  risk of a future bookkeeping field leaking in by accident. Worth doing
  now-ish rather than deferring further: more bookkeeping is likely
  coming (video/audio history per the note above, possibly undo/redo
  state, possibly job-status tracking for async Veo jobs), and each one
  added under the current scheme is one more key someone has to remember
  to keep out of snapshots/JSON export. Needs a read-time migration path
  for scenes already saved with history nested in `params` (backend graph
  JSON has no schema migration story today — see `docs/backend-bootstrap.md`
  — so plan for a fallback read of the legacy location rather than a
  one-time data migration).
