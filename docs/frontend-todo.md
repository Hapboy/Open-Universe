# Frontend TODO

Running scratchpad for frontend work planned across future sessions — not
started yet unless noted otherwise. Add to this freely; it's not a decision
log (see `DECISIONS.md` for those) or a formal spec, just a place to not
lose track of things between sessions.

## Media

- **Media library modal.** A modal listing all of the user's uploaded and
  generated photos/videos, two tabs ("Uploaded" / "Generated") filtering on
  `MediaAsset.kind`. Backend already has what's needed: `GET /media`
  (`apps/api/src/media/media.controller.ts:48-56`) lists all assets with a
  resolved `url` per item — just needs a `media.list()` method added to
  `hayverseApiClient` (`src/core/api/hayverse/client.ts`) if it's not there
  yet. Render via `resolveMediaRefCached`/`useResolvedMediaUrls`
  (`src/core/mediaRef.ts`) same as node thumbnails do.

- **"Choose from library" next to every upload button (depends on the
  above).** Every node with an upload-photo button only supports picking a
  new file from disk (`putBlob(file)` → new `s3:<uuid>` ref each time), no
  way to reuse something already uploaded/generated elsewhere. Add a second
  button next to each upload button that opens the media library modal in
  picker mode and, on selection, imports the existing ref the same way an
  upload result is consumed today (no re-upload, no new asset — just wire
  the picked ref into the same place `putBlob`'s resolved ref goes). Known
  upload sites to add this next to:
    - `apps/web/src/ui/components/PhotoGallerySection/PhotoGallerySection.tsx`
      (~line 104-117) — shared multi-photo gallery upload used by
      character/etc. nodes, feeds `setNodePhotos(node.id, next, idx)`.
    - `apps/web/src/ui/NodeCard/params/UtilParams.tsx` (~line 222-243) —
      single cover-image upload, feeds
      `updateNodeParam(node.id, "coverUrl", ref)`.
      Worth a shared `MediaPickerButton`/hook wrapping the media library modal
      in "select and return a ref" mode, rather than duplicating open/select
      wiring at each of the two (growing) call sites.

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

- **react-hook-form + zod for node param panels.** Today param inputs
  (`apps/web/src/ui/NodeCard/params/GeminiParams.tsx`, `shared.tsx`'s
  `WirableTextField`, `TextField.tsx`) are mostly uncontrolled
  (`defaultValue`), so React never re-renders them after mount. This causes a
  real bug: `MediaSlider`'s `onIndexChange`
  (`apps/web/src/ui/NodeCard/NodeCard.tsx:319-327`) correctly writes the
  selected photo's saved param snapshot back into `node.data.params` via
  `updateNodeParams`, but the prompt/seed/negativePrompt/guidanceScale text
  fields don't visually update — and blurring one of them re-writes the
  DOM's stale value over the just-restored state, silently undoing the
  restore. Only `SelectField`-based dropdowns (model, aspectRatio, ...) are
  truly controlled and update correctly today.
    - Move to `react-hook-form` (+ `@hookform/resolvers/zod`, one zod schema
      per node type) via a shared `useNodeParamsForm(nodeId, schema,
defaultValues)` hook that bridges RHF's local per-node-instance form
      state with the graph store: push edits to `updateNodeParams` on change,
      and call `form.reset(storeParams)` on mount and whenever the store
      changes from outside the form itself (slider `generatedIdx` change,
      future undo/redo). `reset()` is what actually fixes the stale-field bug.
    - Same move gets two more things for free: `formState.dirtyFields` for
      "only include changed/non-empty fields" when serializing params to
      JSON, and `formState.errors.fieldName` (from the zod schema) for
      per-param inline validation errors.
    - Prototype against `gemini_imagen`/`GeminiParams.tsx` first (it already
      has the full history/snapshot mechanism —
      `apps/web/src/store/contexts/graphExecution.ts`'s `appendGeneratedRef`/
      `generatedParamsHistory`), then generalize the schema-per-node-type +
      shared hook pattern to other generative nodes. Note `gemini_veo`
      (video) and `gemini_lyria` (audio) currently have no history/slider at
      all — each generation just overwrites the last — so extending
      "restore params on selecting a past output" to them means giving them
      the history mechanism first, not just the form layer.
    - While at it: snapshotting can switch from denylisting the 4 bookkeeping
      keys (`GENERATION_BOOKKEEPING_KEYS` in `graphExecution.ts`) to picking
      only the zod schema's known keys — self-maintaining, since a schema
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
