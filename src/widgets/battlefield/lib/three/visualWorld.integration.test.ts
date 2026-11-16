import { expect, it } from 'vitest'
import { InstancedMesh, Scene } from 'three'
import { QUALITY_PROFILES } from '@/shared/lib/three'
import { createVisualWorld } from './visualWorld'

it('caps debris, freezes it on pause, expires it and cleans up', async () => {
  const scene = new Scene()
  const visual = createVisualWorld(QUALITY_PROFILES.high, scene)
  visual.spawn(1, 1, 1)
  await visual.ready
  expect(visual.count()).toBe(6)
  const mesh = scene.children[0] as InstancedMesh
  for (let i = 0; i < 20; i++) visual.spawn(1, 1, 1)
  visual.update(0)
  expect(mesh.count).toBe(32)
  const initial = mesh.instanceMatrix.array.slice()
  visual.update(1 / 60)
  const before = mesh.instanceMatrix.array.slice()
  expect(before).not.toEqual(initial)
  visual.update(0)
  expect(mesh.instanceMatrix.array).toEqual(before)
  for (let i = 0; i < 200; i++) visual.update(1 / 60)
  expect(mesh.count).toBe(0)
  visual.dispose()
  expect(visual.count()).toBe(0)
  expect(scene.children).toHaveLength(0)
})
