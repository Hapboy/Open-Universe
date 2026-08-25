# Decisions log

ADR-lite: one entry per decision, newest at bottom. Update in place only if a
decision is reversed — add a new entry noting the change, don't rewrite history.

## Backend framework: NestJS

Chosen over a bare Bun HTTP framework or Express. Solo-maintained project
benefits from Nest's DI, module boundaries, and TypeORM/BullMQ integrations
being first-class instead of hand-rolled. The reference company's custom
"glue" framework is explicitly **not** being replicated here — that exists to
serve many teams sharing infra; this is one person and one service.

## Runtime: Bun

Chosen over Node after review — Bun now covers TypeScript out of the box,
Node API compat, npm packages, decorators + `reflect-metadata` (required by
NestJS/TypeORM), `bun test`, `bun --watch`.

**Residual risk:** Railway's Nixpacks auto-detection is Node-first and may
not correctly detect a Bun project. Mitigation: ship an explicit
`Dockerfile FROM oven/bun` for the API service rather than relying on
auto-detect.

**Follow-up research (2026-07-27):** confirmed via web search that decorator
metadata (`emitDecoratorMetadata`/`reflect-metadata`, the mechanism NestJS DI
depends on) has been stable in Bun since v1.0.3 — the scariest-sounding risk
turned out to be a non-issue. Two real findings that change specifics
elsewhere in this doc:

- **`bcrypt` does not work on Bun** — it's a native node-gyp-compiled addon,
  and Bun doesn't support compiled native extensions. Use **`bcryptjs`**
  (pure JS, same API) instead everywhere `bcrypt` was planned.
- **Nest CLI's Bun support is unofficial/community-driven**, not a blessed
  first-class path (see `nestjs/nest#13881`, `#15764`). `nest new
--package-manager bun` works in practice today, but expect occasional
  friction on Nest CLI upgrades — not a blocker, just don't be surprised.
- **BullMQ**: stick with `ioredis`, not Bun's newer built-in native Redis
  client — `ioredis` is pure JS and is BullMQ's most battle-tested adapter;
  Bun's native-client adapter support is still new. No change from the
  original plan, just confirmed as the right call.

## Hosting: Railway (to start)

Postgres + Redis add-ons and the NestJS service live in one Railway project/
dashboard. Chosen for minimal setup friction while the project is pre-launch
and single-maintainer.

**Long-term infra target (revisit later — do not build now):** the user's
other projects run on Google Cloud with Docker containers + Kubernetes,
managed by a dedicated DevOps team, with frontend and backend consolidated
under one domain. Open Universe should move to that same model once the
project has real usage/second service/DevOps bandwidth to support it. Railway
is a deliberate stepping stone, not the final target — **revisit this
decision** when either (a) a second backend service is created, or (b) the
project gets a custom domain.

**Deploy gotcha (Phase H, discovered 2026-07-29):** Railway injects its own
`PORT` env var into the container at runtime (`8080` observed) — it does
**not** show up in `railway variable list` since it's a reserved
platform-managed variable, not a stored service variable. The Dockerfile's
`EXPOSE 4175` is documentation only and has no effect on routing. A
`railway domain`/`domain update` call's `--port` must match whatever
`process.env.PORT` actually resolves to at runtime, not the Dockerfile's
`EXPOSE` value, or every request 502s ("Application failed to respond")
even though the container is healthy and logs show a clean startup.
`main.ts` binds via `app.listen(process.env.PORT ?? 4175, '0.0.0.0')` — the
explicit `0.0.0.0` host also matters, an unqualified `.listen(port)` risks
binding IPv6-only in some container network setups.

## Auth: JWT bearer token (not cookies)

Frontend (`*.vercel.app`) and backend (`*.railway.app`) are unrelated
registrable domains with no shared custom domain yet, so `SameSite=None`
cookies are fragile against third-party-cookie blocking (already enforced by
Safari/Firefox, coming to Chrome). `Authorization: Bearer <jwt>` sidesteps
that entirely. Revisit if/when both services share a custom domain — cookies
become viable and arguably preferable (httpOnly, no client-side token
storage) at that point.

## Monorepo tooling: npm workspaces

Chosen over Turborepo/Nx — repo already uses npm, and two-to-three packages
(`apps/web`, `apps/api`, `packages/shared`) don't justify a build-orchestration
tool yet. Revisit if the package count or build-graph complexity grows.

## Shared code: `packages/shared`, enums-first

Only `src/types/enums.ts` moves into `packages/shared` initially (the
`as const` + derived-union convention already used throughout the frontend).
Plain interfaces in `src/types.ts` migrate later, on demand, once the backend
needs to share a concrete shape (e.g. a DTO) rather than speculatively moving
everything now.

## `packages/shared` publishing: public npmjs.org package, `apps/api` excluded from npm workspaces

`apps/api` (Bun-managed) was removed from the root npm `workspaces` glob after
`bun install` inside it walked up, found the root `workspaces` field, and
tried to claim/reinstall the whole monorepo via Bun — corrupting the
npm-managed `node_modules` for `apps/web`/`packages/shared` in the process
(see the Phase D commit). Two package managers can't both own the same
workspace root, so `apps/api` is now a fully standalone Bun project (own
`bun.lock`, own `node_modules`), which means it can't resolve
`@hayverse/shared` via the npm workspace symlink the way `apps/web` does.

Fix: `packages/shared` is published for real as `@hayverse/shared` on
npmjs.org (public — `npm-universe`/`open-universe` org names were both
already taken; `hayverse` matches the actual in-app brand name and was
available). `apps/web` still resolves it via the npm workspace symlink
(unaffected, zero publish lag — workspace links always win over the
registry); `apps/api` installs the real published version via `bun add`.

**Revisit later:** move this to GitHub Packages (private, ties into the repo
we already use, no separate npmjs.org login) or otherwise make it private,
once it's worth the setup cost — public was the pragmatic choice for now
since the package is only enum value lists, nothing sensitive.

**Build-artifact gotcha (discovered 2026-07-29, breaks on any registry
change):** publishing a real package means `package.json`'s `main` points at
`dist/enums.js`, not the TS source — but `dist/` is gitignored (never
committed) and nothing in `apps/web`'s build chain builds it. Locally this is
invisible (whoever ran `npm run build` in `packages/shared` once has a stale
but present `dist/` sitting on disk forever), but a fresh clone (any CI, a
new contributor, Vercel's build) gets a workspace symlink to a directory with
no `dist/` and fails with `Module not found: Can't resolve '@hayverse/shared'`.
Same issue independently hit `packages/api-client` the same day (see the Phase
H/I commit history). Fixed with a root `package.json` `postinstall` script
(`npm run build -w packages/shared -w packages/api-client`) — relies on
Vercel's monorepo support running `npm install` from the repo root even when
Root Directory is set to `apps/web`, which is what actually triggers the
rebuild on deploy. **If `packages/shared`/`packages/api-client` ever move off
npm (GitHub Packages, or back to source-only like `@hayverse/shared`
originally was) or off root-level `npm install`/postinstall (e.g. a
build-orchestration tool per the "Monorepo tooling" entry above), re-check
that whatever replaces this still guarantees `dist/` exists before `apps/web`
builds — don't just drop the postinstall script without replacing what it
does.**

## Inter-service client packages: adopted early (reversed)

Originally deferred until a second backend service existed — the
`@finbackoffice/{service}-client` pattern (a typed client package per backend
service, imported by every consumer) solves a multi-service problem this
project didn't have yet. Reversed: the user wants `apps/web` to consume
`apps/api` through a typed, published client rather than hand-written fetch
calls even with just one service, plus it gives a natural place to hang
generated types off the Swagger/OpenAPI spec. Published as
`@hayverse/api-client` (same public-npmjs.org setup as `@hayverse/shared`).

## Observability: OpenTelemetry from day one

Tracing wired in at initial NestJS scaffold time, not bolted on later —
cheap to add early, expensive to retrofit once handlers multiply.

## Deferred until a second service exists

Explicitly not building these yet — revisit when service count > 1:

- `-client` package convention (see above)
- Shared message bus / event-driven inter-service communication
- Per-service CI auto-publish pipelines
- Shared lint config package (oxlint or otherwise)

## Data model choices

- Scene graphs stored as a **`jsonb` column** (verbatim shape of the existing
  in-memory scene graph), not normalized node/edge tables — avoids a costly
  up-front schema design for a shape that's still actively evolving.
- `TeamMember` collapses into `User` (`side`/`role` columns) — today's app
  only ever has one `TeamMember` per `CurrentUser`, so a separate table buys
  nothing yet.
- No migration path for existing localStorage-based accounts — pre-launch
  project, clean start is simpler than writing one-time migration code for
  data that doesn't need to survive.

## Scene ownership/sharing: project + team membership, not per-user-private (planned, not built)

Decided 2026-07-29, **not yet implemented** — record only, wait for the user
to say go before building any of this.

When `AuthModule`/`ScenesModule` ownership work starts, scene visibility
will **not** be simple "each user only sees scenes they personally created."
The user's stated next step after auth: each user can add teammates to their
graph/project ("group of scenes") so others can collaborate on the same
project — a shared-workspace model, not per-user isolation, and not a fully
public shared pool either (today's pre-auth MVP state, where every scene is
visible/editable by anyone).

**Implications for the schema/access-control work this supersedes:**

- A **Project** entity (grouping scenes) needs to exist — today's schema has
  no such grouping; `scenes` is a flat list.
- **Project membership** (users↔projects, many-to-many, likely with a role —
  owner vs. collaborator) grants access, not row-level `owner_id` alone.
- `scenes` needs a `project_id`; access control becomes "is the current user
  a member of this scene's project," not "did this user create this scene."
- The already-planned tightening of `scenes.owner_id`/`media_assets.owner_id`
  back to `NOT NULL` (see `scene.entity.ts`'s comment, and the "Data model
  choices" entry above) is still necessary but **not sufficient alone** once
  teammates need shared access to scenes they didn't personally create.
- Directly complementary to `CollaborationModule` (Phase G step 7 in
  `backend-bootstrap.md` — live multi-user editing via Yjs): project
  membership decides _who can access_ a scene, `CollaborationModule` decides
  what happens when multiple members edit it _at the same time_. Worth
  building/designing these together rather than sequentially in isolation.

**Not yet decided, resolve when this work actually starts:** the invite
flow (add-by-username? by link? approval required?), role granularity
(owner/collaborator, or finer), and whether a project can have zero members
besides its owner (i.e. is "personal, unshared" just a project with one
member, or a distinct case).

## Media storage: Cloudflare R2

S3-compatible, chosen for cost and simplicity. MVP uploads relay through the
backend rather than using presigned URLs — presigned uploads are a later
optimization once upload volume/latency actually matters.

## Real-time collaborative editing: Yjs + Socket.IO + Redis adapter

The user wants team members to live-edit the same scene graph together
(Figma-style multiplayer), not just poll/refresh. **Redis alone is not
sufficient for this** — Redis pub/sub only fans WebSocket events out across
multiple server instances; it does nothing to resolve two people editing the
same node at the same time. Without a merge layer, concurrent edits either
silently overwrite each other (last-write-wins) or require a hand-rolled
operational-transform system, which is a large, error-prone undertaking to
build from scratch.

**Chosen approach:**

- **Yjs** — a CRDT (conflict-free replicated data type) library. Concurrent
  edits from multiple clients merge automatically without central locking
  or manual conflict resolution.
- **NestJS WebSocket Gateway (Socket.IO)** — `@nestjs/websockets` +
  `@nestjs/platform-socket.io`, one "room" per scene, relays Yjs sync
  messages between connected clients.
- **`@socket.io/redis-adapter`** — this is where Redis actually earns its
  keep here: once the API runs on more than one instance, Socket.IO needs
  Redis pub/sub to fan a message from a client on instance A out to a
  client connected to instance B. Single-instance MVP doesn't strictly need
  it, but it's cheap to wire in from the start since Redis is already
  provisioned for BullMQ.
- **`y-protocols`** (awareness) — cursor/presence indicators (who's looking
  at/editing what), same mechanism most Yjs-based collab tools use.

**Data model impact (open design point, not fully resolved):** for edits to
merge at node/edge granularity, the scene graph likely needs to be
represented as a Yjs document (nodes/edges as `Y.Map`/`Y.Array` entries)
rather than an opaque blob. The `scenes.graph jsonb` column stays as the
**persisted snapshot** — the backend periodically encodes the live Yjs
document state and writes it there (and on last-client-disconnect), so
reads/exports/version history still work against plain JSON. Work out the
exact snapshot cadence and Yjs-doc-to-jsonb mapping when `CollaborationModule`
is actually built (see `backend-bootstrap.md` Phase G).

**Packages needed** (add to Phase D/G in the runbook):
`yjs`, `y-protocols`, `@nestjs/websockets`, `@nestjs/platform-socket.io`,
`socket.io`, `@socket.io/redis-adapter`.

## AI job queue: Redis + BullMQ, from the start

The long-running Higgsfield/Veo generation calls (already externally polled
up to 5 minutes today) are the first BullMQ consumer. Not deferred as
premature — this is already the user's stated stack and the existing
provider calls already need async job handling today, not hypothetically.
Status delivery for MVP is **client polling** `GET /ai/jobs/:id`; no
WebSocket/SSE push yet.

## Entity photos: objects in the array, not a sibling metadata map

Decided 2026-08-17, implemented same pass. `params.photos` on every entity type
went from `string[]` (bare media refs) to `EntityPhoto[]`
(`{ ref, include, caption?, role? }`, see
`apps/web/src/schemas/entities/schemaHelpers.ts`).

The alternative was leaving `photos` alone and keeping metadata in a sibling
`photoMeta: Record<ref, …>` map — cheaper (no migration, no call-site churn),
and ref-keying had precedent (`photoPortId`, `paramsHistory`). Rejected because
nobody uses the app yet, so a one-time data migration is affordable, and the
array form pays back immediately: the JSON output pin needs no photo
projection, `setNodePhotos` needs no orphan-entry pruning, and there's one
place to look for anything photo-related.

`include` is written explicitly (rather than optional-means-included) so reads
stay a plain `photos.filter((p) => p.include)`. Excluding a photo keeps it out
of the JSON pin and every composed prompt's reference list, but **not** out of
its own `Photo N` output pin — manual wiring is an explicit act.

Migration: `PhotoEntriesWithMetadata1786742400000` rewrites both
`scenes.graph` nodes and `presets.snapshot` in place, idempotently, with an
empty `down()` — same approach as
`MoveGenerationBookkeepingToSiblingField1786204681897`. No read-time fallback
for the bare-string shape exists on the frontend.

## Param visibility: one `PARAM_AUDIENCE` table, not per-consumer denylists

Decided 2026-08-17. An entity node's `params` mixes content with editor
bookkeeping, identity, and generation config, and three consumers each want a
different subset: the JSON output pin (→ every composed prompt), preset
snapshots, and the node's own UI. Each had grown its own hand-rolled rule
(`filledEntityParams`'s diff-vs-defaults, `buildPresetSnapshot`'s
`BOOKKEEPING_KEYS`, and a third strip list that was about to be added for
`photoGen`).

Now declared once in `schemaHelpers.ts`'s `PARAM_AUDIENCE`: unlisted keys are
content and reach everything; a listed key takes away specific audiences. It
is deliberately _not_ a binary local/shared flag — `coverPhotoIndex` is
`{ json: false, preset: true }` because preset cards render
`snap.photos[snap.coverPhotoIndex]` while a prompt has no use for it.

Scoped to entity nodes on purpose: `gemini_*` nodes have no JSON pin (their
params are all generation inputs) and `output_scene` already namespaces its
config under `params.image`/`params.video`. Not expressed via zod `.meta()`
(available on zod 4) because reads would become
`schema.shape[k].meta()?.…` and every entity file would have to re-annotate
keys it inherits from the shared shapes.

## Entity photo prompts: shared composer + per-type visual allowlist

Decided 2026-08-17. The character node's `buildCharacterPrompt` (a hardcoded
Russian sentence template from 2026-07-12) is deleted. An entity that
generates its own photo now goes through the same
`composeScenePrompt`/`composeRawPrompt`/`composeLlmPrompt` path as
`output_scene`, via `entityFromNode` (`core/scenePrompt.ts`), with a
`promptComposition: "raw" | "llm"` switch of its own and an `entity`-flavored
LLM instruction.

What reaches that prompt is a declared per-type allowlist
(`characterVisualKeys` → `ENTITY_VISUAL_KEYS`), not the full JSON payload:
arc/lifetime/coordinates are legitimate scene-prompt content but noise in a
portrait. The old template's real bug was silent omission — it never mentioned
`stylist` or `color` at all — and a declared list makes that visible instead.
Photo entries are reduced to their `caption`/`role` here: the images themselves
go to the model as reference images, so spending prompt tokens on opaque refs
buys nothing.

## Generation requires a login, refused up front

Decided 2026-08-17. Every generation entry point (a node's ▶, «Прогнать граф»,
output_scene's two wands, a character's photo wand) now goes through
`useRequireAuth()` — authenticated, or the login modal opens and nothing runs.

Before, an anonymous user could spend a real provider call and then lose the
result: `MediaModule`'s upload route is JWT-guarded, so the generated bytes
401'd on the way to R2 and the node was left empty with only a toast. The
alternatives were to store anonymous output somewhere (a local blob store was
deliberately removed — see the IndexedDB cutover) or to leave the money-burning
path in place; refusing early is the only option that neither loses work nor
grows a second storage path.

Only _generation_ is gated: free/local nodes (Pinterest pin, text passthrough,
entity selectors) keep resolving reactively without «Прогнать граф», so an
anonymous user can still build and wire a graph.

## Nano Banana params: one slice shape, three hosts

Decided 2026-08-17. The model's params live in three places — the standalone
node's flat params, `output_scene`'s `params.image`, and a character's
`params.photoGen`. The fields themselves were already a single shared component
(`NanoBananaModelFields`), but each host re-listed the same keys for its
defaults and each call site re-listed them again when building the request.

Now `geminiNanoBanana.schema.ts` exports `nanoBananaSliceSchema` /
`nanoBananaSliceDefaults` (the full schema minus `prompt`, which every host
sources differently) and `core/api/gemini/dto.ts` exports
`nanoBananaRequestFromSlice(slice, { prompt, imageUrls, seed })`. Adding a Nano
Banana param is now: the schema, the shared field component, the request mapper,
and the backend's `NanoBananaOptions` — the hosts inherit it.

`promptComposition` also became one control everywhere: the same `Switch` on
output_scene and on a character, defaulting to off (`"raw"`) so an unset value
never spends a text-model call. `composeScenePrompt` therefore treats anything
other than an explicit `"llm"` as raw.
