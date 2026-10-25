// Генератор карты «Каменный перевал» (Tiled JSON). Запуск: node tools/maps/build-stone-pass.mjs [--check]
import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const SIZE = 26
const TILE = 32 // px на клетку в polyline
const OUT = resolve(dirname(fileURLToPath(import.meta.url)), '../../public/assets/maps/stone-pass.tmj')

// Путь: центры клеток (x, y), штаб в правом нижнем углу.
const PATH = [
  [0, 2.5], [21.5, 2.5], [21.5, 8.5], [4.5, 8.5], [4.5, 12.5], [21.5, 12.5], [21.5, 23.5], [25, 23.5],
]

// Клетки под башни: строка -> список x; плюс одиночные [x, y].
const ROWS = {
  10: [7, 9, 11, 13, 15, 17, 19],
  11: [8, 12, 16],
  4: [3, 6, 9, 12, 15, 18],
  6: [5, 8, 11, 14, 17],
  5: [5, 10, 15],
  1: [4, 8, 12, 16],
  14: [6, 9, 12, 15, 18],
}
const SINGLE = [[23, 4], [23, 6], [19, 15], [19, 18], [19, 21], [23, 15], [23, 18], [23, 21], [22, 25], [24, 25]]
const CELLS = [...Object.entries(ROWS).flatMap(([y, xs]) => xs.map((x) => [x, Number(y)])), ...SINGLE]
const EXPECTED_CELLS = 43
const MAX_DIST = 4

function fail(msg) {
  console.error('Ошибка карты: ' + msg)
  process.exit(1)
}

// Расстояние от точки до отрезка пути (пути строго по осям).
function distToSegment(px, py, [ax, ay], [bx, by]) {
  const cx = Math.min(Math.max(px, Math.min(ax, bx)), Math.max(ax, bx))
  const cy = Math.min(Math.max(py, Math.min(ay, by)), Math.max(ay, by))
  return Math.hypot(px - cx, py - cy)
}

function validate() {
  const segs = PATH.slice(1).map((p, i) => [PATH[i], p])
  for (const [a, b] of segs) {
    if (a[0] === b[0] && a[1] === b[1]) fail('соседние точки пути совпадают')
    if (a[0] !== b[0] && a[1] !== b[1]) fail(`сегмент ${a} -> ${b} не по осям`)
  }
  const last = PATH[PATH.length - 1]
  if (last[0] < SIZE - 2 || last[1] < SIZE / 2) fail('штаб не в правом нижнем углу')
  if (CELLS.length !== EXPECTED_CELLS) fail(`клеток ${CELLS.length}, ожидалось ${EXPECTED_CELLS}`)
  const seen = new Set()
  for (const [x, y] of CELLS) {
    if (x < 0 || y < 0 || x >= SIZE || y >= SIZE) fail(`клетка (${x}, ${y}) вне карты`)
    if (seen.has(`${x},${y}`)) fail(`клетка (${x}, ${y}) повторяется`)
    seen.add(`${x},${y}`)
    const d = Math.min(...segs.map(([a, b]) => distToSegment(x + 0.5, y + 0.5, a, b)))
    if (d <= 0.5) fail(`клетка (${x}, ${y}) лежит на дороге`)
    if (d > MAX_DIST) fail(`клетка (${x}, ${y}) дальше ${MAX_DIST} от пути (${d.toFixed(2)})`)
  }
}

function layer(id, name, data) {
  return { id, name, type: 'tilelayer', x: 0, y: 0, width: SIZE, height: SIZE, opacity: 1, visible: true, data }
}

function build() {
  const buildable = new Array(SIZE * SIZE).fill(0)
  for (const [x, y] of CELLS) buildable[y * SIZE + x] = 2
  const [sx, sy] = PATH[0]
  return {
    type: 'map', version: '1.10', tiledversion: '1.10.2', orientation: 'isometric', renderorder: 'right-down',
    infinite: false, width: SIZE, height: SIZE, tilewidth: 64, tileheight: 32, compressionlevel: -1,
    nextlayerid: 5, nextobjectid: 2,
    properties: [{ name: 'theme', type: 'string', value: 'canyon' }],
    tilesets: [{
      firstgid: 1, name: 'placeholder', image: '../tiles/placeholder.png', imagewidth: 128, imageheight: 32,
      tilewidth: 64, tileheight: 32, tilecount: 2, columns: 2, margin: 0, spacing: 0,
    }],
    layers: [
      layer(1, 'ground', new Array(SIZE * SIZE).fill(1)),
      layer(2, 'decor', new Array(SIZE * SIZE).fill(0)),
      layer(3, 'buildable', buildable),
      {
        id: 4, name: 'objects', type: 'objectgroup', draworder: 'topdown', x: 0, y: 0, opacity: 1, visible: true,
        objects: [{
          id: 1, name: 'path', type: '', x: sx * TILE, y: sy * TILE, width: 0, height: 0, rotation: 0, visible: true,
          polyline: PATH.map(([x, y]) => ({ x: (x - sx) * TILE, y: (y - sy) * TILE })),
        }],
      },
    ],
  }
}

validate()
const text = JSON.stringify(build(), null, 1) + '\n'
if (process.argv.includes('--check')) {
  if (readFileSync(OUT, 'utf8') !== text) fail('stone-pass.tmj не совпадает с результатом скрипта')
  console.log('stone-pass.tmj актуален')
} else {
  writeFileSync(OUT, text)
  console.log('Записано ' + OUT)
}
