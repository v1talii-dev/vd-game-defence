// Загрузка GLB: меши вместе с матрицей узла относительно корня (голова/башня — отдельный узел).
import type { BufferGeometry, Matrix4, Mesh } from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'

export interface GlbPart {
  name: string
  geo: BufferGeometry
  matrix: Matrix4
}

/** Ошибка отдельного файла не роняет остальные: такой файл просто отсутствует в результате. */
export async function loadGlbParts(
  baseUrl: string,
  files: string[],
): Promise<Map<string, GlbPart[]>> {
  const loader = new GLTFLoader()
  const out = new Map<string, GlbPart[]>()
  await Promise.all(
    files.map(async (file) => {
      try {
        const gltf = await loader.loadAsync(`${baseUrl}${file}.glb`)
        gltf.scene.updateMatrixWorld(true)
        const parts: GlbPart[] = []
        gltf.scene.traverse((o) => {
          const m = o as Mesh
          if (m.isMesh) parts.push({ name: m.name, geo: m.geometry, matrix: m.matrixWorld.clone() })
        })
        if (parts.length) out.set(file, parts)
      } catch {
        // fallback на примитивы
      }
    }),
  )
  return out
}
