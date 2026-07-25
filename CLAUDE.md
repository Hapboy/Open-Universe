# CLAUDE.md

Проектный контекст для Claude Code. Подробности — в [docs/DESIGN.md](docs/DESIGN.md).

## Что это

**Open Universe (Hayverse)** — нодовая среда открытой киновселенной армянского
мира, UGC-платформа «Weavy × Git». Ноды = высокоуровневые объекты (персонаж,
локация, одежда, здание, мебель, искусство, транспорт, музыка, сценарий,
раскадровка); из них собирается сцена → ролик/фильм/игра. Версии канонизируются
git-подобным процессом (форк → PR → модерация → merge в `main`); непринятое
живёт в мультивселенной. Это отдельный проект, **не** связан с PROUN-игрой.

## Стек приложения

**React 19 + Next.js (App Router) + TypeScript**. `src/` — корень исходников;
`app/` (Next-конвенция) содержит только роут-файлы (`layout.tsx`, `page.tsx`,
позже `api/*/route.ts`) — миграция с Vite ещё не закончена, план — 4 фазы,
сейчас завершена только фаза 1 (шаблон/тулчейн-swap, без реального SSR-safe
хайдрейшна контекстов — см. ниже).

```
src/
├── core/        graph.ts, renderer.ts, services/ (index.ts, pinterest.ts,
│                higgsfield.ts, gemini.ts)
├── data/        nodes.ts (NODE_TEMPLATES), presets.ts, scenes.ts
├── store/       AppProviders.tsx + contexts/ (Graph/Player/User/Toast/Pwa —
│                React Context per concern, глобальное состояние)
├── ui/          App.tsx (+ App.module.css), NodeEditor/, NodeCard/,
│                NodeBrowser/, PlayerPanel/ (MiniPlayer only), Topbar/,
│                Modals/, Toast/, inspector/, game.ts — каждый компонент =
│                папка с колокейтед `Name.module.css`
├── styles/      global.css (CSS-переменные, reset; импортируется из
│                app/layout.tsx), shared.module.css (общие атомы через
│                `composes`)
└── types.ts     TS-интерфейсы (NodeParams, PinItem, BoardItem, ...)

app/
├── layout.tsx   root layout: metadata/viewport, глобальный CSS, StrictMode
└── page.tsx     'use client', рендерит <App /> из src/App.tsx

public/          статика (Next-конвенция): assets/, icon.svg,
                 manifest.webmanifest, sw.js, prototypes/, terms.html
```

- `public/prototypes/` — **устаревшие** HTML-прототипы; игнорировать.
- `docs/DESIGN.md` — концепция, план интеграции AI-провайдеров, каталог нод.
- `.claude/launch.json` — конфиг превью (сервер `openuniverse`).
- Env-переменные — `NEXT_PUBLIC_*` (не `VITE_*`); `src/core/api/env.ts` держит
  их в статичной map, т.к. Next инлайнит только буквальные
  `process.env.NEXT_PUBLIC_X` — динамический `process.env[name]` не работает.

## Запуск / превью

`npm run dev` → `http://localhost:4174/` (Next.js dev server, Turbopack).
`npm run build` → `.next/`; `npm run start` — прод-сервер локально.

## Ключевые паттерны кода

- Параметры ноды — `params: Record<string, unknown>` (гибко, без смены типов).
- Обновление: `updateNodeParam(nodeId, key, value)` из `GraphContext`.
- Стили — CSS Modules: каждый компонент импортирует свой `Name.module.css`;
  общие переиспользуемые классы — через `composes` из `styles/shared.module.css`,
  не копипастить и не заводить новый глобальный CSS.
- CSS-переменные (в `styles/global.css`): `--color-bg-primary/secondary/tertiary/card`, `--color-text-primary/secondary/tertiary`, `--color-border`, `--radius-sm/md/lg`.
- Иконки — Tabler Icons (`ti-*`).
- Бренд внутри UI — «Hayverse»; имя репозитория — `open-universe`.
