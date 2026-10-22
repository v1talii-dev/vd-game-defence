# Контактный лист: все модели в ряд, вид сверху под 45° и сбоку. Запуск: blender -b --python tools/models/render_preview.py
import bpy, os, math
from mathutils import Vector

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
MODELS = os.path.join(ROOT, "public", "assets", "models")
OUT = os.path.join(ROOT, "tools", "models", "preview")
NAMES = os.environ.get("PREVIEW", "tower_machinegun,tower_rocket,enemy_technical,enemy_tank,enemy_boss,deco_tree,deco_rock").split(",")
os.makedirs(OUT, exist_ok=True)

bpy.ops.wm.read_factory_settings(use_empty=True)
rot = []
for i, n in enumerate(NAMES):
    bpy.ops.import_scene.gltf(filepath=os.path.join(MODELS, n + ".glb"))
    top = [o for o in bpy.context.selected_objects if o.parent is None]
    for o in top:
        o.location.x += i * 1.6  # ряд вдоль X
        o.rotation_mode = 'XYZ'  # glTF даёт кватернионы, euler иначе игнорируется
        rot.append(o)
    # игровой +Z (нос) в Blender это -Y: камера "сверху-спереди" смотрит с -Y
scene = bpy.context.scene
scene.render.engine = 'BLENDER_WORKBENCH'
sh = scene.display.shading
sh.light = 'STUDIO'
sh.color_type = 'VERTEX'
sh.show_shadows = True
scene.render.resolution_x = int(os.environ.get('W', 2200))
scene.render.resolution_y = 600
scene.render.film_transparent = False
scene.world = bpy.data.worlds.new("w")
scene.world.color = (0.55, 0.6, 0.65)
cx = (len(NAMES) - 1) * 0.8
cam_data = bpy.data.cameras.new("c")
cam_data.type = 'ORTHO'
cam_data.ortho_scale = float(os.environ.get('SCALE', 12.5))
cam = bpy.data.objects.new("c", cam_data)
scene.collection.objects.link(cam)
scene.camera = cam


def shot(name, elev_deg, azim_deg):
    e, a = math.radians(elev_deg), math.radians(azim_deg)
    d = 10
    tgt = Vector((cx, 0, 0.1))
    cam.location = tgt + Vector((math.sin(a) * math.cos(e), -math.cos(a) * math.cos(e), math.sin(e))) * d
    cam.rotation_euler = (tgt - cam.location).to_track_quat('-Z', 'Y').to_euler()
    scene.render.filepath = os.path.join(OUT, name)
    bpy.ops.render.render(write_still=True)


shot("tech_top45.png", 50, 25)
for o in rot: o.rotation_euler.z = math.radians(135)
shot("tech_top50_rot.png", 50, 25)
for o in rot: o.rotation_euler.z = 0
for o in rot: o.rotation_euler.z = math.radians(90)  # сбоку: ряд вдоль взгляда не мешает
shot("tech_side.png", 8, 0)
for o in rot: o.rotation_euler.z = 0
shot("tech_front.png", 20, 0)  # спереди: ствол должен смотреть на камеру
