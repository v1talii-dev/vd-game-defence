"""Контактный лист: blender -b -P preview.py -> tools/models/preview/pehota_{top,side}.png"""
import bpy, math, os
from mathutils import Vector
H = os.path.dirname(os.path.abspath(__file__))
M = os.path.join(H, "..", "..", "..", "public", "assets", "models")
P = os.path.abspath(os.path.join(H, "..", "preview"))
names = ["enemy_grunt", "enemy_grenadier", "enemy_drone", "deco_ruin"]
for o in list(bpy.data.objects): bpy.data.objects.remove(o)
objs = []
for i, n in enumerate(names):
    bpy.ops.import_scene.gltf(filepath=os.path.abspath(os.path.join(M, n + ".glb")))
    for o in bpy.context.selected_objects:
        objs.append((i, o))
# пол
bpy.ops.mesh.primitive_plane_add(size=30, location=(0, 0, -0.001))
bpy.context.object.data.materials.append(bpy.data.materials.new("floor"))
bpy.data.materials["floor"].diffuse_color = (0.45, 0.38, 0.28, 1)
sc = bpy.context.scene
sc.render.engine = "BLENDER_WORKBENCH"
sh = sc.display.shading
sh.light = "STUDIO"; sh.color_type = "VERTEX"; sh.show_shadows = True
sc.render.resolution_x, sc.render.resolution_y = 1400, 520
sc.world = bpy.data.worlds.new("w"); sc.world.color = (0.55, 0.65, 0.75)
cam = bpy.data.objects.new("c", bpy.data.cameras.new("c")); sc.collection.objects.link(cam); sc.camera = cam
cam.data.type = "ORTHO"; cam.data.ortho_scale = 3.6
def shot(elev, yaw, name):
    d = 12; e = math.radians(elev); y = math.radians(yaw)
    for i, o in objs:
        o.location.x = math.cos(y) * (i - 1.5) * 0.85; o.location.y = math.sin(y) * (i - 1.5) * 0.85
    tgt = Vector((0, 0, 0.25))
    # glTF +Z (фронт) = Blender -Y; камера смотрит на фронт, если стоит в -Y
    cam.location = tgt + Vector((math.sin(y) * math.cos(e), -math.cos(y) * math.cos(e), math.sin(e))) * d
    cam.rotation_euler = (tgt - cam.location).to_track_quat("-Z", "Y").to_euler()
    sc.render.filepath = os.path.join(P, name); bpy.ops.render.render(write_still=True)
shot(50, 45, "pehota_top.png"); shot(10, 30, "pehota_side.png")
