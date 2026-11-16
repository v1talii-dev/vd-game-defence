# Модели пехоты, дрона и руин (оригинальные)

Файлы: `public/assets/models/{enemy_grunt,enemy_grenadier,enemy_drone,deco_ruin,enemy_runner,enemy_shield}.glb`.
Генерируются скриптами `bpy` в этой папке из примитивов (боксы, призмы), без внешних ассетов.

## Лицензия (для LICENSES.md)

Оригинальные работы проекта vd-game-defence, смоделированы скриптами (`tools/models/pehota/*.py`).
Лицензия: CC0 1.0. Внешних ассетов и заимствованных форм нет.

## Запуск

Полная воспроизводимая сборка всех моделей со staging и единой проверкой описана в [общем README](../README.md). Команды ниже — отдельные генераторы; без `MODELS_OUT_DIR` они пишут в `public/assets/models`.

```
BLENDER="C:/Program Files/Blender Foundation/Blender 5.2/blender.exe"
"$BLENDER" -b -P enemy_grunt.py      # аналогично enemy_grenadier, enemy_drone, deco_ruin
node tools/models/verify.mjs        # единая проверка из корня репозитория
"$BLENDER" -b -P preview.py          # tools/models/preview/pehota_{top,side}.png
```
