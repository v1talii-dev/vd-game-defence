// HUD-объекты в мире: HP-бары над врагами, шевроны рангов, кольцо дальности (SPEC §3.5)
import {
  Color,
  DoubleSide,
  InstancedMesh,
  Matrix4,
  Mesh,
  MeshBasicMaterial,
  PerspectiveCamera,
  PlaneGeometry,
  RingGeometry,
  Scene,
  Shape,
  ShapeGeometry,
  Vector3,
} from 'three'

type Disposables = { dispose(): void }[]

const CAP = 256
const BAR_W = 0.6
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

  const waitGeo = new RingGeometry(0.5, 0.64, 40).rotateX(-Math.PI / 2)
  const waitMat = new MeshBasicMaterial({
    color: 0xff4a1a,
    transparent: true,
    opacity: 0.85,
    depthWrite: false,
    depthTest: false,
  })
  const wait = new InstancedMesh(waitGeo, waitMat, 64)
  wait.count = 0
  wait.renderOrder = 9
  wait.frustumCulled = false
  scene.add(wait)
  disposables.push(waitGeo, waitMat, wait)

  let nWait = 0
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

  return {
    begin() {
      nBar = nChev = nWait = 0
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
    /** пульсирующее кольцо «ждёт кредитов»; t — время в секундах */
    waiting(wx: number, wy: number, wz: number, t: number) {
      if (nWait >= 64) return
      const k = 1 + 0.15 * Math.sin(t * 6)
      waitMat.opacity = 0.65 + 0.35 * Math.sin(t * 6)
      wait.setMatrixAt(nWait++, _m.makeScale(k, 1, k).setPosition(wx, wy, wz))
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
      wait.count = nWait
      wait.instanceMatrix.needsUpdate = true
      for (const m of [bg, fill, chev]) m.instanceMatrix.needsUpdate = true
      if (fill.instanceColor) fill.instanceColor.needsUpdate = true
    },
  }
}

const PAD_RING_Y = 0.13
