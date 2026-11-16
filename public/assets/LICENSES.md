# Лицензии ассетов

Игра без звука; 3D-сцена использует GLB-модели с цветами вершин без внешних текстур. Ниже перечислены шрифты, карты и модели.

## Шрифты интерфейса — `fonts/` (SIL Open Font License 1.1)

| Файлы | Гарнитура | Автор | Источник |
|---|---|---|---|
| russo-one-*.woff2 | Russo One (кириллица, латиница) | Jovanny Lemonad | https://fonts.google.com/specimen/Russo+One (пакет @fontsource/russo-one) |
| play-*.woff2 | Play 400/700 (кириллица, латиница) | Jonas Hecksher | https://fonts.google.com/specimen/Play (пакет @fontsource/play) |

## Иконки интерфейса

Инлайн-SVG в `src/shared/ui/UiIcon.vue` нарисованы для проекта (CC0), внешние иконки не подключены.

## Карты — `maps/`

`desert-base.tmj`, `stone-pass.tmj` — собственная разработка проекта.

## 3D-модели башен, техники и декора — `models/` (CC0 1.0)

Источник используемых внешних деталей — Kenney Tower Defense Kit 2.1 (https://kenney.nl/assets/tower-defense-kit), автор Kenney (www.kenney.nl). Лицензия CC0 подтверждена 2026-10-22, в исходном паке есть `License.txt`. Исходники не коммитятся (`tools/models/_src/tower-defense-kit/`), сборка декора — `tools/models/build_models.py` (Blender). Kenney Car Kit в актуальной генерации не используется.

| Файл | Исходные части | Что изменено |
|---|---|---|
| enemy_technical.glb, enemy_tank.glb, enemy_boss.glb | собственные процедурные модели проекта (`tools/models/build_enemies.py`, CC0), внешних деталей нет | — |
| deco_tree.glb, deco_rock.glb | detail-tree-large, detail-rocks-large (Kenney TD) | перекраска, масштаб, decimate |

## Оригинальные 3D-модели проекта — `models/` (CC0 1.0)

tower_machinegun.glb, tower_rocket.glb (`tools/models/build_towers.py`), ruins_machinegun.glb, ruins_rocket.glb (`tools/models/build_ruins.py`), tower_flamethrower.glb (`tools/models/build_flamethrower.py`), enemy_grunt.glb, enemy_grenadier.glb, enemy_drone.glb, enemy_runner.glb, enemy_shield.glb, deco_ruin.glb (`tools/models/pehota/*.py`) — оригинальные работы проекта из примитивов Blender. Лицензия CC0 1.0, внешних ассетов и заимствованных форм нет. Огнемёт, бегун и щитоносец подготовлены для M14; наличие файлов не означает подключения игровой механики.

## PWA-иконки — `public/icons/` (CC0 1.0)

icon-192.png, icon-512.png, icon-maskable-512.png, apple-touch-icon.png — оригинальный вымышленный силуэт башни, SVG в `tools/pwa/build-icons.mjs`. Внешних ассетов нет.
