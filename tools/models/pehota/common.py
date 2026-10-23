"""Общие помощники: примитивы с цветом вершин, сборка одного меша `body`, экспорт GLB."""
import math, os, sys
import bpy, bmesh
from mathutils import Matrix, Vector

OUT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "..", "public", "assets", "models"))


def lin(c):
    """sRGB-триплет (0..1) в линейный."""
    return tuple(((v + 0.055) / 1.055) ** 2.4 if v > 0.04045 else v / 12.92 for v in c) + (1.0,)


def hexc(h):
    return lin(tuple(int(h[i:i + 2], 16) / 255 for i in (1, 3, 5)))


class Builder:
    def __init__(self):
        self.bm = bmesh.new()
        self.cols = []  # (face, color)

    def _add(self, geom_fn, m, color):
        before = {f for f in self.bm.faces}
        geom_fn()
        new = [f for f in self.bm.faces if f not in before]
        vs = {v for f in new for v in f.verts}
        bmesh.ops.transform(self.bm, matrix=m, verts=list(vs))
        for f in new:
            self.cols.append((f, color))

    def box(self, c, s, color, ry=0.0):
        """Бокс: центр c, размеры s, поворот вокруг Y (рад)."""
        m = Matrix.Translation(c) @ Matrix.Rotation(ry, 4, "Y") @ Matrix.Diagonal((s[0], s[1], s[2], 1))
        self._add(lambda: bmesh.ops.create_cube(self.bm, size=1.0), m, color)

    def prism(self, c, r, h, color, seg=6, r2=None):
        """Призма/усечённый конус по Y: центр c, радиус r (низ), r2 (верх)."""
        r2 = r if r2 is None else r2
        m = Matrix.Translation(c) @ Matrix.Rotation(math.pi / 2, 4, "X")  # ось конуса Z -> Y; radius1 уходит наверх
        self._add(lambda: bmesh.ops.create_cone(self.bm, cap_ends=True, segments=seg, radius1=r2, radius2=r, depth=h), m, color)

    def tube(self, c, r, length, color, seg=6, r2=None):
        """Цилиндр вдоль Z (вперёд +Z)."""
        r2 = r if r2 is None else r2
        m = Matrix.Translation(c)
        self._add(lambda: bmesh.ops.create_cone(self.bm, cap_ends=True, segments=seg, radius1=r, radius2=r2, depth=length), m, color)

    def finish(self, name, ground=True, shift=None):
        """shift — общий сдвиг (см. group_shift), чтобы части одной модели остались на своих местах."""
        bm = self.bm
        bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:])
        if shift is None:
            shift = group_shift([self], ground)
        bmesh.ops.translate(bm, verts=bm.verts[:], vec=shift)
        for f in bm.faces:
            f.smooth = False
        me = bpy.data.meshes.new(name)
        bm.to_mesh(me)
        layer = me.color_attributes.new("Col", "BYTE_COLOR", "CORNER")
        fcol = {f.index: col for f, col in self.cols}
        for poly in me.polygons:
            col = fcol[poly.index]
            for li in poly.loop_indices:
                layer.data[li].color = col
        return me


def group_shift(builders, ground=True):
    """Сдвиг, общий для группы частей: низ на y=0, центр bbox по XZ в начале координат."""
    vs = [v.co for b in builders for v in b.bm.verts]
    ymin = min(v.y for v in vs) if ground else 0.0
    xs = [v.x for v in vs]; zs = [v.z for v in vs]
    return (-(max(xs) + min(xs)) / 2, -ymin, -(max(zs) + min(zs)) / 2)


def export(me, name, extra=()):
    """Очистка сцены, объект `body` (+ extra: [(mesh, имя узла, точка вращения в игровых координатах)]),
    один материал, экспорт GLB (Y вверх). Точка вращения extra-узла — origin узла; вершины в мире не двигаются."""
    for o in list(bpy.data.objects):
        bpy.data.objects.remove(o)
    mat = None
    objs = []
    for m, n, pv in [(me, "body", (0, 0, 0))] + list(extra):
        m.transform(Matrix.Translation((-pv[0], -pv[1], -pv[2])))  # вершины относительно точки вращения
        o = bpy.data.objects.new(n, m)
        bpy.context.scene.collection.objects.link(o)
        # данные построены в Y-вверх; для экспортёра (+Y up) нужна Blender-Z-вверх: поворот +90° по X
        o.rotation_euler = (math.pi / 2, 0, 0)
        o.location = (pv[0], -pv[2], pv[1])
        objs.append(o)
    bpy.ops.object.select_all(action="DESELECT")
    for o in objs:
        o.select_set(True)
        bpy.context.view_layer.objects.active = o
    bpy.ops.object.transform_apply(location=False, rotation=True)
    obj = objs[0]
    mat = bpy.data.materials.new("mat")
    mat.use_nodes = True
    nt = mat.node_tree
    bsdf = nt.nodes["Principled BSDF"]
    bsdf.inputs["Metallic"].default_value = 0.0
    bsdf.inputs["Roughness"].default_value = 0.9
    attr = nt.nodes.new("ShaderNodeVertexColor")
    attr.layer_name = "Col"
    nt.links.new(attr.outputs["Color"], bsdf.inputs["Base Color"])
    for o in objs:
        o.data.materials.append(mat)
    os.makedirs(OUT, exist_ok=True)
    path = os.path.join(OUT, name + ".glb")
    bpy.ops.export_scene.gltf(filepath=path, export_format="GLB", export_yup=True, export_apply=True,
                              export_normals=True, export_animations=False, export_skins=False,
                              export_vertex_color="ACTIVE", export_all_vertex_colors=False,
                              use_selection=False)
    print("OK", path)
