# Лицензии ассетов

Игра без звука; 3D-сцена рисуется примитивами без внешних текстур. Ассеты ниже — шрифты и карта.

## Шрифты интерфейса — `fonts/` (SIL Open Font License 1.1)

| Файлы | Гарнитура | Автор | Источник |
|---|---|---|---|
| russo-one-*.woff2 | Russo One (кириллица, латиница) | Jovanny Lemonad | https://fonts.google.com/specimen/Russo+One (пакет @fontsource/russo-one) |
| play-*.woff2 | Play 400/700 (кириллица, латиница) | Jonas Hecksher | https://fonts.google.com/specimen/Play (пакет @fontsource/play) |

## Иконки интерфейса

Инлайн-SVG в `src/shared/ui/UiIcon.vue` нарисованы для проекта (CC0), внешние иконки не подключены.

## Карты — `maps/`

`desert-base.tmj` — собственная разработка проекта.

## 3D-модели башен, техники и декора — `models/` (CC0 1.0)

Источники (лицензия CC0 подтверждена на страницах паков 2026-10-22, в архивах есть License.txt):
Kenney Tower Defense Kit 2.1 (https://kenney.nl/assets/tower-defense-kit) и Kenney Car Kit (https://kenney.nl/assets/car-kit), автор Kenney (www.kenney.nl). Исходники не коммитятся (`tools/models/_src/`), сборка — `tools/models/build_models.py` (Blender).

| Файл | Исходные части | Что изменено |
|---|---|---|
| enemy_technical.glb, enemy_tank.glb, enemy_boss.glb | собственные процедурные модели проекта (`tools/models/build_enemies.py`, CC0), внешних деталей нет | — |
| deco_tree.glb, deco_rock.glb | detail-tree-large, detail-rocks-large (Kenney TD) | перекраска, масштаб, decimate |

Quaternius Animated Tanks (CC0, Google Drive) не использован: автоскачивание невозможно (ссылка на странице https://quaternius.com/packs/animatedtanks.html), при желании скачать вручную.

## Оригинальные 3D-модели проекта — `models/` (CC0 1.0)

tower_machinegun.glb, tower_rocket.glb (`tools/models/build_towers.py`), enemy_grunt.glb, enemy_grenadier.glb, enemy_drone.glb, deco_ruin.glb — оригинальные работы проекта, смоделированы скриптами Blender (`tools/models/pehota/*.py`) из примитивов. Лицензия CC0 1.0, внешних ассетов и заимствованных форм нет.
