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
