# Backend bootstrap runbook

**Hand this file to a fresh Claude Code session** with an instruction like
"read docs/backend-bootstrap.md and execute it." That session does the actual
work — moving folders, scaffolding NestJS, writing modules. This file was
written against the repo state as of 2026-07-27 (Next.js 16.2.11 / React
19.2.7, plain single-app repo, no `apps/` split yet). **If the repo has
drifted from what's described here — different paths, different deps, a
partial migration already in progress — stop and reconcile with the user
before guessing.**

See [`docs/DECISIONS.md`](DECISIONS.md) for the _why_ behind every choice
below — this file only covers the _what/how_. Do not re-litigate decisions
already logged there while executing this runbook.

## Goal & context

Open Universe is a single Next.js 16 (App Router) + React 19 app deployed to
Vercel at `https://open-universe.vercel.app` (no custom domain). Everything
runs client-side today: Gemini/Higgsfield/Pinterest AI calls go through 11
thin `app/api/*/route.ts` handlers holding the provider keys, and all app
state (scene graphs, presets, narrative settings, a localStorage-backed
signup/login) persists to `localStorage`/IndexedDB in the browser — there is
no database or multi-device backend.

This runbook introduces a real backend: **NestJS + PostgreSQL (TypeORM) +
Redis**, runtime **Bun**, hosted on **Railway** to start (see
`DECISIONS.md` for the long-term Docker/Kubernetes/GCP target this is a
deliberate stepping stone toward). Media moves to **Cloudflare R2**.

## Target end-state layout

```
open-universe/
├── apps/
│   ├── web/          (current app/ + src/ + public/ + next.config.ts, moved verbatim)
│   └── api/           (new NestJS project, Bun runtime)
├── packages/
│   └── shared/        (src/types/enums.ts moved here)
├── docs/
├── package.json        (workspaces: ["apps/*", "packages/*"])
├── tsconfig.base.json
```

Today's actual paths are `app/` and `src/` at the **repo root** — every
reference to `apps/web/...` below is the _target_ path, valid only after
Phase B has run.

## Phase A — Repo hygiene

Before touching structure, confirm the following are already gitignored/
untracked (don't delete anything until `git status --short` confirms it has
no effect on tracked files):

- Root `*.png` screenshots
- `.playwright-mcp/`
- `tsconfig.tsbuildinfo`

```
git status --short          # note current state
rm -f *.png tsconfig.tsbuildinfo
rm -rf .playwright-mcp
git status --short          # confirm identical output — nothing tracked changed
```

If `git status --short` differs before/after, stop — something was tracked
that shouldn't have been assumed disposable.

## Phase B — Monorepo restructuring

```
mkdir -p apps/web apps/api packages/shared/src

git mv app apps/web/app
git mv src apps/web/src
git mv public apps/web/public
git mv next.config.ts apps/web/next.config.ts
git mv tsconfig.json apps/web/tsconfig.json

git mv apps/web/src/types/enums.ts packages/shared/src/enums.ts
```

Update `apps/web/src` imports referencing `types/enums` to import from
`@open-universe/shared` instead (grep for `from '.*types/enums'` /
`from '@/types/enums'` across `apps/web/src`).

Create:

- Root `package.json` — `"workspaces": ["apps/*", "packages/*"]`, move the
  existing root scripts (`dev`, `build`, `typecheck`, `lint`, `format`,
  `knip`) to delegate via `-w apps/web` / run at each workspace as
  appropriate; keep `husky`/`lint-staged`/`prettier`/`eslint`/`knip` as root
  devDependencies (shared tooling), move `next`/`react`/`react-dom`/
  `@google/genai`/`@xyflow/react`/`classnames`/`globe.gl`/`three` and their
  `@types/*` into `apps/web/package.json`.
- `tsconfig.base.json` at root (`compilerOptions` shared baseline: `strict`,
  `target`, `module` settings copied from the current root `tsconfig.json`).
- `apps/web/tsconfig.json` — `extends: "../../tsconfig.base.json"`, keeps
  Next-specific options (`jsx`, `plugins`, path aliases).
- `packages/shared/package.json` — `"name": "@open-universe/shared"`,
  `"main": "src/enums.ts"` (consumed as source via `transpilePackages`, no
  separate build step needed while it's this small).
- `packages/shared/tsconfig.json` — extends the base config.
- Update root `eslint.config.js` and `knip.json` (or create `knip.json` if
  config currently lives inline in `package.json`) to cover all three
  workspaces.
- `apps/web/next.config.ts` — add `transpilePackages: ["@open-universe/shared"]`.

**Verify:**

```
npm install
npm run build -w apps/web
npm run dev -w apps/web       # confirm unchanged app serves at :4174
```

## Phase C — Vercel re-point

Manual dashboard step (not automatable from here): in the Vercel project
settings, set **Root Directory** to `apps/web`. Trigger a redeploy and
confirm production is unchanged before proceeding — this is a hard gate,
don't move to Phase D until a production deploy from the new path succeeds.

## Phase D — NestJS scaffold (Bun runtime)

```
cd apps/api
bunx @nestjs/cli new . --package-manager bun --skip-git
bun add @nestjs/config @nestjs/typeorm typeorm pg @nestjs/jwt passport-jwt bcryptjs @nestjs/bullmq bullmq ioredis
bun add @nestjs/websockets @nestjs/platform-socket.io socket.io @socket.io/redis-adapter yjs y-protocols
bun add -d @types/passport-jwt @types/bcryptjs
```

**Note:** `nest new --package-manager bun` works today but Bun support in
the Nest CLI is community-driven, not officially blessed (see
`nestjs/nest#13881`/`#15764`) — if a Nest CLI upgrade breaks the Bun flag,
fall back to `npm create`-ing the scaffold once and swapping the lockfile/
scripts to Bun by hand. Use **`bcryptjs`**, not `bcrypt` — `bcrypt` is a
native node-gyp-compiled addon and does not run on Bun (see
`DECISIONS.md`). Keep `ioredis` for BullMQ rather than Bun's newer built-in
Redis client — `ioredis` is BullMQ's most battle-tested adapter.

Add:

- `ConfigModule.forRoot()` with env validation (Joi or a hand-written schema
  check at bootstrap — fail fast on missing required vars).
- `GET /health` endpoint returning `{ status: "ok" }`.
- A `Dockerfile` for Railway:
    ```dockerfile
    FROM oven/bun:1
    WORKDIR /app
    COPY . .
    RUN bun install --frozen-lockfile
    RUN bun run build
    EXPOSE 4175
    CMD ["bun", "run", "start:prod"]
    ```
    This exists specifically because Railway's Nixpacks auto-detection is
    Node-first and may misdetect a Bun project (see `DECISIONS.md`) —
    don't skip this and rely on auto-detect.

**Verify:** `bun run start:dev` locally, then `curl localhost:4175/health`.

## Phase E — Provision Postgres + Redis on Railway

Add Postgres and Redis plugins to the Railway project. Copy connection
strings into `apps/api/.env.local` (`DATABASE_URL`, `REDIS_URL`). Run the
first TypeORM migration once Phase F's entities exist.

## Phase F — Database schema

One TypeORM entity per table (all in `apps/api/src/**/*.entity.ts`):

- **`users`** — `id`, `name`, `password_hash`, `char_name`, `side`, `role`,
  `timeline_duration_seconds` (collapses today's `TeamMember` into `User`,
  per `DECISIONS.md`).
- **`scenes`** — `id`, `owner_id`, `title`, `graph jsonb` (verbatim copy of
  the existing in-memory scene graph shape — see `GraphContext.tsx` for the
  source of truth).
- **`narrative_settings`** — `scene_id` (1:1 with `scenes`), `conflict_type`,
  `conflict_target`, `story_phase`, `tension_level`, `pacing`,
  `lore_revelations text[]`, `curve_type`.
- **`presets`** — `id`, `entity_type`, `owner_id` (nullable — null means
  built-in/global preset), `name`, `snapshot jsonb`.
- **`media_assets`** — `id`, `owner_id`, `kind` (`uploaded`|`generated`),
  `storage_key`, `mime_type`, `size_bytes`.
- **`ai_jobs`** — `id`, `owner_id`, `provider`, `kind`, `status`,
  `result jsonb`, `error`.

Run the initial migration against Railway's Postgres.

## Phase G — Build NestJS modules, in order

Verify each with a `curl` round-trip before starting the next:

1. **`AuthModule`** — `POST /auth/signup`, `POST /auth/login`,
   `POST /auth/logout` (stateless — client just drops the token),
   `GET /auth/me` (JWT-guarded). `bcryptjs` password hashing (not `bcrypt`
   — see the Phase D note above). Response envelope
   mirrors `UserContext.tsx`'s `AuthResult` shape but drops the
   one-account-per-browser rule (that was a localStorage-era constraint).
2. **`UsersModule`** — the collapsed `User`/`TeamMember` entity, CRUD as
   needed by the frontend's profile UI.
3. **`ScenesModule`** — CRUD on `scenes` + the `graph jsonb` column;
   `NarrativeSettings` as a 1:1 relation.
4. **`PresetsModule`** — CRUD, seeded from a migrated copy of the existing
   `ENTITY_PRESET_SEEDS` data.
5. **`AiGatewayModule`** — submodules `gemini/`, `higgsfield/`, `pinterest/`,
   `jobs/`. Route table mirrors the 11 existing `app/api/*/route.ts`
   handlers 1:1:
    - `POST /ai/gemini/text`, `.../vision`, `.../imagen`, `.../nano-banana`,
      `.../veo` (→ BullMQ job), `.../lyria`, `GET .../models`
    - `POST /ai/higgsfield/soul`, `.../motion` (both → BullMQ jobs)
    - `GET /ai/pinterest/boards`, `.../boards/:id/pins`

    Service logic ports near-verbatim from
    `apps/web/src/core/services/{gemini,higgsfield,pinterest}.ts`.
    `GET /ai/jobs/:id` is the polling status endpoint for queued jobs.

6. **`MediaModule`** — R2 client, a relay-upload endpoint (client → backend
   → R2, no presigned URLs yet), `media_assets` metadata rows. New refs use
   an `s3:<uuid>` prefix designed to slot into
   `apps/web/src/core/blobStore.ts`'s existing `idb:`/`gen:` prefix
   convention — don't invent a different scheme.
7. **`CollaborationModule`** — live multi-user graph editing (see
   `DECISIONS.md`'s "Real-time collaborative editing" entry — **Redis alone
   does not solve this**, it only fans WebSocket events across instances;
   the actual conflict-free merging comes from Yjs). Build:
    - A Socket.IO `Gateway` (`@nestjs/websockets` +
      `@nestjs/platform-socket.io`), one room per `scene.id`, relaying Yjs
      sync messages between connected clients.
    - `@socket.io/redis-adapter` wired to the same Redis instance as BullMQ,
      so the gateway works correctly once there's more than one API
      instance (cheap to add now since Redis is already provisioned).
    - `y-protocols` awareness for presence/cursor indicators (who's editing
      what).
    - A snapshot writer: periodically (and on last-client-disconnect)
      encode the live Yjs document and persist it into the existing
      `scenes.graph jsonb` column, so reads/exports/version history keep
      working against plain JSON.
    - **Open design point, resolve before/while building this module:**
      representing the scene graph as Yjs shared types (`Y.Map`/`Y.Array`
      per node/edge) is what gives node-level conflict-free merging — decide
      the exact Yjs-doc-to-jsonb mapping here rather than guessing; this
      touches `GraphContext.tsx`'s existing graph shape on the frontend too.

## Phase H — Deploy `apps/api` to Railway

Push the Dockerfile-based service, wire `DATABASE_URL`/`REDIS_URL`/JWT
secret/R2 credentials as Railway env vars. Verify with `curl` against the
live public URL for each module built so far.

## Phase I — Frontend cutover

Cut over provider-by-provider, cheapest/lowest-risk first: **Pinterest →
Gemini → Higgsfield** (last of the three, since it needs the BullMQ
job-polling frontend change) **→ Auth** (last overall — most user-visible).

For each provider:

1. Add `NEXT_PUBLIC_API_URL` to Vercel env vars (once, before the first
   cutover).
2. Add a `getApiUrl()` helper in `apps/web/src/core/api/env.ts`.
3. Edit that provider's `apps/web/src/core/api/*/client.ts` to call the
   absolute backend URL via `getApiUrl()` instead of the local
   `app/api/*/route.ts` handler.
4. Verify a production round-trip against the real Railway-hosted backend.
5. Only then delete the corresponding `app/api/*/route.ts` handler.
6. Remove that provider's API key from Vercel env vars last (after the route
   handler is gone and nothing references it).

## Phase J — CLAUDE.md restructuring

- Trim the root `CLAUDE.md` to a monorepo overview: the layout diagram above,
  links to `docs/DESIGN.md` / `docs/DECISIONS.md` / this file, and any
  conventions that apply across both apps.
- Write `apps/web/CLAUDE.md` — move the current frontend-stack sections
  there verbatim, plus a new "Talking to the backend" section documenting
  the `src/core/api/*` client seam and the JWT bearer auth pattern.
- Write `apps/api/CLAUDE.md` — NestJS/TypeORM/Postgres/Redis/BullMQ stack,
  the module list from Phase G, env var list, local dev instructions
  (`docker-compose up` for local Postgres/Redis, `bun run start:dev`), and
  this rule verbatim: _"a module should be extractable into its own
  microservice later — never reach into another module's repository/entities
  directly, always go through its exported service."_

## Appendix — explicitly out of scope, surface back to the user rather than deciding silently

- Preview-branch Vercel URLs are not in the backend's CORS allowlist yet.
- Presigned R2 upload URLs are not implemented — uploads relay through the
  backend for MVP.
- No WebSocket/SSE push for AI job status — polling only.
- No migration path for existing localStorage-based accounts.

### Rollback notes per phase

- **Phase B**: if `npm install`/build breaks post-restructure, the `git mv`
  history means `git revert` on the restructuring commit cleanly restores
  the flat layout.
- **Phase C**: Vercel's Root Directory change is reversible in the dashboard
  in one step; keep the previous deploy's URL noted before switching.
- **Phase D–H**: all new, isolated to `apps/api` — deleting the Railway
  service and `apps/api/` directory fully reverts with no impact on
  `apps/web`.
- **Phase I**: cut over and roll back one provider at a time — reverting a
  single `client.ts` edit and restoring its `app/api/*/route.ts` handler is
  always independent of the others.

### Critical files this runbook references

- `apps/web/src/core/api/{gemini,higgsfield,pinterest}/client.ts` + sibling
  `dto.ts` — the frontend seam Phase I rewires
- `apps/web/src/core/api/env.ts` — where `getApiUrl()` gets added
- `apps/web/src/core/services/{gemini,higgsfield,pinterest}.ts` — provider
  logic that ports into `AiGatewayModule`
- `packages/shared/src/enums.ts` — moved out of the frontend in Phase B
- `apps/web/src/store/contexts/UserContext.tsx` /
  `AuthContext.tsx` — current auth flow `AuthModule` supersedes
- `apps/web/src/store/contexts/GraphContext.tsx` — source of truth for the
  `scenes.graph jsonb` shape
- `apps/web/src/core/blobStore.ts` — the `idb:`/`gen:` ref-prefix convention
  `MediaModule`'s `s3:` refs must slot into
- `apps/web/next.config.ts`, root `package.json` — need workspace-aware
  config in Phase B/C
