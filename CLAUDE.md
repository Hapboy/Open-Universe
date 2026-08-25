# CLAUDE.md

Проектный контекст для Claude Code (монорепо). Подробности — в
[docs/DESIGN.md](docs/DESIGN.md) (концепция, каталог нод, план AI-провайдеров),
[docs/DECISIONS.md](docs/DECISIONS.md) (ADR-lite лог решений, «почему») и
[docs/backend-bootstrap.md](docs/backend-bootstrap.md) (поэтажный статус
миграции на реальный бэкенд — сверяйтесь с ним, прежде чем предполагать, что
фаза сделана или не сделана).

## Что это

**Open Universe (Hayverse)** — нодовая среда открытой киновселенной армянского
мира, UGC-платформа «Weavy × Git». Ноды = высокоуровневые объекты (персонаж,
локация, одежда, здание, мебель, искусство, транспорт, музыка, сценарий,
раскадровка); из них собирается сцена → ролик/фильм/игра. Версии канонизируются
git-подобным процессом (форк → PR → модерация → merge в `main`); непринятое
живёт в мультивселенной. Это отдельный проект, **не** связан с PROUN-игрой.

## Соглашения репозитория

- Бренд внутри UI — «Hayverse»; имя репозитория — `open-universe`.
- `apps/web/public/prototypes/` — устаревшие HTML-прототипы, игнорировать.
- Специфика приложений — в `apps/web/CLAUDE.md` и `apps/api/CLAUDE.md`.

## Запуск

Корневые скрипты делегируют в `apps/web`; исключение — `lint` / `format`,
они прогоняются по всему репозиторию. Бэкенд запускается отдельно из
`apps/api/` (`bun run start:dev`) — Bun намеренно не входит в npm workspaces,
поэтому корневые команды его не покрывают.

## Кросс-app конвенции

- `packages/shared` и `packages/api-client` собираются в `dist/` корневым
  `postinstall`-скриптом — `dist/` гитигнорится, на свежем клоне (Vercel)
  нужен реальный build, TS source сам по себе не потребляется.
- Фронтенд и бэкенд общаются только через `@hayverse/api-client`
  (типизированный клиент, растущий вместе со Swagger-поверхностью apps/api),
  не через hand-written fetch — см. «Talking to the backend» в
  `apps/web/CLAUDE.md`.
- Деплой асимметричен: `apps/web` на Vercel — автодеплой на push в `main`;
  `apps/api` на Railway — **нет** автодеплоя, нужен `railway up` из
  `apps/api/` вручную. Vercel CLI-команды (`vercel --prod`, `vercel env add`)
  всегда запускать из корня репозитория, не из `apps/web` — Root Directory в
  Vercel уже настроен на `apps/web`, `cd` туда задваивает путь.
