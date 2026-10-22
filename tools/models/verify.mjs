// Проверка GLB-моделей по контракту: треугольники, bbox, узлы, материалы, y_min.
// Запуск: node tools/models/verify.mjs [файлы...]  (по умолчанию — модели башен, техники и декора)
import { readFileSync } from 'node:fs'

const DIR = new URL('../../public/assets/models/', import.meta.url)
const LIMITS = {
  tower_machinegun: [1200, 1.15], tower_rocket: [1200, 1.15], enemy_technical: [1000, 0.95],
  enemy_tank: [1500, 0.95], enemy_boss: [2200, 1.5], deco_tree: [500, 1], deco_rock: [500, 1],
}
const files = process.argv.length > 2 ? process.argv.slice(2) : Object.keys(LIMITS).map((n) => n + '.glb')
let bad = 0
const pad = (s, n) => String(s).padEnd(n)
console.log(pad('файл', 22), pad('tris', 6), pad('bbox (x y z)', 22), pad('y_min', 7), pad('mat', 4), 'узлы / проблемы')
for (const f of files) {
  const b = readFileSync(new URL(f, DIR))
  const jl = b.readUInt32LE(12)
  const j = JSON.parse(b.subarray(20, 20 + jl).toString())
  let tris = 0
  const mn = [1e9, 1e9, 1e9], mx = [-1e9, -1e9, -1e9]
  for (const n of j.nodes) {
    if (n.mesh === undefined) continue
    const t = n.translation ?? [0, 0, 0]
    for (const p of j.meshes[n.mesh].primitives) {
      const pos = j.accessors[p.attributes.POSITION]
      tris += (p.indices !== undefined ? j.accessors[p.indices].count : pos.count) / 3
      for (let i = 0; i < 3; i++) { mn[i] = Math.min(mn[i], pos.min[i] + t[i]); mx[i] = Math.max(mx[i], pos.max[i] + t[i]) }
    }
  }
  const size = mx.map((v, i) => v - mn[i])
  const names = j.nodes.map((n) => n.name)
  const mats = j.materials?.length ?? 0
  const m0 = j.materials?.[0]
  const issues = []
  const name = f.replace('.glb', '')
  const [maxTris, maxDim] = LIMITS[name] ?? [Infinity, Infinity]
  if (tris > maxTris) issues.push(`tris>${maxTris}`)
  if (/^tower_/.test(name) ? (Math.max(size[0], size[2]) > maxDim || size[1] > 1.5) : Math.max(...size) > maxDim) issues.push(`размер>${maxDim}`)
  if (Math.abs(mn[1]) > 0.02) issues.push('y_min!=0')
  if (mats !== 1) issues.push('материалов!=1')
  if (j.animations?.length || j.skins?.length) issues.push('анимации/кости')
  if (!j.meshes.every((m) => m.primitives.every((p) => p.attributes.COLOR_0 !== undefined))) issues.push('нет COLOR_0')
  if (m0 && (m0.pbrMetallicRoughness?.metallicFactor ?? 1) !== 0) issues.push('metallic!=0')
  if (/^tower_/.test(name) && !(names.includes('base') && names.includes('head'))) issues.push('нет base/head')
  if (/^enemy_(tank|boss)/.test(name) && !(names.includes('hull') && names.includes('turret'))) issues.push('нет hull/turret')
  if (name === 'enemy_technical' && !names.includes('body')) issues.push('нет body')
  if (issues.length) bad++
  console.log(pad(f, 22), pad(tris, 6), pad(size.map((v) => v.toFixed(2)).join(' '), 22), pad(mn[1].toFixed(3), 7), pad(mats, 4), names.join(',') + (issues.length ? '  !! ' + issues.join('; ') : ''))
}
process.exit(bad ? 1 : 0)
