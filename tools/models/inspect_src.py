# Осмотр исходных GLB: узлы, треугольники, габариты. Аргументы после "--": пути к файлам.
import bpy, sys
from mathutils import Vector
for p in sys.argv[sys.argv.index("--")+1:]:
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=p)
    objs=[o for o in bpy.data.objects if o.type=='MESH']
    tris=sum(len(o.data.polygons) for o in objs)
    mn=Vector((1e9,)*3); mx=Vector((-1e9,)*3)
    for o in objs:
        for c in o.bound_box:
            w=o.matrix_world@Vector(c); mn=Vector(map(min,mn,w)); mx=Vector(map(max,mx,w))
    print("SRC",p.split("/")[-1],"polys",tris,"size",tuple(round(v,2) for v in (mx-mn)),"min",tuple(round(v,2) for v in mn),[o.name for o in bpy.data.objects])
