# Оригинальные башни игрока (пулемётная и ракетная) из примитивов Blender, CC0.
# Запуск: blender -b -P tools/models/build_towers.py
# Контракт как в build_models.py: клетка = 1.0, Y вверх, ствол в +Z, узлы base/head, pivot head на верху основания.
import sys, os, math
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import bpy
import build_models as bm
from mathutils import Vector

P = bm.PLAYER
# палитра башен: серо-синий корпус, оливковые детали, тёмные стволы, янтарь
HULL, OLIVE, DARK, STEEL, SAND, AMBER = (bm.lin("#56677a"), bm.lin("#5f6e4b"), bm.lin("#23282e"),
                                         bm.lin("#8795a4"), bm.lin("#a39a76"), bm.lin("#e3a42e"))


def fin(o, color, c, rz=0.0, rx=0.0):
    o.rotation_euler = (math.radians(rx), 0, math.radians(rz))
    o.location = bm.to_bl(*c)
    bm.apply_all(o)
    bm.set_color(o, color)
    return o


def bx(c, s, color, rz=0.0):
    """Параллелепипед: центр c, размеры s (игровые оси), поворот rz вокруг вертикали."""
    bpy.ops.mesh.primitive_cube_add()
    o = bpy.context.object
    o.scale = (s[0] / 2, s[2] / 2, s[1] / 2)
    bm.apply_all(o)
    return fin(o, color, c, rz)


def cone(c, r1, r2, h, color, verts=8, rz=22.5):
    """Вертикальная усечённая призма: низ r1, верх r2; c — центр."""
    bpy.ops.mesh.primitive_cone_add(vertices=verts, radius1=r1, radius2=r2, depth=h)
    return fin(bpy.context.object, color, c, rz)


def tube(c, r, l, color, verts=10):
    """Цилиндр вдоль игровой оси +Z."""
    bpy.ops.mesh.primitive_cylinder_add(vertices=verts, radius=r, depth=l)
    return fin(bpy.context.object, color, c, 0, 90)


def tilt(o, deg, pivot):
    """Наклон ствольной группы вверх на deg вокруг оси X через точку pivot (игровые координаты)."""
    o.rotation_euler = (math.radians(-deg), 0, 0)
    bm.apply_all(o)
    bm.move_obj(o, bm.to_bl(*pivot))


def mg():
    bm.reset()
    base = [
        cone((0, 0.06, 0), 0.47, 0.47, 0.12, DARK),
        cone((0, 0.32, 0), 0.43, 0.34, 0.40, HULL),
        cone((0, 0.54, 0), 0.34, 0.34, 0.04, DARK),
        bx((0, 0.40, 0.24), (0.3, 0.1, 0.06), AMBER),  # янтарная полоса на борту
    ]
    for i in range(10):  # бруствер из мешков
        a = math.radians(i * 36 + 18)
        x, z = math.sin(a) * 0.41, math.cos(a) * 0.41
        base.append(bx((x, 0.2, z), (0.22, 0.16, 0.13), SAND, rz=-math.degrees(a)))
    base = bm.join(base)
    top = 0.56
    head = [
        bx((0, 0.76, -0.1), (0.5, 0.40, 0.44), OLIVE),            # кожух
        bx((0, 0.98, -0.1), (0.4, 0.06, 0.4), HULL),                # крыша
        cone((0, 1.06, -0.12), 0.17, 0.12, 0.12, STEEL, verts=8),   # башенка
        bx((0, 0.78, 0.15), (0.54, 0.34, 0.06), HULL),              # щит перед стволом
        bx((0, 0.9, 0.15), (0.5, 0.05, 0.07), AMBER),
        tube((0, 0.78, 0.4), 0.1, 0.42, STEEL),                     # кожух ствола
        tube((0, 0.78, 0.45), 0.065, 0.24, DARK),                    # ствол
        tube((0, 0.78, 0.565), 0.09, 0.07, DARK),                    # дульный тормоз
        bx((0, 0.78, -0.36), (0.2, 0.2, 0.1), DARK),                # казённик
        bx((0.32, 0.7, -0.02), (0.15, 0.28, 0.3), HULL),            # магазин сбоку
        bx((0.32, 0.86, -0.02), (0.16, 0.05, 0.31), AMBER),
        bx((-0.28, 0.98, -0.2), (0.03, 0.3, 0.03), DARK),           # антенна
        bx((-0.28, 1.14, -0.2), (0.07, 0.05, 0.07), AMBER),
    ]
    head = bm.join(head)
    return base, head, top


def rocket():
    bm.reset()
    base = [
        bx((0, 0.07, 0), (0.98, 0.14, 0.98), DARK),
        bx((0, 0.3, 0), (0.86, 0.32, 0.86), HULL),
        bx((0, 0.49, 0), (0.9, 0.06, 0.9), OLIVE),
        cone((0, 0.54, 0), 0.34, 0.34, 0.04, DARK, verts=12),
    ]
    for sx in (-1, 1):  # янтарные полосы и упоры по бортам
        base.append(bx((sx * 0.44, 0.3, 0), (0.04, 0.12, 0.7), AMBER))
        for sz in (-1, 1):
            base.append(bx((sx * 0.42, 0.14, sz * 0.42), (0.14, 0.2, 0.14), OLIVE))
    base = bm.join(base)
    top = 0.56
    # пакет труб в локальной системе (нос +Z, центр в 0), затем наклон на 30 градусов
    pack = [bx((0, 0, -0.1), (0.7, 0.7, 0.14), OLIVE),  # задняя стенка
            bx((0, 0, -0.17), (0.4, 0.4, 0.12), DARK)]
    for sx in (-1, 1):
        for sy in (-1, 1):
            c = (sx * 0.17, sy * 0.17, 0.15)
            pack.append(tube(c, 0.155, 0.6, HULL, verts=10))
            pack.append(tube((c[0], c[1], 0.455), 0.12, 0.03, DARK))        # тёмный торец
            pack.append(tube((c[0], c[1], 0.34), 0.17, 0.06, AMBER, verts=10))  # янтарный пояс
    pack.append(bx((0, 0, 0.15), (0.06, 0.66, 0.5), OLIVE))   # стяжки между трубами
    pack.append(bx((0, 0, 0.15), (0.66, 0.06, 0.5), OLIVE))
    pack = bm.join(pack)
    tilt(pack, 30, (0, top + 0.36, -0.02))
    cradle = [cone((0, top + 0.06, 0), 0.3, 0.3, 0.12, DARK, verts=12)]
    for sx in (-1, 1):
        cradle.append(bx((sx * 0.38, top + 0.28, -0.02), (0.08, 0.5, 0.34), HULL))
    cradle = bm.join(cradle)
    head = bm.join([pack, cradle])
    return base, head, top


def build(fname, fn, budgets):
    base, head, top = fn()
    # дно головы не должно уходить под основание: низ меша у y=top
    bm.reduce(base, budgets[0])
    bm.reduce(head, budgets[1])
    bm.finish(base, "base")
    bm.finish(head, "head")
    bm.set_pivot(head, "head", (0, top, 0))
    bm.export([base, head], fname)
    print("BUILD", fname, bm.tris(base), bm.tris(head))


build("tower_machinegun.glb", mg, (450, 700))
build("tower_rocket.glb", rocket, (300, 800))
