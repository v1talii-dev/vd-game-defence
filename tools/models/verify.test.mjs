import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { inspectGlb, verifyModel, LIMITS, MUZZLES } from './verify.mjs'
import {
  TOWER_GLB,
  ENEMY_GLB,
  RUINS_GLB,
  DECO_GLB,
  TOWER_MUZZLE,
} from '../../src/widgets/battlefield/lib/three/modelConfig.ts'

function fixture(change = () => {}) {
  const values = [0, 0, 0, 1, 0, 0, 0, 1, 0]
  const bin = Buffer.alloc(108)
  for (let i = 0; i < 27; i++) bin.writeFloatLE(values[i % 9], i * 4)
  const j = {
    asset: { version: '2.0' },
    buffers: [{ byteLength: bin.length }],
    bufferViews: [0, 36, 72].map((byteOffset) => ({ buffer: 0, byteOffset, byteLength: 36 })),
    accessors: [0, 1, 2].map((bufferView) => ({
      bufferView,
      count: 3,
      componentType: 5126,
      type: 'VEC3',
    })),
    nodes: [{ name: 'body', mesh: 0 }],
    meshes: [{ primitives: [{ attributes: { POSITION: 0, NORMAL: 1, COLOR_0: 2 }, material: 0 }] }],
    scenes: [{ nodes: [0] }],
    scene: 0,
    materials: [{ pbrMetallicRoughness: { metallicFactor: 0, roughnessFactor: 0.9 } }],
  }
  change(j)
  const json = Buffer.from(JSON.stringify(j).padEnd(Math.ceil(JSON.stringify(j).length / 4) * 4))
  const out = Buffer.alloc(12 + 8 + json.length + 8 + bin.length)
  out.writeUInt32LE(0x46546c67, 0)
  out.writeUInt32LE(2, 4)
  out.writeUInt32LE(out.length, 8)
  out.writeUInt32LE(json.length, 12)
  out.writeUInt32LE(0x4e4f534a, 16)
  json.copy(out, 20)
  out.writeUInt32LE(bin.length, 20 + json.length)
  out.writeUInt32LE(0x004e4942, 24 + json.length)
  bin.copy(out, 28 + json.length)
  return out
}

test('computes actual transformed vertex bounds through parent TRS and child matrix', () => {
  const c = inspectGlb(
    fixture((j) => {
      j.nodes = [
        {
          translation: [5, 0, 0],
          rotation: [0, 0, Math.SQRT1_2, Math.SQRT1_2],
          scale: [2, 3, 1],
          children: [1],
        },
        { name: 'body', mesh: 0, matrix: [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 1, 0, 0, 1] },
      ]
    }),
  )
  assert.deepEqual(c.bounds, [
    [2, 5],
    [2, 4],
    [0, 0],
  ])
  assert.equal(c.triangles, 1)
})

test('rejects truncated binary, accessor overruns, hierarchy cycles and missing vertex colors', () => {
  assert.throws(() => inspectGlb(fixture().subarray(0, 24)), /длина/)
  assert.throws(
    () =>
      inspectGlb(
        fixture((j) => {
          j.accessors[0].count = 300
        }),
      ),
    /вне buffer/,
  )
  assert.throws(
    () =>
      inspectGlb(
        fixture((j) => {
          j.nodes[0].children = [0]
        }),
      ),
    /цикл/,
  )
  assert.throws(
    () =>
      inspectGlb(
        fixture((j) => {
          delete j.meshes[0].primitives[0].attributes.COLOR_0
        }),
      ),
    /accessor/,
  )
})

test('rejects unknown model names, wrong pivots and exceeded budgets', () => {
  const path = new URL('../../public/assets/models/tower_machinegun.glb', import.meta.url)
  const c = inspectGlb(readFileSync(path))
  verifyModel('tower_machinegun', c)
  assert.throws(() => verifyModel('unknown', c), /контракта/)
  const wrongPivot = structuredClone(c)
  wrongPivot.parts.find((p) => p.name === 'head').matrix[13] = 0
  assert.throws(() => verifyModel('tower_machinegun', wrongPivot), /pivot/)
  assert.throws(() => verifyModel('tower_machinegun', { ...c, triangles: 1201 }), /tris/)
})

test('covers every runtime GLB in modelConfig, including future additions', () => {
  for (const { file } of Object.values({ ...TOWER_GLB, ...ENEMY_GLB, ...DECO_GLB }))
    assert.ok(LIMITS[file], `missing ${file}`)
  for (const { file } of Object.values(RUINS_GLB)) assert.ok(LIMITS[file], `missing ${file}`)
  for (const [type, point] of Object.entries(TOWER_MUZZLE))
    assert.deepEqual(MUZZLES[TOWER_GLB[type].file], point)
})
