# Backend bootstrap status

The Next.js-only → NestJS+Postgres+Redis migration described by earlier
versions of this file is **complete** — Auth/Users/Scenes/Presets/Pinterest/
Media/Gemini all shipped, the monorepo restructuring (Phases A–I) and the
three-way `CLAUDE.md` split (Phase K) are done. See
[`apps/api/CLAUDE.md`](../apps/api/CLAUDE.md) and
[`apps/web/CLAUDE.md`](../apps/web/CLAUDE.md) for the current architecture —
this file now only tracks what's still genuinely open.

## Open work

### CollaborationModule — not started

Live multi-user graph editing (see `DECISIONS.md`'s "Real-time collaborative
editing" entry — **Redis alone does not solve this**, it only fans WebSocket
events across instances; the actual conflict-free merging comes from Yjs).
Deps (`yjs`, `y-protocols`, `socket.io`, `@nestjs/websockets`,
`@socket.io/redis-adapter`) are already installed in `apps/api` but unused.
Per `apps/api/CLAUDE.md`, intentionally deferred until it ships alongside
project/team modules — don't start this in isolation.

When it's time, build:

- A Socket.IO `Gateway` (`@nestjs/websockets` + `@nestjs/platform-socket.io`),
  one room per `scene.id`, relaying Yjs sync messages between connected
  clients.
- `@socket.io/redis-adapter` wired to the same Redis instance as BullMQ, so
  the gateway works correctly once there's more than one API instance
  (cheap to add now since Redis is already provisioned).
- `y-protocols` awareness for presence/cursor indicators (who's editing
  what).
- A snapshot writer: periodically (and on last-client-disconnect) encode the
  live Yjs document and persist it into the existing `scenes.graph jsonb`
  column, so reads/exports/version history keep working against plain JSON.
- **Open design point, resolve before/while building this module:**
  representing the scene graph as Yjs shared types (`Y.Map`/`Y.Array` per
  node/edge) is what gives node-level conflict-free merging — decide the
  exact Yjs-doc-to-jsonb mapping here rather than guessing; this touches
  `apps/web/src/store/contexts/GraphContext.tsx`'s existing graph shape on
  the frontend too.

### Higgsfield — not ported, may be dropped

`apps/web/app/api/higgsfield/{soul,motion}/route.ts` still hold the provider
key client-side; never migrated into `ai-gateway`. Per `apps/api/CLAUDE.md`
this is deliberate — deprioritized, and may get dropped from the product
rather than migrated. No action needed unless that decision changes.

## Known gaps (out of scope, surface back to the user rather than deciding silently)

- Preview-branch Vercel URLs are not in the backend's CORS allowlist yet.
- Presigned R2 upload URLs are not implemented — uploads relay through the
  backend for MVP (see [[project_r2_presign_after_collaboration]] — ordered
  after CollaborationModule above).
- No WebSocket/SSE push for AI job status — polling only
  (`GET /ai/jobs/:id`).
- No migration path for existing localStorage-based accounts from the
  pre-backend era.
- **Orphaned media garbage collection — not implemented.** Deleting a graph
  node (or a whole scene) today only removes it from `scenes.graph jsonb` /
  the `scenes` table; the `media_assets` row and its R2 object are never
  touched, so uploaded/generated media orphans permanently. `MediaService
.remove()` (`apps/api/src/media/media.service.ts`) already does the actual
  R2 + row deletion correctly — nothing calls it. Don't wire this as a
  synchronous cascade off node/scene delete: the same `media_assets` row can
  be referenced from multiple forks/versions/undo history (git-like
  fork→PR→merge model), so an immediate cascade risks deleting media another
  branch still needs. Instead, build a scheduled **mark-and-sweep GC job**:
  a cron (BullMQ repeatable job, since BullMQ/Redis are already provisioned)
  that queries all `media_assets`, checks per-row whether the ref still
  appears in any scene's `graph jsonb` (any fork/version, not just canonical
  `main`) via a `jsonb` containment/path query — not an incrementally
  maintained refcount, which drifts — and marks unreferenced rows with an
  `orphaned_at` timestamp. Hard-delete (via the existing `MediaService
.remove()`) only after a grace period (e.g. 7 days) past `orphaned_at`, to
  protect against races (mid-edit saves, undo/redo) and give a recovery
  window. Log sweep actions for a while before trusting it unattended.
