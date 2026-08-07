# apps/api — CLAUDE.md

Часть монорепо `open-universe` — см. корневой [../../CLAUDE.md](../../CLAUDE.md)
для общей картины. Решения и их обоснование — `docs/DECISIONS.md` в корне
репозитория; поэтажный статус миграции — `docs/backend-bootstrap.md`.

## Stack

**NestJS + TypeORM + PostgreSQL + Redis, runtime Bun**, hosted on **Railway**
(Docker-based, `Dockerfile FROM oven/bun:1` — Railway's Nixpacks auto-detect
is Node-first and misdetects Bun, don't rely on it). Media in **Cloudflare
R2** via `@aws-sdk/client-s3`. BullMQ (+ `ioredis`) for async AI jobs.
`bcryptjs`, not `bcrypt` — `bcrypt` is a native node-gyp addon and doesn't
run on Bun.

## Modules (`src/*`)

- **`auth`** — JWT bearer (`@nestjs/jwt` + `passport-jwt`), signup/login/me,
  `bcryptjs` password hashing.
- **`users`** — collapsed `User`/`TeamMember` entity from the old
  localStorage-era model.
- **`scenes`** — CRUD on `scenes` + `graph jsonb`, `NarrativeSettings` 1:1.
- **`presets`** — CRUD, backs all 11 entity types (character, location,
  building, clothing, artwork, furniture, music, script, storyboard,
  transport, mise_en_scene). `POST /presets` upserts when the caller passes a
  client-minted `id` (frontend mints preset ids client-side — identity exists
  before the first save).
- **`pinterest`** — OAuth + boards/pins proxy, separate top-level module (not
  under `ai-gateway`) since it predates that module's shape.
- **`media`** — relay-upload (client → backend → R2, no presigned URLs yet),
  `media_assets` metadata rows. `kind: 'uploaded' | 'generated'` — pass
  `'generated'` for AI-output media (`MediaModule.upload()`'s default is
  `'uploaded'`).
- **`ai-gateway`** — currently **Gemini only** (`ai-gateway/gemini/`).
  Sync routes (`text`, `vision`, `imagen`, `nano-banana`, `lyria`) respond
  directly; `veo` is async — returns `202 {jobId}`, processed by
  `AiGatewayProcessor` (BullMQ `WorkerHost`), polled via `ai-gateway/jobs/`
  (`GET /ai/jobs/:id`). Higgsfield **not** ported yet — deliberately
  deprioritized, may get dropped rather than migrated.
- **`health`** — `GET /health`.
- **`config`** — `env.validation.ts`, fail-fast at boot on missing required vars.
- **`database`** — `data-source.ts` + `migrations/` (TypeORM).

**Not built yet:** `CollaborationModule` (Yjs + Socket.IO real-time graph
editing) — deps (`yjs`, `y-protocols`, `socket.io`, `@nestjs/websockets`,
`@socket.io/redis-adapter`) are already installed but unused; this is
intentionally deferred until it ships alongside project/team modules.

## Env vars (`.env.example`)

`DATABASE_URL`, `REDIS_URL`, `R2_ACCOUNT_ID`/`R2_ACCESS_KEY_ID`/
`R2_SECRET_ACCESS_KEY`/`R2_BUCKET_NAME`/`R2_PUBLIC_URL`, `CORS_ORIGINS`
(optional, comma-separated — defaults to localhost:4174 + prod Vercel domain),
`GEMINI_KEY` (optional, Gemini routes 501 if unset), `JWT_SECRET`/
`JWT_EXPIRES_IN` (required, fails fast if unset), `PINTEREST_CLIENT_ID`/
`PINTEREST_CLIENT_SECRET`/`PINTEREST_REDIRECT_URI` (optional, Pinterest
routes 501 if unset), `APP_URL` (Pinterest OAuth callback redirect target,
defaults to localhost:4174).

## Local dev

No local Postgres/Redis setup exists yet — `.env.local`'s `DATABASE_URL`/
`REDIS_URL` point at Railway's live instances. `bun run start:dev` (port
4175), verify with `curl localhost:4175/health`. Migrations:
`bun run migration:generate` / `migration:run` / `migration:revert`.

## Deploy

**No auto-deploy** — `railway up` from `apps/api/` after every change meant
to ship. (Contrast with `apps/web`, which auto-deploys on push to `main`.)

## Architectural rule

A module should be extractable into its own microservice later — never
reach into another module's repository/entities directly, always go through
its exported service.
