"""Превью руин рядом с целыми башнями: blender -b -P tools/models/preview_ruins.py -> preview/ruins_{top,side}.png"""
import bpy, math, os
from mathutils import Vector
H = os.path.dirname(os.path.abspath(__file__))
M = os.path.join(H, "..", "..", "public", "assets", "models")
P = os.path.join(H, "preview")
names = ["tower_machinegun", "ruins_machinegun", "tower_rocket", "ruins_rocket"]
for o in list(bpy.data.objects): bpy.data.objects.remove(o)
objs = []
for i, n in enumerate(names):
    bpy.ops.import_scene.gltf(filepath=os.path.abspath(os.path.join(M, n + ".glb")))
    for o in bpy.context.selected_objects: objs.append((i, o))
bpy.ops.mesh.primitive_plane_add(size=30, location=(0, 0, -0.001))
bpy.context.object.data.materials.append(bpy.data.materials.new("floor"))
bpy.data.materials["floor"].diffuse_color = (0.45, 0.38, 0.28, 1)
sc = bpy.context.scene
sc.render.engine = "BLENDER_WORKBENCH"
sh = sc.display.shading; sh.light = "STUDIO"; sh.color_type = "VERTEX"; sh.show_shadows = True
sc.render.resolution_x, sc.render.resolution_y = 1200, 480
sc.world = bpy.data.worlds.new("w"); sc.world.color = (0.55, 0.65, 0.75)
cam = bpy.data.objects.new("c", bpy.data.cameras.new("c")); sc.collection.objects.link(cam); sc.camera = cam
cam.data.type = "ORTHO"; cam.data.ortho_scale = 5.2
def shot(elev, yaw, name):
    d = 14; e = math.radians(elev); y = math.radians(yaw)
    for i, o in objs:
        if o.parent is None:
            o.location.x = math.cos(y) * (i - 1.5) * 1.2; o.location.y = math.sin(y) * (i - 1.5) * 1.2
    tgt = Vector((0, 0, 0.3))
    cam.location = tgt + Vector((math.sin(y) * math.cos(e), -math.cos(y) * math.cos(e), math.sin(e))) * d
    cam.rotation_euler = (tgt - cam.location).to_track_quat("-Z", "Y").to_euler()
    sc.render.filepath = os.path.join(P, name); bpy.ops.render.render(write_still=True)
shot(50, 0, "ruins_top.png"); shot(12, 0, "ruins_side.png")
