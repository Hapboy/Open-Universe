# Frontend TODO

Running scratchpad for frontend work planned across future sessions — not
started yet unless noted otherwise. Add to this freely; it's not a decision
log (see `DECISIONS.md` for those) or a formal spec, just a place to not
lose track of things between sessions.

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

## Generative Node Params

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
    - **Next**: the RHF/zod/`Controller` wiring itself for these 4
      components' param fields — same `useNodeParamsForm`/schema pattern as
      `GeminiImagenParams`/`GeminiNanoBananaParams`, now that there's
      history for a form to actually restore. Not done in this pass.
    - While at it: snapshotting can switch from denylisting the 4 bookkeeping
      keys (`GENERATION_BOOKKEEPING_KEYS` in `graphExecution.ts`) to picking
      only each schema's known keys — self-maintaining, since a schema
      change automatically changes what gets snapshotted without a second
      list to keep in sync.

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
