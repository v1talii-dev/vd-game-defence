# Генерация моделей

Проверенная версия: **Blender 5.2.3 LTS**, build `e13b728c6880`. Node — версия проекта (24). `BLENDER` содержит путь к исполняемому файлу, без аргументов. Runner проверяет версию, входы и каталог вывода до генерации; Python-ошибки останавливают запуск.

## Входы

Только декор `deco_tree`/`deco_rock` использует Kenney Tower Defense Kit (CC0):

- `tools/models/_src/tower-defense-kit/License.txt`;
- `tools/models/_src/tower-defense-kit/Models/GLB format/detail-tree-large.glb`;
- `tools/models/_src/tower-defense-kit/Models/GLB format/detail-rocks-large.glb`.

Пакет: https://kenney.nl/assets/tower-defense-kit. Каталог `_src` не хранится в Git: распакуйте пакет с сохранением этих путей. `car-kit` не нужен — активная техника генерируется из оригинальных примитивов. Остальные башни, техника, пехота, дрон и руины также оригинальные; реестр происхождения — `public/assets/LICENSES.md`.

## Единый запуск

PowerShell, из корня репозитория:

```powershell
$env:BLENDER = 'C:/Program Files/Blender Foundation/Blender 5.2/blender.exe'
npm.cmd run models:build -- --out tmp-shots/models-a
npm.cmd run models:build -- --out tmp-shots/models-b
npm.cmd run models:verify -- --dir tmp-shots/models-a --compare tmp-shots/models-b
```

Путь Blender в примере — настройка локальной машины, runner не привязан к нему. Каждый output должен быть новым или пустым каталогом вне `public`. Runner передаёт `MODELS_OUT_DIR` обоим общим Python-модулям и последовательно запускает:

1. `build_models.py` — дерево и камень из Kenney;
2. `build_towers.py` — пулемётная и ракетная башни;
3. `build_enemies.py` — техничка, танк, босс;
4. `build_ruins.py` — руины двух башен;
5. `build_flamethrower.py` — сохранённая модель M14;
6. `pehota/{enemy_grunt,enemy_grenadier,enemy_drone,deco_ruin,enemy_runner,enemy_shield}.py`.

После всех генераторов запускается единый `verify.mjs` по staging. Ошибка генератора или проверки оставляет staging для диагностики и не меняет `public`. `--compare` сверяет геометрический контракт повторных сборок, а не байтовый GLB (метаданные экспортера могут различаться).

После успешной проверки и визуального просмотра копируйте только проверенные `.glb` из staging в `public/assets/models`; затем прогоните `npm.cmd run models:verify` и локальный DoD. Автоматической публикации нет. M14-модели генерируются и проверяются, но runner не подключает их к игре.

```powershell
npm.cmd run models:test
```

Прямой запуск отдельных старых Python-генераторов сохраняет прежнее поведение (вывод в `public`); для безопасной повторяемой сборки используйте runner выше.
