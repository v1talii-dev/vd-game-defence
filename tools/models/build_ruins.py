# Руины башен (phase 'ruins'): низкая груда обломков на плато, один узел body, без поворотной головы.
# Запуск: blender -b -P tools/models/build_ruins.py   (опционально RUIN=machinegun|rocket)
import sys, os, math
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import bpy
import build_models as bm
from mathutils import Matrix

# обгоревшая палитра + янтарные акценты (как у целых башен)
ASH, SOOT, CHAR, BURNT, DARK, AMBER = (bm.lin("#2b2724"), bm.lin("#3b3632"), bm.lin("#4a423b"),
                                       bm.lin("#5a4a3a"), bm.lin("#1b1d20"), bm.lin("#e3a42e"))


def put(o, color, c, rx=0.0, ry=0.0, rz=0.0):
    """Поворот (градусы, Blender XYZ) вокруг центра объекта, затем перенос в игровую точку c."""
    o.rotation_euler = (math.radians(rx), math.radians(ry), math.radians(rz))
    o.location = bm.to_bl(*c)
    bm.apply_all(o)
    bm.set_color(o, color)
    return o


def bx(c, s, color, rx=0.0, ry=0.0, rz=0.0):
    bpy.ops.mesh.primitive_cube_add()
    o = bpy.context.object
    o.scale = (s[0] / 2, s[2] / 2, s[1] / 2)  # игровые оси -> Blender
    bm.apply_all(o)
    return put(o, color, c, rx, ry, rz)


def cone(c, r1, r2, h, color, verts=8, rz=22.5):
    bpy.ops.mesh.primitive_cone_add(vertices=verts, radius1=r1, radius2=r2, depth=h)
    return put(bpy.context.object, color, c, 0, 0, rz)


def tube(c, r, l, color, pitch=0.0, yaw=0.0, verts=8):
    """Цилиндр вдоль игрового +Z, затем pitch вокруг X и yaw вокруг вертикали."""
    bpy.ops.mesh.primitive_cylinder_add(vertices=verts, radius=r, depth=l)
    o = bpy.context.object
    o.rotation_euler = (Matrix.Rotation(math.radians(yaw), 3, 'Z') @ Matrix.Rotation(math.radians(pitch), 3, 'X')
                        @ Matrix.Rotation(math.radians(90), 3, 'X')).to_euler()
    o.location = bm.to_bl(*c)
    bm.apply_all(o)
    bm.set_color(o, color)
    return o


def mg():
    bm.reset()
    p = [
        cone((0, 0.05, 0), 0.47, 0.47, 0.10, DARK),                       # плато-подставка
        cone((0.02, 0.16, 0), 0.40, 0.30, 0.12, ASH, verts=7, rz=10),     # оплавленный стакан
        bx((0, 0.21, 0.02), (0.32, 0.05, 0.3), BURNT, ry=4, rz=18),       # обгоревшая платформа
        bx((-0.2, 0.25, -0.12), (0.34, 0.05, 0.26), CHAR, rx=-24, rz=25),  # перекошенные панели
        bx((0.18, 0.27, -0.16), (0.26, 0.05, 0.22), SOOT, rx=18, ry=20, rz=-20),
        bx((0.2, 0.2, 0.2), (0.24, 0.07, 0.2), CHAR, rx=10, ry=-14, rz=40),
        tube((-0.06, 0.28, 0.14), 0.05, 0.4, DARK, pitch=22, yaw=-28),    # обломок ствола
        tube((-0.17, 0.2, 0.3), 0.075, 0.1, SOOT, pitch=22, yaw=-28),     # кусок кожуха
        bx((0.3, 0.19, -0.06), (0.1, 0.18, 0.14), SOOT, rx=12, rz=-15),   # обломок магазина
        bx((0.12, 0.33, 0.03), (0.2, 0.025, 0.05), AMBER, rx=6, rz=30),   # янтарный акцент: полоса
        bx((-0.3, 0.17, 0.14), (0.05, 0.05, 0.05), AMBER, rx=20, ry=15, rz=10),  # янтарный огарок
    ]
    for i, (a, d) in enumerate([(200, .4), (245, .42), (300, .41), (20, .42)]):  # разбросанные мешки
        r = math.radians(a)
        p.append(bx((math.sin(r) * d, 0.16, math.cos(r) * d), (0.2, 0.1, 0.12), ASH if i % 2 else SOOT,
                    rx=8 * (i - 1), rz=-a + 12 * i))
    return bm.join(p)


def rocket():
    bm.reset()
    p = [
        bx((0, 0.06, 0), (0.98, 0.12, 0.98), DARK),                         # плато
        bx((-0.05, 0.17, 0.05), (0.8, 0.1, 0.78), ASH, rz=6),              # обгоревшая платформа
        bx((0.3, 0.26, -0.3), (0.34, 0.06, 0.3), CHAR, rx=-16, ry=12, rz=-10),  # перекошенные панели
        bx((-0.32, 0.28, -0.28), (0.3, 0.06, 0.34), SOOT, rx=14, ry=-18, rz=18),
        bx((0.34, 0.2, 0.34), (0.2, 0.18, 0.2), BURNT, rz=12, rx=-6),      # опорная тумба
        tube((-0.12, 0.32, 0.0), 0.14, 0.62, CHAR, pitch=16, yaw=20, verts=8),       # уцелевшая пусковая труба
        tube((-0.12, 0.32, 0.31), 0.095, 0.03, DARK, pitch=16, yaw=20, verts=8),     # тёмный срез
        tube((-0.07, 0.38, 0.1), 0.15, 0.05, AMBER, pitch=16, yaw=20, verts=8),      # янтарный пояс
        tube((0.2, 0.2, 0.0), 0.12, 0.34, SOOT, pitch=-6, yaw=-65, verts=8),          # упавший обрубок трубы
        bx((0.0, 0.24, -0.36), (0.5, 0.05, 0.1), BURNT, rx=-30, rz=4),     # согнутая стяжка
        bx((-0.45, 0.2, 0.2), (0.04, 0.05, 0.3), AMBER, rx=8, rz=5),       # обломок янтарной полосы
    ]
    return bm.join(p)


def build(fname, fn, budget):
    o = fn()
    bm.reduce(o, budget)
    bm.finish(o, "body")
    bm.export([o], fname)
    print("BUILD", fname, bm.tris(o))


w = os.environ.get("RUIN", "")
if w in ("", "machinegun"):
    build("ruins_machinegun.glb", mg, 270)
if w in ("", "rocket"):
    build("ruins_rocket.glb", rocket, 420)
