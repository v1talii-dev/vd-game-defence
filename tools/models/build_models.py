# Сборка GLB-моделей башен и техники из Kenney (CC0) + процедурные части.
# Запуск: blender --background --python tools/models/build_models.py
# Контракт: клетка = 1.0, Y вверх, нос в +Z, один материал с vertex colors, без анимаций.
# Внутри Blender: Z вверх, нос -Y (экспорт glTF переводит в Y вверх, нос +Z).
import bpy, bmesh, os, math, colorsys
import numpy as np
from mathutils import Vector, Matrix

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
SRC = os.path.join(ROOT, "tools", "models", "_src")
OUT = os.path.join(ROOT, "public", "assets", "models")
TD = os.path.join(SRC, "tower-defense-kit", "Models", "GLB format")
CAR = os.path.join(SRC, "car-kit", "Models", "GLB format")
os.makedirs(OUT, exist_ok=True)


def lin(h):
    """sRGB hex -> линейный RGBA."""
    c = [int(h[i:i + 2], 16) / 255 for i in (1, 3, 5)]
    c = [(v / 12.92 if v <= 0.04045 else ((v + 0.055) / 1.055) ** 2.4) for v in c]
    return (*c, 1.0)


# main — корпус, dark — тёмные детали, neutral — металл, light — светлые части, accent — акцент
PLAYER = dict(main=lin("#5f6e4b"), dark=lin("#2c3138"), neutral=lin("#6d7b8b"), light=lin("#9aa7b4"), accent=lin("#e3a42e"))
ENEMY = dict(main=lin("#8e4330"), dark=lin("#2e2522"), neutral=lin("#7a5a45"), light=lin("#c9ab78"), accent=lin("#d8b350"))
BOSS = dict(main=lin("#6b1f22"), dark=lin("#1d1416"), neutral=lin("#4a3436"), light=lin("#b59a7a"), accent=lin("#e0c060"))
TREE = dict(main=lin("#4f6b3a"), dark=lin("#4a3626"), neutral=lin("#5b4a38"), light=lin("#7a8a50"), accent=lin("#6b7f42"))
ROCK = dict(main=lin("#a08a68"), dark=lin("#5e5040"), neutral=lin("#8a7a62"), light=lin("#c2ae88"), accent=lin("#8a7a62"))


def reset():
    bpy.ops.wm.read_factory_settings(use_empty=True)


def to_bl(x, y, z):
    """Игровые координаты (Y вверх, нос +Z) -> Blender (Z вверх, нос -Y)."""
    return Vector((x, -z, y))


def sel(o):
    bpy.ops.object.select_all(action='DESELECT')
    o.select_set(True)
    bpy.context.view_layer.objects.active = o


def apply_all(o):
    sel(o)
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)


def set_color(obj, rgba):
    me = obj.data
    if "Col" in me.color_attributes:
        me.color_attributes.remove(me.color_attributes["Col"])
    a = me.color_attributes.new("Col", 'FLOAT_COLOR', 'CORNER')
    a.data.foreach_set("color", list(rgba) * len(me.loops))


def box(name, c, s, color):
    """Параллелепипед: центр c и размеры s в игровых координатах."""
    bpy.ops.mesh.primitive_cube_add()
    o = bpy.context.object
    o.name = name
    o.scale = (s[0] / 2, s[2] / 2, s[1] / 2)
    o.location = to_bl(*c)
    apply_all(o)
    set_color(o, color)
    return o


def cyl(name, c, r, h, color, axis='Y', verts=10):
    bpy.ops.mesh.primitive_cylinder_add(vertices=verts, radius=r, depth=h)
    o = bpy.context.object
    o.name = name
    if axis == 'X':
        o.rotation_euler = (0, math.radians(90), 0)
    o.location = to_bl(*c)
    apply_all(o)
    set_color(o, color)
    return o


def load(path, theme):
    """Импорт GLB, перекраска по палитре темы, запекание трансформаций; один объект."""
    before = set(bpy.data.objects)
    bpy.ops.import_scene.gltf(filepath=path)
    new = [o for o in bpy.data.objects if o not in before]
    meshes = [o for o in new if o.type == 'MESH']
    for o in meshes:
        mw = o.matrix_world.copy()
        o.parent = None
        o.matrix_world = mw
    for o in new:
        if o.type != 'MESH':
            bpy.data.objects.remove(o)
    cache = {}
    for o in meshes:
        recolor(o, theme, cache)
    return join(meshes)


def recolor(o, theme, cache):
    """Цвет грани берём из colormap-текстуры Kenney и подменяем по HSV на цвет палитры."""
    me = o.data
    img = None
    for n in me.materials[0].node_tree.nodes:
        if n.type == 'TEX_IMAGE':
            img = n.image
    w, h = img.size
    if img.name not in cache:
        cache[img.name] = np.array(img.pixels[:], dtype=np.float32).reshape(h, w, 4)
    px = cache[img.name]
    uv = me.uv_layers.active.data
    out = np.zeros((len(me.loops), 4), dtype=np.float32)
    for poly in me.polygons:
        u = np.mean([uv[i].uv[0] for i in poly.loop_indices])
        v = np.mean([uv[i].uv[1] for i in poly.loop_indices])
        r, g, b, _ = px[min(h - 1, max(0, int(v * h))), min(w - 1, max(0, int(u * w)))]
        hh, ss, vv = colorsys.rgb_to_hsv(float(r), float(g), float(b))
        if vv < 0.06:
            base, k = theme["dark"], 1.0
        elif ss < 0.22:
            base, k = (theme["light"], 0.9 + 0.2 * vv) if vv > 0.5 else (theme["neutral"], 0.8 + 0.6 * vv)
        elif 0.04 < hh < 0.19 and ss > 0.55 and vv > 0.35:
            base, k = theme["accent"], 1.0
        else:
            base, k = theme["main"], 0.85 + 0.5 * vv
        c = (base[0] * k, base[1] * k, base[2] * k, 1.0)
        for i in poly.loop_indices:
            out[i] = c
    for a in list(me.color_attributes):
        me.color_attributes.remove(a)
    col = me.color_attributes.new("Col", 'FLOAT_COLOR', 'CORNER')
    col.data.foreach_set("color", out.ravel())


def join(objs):
    sel(objs[0])
    for o in objs:
        o.select_set(True)
    if len(objs) > 1:
        bpy.ops.object.join()
    o = bpy.context.object
    apply_all(o)
    return o


def bounds(o):
    pts = [o.matrix_world @ Vector(c) for c in o.bound_box]
    mn = Vector([min(p[i] for p in pts) for i in range(3)])
    mx = Vector([max(p[i] for p in pts) for i in range(3)])
    return mn, mx  # в координатах Blender


def scale_obj(o, s):
    o.scale = (s, s, s)
    apply_all(o)


def move_obj(o, v):
    o.location = Vector(v)
    apply_all(o)


def center_bottom(o):
    """Центр по XY в 0, низ на 0 (Blender Z)."""
    mn, mx = bounds(o)
    move_obj(o, (-(mn.x + mx.x) / 2, -(mn.y + mx.y) / 2, -mn.z))


def stack(parts):
    """Складывает детали друг на друга по высоте, центрирует по XY; возвращает один объект."""
    z = 0.0
    for p in parts:
        mn, mx = bounds(p)
        move_obj(p, (-(mn.x + mx.x) / 2, -(mn.y + mx.y) / 2, z - mn.z))
        z = bounds(p)[1].z
    return join(parts)


def tris(o):
    return sum(len(p.vertices) - 2 for p in o.data.polygons)


def reduce(o, budget):
    """Склейка вершин, dissolve, триангуляция, collapse до бюджета."""
    sel(o)
    bm = bmesh.new()
    bm.from_mesh(o.data)
    bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=1e-4)
    bm.to_mesh(o.data)
    bm.free()
    m = o.modifiers.new("d", 'DECIMATE')
    m.decimate_type = 'DISSOLVE'
    m.angle_limit = math.radians(4)
    bpy.ops.object.modifier_apply(modifier=m.name)
    m = o.modifiers.new("t", 'TRIANGULATE')
    bpy.ops.object.modifier_apply(modifier=m.name)
    n = tris(o)
    if n > budget:
        m = o.modifiers.new("c", 'DECIMATE')
        m.decimate_type = 'COLLAPSE'
        m.ratio = budget * 0.97 / n
        bpy.ops.object.modifier_apply(modifier=m.name)
    return tris(o)


def finish(o, name):
    """Плоское затенение, один материал с vertex colors (metallic 0, roughness 0.9)."""
    o.name = name
    o.data.name = name
    for p in o.data.polygons:
        p.use_smooth = False
    ca = o.data.color_attributes
    ca.active_color = ca["Col"]
    ca.render_color_index = ca.find("Col")
    o.data.materials.clear()
    mat = bpy.data.materials.get("palette")
    if mat is None:  # один материал на файл: переиспользуем между частями
        mat = bpy.data.materials.new("palette")
        mat.use_nodes = True
        nt = mat.node_tree
        bsdf = nt.nodes["Principled BSDF"]
        vc = nt.nodes.new("ShaderNodeVertexColor")
        vc.layer_name = "Col"
        nt.links.new(vc.outputs["Color"], bsdf.inputs["Base Color"])
        bsdf.inputs["Metallic"].default_value = 0.0
        bsdf.inputs["Roughness"].default_value = 0.9
    o.data.materials.append(mat)


def export(objs, fname):
    bpy.ops.object.select_all(action='DESELECT')
    for o in objs:
        o.select_set(True)
    bpy.ops.export_scene.gltf(
        filepath=os.path.join(OUT, fname), export_format='GLB', use_selection=True,
        export_apply=True, export_yup=True, export_animations=False, export_skins=False,
        export_cameras=False, export_lights=False, export_image_format='NONE', export_vertex_color='ACTIVE')


def set_pivot(o, name, pivot_game):
    """Origin объекта -> pivot (игровые координаты), вершины остаются на месте в мире."""
    p = to_bl(*pivot_game)
    o.data.transform(Matrix.Translation(-p))
    o.location = p
    o.name = name


# ---------- модели ----------

def tower(fname, kind):
    reset()
    th = PLAYER
    if kind == "mg":
        base = stack([load(os.path.join(TD, n), th) for n in ("tower-round-base.glb", "tower-round-top-a.glb")])
        head = load(os.path.join(TD, "weapon-turret.glb"), th)
    else:
        base = stack([load(os.path.join(TD, n), th) for n in ("tower-square-bottom-a.glb", "tower-square-top-a.glb")])
        cannon = load(os.path.join(TD, "weapon-cannon.glb"), th)
        parts = [cannon]
        for sx in (-1, 1):
            parts.append(box("pod", (sx * 0.21, 0.13, 0.0), (0.14, 0.14, 0.62), th["dark"]))
            parts.append(box("tip", (sx * 0.21, 0.13, 0.33), (0.15, 0.15, 0.05), th["accent"]))
        head = join(parts)
    bmn, bmx = bounds(base)
    s = min(0.8 / max(bmx.x - bmn.x, bmx.y - bmn.y), 0.5 / (bmx.z - bmn.z))
    scale_obj(base, s)
    center_bottom(base)
    top = bounds(base)[1].z
    hmn, hmx = bounds(head)
    scale_obj(head, min(s * 1.1, 0.38 / (hmx.z - hmn.z), 0.8 / max(hmx.x - hmn.x, hmx.y - hmn.y)))
    center_bottom(head)
    move_obj(head, (0, 0, top))
    reduce(base, 450)
    reduce(head, 500)
    finish(base, "base")
    finish(head, "head")
    set_pivot(head, "head", (0, top, 0))
    export([base, head], fname)
    return {"base": tris(base), "head": tris(head)}


def technical():
    reset()
    th = ENEMY
    truck = load(os.path.join(CAR, "truck-flat.glb"), th)
    mn, mx = bounds(truck)
    scale_obj(truck, 0.8 / (mx.y - mn.y))
    center_bottom(truck)
    mn, mx = bounds(truck)
    gun = load(os.path.join(TD, "weapon-turret.glb"), th)
    scale_obj(gun, 0.4)
    center_bottom(gun)
    # пулемёт в кузове (задняя часть: +Y в Blender), на высоте борта кузова
    move_obj(gun, (0, 0.13, mx.z * 0.66))
    body = join([truck, gun])
    reduce(body, 780)
    finish(body, "body")
    export([body], "enemy_technical.glb")
    return {"body": tris(body)}


def tank(fname, boss=False):
    reset()
    th = BOSS if boss else ENEMY
    parts = [
        box("hull", (0, 0.17, 0), (0.56, 0.16, 0.86), th["main"]),
        box("deck", (0, 0.27, -0.04), (0.5, 0.06, 0.66), th["neutral"]),
        box("glacis", (0, 0.22, 0.4), (0.5, 0.1, 0.16), th["main"]),
        box("light", (0.15, 0.23, 0.49), (0.07, 0.04, 0.03), th["accent"]),
        box("light", (-0.15, 0.23, 0.49), (0.07, 0.04, 0.03), th["accent"]),
    ]
    for sx in (-1, 1):
        parts.append(box("track", (sx * 0.33, 0.11, 0), (0.15, 0.22, 0.92), th["dark"]))
        parts.append(box("fender", (sx * 0.33, 0.235, 0), (0.17, 0.03, 0.94), th["main"]))
        for i in range(5):
            parts.append(cyl("wheel", (sx * 0.41, 0.11, -0.36 + i * 0.18), 0.075, 0.03, th["neutral"], axis='X', verts=8))
    if boss:  # боковые бронеплиты и задний бак
        for sx in (-1, 1):
            parts.append(box("skirt", (sx * 0.4, 0.2, 0), (0.04, 0.16, 0.7), th["neutral"]))
        parts.append(box("tank", (0, 0.34, -0.36), (0.36, 0.1, 0.16), th["dark"]))
    hull = join(parts)

    t = []  # башня целиком процедурная: пушка Kenney выглядит как бочка
    t.append(box("mantlet", (0, 0.1, 0.0), (0.34, 0.14, 0.36), th["main"]))
    t.append(box("cap", (0, 0.2, -0.04), (0.22, 0.06, 0.2), th["neutral"]))
    t.append(box("hatch", (0.07, 0.235, -0.08), (0.08, 0.03, 0.08), th["accent"]))
    if boss:
        t += [box("barrel", (sx * 0.1, 0.1, 0.42), (0.05, 0.05, 0.6), th["dark"]) for sx in (-1, 1)]
        t += [box("muzzle", (sx * 0.1, 0.1, 0.74), (0.07, 0.07, 0.06), th["accent"]) for sx in (-1, 1)]
        t += [box("spike", (sx * 0.2, 0.21, -0.1), (0.04, 0.1, 0.04), th["accent"]) for sx in (-1, 1)]
        t.append(box("plate", (0, 0.12, -0.2), (0.4, 0.12, 0.1), th["dark"]))
    else:
        t.append(box("barrel", (0, 0.1, 0.4), (0.06, 0.06, 0.5), th["dark"]))
    turret = join(t)

    # собираем в общий масштаб по длине (корпус + ствол)
    center_bottom(hull)
    hmn, hmx = bounds(hull)
    center_bottom(turret)
    tmn, tmx = bounds(turret)
    move_obj(turret, (0, 0, hmx.z))
    tmn, tmx = bounds(turret)
    L = max(hmx.y, tmx.y) - min(hmn.y, tmn.y)
    target = 1.3 if boss else 0.85
    s = target / L
    for o in (hull, turret):
        scale_obj(o, s)
    hmn, hmx = bounds(hull)
    off = (-(hmn.x + hmx.x) / 2, -(hmn.y + hmx.y) / 2, -hmn.z)
    for o in (hull, turret):
        move_obj(o, off)
    hmn, hmx = bounds(hull)
    top = hmx.z
    reduce(hull, 800 if not boss else 1000)
    reduce(turret, 650 if not boss else 950)
    finish(hull, "hull")
    finish(turret, "turret")
    set_pivot(turret, "turret", (0, top, 0))
    export([hull, turret], fname)
    return {"hull": tris(hull), "turret": tris(turret)}


def deco(fname, src, theme, size):
    reset()
    o = load(os.path.join(TD, src), theme)
    mn, mx = bounds(o)
    scale_obj(o, size / max(mx.x - mn.x, mx.y - mn.y, mx.z - mn.z))
    center_bottom(o)
    reduce(o, 300)
    finish(o, "deco")
    export([o], fname)
    return {"deco": tris(o)}


if __name__ == "__main__":
    r = {}
    # башни теперь собирает build_towers.py
    r["deco_tree"] = deco("deco_tree.glb", "detail-tree-large.glb", TREE, 0.7)
    r["deco_rock"] = deco("deco_rock.glb", "detail-rocks-large.glb", ROCK, 0.6)
    for k, v in r.items():
        print("BUILD", k, v)
