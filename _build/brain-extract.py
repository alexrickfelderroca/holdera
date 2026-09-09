# Brain.fbx  ->  compact, web-ready point cloud for the hero hologram.
#
# The FBX is 10.000 tiny icospheres (22 verts each) arranged in a brain. One
# point per icosphere is visually identical and ~11x smaller, so the hero
# ships ~70 KB instead of an 11,8 MB FBX.
#
# Output (assets/model/):
#   brain-points.bin  int16 XYZ, Y-up, centred, longest axis normalised to 2.0
#   brain-sizes.bin   uint8 per-point radius (relative to the median particle)
#   brain-points.json meta (count, quantisation scale) read by the loader
#
# Run:  "C:\Program Files\Blender Foundation\Blender 5.1\blender.exe" \
#         --background --python _build/brain-extract.py
import bpy, json, os, struct

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, "brain-hologram", "source", "Brain.fbx")
OUT_DIR = os.path.join(ROOT, "assets", "model")
os.makedirs(OUT_DIR, exist_ok=True)

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.fbx(filepath=SRC)

ob = next(o for o in bpy.data.objects if o.type == 'MESH')
me = ob.data
mw = ob.matrix_world
nv = len(me.vertices)

# ---- union-find over the edges: one component per icosphere ----
parent = list(range(nv))
def find(x):
    while parent[x] != x:
        parent[x] = parent[parent[x]]
        x = parent[x]
    return x
for e in me.edges:
    ra, rb = find(e.vertices[0]), find(e.vertices[1])
    if ra != rb:
        parent[rb] = ra

co = [mw @ v.co for v in me.vertices]

# accumulate centroid + extent per component
acc = {}
for i in range(nv):
    r = find(i)
    g = acc.get(r)
    if g is None:
        acc[r] = g = [0.0, 0.0, 0.0, 0, 1e9, 1e9, -1e9, -1e9]
    v = co[i]
    g[0] += v.x; g[1] += v.y; g[2] += v.z; g[3] += 1
    if v.x < g[4]: g[4] = v.x
    if v.y < g[5]: g[5] = v.y
    if v.x > g[6]: g[6] = v.x
    if v.y > g[7]: g[7] = v.y

# Blender is Z-up, three.js is Y-up:  (x, y, z)_blender -> (x, z, -y)_three
pts = []
for g in acc.values():
    n = g[3]
    bx, by, bz = g[0]/n, g[1]/n, g[2]/n
    rad = max(g[6]-g[4], g[7]-g[5]) * 0.5
    pts.append((bx, bz, -by, rad))

print("verts", nv, "particles", len(pts), "verts/particle", nv / max(len(pts), 1))

xs = [p[0] for p in pts]; ys = [p[1] for p in pts]; zs = [p[2] for p in pts]
cx = (min(xs)+max(xs))/2; cy = (min(ys)+max(ys))/2; cz = (min(zs)+max(zs))/2
span = max(max(xs)-min(xs), max(ys)-min(ys), max(zs)-min(zs))
k = 2.0 / span

radii = sorted(p[3] for p in pts)
med_r = radii[len(radii)//2]

# int16 quantisation over a fixed +-1.2 unit box (the normalised cloud fits in
# +-1.0; the margin keeps the scale a round number and leaves headroom)
QRANGE = 1.2
QSCALE = 32767.0 / QRANGE

pts.sort(key=lambda p: p[1])   # bottom-up order, in case of a progressive reveal

pbuf = bytearray()
sbuf = bytearray()
for (x, y, z, r) in pts:
    nx, ny, nz = (x-cx)*k, (y-cy)*k, (z-cz)*k
    pbuf += struct.pack('<hhh',
                        int(round(max(-32767, min(32767, nx * QSCALE)))),
                        int(round(max(-32767, min(32767, ny * QSCALE)))),
                        int(round(max(-32767, min(32767, nz * QSCALE)))))
    sbuf.append(int(max(0, min(255, round((r / (med_r * 2.0)) * 255)))))

open(os.path.join(OUT_DIR, "brain-points.bin"), "wb").write(bytes(pbuf))
open(os.path.join(OUT_DIR, "brain-sizes.bin"), "wb").write(bytes(sbuf))

# the two FBX materials are radially interleaved (both median r ~= 0.73), so they
# carry no spatial information: variation is generated in-shader instead.
stale = os.path.join(OUT_DIR, "brain-mats.bin")
if os.path.exists(stale):
    os.remove(stale)

meta = {
    "count": len(pts),
    "format": "int16 xyz, Y-up, centred, longest axis = 2.0",
    "quantScale": QRANGE / 32767.0,
    "source": "brain-hologram/source/Brain.fbx",
    "sourceVerts": nv,
    "medianParticleRadius": med_r,
}
json.dump(meta, open(os.path.join(OUT_DIR, "brain-points.json"), "w"), indent=1)
print("###META###", json.dumps(meta))
