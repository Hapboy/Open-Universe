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

**React 19 + Vite + TypeScript**, `app/` — корень исходников.

```
app/
├── core/        graph.ts, renderer.ts, services/ (index.ts, pinterest.ts,
│                higgsfield.ts, gemini.ts)
├── data/        nodes.ts (NODE_TEMPLATES), presets.ts, scenes.ts
├── store/       AppProviders.tsx + contexts/ (Graph/Player/User/Toast/Pwa —
│                React Context per concern, глобальное состояние)
├── ui/          App.tsx (+ App.module.css), NodeEditor/, NodeCard/,
│                NodeBrowser/, PlayerPanel/ (MiniPlayer only), Topbar/,
│                Modals/, Toast/, inspector/, game.ts — каждый компонент =
│                папка с колокейтед `Name.module.css`
├── styles/      global.css (CSS-переменные, reset), shared.module.css
│                (общие атомы через `composes`)
├── types.ts     TS-интерфейсы (NodeParams, PinItem, BoardItem, ...)
└── main.tsx     точка входа React DOM
```

- `app/public/prototypes/` — **устаревшие** HTML-прототипы; игнорировать.
- `docs/DESIGN.md` — концепция, план интеграции AI-провайдеров, каталог нод.
- `.claude/launch.json` — конфиг превью (сервер `openuniverse`).

## Запуск / превью

`npm run dev` → `http://localhost:4174/` (Vite dev server).
`npm run build` → `dist/`.

## Ключевые паттерны кода

- Параметры ноды — `params: Record<string, unknown>` (гибко, без смены типов).
- Обновление: `updateNodeParam(nodeId, key, value)` из `GraphContext`.
- Стили — CSS Modules: каждый компонент импортирует свой `Name.module.css`;
  общие переиспользуемые классы — через `composes` из `styles/shared.module.css`,
  не копипастить и не заводить новый глобальный CSS.
- CSS-переменные (в `styles/global.css`): `--color-bg-primary/secondary/tertiary/card`, `--color-text-primary/secondary/tertiary`, `--color-border`, `--radius-sm/md/lg`.
- Иконки — Tabler Icons (`ti-*`).
- Бренд внутри UI — «Hayverse»; имя репозитория — `open-universe`.
