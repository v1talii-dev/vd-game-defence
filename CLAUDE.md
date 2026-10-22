# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

Браузерный tower defense в стиле C&C Generals: Zero Hour. **Полная спецификация — `docs/SPEC.md`, читай её перед любой задачей.** Проект пока на стадии спеки; код начинается с этапа M0 (каркас).

## Процесс (по «Agentic Coding Design Patterns», облегчённый SDD)

- В начале сессии читай `PROGRESS.md`; обновляй его вместе с коммитом после проверенного шага.
- `docs/SPEC.md` — целевые требования. Требования меняются сначала в спеке, потом в коде.
- Крупное изменение — пакет `docs/changes/NNN-имя/tasks.md`: сквозные срезы с проверкой у каждого. Мелкие обратимые правки делай без пакета.
- Один срез за раз; `[x]` ставится только после проверки и DoD. Закрытый пакет переносится в `docs/changes/archive/`.
- Перед новым пакетом задай пользователю уточняющие вопросы по развилкам.

## Стек

Vite + TypeScript (strict) + Vue 3 (UI-оболочка) + Pinia + vue-router (hash) + Three.js (3D-рендер, карты из Tiled). Тесты: Vitest, Playwright. Линт: ESLint + Prettier + `@feature-sliced/steiger`. Node 24 (`.nvmrc`).

## Команды (появятся после M0)

```
npm run dev          # dev-сервер
npm run build
npm run typecheck    # vue-tsc --noEmit
npm run lint         # eslint
npm run lint:fsd     # steiger ./src — информативно, в DoD не входит
npm run test         # vitest run
npx vitest run src/entities/tower -t "rank"     # один тест
npm run e2e                                     # playwright, headless
npm run e2e:headed                              # видимое окно браузера, 1 воркер
npm run e2e:ui                                  # UI-режим Playwright
npx playwright test e2e/build.spec.ts --project=mobile
```

Definition of Done: проходят typecheck, lint и test; при изменениях UI, ввода или сцен — ещё и e2e.

Playwright MCP настроен в `.mcp.json` и работает в видимом окне — пользователь наблюдает за процессом. Используй его для ручных и визуальных проверок на `npm run dev`. Если пользователь хочет смотреть e2e-тесты, запускай `e2e:headed`.

CI: `.github/workflows/ci.yml` — DoD + e2e на каждый PR и push в `main`.

Деплой: GitHub Pages через `.github/workflows/deploy-pages.yml` при push в `main` (репозиторий `v1talii-dev/vd-game-defence`). В Vite должен быть `base: '/vd-game-defence/'`.

## Правила архитектуры

- Feature-Sliced Design: `app → pages → widgets → features → entities → shared`. Импорты только вниз и только через `index.ts` слайса. Импорты между сущностями — только через `@x` (например, `entities/tower/@x/battle.ts`), и пользуется ими только `entities/battle`.
- Симуляция — чистый TS в `entities/*/model` и `shared/lib/sim`: никаких импортов `three`, `vue` и DOM. Фиксированный тик 30 Гц, ГСЧ с seed, полный детерминизм: одинаковые seed и команды дают одинаковое состояние.
- Three.js только рисует состояние симуляции и превращает ввод в команды. Vue получает события симуляции через Pinia и не опрашивает её каждый кадр.
- Числа баланса — в `entities/*/config`, типизированные TS-константы.
- Debug-API `window.__game` существует только в dev- и test-сборках.
- Работа с багом: `__game.exportReplay()` → `tests/replays/bugs/` → падающий тест → исправление.
- Фракции и названия только вымышленные; никаких ассетов и названий из Generals/EA. Ассеты — только CC0/CC-BY, каждый записан в `public/assets/LICENSES.md`.
- Язык интерфейса — только русский, строки лежат в `shared/i18n`.

## Субагенты

В `.claude/agents/`: `sim-engineer`, `render-engineer`, `ui-engineer`, `balance-designer`, `qa-debugger`. Зоны ответственности и правила передачи работы — SPEC §8. Модели заданы в frontmatter агентов: проектные исполнители — `sonnet`; механическая работа (прогон typecheck/lint/test/e2e/build, grep-проверки, скриншоты, правки docs) — агент `runner` на `haiku`; `opus` остаётся за оркестратором (основной сессией); если агент не справляется, оркестратор поднимает модель на ступень (haiku → sonnet → opus). Экономия токенов: короткие промпты и отчёты, без лишних чтений и перепроверок, один прогон e2e на срез. Если изменение затрагивает и симуляцию, и UI, первым фиксируется контракт симуляции (команда или событие + тест).
