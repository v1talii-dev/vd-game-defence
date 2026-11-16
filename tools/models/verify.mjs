// node tools/models/verify.mjs [--dir path] [--compare path] [model.glb ...]
import { readFileSync } from 'node:fs'
import { basename, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { Matrix4, Quaternion, Vector3 } from 'three'

export const LIMITS = {
  tower_machinegun: [1200, 1.15],
  tower_rocket: [1200, 1.15],
  tower_flamethrower: [1200, 1.15],
  ruins_machinegun: [270, 1.15],
  ruins_rocket: [420, 1.15],
  enemy_technical: [1000, 0.95],
  enemy_tank: [1500, 0.95],
  enemy_boss: [2200, 1.5],
  enemy_grunt: [300, 1],
  enemy_grenadier: [300, 1],
  enemy_runner: [300, 1],
  enemy_shield: [300, 1],
  enemy_drone: [600, 1],
  deco_ruin: [80, 1],
  deco_tree: [500, 1],
  deco_rock: [500, 1],
}
const DEFAULT_DIR = fileURLToPath(new URL('../../public/assets/models/', import.meta.url))
export const MUZZLES = { tower_machinegun: [0, 0.78, 0.6], tower_rocket: [0, 1.155, 0.387] }
const round = (v) => Math.round(v * 1e5) / 1e5
const finite = (values, length) =>
  Array.isArray(values) && values.length === length && values.every(Number.isFinite)
function requireValue(ok, message) {
  if (!ok) throw new Error(message)
}

export function readGlb(buffer) {
  requireValue(buffer.length >= 20 && buffer.readUInt32LE(0) === 0x46546c67, 'не GLB')
  requireValue(
    buffer.readUInt32LE(4) === 2 && buffer.readUInt32LE(8) === buffer.length,
    'неверная версия/длина GLB',
  )
  let json, bin
  for (let offset = 12; offset < buffer.length;) {
    requireValue(offset + 8 <= buffer.length, 'обрезан заголовок chunk')
    const length = buffer.readUInt32LE(offset),
      type = buffer.readUInt32LE(offset + 4)
    requireValue(length % 4 === 0 && offset + 8 + length <= buffer.length, 'неверная длина chunk')
    const data = buffer.subarray(offset + 8, offset + 8 + length)
    if (type === 0x4e4f534a) {
      requireValue(!json && offset === 12, 'неверный JSON chunk')
      json = JSON.parse(data.toString())
    } else if (type === 0x004e4942) {
      requireValue(!bin, 'повторный BIN chunk')
      bin = data
    }
    offset += 8 + length
  }
  requireValue(json?.asset?.version === '2.0' && bin, 'нет glTF 2.0/BIN')
  requireValue(
    json.buffers?.length === 1 && !json.buffers[0].uri && json.buffers[0].byteLength <= bin.length,
    'требуется один встроенный buffer',
  )
  return { json, bin }
}

export function inspectGlb(buffer) {
  const { json: j, bin } = readGlb(buffer)
  requireValue(Array.isArray(j.nodes) && Array.isArray(j.meshes), 'нет nodes/meshes')
  const components = {
    5121: [1, 'readUInt8'],
    5123: [2, 'readUInt16LE'],
    5125: [4, 'readUInt32LE'],
    5126: [4, 'readFloatLE'],
  }
  const widths = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4 }
  function accessor(index) {
    const a = j.accessors?.[index],
      view = j.bufferViews?.[a?.bufferView]
    requireValue(a && view && !a.sparse && view.buffer === 0, 'неверный accessor/bufferView')
    const c = components[a.componentType],
      width = widths[a.type]
    requireValue(
      c && width && Number.isInteger(a.count) && a.count > 0,
      'неверный тип/count accessor',
    )
    const stride = view.byteStride ?? c[0] * width,
      start = a.byteOffset ?? 0
    requireValue(
      Number.isInteger(stride) && stride >= c[0] * width && Number.isInteger(start) && start >= 0,
      'неверный stride/offset',
    )
    const end = start + (a.count - 1) * stride + c[0] * width
    requireValue(
      Number.isInteger(view.byteOffset ?? 0) &&
        (view.byteOffset ?? 0) >= 0 &&
        end <= view.byteLength &&
        (view.byteOffset ?? 0) + view.byteLength <= bin.length,
      'accessor вне buffer',
    )
    const values = Array.from({ length: a.count }, (_, i) =>
      Array.from({ length: width }, (_, k) =>
        bin[c[1]]((view.byteOffset ?? 0) + start + i * stride + k * c[0]),
      ),
    )
    requireValue(
      values.every((v) => v.every(Number.isFinite)),
      'нечисловые данные accessor',
    )
    return { ...a, values }
  }
  const roots = j.scenes?.[j.scene ?? 0]?.nodes
  requireValue(Array.isArray(roots) && roots.length > 0, 'нет корней сцены')
  const visited = new Set(),
    parts = [],
    allPoints = []
  function bounds(points) {
    return [0, 1, 2].map((i) => [
      round(Math.min(...points.map((p) => p[i]))),
      round(Math.max(...points.map((p) => p[i]))),
    ])
  }
  function visit(index, parent) {
    requireValue(
      Number.isInteger(index) && j.nodes[index] && !visited.has(index),
      'цикл/повтор/неверный индекс node',
    )
    visited.add(index)
    const n = j.nodes[index],
      matrix = new Matrix4()
    if (n.matrix) {
      requireValue(
        finite(n.matrix, 16) && !n.translation && !n.rotation && !n.scale,
        'неверная matrix node',
      )
      matrix.fromArray(n.matrix)
    } else {
      const t = n.translation ?? [0, 0, 0],
        r = n.rotation ?? [0, 0, 0, 1],
        s = n.scale ?? [1, 1, 1]
      requireValue(
        finite(t, 3) && finite(r, 4) && finite(s, 3) && Math.abs(Math.hypot(...r) - 1) < 1e-4,
        'неверный TRS node',
      )
      matrix.compose(new Vector3(...t), new Quaternion(...r), new Vector3(...s))
    }
    matrix.premultiply(parent)
    if (n.mesh !== undefined) {
      const mesh = j.meshes[n.mesh]
      requireValue(mesh?.primitives?.length > 0, 'неверный mesh')
      const points = [],
        primitives = []
      for (const p of mesh.primitives) {
        requireValue((p.mode ?? 4) === 4 && !p.targets, 'требуются TRIANGLES без morph')
        const pos = accessor(p.attributes?.POSITION)
        requireValue(
          pos.type === 'VEC3' && pos.componentType === 5126,
          'POSITION должен быть FLOAT VEC3',
        )
        const normal = accessor(p.attributes?.NORMAL),
          color = accessor(p.attributes?.COLOR_0)
        requireValue(
          normal.type === 'VEC3' &&
            /^VEC[34]$/.test(color.type) &&
            normal.count === pos.count &&
            color.count === pos.count,
          'неверные NORMAL/COLOR_0',
        )
        const indices = p.indices === undefined ? undefined : accessor(p.indices)
        requireValue(
          !indices ||
            (indices.type === 'SCALAR' &&
              indices.componentType !== 5126 &&
              indices.values.every(([i]) => i < pos.count)),
          'неверные indices',
        )
        const count = indices?.count ?? pos.count
        requireValue(count % 3 === 0, 'неполный треугольник')
        requireValue(p.material === 0, 'требуется общий материал 0')
        for (const v of pos.values) {
          const point = new Vector3(...v).applyMatrix4(matrix).toArray()
          requireValue(point.every(Number.isFinite), 'нечисловая мировая позиция')
          points.push(point)
        }
        primitives.push({
          triangles: count / 3,
          vertices: pos.count,
          attributes: Object.keys(p.attributes).sort(),
        })
      }
      allPoints.push(...points)
      parts.push({
        name: n.name,
        matrix: matrix.toArray().map(round),
        bounds: bounds(points),
        primitives,
      })
    }
    for (const child of n.children ?? []) visit(child, matrix)
  }
  for (const root of roots) visit(root, new Matrix4())
  requireValue(parts.length && visited.size === j.nodes.length, 'пустая сцена/недостижимые nodes')
  requireValue(
    new Set(parts.map((p) => p.name)).size === parts.length &&
      parts.every((p) => typeof p.name === 'string'),
    'нет уникальных имён частей',
  )
  const b = bounds(allPoints),
    material = j.materials?.[0]
  requireValue(j.materials?.length === 1 && material, 'материалов!=1')
  requireValue(
    !j.animations?.length && !j.skins?.length && !j.textures?.length && !j.images?.length,
    'анимации/кости/текстуры',
  )
  requireValue((material.pbrMetallicRoughness?.metallicFactor ?? 1) === 0, 'metallic!=0')
  requireValue((material.pbrMetallicRoughness?.roughnessFactor ?? 1) >= 0.89, 'roughness<0.89')
  return {
    bounds: b,
    triangles: parts.reduce((sum, p) => sum + p.primitives.reduce((s, v) => s + v.triangles, 0), 0),
    parts: parts.sort((a, b) => a.name.localeCompare(b.name)),
  }
}

export function verifyModel(name, contract) {
  const limit = LIMITS[name]
  requireValue(limit, `нет контракта ${name}`)
  const { bounds: b, triangles, parts } = contract,
    size = b.map(([min, max]) => max - min)
  requireValue(triangles <= limit[0], `tris>${limit[0]}`)
  requireValue(
    Math.max(size[0], size[2]) <= limit[1] + 1e-5 &&
      size[1] <= (/^tower_/.test(name) ? 1.5 : limit[1]) + 1e-5,
    `размер>${limit[1]}`,
  )
  requireValue(Math.abs(b[1][0]) <= 0.02, 'y_min!=0')
  requireValue(
    size.every((v) => v > 0),
    'вырожденная модель',
  )
  const infantry = /^enemy_(grunt|grenadier|runner|shield)$/.test(name)
  const names = /^tower_/.test(name)
    ? ['base', 'head']
    : /^enemy_(tank|boss)$/.test(name)
      ? ['hull', 'turret']
      : infantry
        ? ['body', 'legL', 'legR']
        : /^deco_(tree|rock)$/.test(name)
          ? ['deco']
          : ['body']
  requireValue(
    JSON.stringify(parts.map((p) => p.name)) === JSON.stringify(names.sort()),
    `узлы должны быть ${names}`,
  )
  for (const p of parts) {
    const pivot = p.matrix.slice(12, 15)
    if (p.name === 'head' || p.name === 'turret') {
      const height = p.name === 'head' ? 0.56 : name === 'enemy_tank' ? 0.28 : 0.34
      requireValue(
        Math.abs(pivot[0]) < 1e-4 &&
          Math.abs(pivot[1] - height) < 1e-4 &&
          Math.abs(pivot[2]) < 1e-4,
        `pivot ${p.name}`,
      )
      requireValue(p.bounds[2][1] > pivot[2] + 0.1, 'ствол не направлен в +Z')
      const muzzle = MUZZLES[name]
      if (muzzle)
        requireValue(
          muzzle.every((v, i) => v >= p.bounds[i][0] - 0.02 && v <= p.bounds[i][1] + 0.02),
          'визуальное дуло вне head',
        )
    } else if (/^leg/.test(p.name)) {
      requireValue(
        Math.abs(pivot[1] - 0.2) < 1e-4 && (p.name === 'legL' ? pivot[0] > 0 : pivot[0] < 0),
        `pivot ${p.name}`,
      )
    }
  }
  return contract
}

function main() {
  let dir = DEFAULT_DIR,
    compare
  const files = [],
    args = process.argv.slice(2)
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--dir' || args[i] === '--compare') {
      requireValue(args[i + 1], `нет значения ${args[i]}`)
      if (args[i] === '--dir') dir = resolve(args[++i])
      else compare = resolve(args[++i])
    } else {
      requireValue(!args[i].startsWith('-'), `неизвестный аргумент ${args[i]}`)
      files.push(args[i])
    }
  }
  if (!files.length) files.push(...Object.keys(LIMITS).map((n) => `${n}.glb`))
  let bad = 0
  for (const file of files) {
    try {
      requireValue(basename(file) === file && file.endsWith('.glb'), 'ожидается имя GLB без пути')
      const name = file.slice(0, -4),
        c = verifyModel(name, inspectGlb(readFileSync(resolve(dir, file))))
      if (compare) {
        const other = verifyModel(name, inspectGlb(readFileSync(resolve(compare, file))))
        requireValue(
          JSON.stringify(c) === JSON.stringify(other),
          'геометрический контракт отличается',
        )
      }
      console.log(
        `${file}: OK tris=${c.triangles} bbox=${c.bounds.map(([min, max]) => (max - min).toFixed(3)).join(' ')} nodes=${c.parts.map((p) => p.name).join(',')}`,
      )
    } catch (error) {
      bad++
      console.error(`${file}: FAIL ${error.message}`)
    }
  }
  process.exitCode = bad ? 1 : 0
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    main()
  } catch (error) {
    console.error(error.message)
    process.exitCode = 1
  }
}
