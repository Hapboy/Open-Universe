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

**React 18 + Vite + TypeScript**, `app/` — корень исходников.

```
app/
├── core/        graph.ts, renderer.ts, services.ts (Pinterest & Higgsfield AI)
├── data/        nodes.ts (NODE_TEMPLATES), presets.ts, scenes.ts
├── store/       AppContext.tsx (React Context, глобальное состояние)
├── ui/          App.tsx, NodeEditor.tsx, inspector/, NodeCard.tsx,
│                Palette.tsx, PlayerPanel.tsx (MiniPlayer only),
│                Topbar.tsx, Modals.tsx, Toast.tsx, game.ts
├── style.css    единый CSS (CSS-переменные: --color-bg-*, --radius-*, ...)
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
- Обновление: `updateNodeParam(nodeId, key, value)` из `AppContext`.
- Pinterest-паттерн (`.pinterest-pins-grid` / `.pinterest-pin-item`) уже в `style.css` — переиспользовать для медиа-сеток.
- CSS-переменные: `--color-bg-primary/secondary/tertiary/card`, `--color-text-primary/secondary/tertiary`, `--color-border`, `--radius-sm/md/lg`.
- Иконки — Tabler Icons (`ti-*`).
- Бренд внутри UI — «Hayverse»; имя репозитория — `open-universe`.
