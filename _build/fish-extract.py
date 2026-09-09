# fishHologram.fbx  ->  compact web geometry for the "spiral" section.
#
# The FBX is 6 copies of ONE fish mesh (identical topology, 1694 verts / 1579
# tris) plus 8 "swirl" rings. We ship the fish ONCE with its 6 instance
# transforms, and for the rings we ship only their world-space centre + radius:
# the rings themselves are replaced by CSS-3D text rings (Alex's brief), so
# their geometry is never drawn.
#
# Output (assets/model/):
#   fish-pos.bin    int16 XYZ, Y-up, normalised (see QRANGE)
#   fish-nrm.bin    int8  XYZ normals
#   fish-idx.bin    uint16 triangle indices
#   fish-scene.json instance transforms + ring rings + meta
#
# Run: "C:\Program Files\Blender Foundation\Blender 5.1\blender.exe" \
#        --background --python _build/fish-extract.py
import bpy, json, os, math
from mathutils import Vector

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, "fish-hologram", "source", "extracted", "fishHologram.fbx")
OUT = os.path.join(ROOT, "assets", "model")
os.makedirs(OUT, exist_ok=True)

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.fbx(filepath=SRC)

fish = [o for o in bpy.data.objects if o.type == 'MESH' and o.name.startswith('fishA')]
rings = [o for o in bpy.data.objects if o.type == 'MESH' and o.name.startswith('swirl')]
fish.sort(key=lambda o: o.name)
rings.sort(key=lambda o: o.name)
print("fish:", [o.name for o in fish])
print("rings:", [o.name for o in rings])

# Blender Z-up -> web Y-up:  (x, y, z)_b -> (x, z, -y)
def toweb(v):
    return (v.x, v.z, -v.y)

# ---- world-space bounds of everything, to normalise the whole scene once ----
allpts = []
for o in fish + rings:
    mw = o.matrix_world
    for v in o.data.vertices:
        allpts.append(toweb(mw @ v.co))
xs = [p[0] for p in allpts]; ys = [p[1] for p in allpts]; zs = [p[2] for p in allpts]
cx = (min(xs)+max(xs))/2; cy = (min(ys)+max(ys))/2; cz = (min(zs)+max(zs))/2
span = max(max(xs)-min(xs), max(ys)-min(ys), max(zs)-min(zs))
K = 2.0 / span     # longest axis -> 2.0, same convention as the brain
print("scene span", round(span,4), "centre", (round(cx,4), round(cy,4), round(cz,4)))

def norm(p):
    return ((p[0]-cx)*K, (p[1]-cy)*K, (p[2]-cz)*K)

# ---- the fish mesh, taken from the FIRST fish in ITS OWN local space --------
# All six share topology; we keep local space and ship a per-instance matrix so
# the mesh is uploaded once.
base = fish[0]
me = base.data
me.calc_loop_triangles()
try:
    me.calc_normals_split()
except AttributeError:
    pass   # Blender 4.1+ computes split normals automatically

# vertex normals, averaged from loops (the mesh is smooth-shaded)
nrm = [Vector((0.0,0.0,0.0)) for _ in me.vertices]
for loop in me.loops:
    nrm[loop.vertex_index] += Vector(loop.normal)
for n in nrm:
    if n.length > 1e-9: n.normalize()

verts_local = [v.co.copy() for v in me.vertices]
tris = [tuple(t.vertices) for t in me.loop_triangles]
print("fish mesh verts", len(verts_local), "tris", len(tris))
assert len(verts_local) < 65536, "index buffer must stay uint16"

# fish local extent, so the quantisation range is tight
lx = [v.x for v in verts_local]; ly = [v.y for v in verts_local]; lz = [v.z for v in verts_local]
lspan = max(max(lx)-min(lx), max(ly)-min(ly), max(lz)-min(lz))
LQ = 1.05 * lspan / 2          # half-extent + 5% headroom
QSCALE = 32767.0 / LQ

import struct
pos = bytearray(); nb = bytearray()
for v, n in zip(verts_local, nrm):
    p = toweb(v); nn = toweb(n)
    for c in p:
        q = int(round(c * QSCALE))
        pos += struct.pack('<h', max(-32767, min(32767, q)))
    for c in nn:
        q = int(round(c * 127))
        nb += struct.pack('<b', max(-127, min(127, q)))
idx = bytearray()
for t in tris:
    # winding: Blender is CCW; the Z flip in toweb mirrors handedness, so swap
    for i in (t[0], t[2], t[1]):
        idx += struct.pack('<H', i)

open(os.path.join(OUT, "fish-pos.bin"), "wb").write(pos)
open(os.path.join(OUT, "fish-nrm.bin"), "wb").write(nb)
open(os.path.join(OUT, "fish-idx.bin"), "wb").write(idx)

# ---- per-fish instance transform, expressed in the normalised scene ---------
insts = []
for o in fish:
    mw = o.matrix_world
    loc, rot, scl = mw.decompose()
    e = rot.to_euler('XYZ')
    wl = norm(toweb(loc))
    # world-space bbox centre, which is what we actually want to place it by
    pts = [toweb(mw @ v.co) for v in o.data.vertices]
    bx = [p[0] for p in pts]; by = [p[1] for p in pts]; bz = [p[2] for p in pts]
    ctr = norm(((min(bx)+max(bx))/2, (min(by)+max(by))/2, (min(bz)+max(bz))/2))
    insts.append({
        "name": o.name,
        "centre": [round(c, 5) for c in ctr],
        "origin": [round(c, 5) for c in wl],
        # rotation as a matrix is safest across the axis flip: ship the 3x3
        "m3": [round(x, 6) for r in range(3) for x in (mw[0][r], mw[2][r], -mw[1][r])],
        "scale": round(scl.x * K, 6),
    })

# ---- rings: world-space centre + radius, for the CSS-3D text rings ----------
ringdata = []
for o in rings:
    mw = o.matrix_world
    pts = [toweb(mw @ v.co) for v in o.data.vertices]
    bx = [p[0] for p in pts]; by = [p[1] for p in pts]; bz = [p[2] for p in pts]
    ctr = ((min(bx)+max(bx))/2, (min(by)+max(by))/2, (min(bz)+max(bz))/2)
    nctr = norm(ctr)
    # radius in the XZ plane (the rings lie flat, Y is their axis)
    r = max(max(bx)-min(bx), max(bz)-min(bz)) / 2 * K
    thick = (max(by)-min(by)) * K
    ringdata.append({
        "name": o.name,
        "centre": [round(c, 5) for c in nctr],
        "radius": round(r, 5),
        "thickness": round(thick, 5),
    })

meta = {
    "fish": {
        "count": len(verts_local),
        "tris": len(tris),
        "quant": round(LQ / 32767.0, 12),
        "instances": insts,
    },
    "rings": ringdata,
    "sceneScale": round(K, 8),
}
json.dump(meta, open(os.path.join(OUT, "fish-scene.json"), "w"), indent=1)

print("--- RINGS ---")
for r in ringdata:
    print(" ", r["name"], "centre", r["centre"], "radius", r["radius"])
print("--- FISH ---")
for i in insts:
    print(" ", i["name"], "centre", i["centre"], "scale", i["scale"])
print("bytes: pos", len(pos), "nrm", len(nb), "idx", len(idx))
