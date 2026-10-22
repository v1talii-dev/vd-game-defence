# Модели пехоты, дрона и руин (оригинальные)

Файлы: `public/assets/models/{enemy_grunt,enemy_grenadier,enemy_drone,deco_ruin}.glb`.
Генерируются скриптами `bpy` в этой папке из примитивов (боксы, призмы), без внешних ассетов.

## Лицензия (для LICENSES.md)

Оригинальные работы проекта vd-game-defence, смоделированы скриптами (`tools/models/pehota/*.py`).
Лицензия: CC0 1.0. Внешних ассетов и заимствованных форм нет.

## Запуск

```
BLENDER="C:/Program Files/Blender Foundation/Blender 5.2/blender.exe"
"$BLENDER" -b -P enemy_grunt.py      # аналогично enemy_grenadier, enemy_drone, deco_ruin
"$BLENDER" -b -P verify.py           # таблица проверки контракта
"$BLENDER" -b -P preview.py          # tools/models/preview/pehota_{top,side}.png
```
