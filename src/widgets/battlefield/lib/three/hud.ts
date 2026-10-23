// HUD-объекты в мире: HP-бары над врагами, шевроны рангов, кольцо дальности, кольцо прогресса (SPEC §3.5)
import {
  Color,
  DoubleSide,
  DynamicDrawUsage,
  InstancedBufferAttribute,
  InstancedMesh,
  Matrix4,
  Mesh,
  MeshBasicMaterial,
  PerspectiveCamera,
  PlaneGeometry,
  RingGeometry,
  Scene,
  ShaderMaterial,
  Shape,
  ShapeGeometry,
  Vector3,
} from 'three'

type Disposables = { dispose(): void }[]

const CAP = 256
const PROG_CAP = 128
const BAR_W = 0.6
/** Диаметр кольца прогресса в клетках */
const PROG_SIZE = 0.68
const FULL = new Color(0x6fbf3a)
const LOW = new Color(0xd23b22)
const _m = new Matrix4()
const _p = new Vector3()
const _s = new Vector3()
const _right = new Vector3()
const _c = new Color()

export function createHud(scene: Scene, camera: PerspectiveCamera, disposables: Disposables) {
  const make = (geo: PlaneGeometry | ShapeGeometry, color: number, order: number) => {
    const mat = new MeshBasicMaterial({ color, side: DoubleSide, depthTest: false })
    const mesh = new InstancedMesh(geo, mat, CAP)
    mesh.count = 0
    mesh.frustumCulled = false
    mesh.renderOrder = order
    scene.add(mesh)
    disposables.push(geo, mat, mesh)
    return mesh
  }
  const bg = make(new PlaneGeometry(1, 0.09), 0x14110c, 10)
  const fill = make(new PlaneGeometry(1, 0.07), 0xffffff, 11)

  // шеврон-«галочка», одна геометрия на все ранги
  const v = new Shape()
  v.moveTo(-0.12, 0.1)
    .lineTo(0, 0.02)
    .lineTo(0.12, 0.1)
    .lineTo(0.12, 0.05)
    .lineTo(0, -0.03)
    .lineTo(-0.12, 0.05)
  const chev = make(new ShapeGeometry(v), 0xffd24a, 12)

  const ringGeo = new RingGeometry(0.97, 1, 64).rotateX(-Math.PI / 2)
  const ringMat = new MeshBasicMaterial({
    color: 0xffe08a,
    transparent: true,
    opacity: 0.8,
    depthWrite: false,
  })
  const ring = new Mesh(ringGeo, ringMat)
  ring.visible = false
  scene.add(ring)
  disposables.push(ringGeo, ringMat)

  // кольцо прогресса-билборд над башней: заливка по часовой от верха
  const pGeo = new PlaneGeometry(1, 1)
  const pData = new InstancedBufferAttribute(new Float32Array(PROG_CAP * 4), 4) // progress, r, g, b
  pData.setUsage(DynamicDrawUsage)
  pGeo.setAttribute('aData', pData)
  const pMat = new ShaderMaterial({
    uniforms: { uTime: { value: 0 } },
    transparent: true,
    depthTest: false,
    depthWrite: false,
    vertexShader: `
      attribute vec4 aData;
      varying vec2 vUv;
      varying vec4 vData;
      void main() {
        vUv = position.xy * 2.0;
        vData = aData;
        gl_Position = projectionMatrix * modelViewMatrix * instanceMatrix * vec4(position, 1.0);
      }`,
    fragmentShader: `
      varying vec2 vUv;
      varying vec4 vData;
      uniform float uTime;
      void main() {
        vec2 q = vUv;
        float r = length(q);
        float e = fwidth(r) * 1.2;
        float disc = 1.0 - smoothstep(0.98 - e, 0.98, r);
        if (disc <= 0.0) discard;
        float band = smoothstep(0.46, 0.46 + e, r);
        float a = atan(q.x, q.y);
        float u = (a < 0.0 ? a + 6.2831853 : a) / 6.2831853;
        vec3 col;
        if (vData.x < 0.0) {
          float d = mod(u - uTime * 0.5, 1.0);
          col = d < 0.25 ? vec3(1.0, 0.95, 0.75) : vData.yzw * 0.55;
        } else {
          col = u <= vData.x ? vData.yzw : vec3(0.1, 0.09, 0.08);
        }
        // без обводки; незаполненная часть и центр — лёгкая тёмная полупрозрачная заливка
        float alpha = mix(0.45, 1.0, band);
        if (u > vData.x && vData.x >= 0.0) alpha = mix(0.45, 0.6, band);
        if (r < 0.46) col = vec3(0.05, 0.04, 0.03);
        gl_FragColor = vec4(col, alpha * disc);
      }`,
  })
  const prog = new InstancedMesh(pGeo, pMat, PROG_CAP)
  prog.count = 0
  prog.frustumCulled = false
  prog.renderOrder = 20
  scene.add(prog)
  disposables.push(pGeo, pMat, prog)

  let nProg = 0
  let nBar = 0
  let nChev = 0
  const put = (
    mesh: InstancedMesh,
    i: number,
    x: number,
    y: number,
    z: number,
    sx: number,
    sy = 1,
  ) => {
    _m.compose(_p.set(x, y, z), camera.quaternion, _s.set(sx, sy, 1))
    mesh.setMatrixAt(i, _m)
  }

  const putProg = (x: number, y: number, z: number, progress: number, color: number) => {
    put(prog, nProg, x, y, z, PROG_SIZE, PROG_SIZE)
    writeProgress(pData.array as Float32Array, nProg, progress, color)
    nProg++
  }

  return {
    begin() {
      nBar = nChev = nProg = 0
    },
    /** кольцо «ждёт кредитов»: тусклое, по нему бежит светлый сегмент, без цифры; (wx, wy, wz) — центр кольца; t — секунды */
    waiting(wx: number, wy: number, wz: number, t: number) {
      if (nProg >= PROG_CAP) return
      putProg(wx, wy, wz, 0, WAIT_COLOR)
      ;(pData.array as Float32Array)[(nProg - 1) * 4] = -1 // признак режима «ожидание»
      pMat.uniforms.uTime!.value = t
    },
    /** кольцо прогресса, заливка по часовой от верха; progress 0..1, color — 0xRRGGBB */
    progress(wx: number, wy: number, wz: number, progress: number, color: number) {
      if (nProg >= PROG_CAP) return
      putProg(wx, wy, wz, progress, color)
    },
    /** бар над точкой (мировые координаты), ratio = hp / maxHp */
    bar(wx: number, wy: number, wz: number, ratio: number, color?: Color, k = 1) {
      if (nBar >= CAP) return
      _right.set(1, 0, 0).applyQuaternion(camera.quaternion)
      put(bg, nBar, wx, wy, wz, (BAR_W + 0.04) * k, k)
      const w = BAR_W * k * ratio
      const off = -(BAR_W * k - w) / 2
      put(fill, nBar, wx + _right.x * off, wy + _right.y * off, wz + _right.z * off, w, k)
      fill.setColorAt(nBar, color ?? _c.copy(LOW).lerp(FULL, ratio))
      nBar++
    },
    /** rank шевронов, стопкой вверх от (wx, wy, wz) */
    chevrons(wx: number, wy: number, wz: number, rank: number) {
      for (let i = 0; i < rank && nChev < CAP; i++) put(chev, nChev++, wx, wy + i * 0.11, wz, 2)
    },
    /** кольцо дальности; null — скрыть */
    ring(wx: number, wz: number, range: number | null) {
      ring.visible = range !== null
      if (range !== null) {
        ring.position.set(wx, PAD_RING_Y, wz)
        ring.scale.set(range, 1, range)
      }
    },
    end() {
      bg.count = fill.count = nBar
      chev.count = nChev
      prog.count = nProg
      prog.instanceMatrix.needsUpdate = true
      pData.needsUpdate = true
      for (const m of [bg, fill, chev]) m.instanceMatrix.needsUpdate = true
      if (fill.instanceColor) fill.instanceColor.needsUpdate = true
    },
  }
}

const PAD_RING_Y = 0.13

/** Цвета кольца прогресса */
export const BUILD_COLOR = 0xffe14d
export const UPGRADE_COLOR = 0x3dd6ff
export const WAIT_COLOR = 0xffc83d

/** Пишет [progress, r, g, b] экземпляра i в плоский буфер; progress зажат в 0..1 */
export function writeProgress(arr: Float32Array, i: number, progress: number, color: number) {
  const o = i * 4
  arr[o] = Math.min(1, Math.max(0, progress))
  arr[o + 1] = ((color >> 16) & 255) / 255
  arr[o + 2] = ((color >> 8) & 255) / 255
  arr[o + 3] = (color & 255) / 255
}
