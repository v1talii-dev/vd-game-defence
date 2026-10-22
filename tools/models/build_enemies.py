# Оригинальные враги (танк, босс, техничка) из примитивов Blender, CC0.
# Запуск: blender -b -P tools/models/build_enemies.py
# Контракт: клетка = 1.0, Y вверх, нос/ствол в +Z, низ y=0, узлы hull+turret / body.
import sys, os, math
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import bpy
import build_models as bm

E, B = bm.ENEMY, bm.BOSS
BUD = {"enemy_tank.glb": (850, 650), "enemy_boss.glb": (1200, 1000), "enemy_technical.glb": (950,)}


def place(o, color, c, rot=(0, 0, 0)):
    o.rotation_euler = tuple(math.radians(a) for a in rot)
    o.location = bm.to_bl(*c)
    bm.apply_all(o)
    bm.set_color(o, color)
    return o


def bx(c, s, color, rx=0.0):
    """Параллелепипед: центр c, размеры s (игровые оси); rx — подъём носа в градусах."""
    bpy.ops.mesh.primitive_cube_add()
    o = bpy.context.object
    o.scale = (s[0] / 2, s[2] / 2, s[1] / 2)
    bm.apply_all(o)
    return place(o, color, c, (-rx, 0, 0))


def wheel(c, r, w, color, verts=10):
    """Цилиндр с осью вдоль игровой X."""
    bpy.ops.mesh.primitive_cylinder_add(vertices=verts, radius=r, depth=w)
    return place(bpy.context.object, color, c, (0, 90, 0))


def tube(c, r, l, color, verts=8, tilt=0.0):
    """Цилиндр вдоль игровой +Z, tilt — подъём носа."""
    bpy.ops.mesh.primitive_cylinder_add(vertices=verts, radius=r, depth=l)
    return place(bpy.context.object, color, c, (90 - tilt, 0, 0))


def post(c, r1, r2, h, color, verts=8):
    """Вертикальная усечённая призма."""
    bpy.ops.mesh.primitive_cone_add(vertices=verts, radius1=r1, radius2=r2, depth=h)
    return place(bpy.context.object, color, c, (0, 0, 22.5))


def run(fname, parts_fn, kind):
    bm.reset()
    out = parts_fn()
    if kind == "body":
        body = bm.join(out)
        n = bm.reduce(body, BUD[fname][0])
        bm.finish(body, "body")
        bm.export([body], fname)
        print("BUILD", fname, n)
        return
    hull, turret, top = bm.join(out[0]), bm.join(out[1]), out[2]
    n1, n2 = bm.reduce(hull, BUD[fname][0]), bm.reduce(turret, BUD[fname][1])
    bm.finish(hull, "hull")
    bm.finish(turret, "turret")
    bm.set_pivot(turret, "turret", (0, top, 0))
    bm.export([hull, turret], fname)
    print("BUILD", fname, n1, n2)


def tank_parts():
    th, hv = E, 0.28  # hv — верх корпуса
    h = [bx((0, 0.17, -0.02), (0.32, 0.14, 0.62), th["main"]),
         bx((0, 0.25, -0.03), (0.3, 0.05, 0.56), th["neutral"]),
         bx((0, 0.23, 0.31), (0.3, 0.03, 0.2), th["main"], rx=-38),       # скошенный лоб
         bx((0, 0.265, -0.26), (0.26, 0.03, 0.14), th["dark"]),            # решётка МТО
         bx((0, 0.2, -0.345), (0.3, 0.1, 0.03), th["main"]),               # корма
         bx((0.11, 0.22, 0.4), (0.06, 0.03, 0.03), th["accent"]),
         bx((-0.11, 0.22, 0.4), (0.06, 0.03, 0.03), th["accent"])]
    for sx in (-1, 1):
        x = sx * 0.235
        h.append(bx((x, 0.1, 0), (0.13, 0.19, 0.6), th["dark"]))            # гусеница
        h.append(wheel((x, 0.1, 0.31), 0.1, 0.13, th["dark"]))               # ленивец/ведущее
        h.append(wheel((x, 0.1, -0.31), 0.1, 0.13, th["dark"]))
        h.append(bx((x, 0.215, 0), (0.15, 0.025, 0.66), th["main"]))         # крыло
        h.append(bx((x, 0.215, 0.35), (0.15, 0.025, 0.1), th["main"], rx=-25))
        for i in range(5):
            h.append(wheel((x + sx * 0.012, 0.085, -0.25 + i * 0.125), 0.062, 0.13, th["neutral"]))
        h.append(tube((sx * 0.1, 0.24, -0.37), 0.02, 0.07, th["dark"]))      # выхлоп
    t = [post((0, hv + 0.02, -0.01), 0.17, 0.15, 0.04, th["dark"], 10),
         post((0, hv + 0.085, -0.01), 0.16, 0.12, 0.09, th["main"], 8),
         bx((0, hv + 0.09, -0.13), (0.22, 0.09, 0.1), th["main"]),            # ниша башни
         bx((0, hv + 0.09, 0.13), (0.17, 0.09, 0.07), th["neutral"]),         # мантлет
         tube((0, hv + 0.09, 0.33), 0.026, 0.34, th["dark"]),                  # ствол
         tube((0, hv + 0.09, 0.5), 0.04, 0.07, th["dark"]),                  # дульный тормоз
         post((-0.06, hv + 0.15, -0.06), 0.04, 0.04, 0.03, th["accent"], 8),  # люк
         bx((0.09, hv + 0.15, 0.0), (0.05, 0.015, 0.05), th["dark"]),
         bx((0.11, hv + 0.17, -0.08), (0.012, 0.1, 0.012), th["dark"])]       # антенна
    return h, t, hv


def boss_parts():
    th, hv = B, 0.34
    h = [bx((0, 0.2, -0.03), (0.5, 0.17, 0.92), th["main"]),
         bx((0, 0.3, -0.06), (0.46, 0.06, 0.78), th["neutral"]),
         bx((0, 0.26, 0.45), (0.5, 0.04, 0.26), th["main"], rx=-35),           # лобовой лист
         bx((0, 0.14, 0.52), (0.44, 0.1, 0.06), th["neutral"]),
         bx((0, 0.3, 0.25), (0.46, 0.05, 0.06), th["dark"]),                   # уступ
         bx((0, 0.33, -0.42), (0.38, 0.06, 0.2), th["dark"]),                  # решётка МТО
         bx((0, 0.22, -0.5), (0.5, 0.16, 0.04), th["main"]),
         bx((0.17, 0.27, 0.56), (0.08, 0.04, 0.03), th["accent"]),
         bx((-0.17, 0.27, 0.56), (0.08, 0.04, 0.03), th["accent"])]
    for sx in (-1, 1):
        x = sx * 0.33
        h.append(bx((x, 0.125, 0), (0.18, 0.24, 0.96), th["dark"]))
        h.append(wheel((x, 0.125, 0.47), 0.125, 0.18, th["dark"], 12))
        h.append(wheel((x, 0.125, -0.47), 0.125, 0.18, th["dark"], 12))
        for i in range(6):
            h.append(wheel((x + sx * 0.012, 0.1, -0.37 + i * 0.148), 0.075, 0.18, th["neutral"]))
        h.append(bx((sx * 0.43, 0.215, -0.02), (0.035, 0.17, 0.74), th["neutral"]))  # боковой экран
        h.append(bx((sx * 0.43, 0.31, -0.02), (0.05, 0.025, 0.78), th["main"]))
        h.append(bx((x, 0.27, 0.0), (0.2, 0.03, 0.94), th["main"]))                  # крыло
        h.append(tube((sx * 0.14, 0.3, -0.55), 0.03, 0.1, th["dark"]))              # выхлоп
        h.append(bx((sx * 0.12, 0.38, -0.4), (0.1, 0.1, 0.12), th["accent"]))        # ящик
    t = [post((0, hv + 0.02, -0.04), 0.27, 0.25, 0.04, th["dark"], 12),
         bx((0, hv + 0.1, -0.02), (0.44, 0.12, 0.4), th["main"]),
         bx((0, hv + 0.165, -0.05), (0.34, 0.03, 0.3), th["neutral"]),
         bx((0, hv + 0.09, 0.22), (0.4, 0.16, 0.14), th["neutral"], rx=-12),  # мантлет
         bx((0, hv + 0.1, -0.26), (0.36, 0.14, 0.14), th["main"]),             # корма башни
         bx((0, hv + 0.1, -0.35), (0.3, 0.1, 0.05), th["dark"])]
    for sx in (-1, 1):
        t.append(tube((sx * 0.11, hv + 0.1, 0.52), 0.032, 0.62, th["dark"]))     # двойной ствол
        t.append(tube((sx * 0.11, hv + 0.1, 0.8), 0.05, 0.1, th["dark"]))        # дульный тормоз
        t.append(tube((sx * 0.11, hv + 0.1, 0.84), 0.034, 0.03, th["accent"]))
        t.append(bx((sx * 0.25, hv + 0.14, 0.0), (0.06, 0.07, 0.14), th["dark"]))  # дымовые
        t.append(bx((sx * 0.17, hv + 0.34, -0.28), (0.012, 0.28, 0.012), th["dark"]))  # антенна
        t.append(bx((sx * 0.17, hv + 0.49, -0.28), (0.04, 0.03, 0.04), th["accent"]))
    t.append(post((0.1, hv + 0.2, -0.1), 0.06, 0.06, 0.04, th["accent"], 8))        # люк
    t.append(bx((-0.1, hv + 0.2, -0.1), (0.09, 0.03, 0.09), th["light"]))
    return h, t, hv


def tech_parts():
    th = E
    p = [bx((0, 0.2, 0), (0.36, 0.07, 0.86), th["dark"]),                        # рама
         bx((0, 0.3, 0.28), (0.42, 0.14, 0.28), th["main"]),                       # капот
         bx((0, 0.4, 0.14), (0.42, 0.16, 0.2), th["main"]),                      # кабина
         bx((0, 0.44, 0.14), (0.44, 0.06, 0.12), th["dark"]),                    # стекло
         bx((0, 0.5, 0.1), (0.4, 0.025, 0.2), th["neutral"]),                    # крыша
         bx((0, 0.22, 0.42), (0.5, 0.07, 0.06), th["accent"]),                   # бампер
         bx((0.14, 0.32, 0.43), (0.07, 0.05, 0.03), th["light"]),
         bx((-0.14, 0.32, 0.43), (0.07, 0.05, 0.03), th["light"]),
         bx((0, 0.26, -0.27), (0.46, 0.03, 0.42), th["neutral"]),                # пол кузова
         bx((0, 0.27, -0.455), (0.5, 0.13, 0.03), th["main"])]                   # задний борт
    for sx in (-1, 1):
        p.append(bx((sx * 0.23, 0.31, -0.27), (0.03, 0.12, 0.42), th["main"]))    # борта кузова
        for sz in (-1, 1):
            p.append(wheel((sx * 0.265, 0.12, sz * 0.29), 0.12, 0.1, th["dark"], 12))
            p.append(wheel((sx * 0.272, 0.12, sz * 0.29), 0.06, 0.1, th["light"], 8))
            p.append(bx((sx * 0.22, 0.25, sz * 0.29), (0.1, 0.03, 0.26), th["main"]))  # арка
    # пулемётная стойка по центру кузова, ствол слегка вверх
    p += [bx((0, 0.4, -0.28), (0.045, 0.28, 0.045), th["dark"]),
          bx((0, 0.55, -0.28), (0.12, 0.07, 0.12), th["neutral"]),
          bx((0, 0.59, -0.2), (0.16, 0.12, 0.025), th["dark"]),                  # щиток
          tube((0, 0.58, -0.1), 0.025, 0.26, th["dark"], tilt=6),
          tube((0, 0.595, 0.03), 0.04, 0.05, th["accent"], tilt=6),
          bx((0, 0.56, -0.36), (0.06, 0.06, 0.1), th["dark"])]
    return p


if __name__ == "__main__":
    run("enemy_tank.glb", tank_parts, "tank")
    run("enemy_boss.glb", boss_parts, "tank")
    run("enemy_technical.glb", tech_parts, "body")
