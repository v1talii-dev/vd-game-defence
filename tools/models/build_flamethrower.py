# Башня «Горелка» (огнемёт): низкая платформа, баки с топливом, широкое сопло. CC0, оригинал.
# Запуск: blender -b -P tools/models/build_flamethrower.py. Контракт как в build_towers.py: узлы base/head, pivot head (0, 0.56, 0).
import sys, os, math
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import bpy
import build_models as bm

HULL, OLIVE, DARK, STEEL, SAND, AMBER = (bm.lin("#56677a"), bm.lin("#5f6e4b"), bm.lin("#23282e"),
                                         bm.lin("#8795a4"), bm.lin("#a39a76"), bm.lin("#e3a42e"))
RED = bm.lin("#b8402a")


def fin(o, color, c, rz=0.0, rx=0.0):
    o.rotation_euler = (math.radians(rx), 0, math.radians(rz))
    o.location = bm.to_bl(*c)
    bm.apply_all(o)
    bm.set_color(o, color)
    return o


def bx(c, s, color, rz=0.0):
    bpy.ops.mesh.primitive_cube_add()
    o = bpy.context.object
    o.scale = (s[0] / 2, s[2] / 2, s[1] / 2)
    bm.apply_all(o)
    return fin(o, color, c, rz)


def cone(c, r1, r2, h, color, verts=8, rz=22.5):
    bpy.ops.mesh.primitive_cone_add(vertices=verts, radius1=r1, radius2=r2, depth=h)
    return fin(bpy.context.object, color, c, rz)


def zcone(c, r1, r2, l, color, verts=10):
    """Усечённый конус вдоль +Z: r1 сзади, r2 спереди."""
    bpy.ops.mesh.primitive_cone_add(vertices=verts, radius1=r1, radius2=r2, depth=l)
    return fin(bpy.context.object, color, c, 0, 90)


bm.reset()
top = 0.56
base = [
    bx((0, 0.07, 0), (0.98, 0.14, 0.98), DARK),
    bx((0, 0.3, 0), (0.9, 0.32, 0.9), HULL),
    bx((0, 0.49, 0), (0.94, 0.06, 0.94), OLIVE),
    cone((0, 0.54, 0), 0.34, 0.34, 0.04, DARK, verts=12),
]
for sx in (-1, 1):  # янтарные предупреждающие полосы и упоры
    base.append(bx((sx * 0.46, 0.3, 0.1), (0.04, 0.12, 0.6), AMBER))
    for sz in (-1, 1):
        base.append(bx((sx * 0.44, 0.14, sz * 0.44), (0.14, 0.2, 0.14), OLIVE))
base = bm.join(base)
head = [
    cone((0, top + 0.05, -0.02), 0.3, 0.3, 0.1, DARK, verts=12),       # подшипник
    bx((0, top + 0.17, -0.02), (0.5, 0.14, 0.5), OLIVE),                # лафет
    zcone((0, top + 0.34, -0.14), 0.19, 0.19, 0.42, RED, verts=10),     # главный бак горизонтально
    zcone((0, top + 0.34, -0.37), 0.19, 0.1, 0.06, DARK, verts=10),     # задняя крышка бака
    zcone((0, top + 0.34, -0.06), 0.2, 0.2, 0.05, AMBER, verts=10),     # пояс бака
    zcone((0, top + 0.34, -0.24), 0.2, 0.2, 0.05, AMBER, verts=10),
    zcone((0.0, top + 0.34, 0.2), 0.1, 0.1, 0.1, STEEL, verts=8),       # патрубок
    zcone((0, top + 0.34, 0.34), 0.12, 0.27, 0.2, DARK, verts=12),      # широкое сопло-раструб
    zcone((0, top + 0.34, 0.45), 0.29, 0.29, 0.04, AMBER, verts=12),    # янтарное кольцо на срезе
    bx((0, top + 0.5, -0.14), (0.08, 0.08, 0.12), STEEL),               # вентиль на баке
]
for sx in (-1, 1):  # два боковых баллона пониже
    head.append(zcone((sx * 0.3, top + 0.24, -0.16), 0.1, 0.1, 0.36, STEEL, verts=8))
    head.append(zcone((sx * 0.3, top + 0.24, -0.35), 0.1, 0.05, 0.04, DARK, verts=8))
head = bm.join(head)
bm.reduce(base, 450)
bm.reduce(head, 700)
bm.finish(base, "base")
bm.finish(head, "head")
bm.set_pivot(head, "head", (0, top, 0))
bm.export([base, head], "tower_flamethrower.glb")
print("BUILD tower_flamethrower", bm.tris(base), bm.tris(head))
