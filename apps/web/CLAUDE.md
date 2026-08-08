# apps/web — CLAUDE.md

Часть монорепо `open-universe` — см. корневой [../../CLAUDE.md](../../CLAUDE.md)
для общей картины и `docs/DESIGN.md`/`docs/DECISIONS.md` в корне репозитория
для концепции и лога решений.

## Стек приложения

**React 19 + Next.js (App Router) + TypeScript**. `src/` — корень исходников;
`app/` (Next-конвенция) содержит только роут-файлы (`layout.tsx`, `page.tsx`,
`api/higgsfield/*/route.ts`, `pinterest/callback/`).

```
src/
├── core/
│   ├── api/       env.ts (getApiUrl/getR2PublicUrl), hayverse/ (hayverseApiClient),
│   │               gemini/ pinterest/ higgsfield/ (client.ts + dto.ts per provider),
│   │               pollJob.ts, index.ts
│   ├── auth/      tokenStore.ts (JWT в браузере)
│   ├── services/  higgsfield.ts (провайдер-специфичная логика, ещё не в apps/api)
│   ├── mediaRef.ts         резолвит `s3:<uuid>` медиа-refs в R2-URL (см. ниже);
│   │                        IndexedDB-логика вырезана, старые idb:/gen: refs не резолвятся
│   ├── browserStorage.ts, characterPorts.ts, graph.ts, renderer (см. graph.ts)
├── data/          nodes.ts (NODE_TEMPLATES), presets.ts, scenes.ts, miseEnSceneDiagrams.ts
├── store/         AppProviders.tsx + contexts/ (Graph/Auth/User/Player/Narrative/
│                  Modal/Toast — React Context per concern) + hooks/
├── ui/            App.tsx (+ App.module.css), NodeEditor/, NodeCard/, NodeBrowser/,
│                  Timeline/, MontageMonitor/, WorldMap/, Topbar/, Modals/, Toast/,
│                  components/, hooks/ — каждый компонент = папка с колокейтед
│                  `Name.module.css`
├── styles/        global.css (CSS-переменные, reset; импортируется из
│                  app/layout.tsx), shared.module.css (общие атомы через `composes`)
└── types.ts       TS-интерфейсы (NodeParams, PinItem, BoardItem, ...)

app/
├── layout.tsx     root layout: metadata/viewport, глобальный CSS, StrictMode
├── page.tsx       'use client', рендерит <App /> из src/App.tsx
├── api/higgsfield/*/route.ts   последний провайдер ещё не перенесённый в apps/api
└── pinterest/callback/          OAuth callback (Pinterest уже проксируется через apps/api)
```

- `public/prototypes/` — устаревшие HTML-прототипы; игнорировать.
- Env-переменные — `NEXT_PUBLIC_*` (не `VITE_*`); `src/core/api/env.ts` держит
  их в статичной map, т.к. Next инлайнит только буквальные
  `process.env.NEXT_PUBLIC_X` — динамический `process.env[name]` не работает.

## Запуск / превью

`npm run dev` (из корня или `apps/web`) → `http://localhost:4174/`
(Next.js dev server, Turbopack). `npm run build` → `.next/`; `npm run start`
— прод-сервер локально.

## Ключевые паттерны кода

- Импорты — всегда через `@/*` (→ `src/*`, `tsconfig.json`), не относительные
  `../`/`./`; включая колокейтед `Name.module.css` (`@/ui/.../Name.module.css`,
  не `./Name.module.css`). Кодовая база переведена на это целиком 2026-08-08.
- Параметры ноды — `params: Record<string, unknown>` (гибко, без смены типов).
- Обновление: `updateNodeParam(nodeId, key, value)` из `GraphContext`.
- Стили — CSS Modules: каждый компонент импортирует свой `Name.module.css`;
  общие переиспользуемые классы — через `composes` из `styles/shared.module.css`,
  не копипастить и не заводить новый глобальный CSS.
- CSS-переменные (в `styles/global.css`): `--color-bg-primary/secondary/tertiary/card`, `--color-text-primary/secondary/tertiary`, `--color-border`, `--radius-sm/md/lg`.
- Иконки — Tabler Icons (`ti-*`).
- Бренд внутри UI — «Hayverse»; имя репозитория — `open-universe`.

## Talking to the backend

Бэкенд (`apps/api`, NestJS) — источник истины для сцен и медиа; фронтенд не
хранит их в localStorage/IndexedDB как fallback (см. `docs/backend-bootstrap.md`
Phase I — ошибка сохранения показывает toast, без retry/rollback).

- **Единая точка входа** — `hayverseApiClient` (`src/core/api/hayverse/client.ts`),
  инстанс `@hayverse/api-client`'s `HayverseApiClient`, настроенный на
  `getApiUrl()` (`src/core/api/env.ts`, читает `NEXT_PUBLIC_API_URL`). Вызовы
  к `apps/api` идут только через него — не hand-written `fetch`.
- **Провайдер-клиенты** (`core/api/{gemini,pinterest}/client.ts`) — тонкие
  адаптеры поверх `hayverseApiClient`, тоже не голый fetch. `higgsfield/client.ts`
  — исключение, единственный провайдер ещё не перенесённый в `apps/api`, всё
  ещё бьёт в локальный `app/api/higgsfield/*/route.ts`.
- **Auth** — JWT bearer. Токен живёт в `src/core/auth/tokenStore.ts`
  (`getToken`/`setToken`/`clearToken`, обёртка над `browserStorage.ts`, ключ
  `hv_jwt`). `hayverseApiClient` читает токен через синхронный `getAuthToken`
  callback (не React state — колбэк дергается в момент запроса, не рендера).
  `AuthContext`/`UserContext` — единственные места, которые должны звать
  `setToken`/`clearToken`.
- **Асинхронные AI-джобы** (Veo и т.п.) — `POST` возвращает `202 {jobId}`,
  `src/core/api/pollJob.ts` опрашивает `GET /ai/jobs/:id` до `completed`/`failed`.
  Нет WebSocket/SSE push — только polling.
- **Медиа** — `mediaRef.ts`'s `putBlob`/`putGeneratedBlob` грузят файл через
  `hayverseApiClient.media.upload()` в R2, возвращают `s3:<uuid>` ref;
  `resolveMediaRef`/`resolveMediaRefCached` резолвят такой ref в R2-URL (чистая
  строковая функция, без похода в API). IndexedDB-based `idb:`/`gen:` legacy-
  путь вырезан целиком — любая сцена/пресет со старым таким ref'ом просто
  покажет битую картинку, миграции для них не будет.
