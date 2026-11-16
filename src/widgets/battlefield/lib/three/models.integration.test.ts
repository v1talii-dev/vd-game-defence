import { readFile } from 'node:fs/promises'
import { expect, it } from 'vitest'
import { Matrix4, type Mesh, Scene, Vector3 } from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import type { GlbPart } from '@/shared/lib/three'
import { ENEMY_GLB, RUINS_GLB, TOWER_GLB } from './modelConfig'
import { createModels, type Model } from './models'

it('replaces every active model with real GLB parts and animates their authored pivots', async () => {
  const scene = new Scene()
  const disposables: { dispose(): void }[] = []
  const models = createModels(scene, disposables)
  const loaded = new Map<string, GlbPart[]>()
  for (const { file } of [
    ...Object.values(TOWER_GLB),
    ...Object.values(RUINS_GLB),
    ...Object.values(ENEMY_GLB),
  ]) {
    const bytes = await readFile(
      new URL(`../../../../../public/assets/models/${file}.glb`, import.meta.url),
    )
    const gltf = await new GLTFLoader().parseAsync(Uint8Array.from(bytes).buffer, '')
    gltf.scene.updateMatrixWorld(true)
    const parts: GlbPart[] = []
    gltf.scene.traverse((object) => {
      const mesh = object as Mesh
      if (mesh.isMesh)
        parts.push({ name: mesh.name, geo: mesh.geometry, matrix: mesh.matrixWorld.clone() })
    })
    const names = file.startsWith('tower_')
      ? ['base', 'head']
      : file === 'enemy_grunt' || file === 'enemy_grenadier'
        ? ['body', 'legL', 'legR']
        : file === 'enemy_tank' || file === 'enemy_boss'
          ? ['hull', 'turret']
          : ['body']
    expect(parts.map((part) => part.name).sort()).toEqual(names.sort())
    loaded.set(file, parts)
  }
  models.applyGlbs(loaded)
  for (const [specs, runtime] of [
    [TOWER_GLB, models.towers],
    [TOWER_GLB, models.ghosts],
    [RUINS_GLB, models.ruins],
    [ENEMY_GLB, models.enemies],
  ] as const) {
    for (const [type, spec] of Object.entries(specs)) {
      const model = (runtime as Record<string, Model>)[type]!
      const parts = loaded.get(spec.file)!
      expect(model.parts).toHaveLength(parts.length)
      parts.forEach((part, index) => {
        const actual = model.parts[index]!
        expect(actual.mesh.geometry).toBe(part.geo)
        expect(actual.head).toBe(part.name === 'head' || part.name === 'turret')
        expect(actual.leg).toBe(part.name === 'legL' ? 1 : part.name === 'legR' ? -1 : 0)
        expect(disposables).toContain(actual.mesh)
        expect(disposables).toContain(actual.mesh.geometry)
        for (const material of [actual.mesh.material].flat())
          expect(disposables).toContain(material)
      })
    }
  }
  const place = (model: Model, headYaw: number, phase?: number) => {
    models.begin()
    models.place(model, 2, 0.1, 3, 0, headYaw, 1, 1, phase)
    models.end()
    return model.parts.map(({ mesh }) => {
      const matrix = new Matrix4()
      mesh.getMatrixAt(0, matrix)
      return matrix
    })
  }
  const tower = models.towers.machineGun
  const rest = place(tower, 0)
  const aimed = place(tower, Math.PI / 2)
  tower.parts.forEach((part, index) => {
    expect(aimed[index]!.equals(rest[index]!)).toBe(!part.head)
    expect(new Vector3().setFromMatrixPosition(aimed[index]!)).toEqual(
      new Vector3().setFromMatrixPosition(rest[index]!),
    )
  })
  for (const model of [models.enemies.grunt, models.enemies.grenadier]) {
    const standing = place(model, 0)
    const walking = place(model, 0, Math.PI / 2)
    model.parts.forEach((part, index) => {
      expect(walking[index]!.equals(standing[index]!)).toBe(part.leg === 0)
      expect(new Vector3().setFromMatrixPosition(walking[index]!)).toEqual(
        new Vector3().setFromMatrixPosition(standing[index]!),
      )
    })
    const paused = place(model, 0)
    expect(paused.map((matrix) => matrix.elements)).toEqual(
      standing.map((matrix) => matrix.elements),
    )
  }
  for (const disposable of disposables) disposable.dispose()
})
