"""Проверка GLB: python verify.py (чистый Python, без Blender). Таблица + код возврата 1 при нарушении."""
import json, struct, sys, os  # запуск: blender -b -P verify.py
M = os.path.join(os.path.dirname(os.path.abspath(sys.argv[-1] if sys.argv[-1].endswith(".py") else __file__)), "..", "..", "..", "public", "assets", "models")
LIM = {"enemy_grunt": 300, "enemy_grenadier": 300, "enemy_drone": 600, "enemy_runner": 300, "enemy_shield": 300, "deco_ruin": 80}
NODES = {"enemy_grunt": ["body", "legL", "legR"], "enemy_grenadier": ["body", "legL", "legR"], "enemy_runner": ["body", "legL", "legR"], "enemy_shield": ["body", "legL", "legR"]}
bad = 0
print("model | tris | bbox(x y z) | ymin | nodes | mats | col | anim/skin | verdict")
for n, lim in LIM.items():
    d = open(os.path.join(M, n + ".glb"), "rb").read()
    L = struct.unpack_from("<I", d, 12)[0]
    j = json.loads(d[20:20 + L])
    prims = [p for m in j["meshes"] for p in m["primitives"]]
    tris = sum(j["accessors"][p["indices"]]["count"] // 3 for p in prims)
    # границы в пространстве корня: локальные min/max примитива + перенос узла (точка вращения ног)
    ext = []
    for nd in j["nodes"]:
        t = nd.get("translation", [0, 0, 0])
        for p in j["meshes"][nd["mesh"]]["primitives"]:
            a = j["accessors"][p["attributes"]["POSITION"]]
            ext.append(([a["min"][i] + t[i] for i in range(3)], [a["max"][i] + t[i] for i in range(3)]))
    mn = [min(e[0][i] for e in ext) for i in range(3)]
    mx = [max(e[1][i] for e in ext) for i in range(3)]
    size = [round(mx[i] - mn[i], 2) for i in range(3)]
    nodes = [x["name"] for x in j["nodes"]]
    col = all("COLOR_0" in p["attributes"] and "NORMAL" in p["attributes"] for p in prims)
    mats = j.get("materials", [])
    pbr = mats[0]["pbrMetallicRoughness"] if mats else {}
    ok = (tris <= lim and sorted(nodes) == sorted(NODES.get(n, ["body"])) and len(mats) == 1 and col and abs(mn[1]) < 0.01
          and pbr.get("metallicFactor", 1) == 0 and pbr.get("roughnessFactor", 1) >= 0.89
          and "animations" not in j and "skins" not in j and abs((mn[0] + mx[0]) / 2) < 0.05 and abs((mn[2] + mx[2]) / 2) < 0.08)
    bad += not ok
    print(f"{n} | {tris}/{lim} | {size} | {mn[1]:.3f} | {nodes} | {len(mats)} | {col} | {'animations' in j or 'skins' in j} | {'OK' if ok else 'FAIL'}")
sys.exit(1 if bad else 0)
