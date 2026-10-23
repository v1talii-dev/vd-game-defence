// HUD-объекты в мире: HP-бары над врагами, шевроны рангов, кольцо дальности (SPEC §3.5)
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
/** Рамка индикатора на кромке плато (SPEC §3.5): квад 1 клетка, плато 0.94; границы по Чебышёву в долях полуразмера */
const FRAME_SIZE = 1.14 // полоса чуть снаружи кромки плато: модели шире плато её не закрывают
const BAND_IN = 0.8 // цветная полоса ≈0.08 клетки
const BAND_OUT = 0.94
const UNDER_IN = 0.75 // тёмная подложка шире полосы
const UNDER_OUT = 0.97
const FULL = new Color(0x6fbf3a)
const LOW = new Color(0xd23b22)
const _m = new Matrix4()
const _p = new Vector3()
const _s = new Vector3()
const _right = new Vector3()
const _c = new Color()
const _fwd = new Vector3()

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

  // рамка прогресса по кромке плато-подставки: плоский квад на башню, положение вдоль периметра считается в шейдере
  const pGeo = new PlaneGeometry(1, 1).rotateX(-Math.PI / 2)
  const pData = new InstancedBufferAttribute(new Float32Array(PROG_CAP * 4), 4) // progress, r, g, b
  pData.setUsage(DynamicDrawUsage)
  pGeo.setAttribute('aData', pData)
  const pMat = new ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uStart: { value: 0 } },
    transparent: true,
    depthWrite: false,
    polygonOffset: true,
    polygonOffsetFactor: -2,
    polygonOffsetUnits: -2,
    vertexShader: `
      attribute vec4 aData;
      varying vec2 vUv;
      varying vec4 vData;
      void main() {
        vUv = position.xz * 2.0;
        vData = aData;
        gl_Position = projectionMatrix * modelViewMatrix * instanceMatrix * vec4(position, 1.0);
      }`,
    fragmentShader: `
      varying vec2 vUv;
      varying vec4 vData;
      uniform float uTime;
      uniform float uStart;
      void main() {
        vec2 q = vUv;
        float c = max(abs(q.x), abs(q.y));
        float e = fwidth(c);
        float under = smoothstep(${UNDER_IN}, ${UNDER_IN} + e, c) * (1.0 - smoothstep(${UNDER_OUT} - e, ${UNDER_OUT}, c));
        if (under <= 0.0) discard;
        float band = smoothstep(${BAND_IN}, ${BAND_IN} + e, c) * (1.0 - smoothstep(${BAND_OUT} - e, ${BAND_OUT}, c));
        // поворот: старт (u = 0) в ближнем к камере углу; обход по часовой
        for (int i = 0; i < 4; i++) if (float(i) < uStart) q = vec2(q.y, -q.x);
        float u;
        if (c + q.y < 1e-5) u = (q.x / c + 1.0) * 0.5;
        else if (c - q.x < 1e-5) u = 1.0 + (q.y / c + 1.0) * 0.5;
        else if (c - q.y < 1e-5) u = 2.0 + (1.0 - q.x / c) * 0.5;
        else u = 3.0 + (1.0 - q.y / c) * 0.5;
        u *= 0.25;
        vec3 col;
        if (vData.x < 0.0) {
          float d = mod(u - uTime * 0.12, 1.0);
          col = d < 0.16 ? vec3(1.0, 0.95, 0.75) : vData.yzw * 0.85;
        } else {
          col = u <= vData.x ? vData.yzw : vec3(0.42, 0.39, 0.32);
        }
        col = mix(vec3(0.05, 0.04, 0.03), col, band);
        gl_FragColor = vec4(col, under * mix(0.85, 1.0, band));
      }`,
  })
  const prog = new InstancedMesh(pGeo, pMat, PROG_CAP)
  prog.count = 0
  prog.frustumCulled = false
  prog.renderOrder = 13
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

  const putFlat = (i: number, x: number, y: number, z: number) => {
    _m.makeScale(FRAME_SIZE, 1, FRAME_SIZE).setPosition(x, y, z)
    prog.setMatrixAt(i, _m)
  }

  return {
    begin() {
      nBar = nChev = nProg = 0
      // старт рамки — в ближнем к камере углу
      camera.getWorldDirection(_fwd)
      pMat.uniforms.uStart!.value = _fwd.x < 0 ? (_fwd.z < 0 ? 2 : 1) : _fwd.z < 0 ? 3 : 0
    },
    /** рамка «ждёт кредитов»: тусклая, по ней бежит светлый сегмент; (wx, wy, wz) — центр плато, wy — чуть выше его верха; t — секунды */
    waiting(wx: number, wy: number, wz: number, t: number) {
      if (nProg >= PROG_CAP) return
      putFlat(nProg, wx, wy, wz)
      writeProgress(pData.array as Float32Array, nProg, 0, WAIT_COLOR)
      ;(pData.array as Float32Array)[nProg * 4] = -1 // признак режима «ожидание»
      pMat.uniforms.uTime!.value = t
      nProg++
    },
    /** рамка прогресса по кромке плато, заливка по часовой от ближнего угла; progress 0..1, color — 0xRRGGBB */
    progress(wx: number, wy: number, wz: number, progress: number, color: number) {
      if (nProg >= PROG_CAP) return
      putFlat(nProg, wx, wy, wz)
      writeProgress(pData.array as Float32Array, nProg, progress, color)
      nProg++
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
