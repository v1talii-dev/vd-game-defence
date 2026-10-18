# Лицензии ассетов

Все ассеты — CC0 1.0 (public domain), указание авторов не обязательно, но мы его ведём.

## Звуки — `audio/sfx/`

| Файл | Исходный файл | Пак | Автор | Источник |
|---|---|---|---|---|
| mg-fire.ogg | pxx.ogg | Residue SFX | FacadeGaikan | https://opengameart.org/content/residue-sfx |
| mortar-fire.ogg | boom.ogg | Residue SFX | FacadeGaikan | https://opengameart.org/content/residue-sfx |
| rocket-fire.ogg | thrusterFire_000.ogg | Sci-fi Sounds | Kenney | https://kenney.nl/assets/sci-fi-sounds |
| aa-fire.ogg | laserSmall_001.ogg | Sci-fi Sounds | Kenney | https://kenney.nl/assets/sci-fi-sounds |
| explosion-small.ogg | explosionCrunch_000.ogg | Sci-fi Sounds | Kenney | https://kenney.nl/assets/sci-fi-sounds |
| explosion-medium.ogg | explosionCrunch_002.ogg | Sci-fi Sounds | Kenney | https://kenney.nl/assets/sci-fi-sounds |
| explosion-large.ogg | lowFrequency_explosion_000.ogg | Sci-fi Sounds | Kenney | https://kenney.nl/assets/sci-fi-sounds |
| hit.ogg | impactMetal_light_000.ogg | Impact Sounds | Kenney | https://kenney.nl/assets/impact-sounds |
| build.ogg | impactMetal_heavy_000.ogg | Impact Sounds | Kenney | https://kenney.nl/assets/impact-sounds |
| leak.ogg | impactBell_heavy_000.ogg | Impact Sounds | Kenney | https://kenney.nl/assets/impact-sounds |
| upgrade.ogg | confirmation_001.ogg | Interface Sounds | Kenney | https://kenney.nl/assets/interface-sounds |
| sell.ogg | drop_001.ogg | Interface Sounds | Kenney | https://kenney.nl/assets/interface-sounds |
| error.ogg | error_001.ogg | Interface Sounds | Kenney | https://kenney.nl/assets/interface-sounds |
| rank-up.ogg | maximize_001.ogg | Interface Sounds | Kenney | https://kenney.nl/assets/interface-sounds |
| click.ogg | click1.ogg | UI Audio | Kenney | https://kenney.nl/assets/ui-audio |
| wave-start.ogg | jingles_STEEL00.ogg | Music Jingles | Kenney | https://kenney.nl/assets/music-jingles |
| victory.ogg | jingles_STEEL16.ogg | Music Jingles | Kenney | https://kenney.nl/assets/music-jingles |
| defeat.ogg | jingles_SAX04.ogg | Music Jingles | Kenney | https://kenney.nl/assets/music-jingles |

## Шрифты интерфейса — `fonts/` (SIL Open Font License 1.1)

| Файлы | Гарнитура | Автор | Источник |
|---|---|---|---|
| russo-one-*.woff2 | Russo One (кириллица, латиница) | Jovanny Lemonad | https://fonts.google.com/specimen/Russo+One (пакет @fontsource/russo-one) |
| play-*.woff2 | Play 400/700 (кириллица, латиница) | Jonas Hecksher | https://fonts.google.com/specimen/Play (пакет @fontsource/play) |

## Иконки интерфейса

Инлайн-SVG в `src/shared/ui/UiIcon.vue` нарисованы для проекта (CC0), внешние иконки не подключены.

## Карты — `maps/`

`desert-base.tmj` — собственная разработка проекта.

## Спрайты — `sprites/`

PixVoxel Revised Isometric Wargame Sprites — Tommy Ettinger, CC0: https://opengameart.org/content/pixvoxel-revised-isometric-wargame-sprites

Кадры скопированы скриптом `scripts/copy-sprites.mjs` (4 направления, кадр покоя 0; размер Large, 88×108). Палитра color6 — игрок, color2 — враги.

| Файлы | Юнит PixVoxel |
|---|---|
| machineGun_* | Artillery_P (color6) |
| rocket_* | Artillery_T (color6) |
| mortar_* | Artillery (color6) |
| antiAir_* | Artillery_S (color6) |
| hq_* | Castle (color6) |
| grunt_* | Infantry (color2) |
| grenadier_* | Infantry_P (color2) |
| technical_* | Tank_T (color2) |
| tank_* | Tank (color2) |
| drone_* | Copter_S (color2) |
| boss_* | Tank_P (color2), масштаб 0.95 |
| explode_0..11 | Tank, fiery_explode (color2) |

## Текстуры земли — `terrain/`

Все текстуры — ambientCG, CC0 1.0 (https://docs.ambientcg.com/license/). Исходники 1K JPG уменьшены до 512x512 и пересжаты в JPEG (q0.78). Декор (валуны, кусты, ящики, мешки, бочки, кратеры, колеи) нарисован процедурно кодом проекта (`terrainBake.ts`), сторонних ассетов не использует.

| Файл | Исходный материал | Автор | Источник |
|---|---|---|---|
| sand.jpg | Ground080 | ambientCG | https://ambientcg.com/view?id=Ground080 |
| sand-light.jpg | Ground093C | ambientCG | https://ambientcg.com/view?id=Ground093C |
| sand-dry.jpg | Ground054 | ambientCG | https://ambientcg.com/view?id=Ground054 |
| road.jpg | Ground088 | ambientCG | https://ambientcg.com/view?id=Ground088 |
| rock.jpg | Rock061 | ambientCG | https://ambientcg.com/view?id=Rock061 |

Эффекты (тени, дым, вспышки, виньетка) — процедурные текстуры, генерируются в рантайме (`shared/lib/fx`).
