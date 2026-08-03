#!/usr/bin/env python3
"""
Generates the scientific imagery used on the conference site.

These are procedurally rendered, illustrative micrograph-style images
(fluorescence-microscopy look, agar plate, FISH-style biofilm, and a
computational heatmap figure). They are generated locally so the site
ships with no third-party image licensing or hotlinking.

Run:  python3 tools/generate_images.py
Out:  public/img/*.jpg
"""

import math
import os
import random

import numpy as np
from PIL import Image, ImageDraw, ImageFilter
from scipy.ndimage import gaussian_filter

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(os.path.dirname(HERE), "public", "img")
os.makedirs(OUT, exist_ok=True)

rng = np.random.default_rng(20261025)
random.seed(20261025)


# ----------------------------------------------------------------------------
# helpers
# ----------------------------------------------------------------------------
def save(arr, name, quality=88):
    arr = np.clip(arr, 0, 1)
    img = Image.fromarray((arr * 255).astype(np.uint8))
    path = os.path.join(OUT, name)
    img.save(path, quality=quality, optimize=True, progressive=True)
    print(f"  wrote {name}  {img.size[0]}x{img.size[1]}")


def capsule_field(h, w, x0, y0, x1, y1, r):
    """Signed distance -> soft intensity mask for a rod (capsule) shape."""
    pad = int(r * 4 + 4)
    xmin = max(0, int(min(x0, x1) - pad))
    xmax = min(w, int(max(x0, x1) + pad))
    ymin = max(0, int(min(y0, y1) - pad))
    ymax = min(h, int(max(y0, y1) + pad))
    if xmax <= xmin or ymax <= ymin:
        return None
    ys, xs = np.mgrid[ymin:ymax, xmin:xmax]
    px, py = xs - x0, ys - y0
    dx, dy = x1 - x0, y1 - y0
    ll = dx * dx + dy * dy
    t = 0.0 if ll == 0 else np.clip((px * dx + py * dy) / ll, 0.0, 1.0)
    d = np.hypot(px - t * dx, py - t * dy)
    # soft membrane: bright rim, slightly dimmer core (like stained cells)
    body = np.clip(1.0 - (d / r) ** 3, 0.0, 1.0)
    rim = np.exp(-(((d - r * 0.72) / (r * 0.42)) ** 2))
    inten = body * 0.62 + rim * body * 0.75
    return (ymin, ymax, xmin, xmax), inten


def vignette(h, w, strength=0.55, power=1.7):
    ys, xs = np.mgrid[0:h, 0:w]
    cx, cy = w / 2, h / 2
    d = np.hypot((xs - cx) / cx, (ys - cy) / cy) / math.sqrt(2)
    return 1.0 - strength * (d ** power)


def grain(h, w, amount=0.018):
    g = rng.normal(0, 1, (h, w))
    g = gaussian_filter(g, 0.6)
    return g[..., None] * amount


def bloom(rgb, sigma=14, amount=0.45, thresh=0.45):
    lum = rgb.max(axis=2)
    mask = np.clip((lum - thresh) / (1 - thresh), 0, 1)[..., None]
    b = gaussian_filter(rgb * mask, (sigma, sigma, 0))
    return rgb + b * amount


# ----------------------------------------------------------------------------
# 1. Hero: fluorescence-microscopy style field of gut bacteria
# ----------------------------------------------------------------------------
def hero(w=2400, h=1350, name="hero-microbiome.jpg", seed=1):
    r_ = np.random.default_rng(seed)
    # deep background gradient (navy -> teal-black)
    ys, xs = np.mgrid[0:h, 0:w]
    gx, gy = xs / w, ys / h
    bg = np.zeros((h, w, 3))
    bg[..., 0] = 0.020 + 0.045 * (1 - gy) * gx
    bg[..., 1] = 0.045 + 0.085 * (1 - gy)
    bg[..., 2] = 0.090 + 0.130 * (1 - gy * 0.6)
    # faint nebulous mucus texture
    tex = gaussian_filter(r_.normal(0, 1, (h, w)), 55)
    tex = (tex - tex.min()) / (np.ptp(tex) + 1e-9)
    bg += (tex[..., None] - 0.5) * np.array([0.02, 0.05, 0.07]) * 2.0

    palette = [
        (0.30, 0.95, 0.90),   # cyan
        (0.35, 0.85, 1.00),   # sky
        (0.95, 0.80, 0.35),   # gold
        (0.55, 0.95, 0.65),   # green
        (0.95, 0.45, 0.70),   # magenta
        (0.80, 0.90, 1.00),   # white-blue
    ]

    # three depth layers: far (very blurred) -> near (sharp)
    layers = [
        dict(n=150, r=(9, 22), blur=16, gain=0.55),
        dict(n=190, r=(6, 14), blur=5.0, gain=0.85),
        dict(n=230, r=(4, 9), blur=0.9, gain=1.15),
    ]

    acc = bg.copy()
    for L in layers:
        layer = np.zeros((h, w, 3))
        for _ in range(L["n"]):
            r = r_.uniform(*L["r"])
            kind = r_.random()
            cx, cy = r_.uniform(-40, w + 40), r_.uniform(-40, h + 40)
            ang = r_.uniform(0, math.pi * 2)
            col = np.array(palette[r_.integers(0, len(palette))])
            col = col * r_.uniform(0.75, 1.15)
            if kind < 0.55:                      # rod / bacillus
                ln = r * r_.uniform(2.5, 7.5)
                x0, y0 = cx - math.cos(ang) * ln / 2, cy - math.sin(ang) * ln / 2
                x1, y1 = cx + math.cos(ang) * ln / 2, cy + math.sin(ang) * ln / 2
                segs = [(x0, y0, x1, y1, r)]
            elif kind < 0.78:                    # coccus chain
                n = r_.integers(2, 7)
                segs = []
                for i in range(n):
                    px = cx + math.cos(ang) * i * r * 2.05
                    py = cy + math.sin(ang) * i * r * 2.05
                    segs.append((px, py, px, py, r))
            else:                                # spirillum / curved rod
                n = 9
                ln = r * r_.uniform(6, 13)
                amp = r * r_.uniform(1.2, 2.6)
                pts = []
                for i in range(n):
                    t = i / (n - 1) - 0.5
                    ox, oy = t * ln, math.sin(t * math.pi * 2.2) * amp
                    pts.append((cx + ox * math.cos(ang) - oy * math.sin(ang),
                                cy + ox * math.sin(ang) + oy * math.cos(ang)))
                segs = [(pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1], r * 0.85)
                        for i in range(n - 1)]
            for (x0, y0, x1, y1, rr) in segs:
                res = capsule_field(h, w, x0, y0, x1, y1, rr)
                if res is None:
                    continue
                (ymin, ymax, xmin, xmax), inten = res
                layer[ymin:ymax, xmin:xmax] += inten[..., None] * col
        if L["blur"] > 0.2:
            layer = gaussian_filter(layer, (L["blur"], L["blur"], 0))
        acc += layer * L["gain"]

    acc = bloom(acc, sigma=22, amount=0.40, thresh=0.40)
    acc *= vignette(h, w, 0.60, 1.8)[..., None]
    acc += grain(h, w, 0.016)
    acc = np.clip(acc, 0, 1) ** 0.94          # gentle lift
    save(acc, name, quality=86)


# ----------------------------------------------------------------------------
# 2. FISH-style dense biofilm community (multi-channel look)
# ----------------------------------------------------------------------------
def biofilm(w=1600, h=1100, name="biofilm.jpg"):
    r_ = np.random.default_rng(7)
    acc = np.zeros((h, w, 3))
    acc[..., 2] += 0.05
    acc[..., 1] += 0.02
    palette = [
        (1.00, 0.25, 0.55), (0.20, 1.00, 0.70), (0.35, 0.65, 1.00),
        (1.00, 0.85, 0.30), (0.75, 0.40, 1.00), (0.30, 1.00, 0.95),
    ]
    # taxa cluster in patches, like a real FISH image
    centers = [(r_.uniform(0, w), r_.uniform(0, h), palette[i % len(palette)])
               for i in range(14)]
    for _ in range(2600):
        cx0, cy0, col = centers[r_.integers(0, len(centers))]
        cx = np.clip(r_.normal(cx0, 190), -30, w + 30)
        cy = np.clip(r_.normal(cy0, 150), -30, h + 30)
        r = r_.uniform(2.4, 5.6)
        ang = r_.uniform(0, math.pi * 2)
        ln = r * r_.uniform(1.6, 5.0)
        c = np.array(col) * r_.uniform(0.7, 1.2)
        x0, y0 = cx - math.cos(ang) * ln / 2, cy - math.sin(ang) * ln / 2
        x1, y1 = cx + math.cos(ang) * ln / 2, cy + math.sin(ang) * ln / 2
        res = capsule_field(h, w, x0, y0, x1, y1, r)
        if res is None:
            continue
        (ymin, ymax, xmin, xmax), inten = res
        acc[ymin:ymax, xmin:xmax] += inten[..., None] * c * 0.9
    acc = bloom(acc, sigma=10, amount=0.35, thresh=0.5)
    acc *= vignette(h, w, 0.5, 1.6)[..., None]
    acc += grain(h, w, 0.015)
    save(acc, name)


# ----------------------------------------------------------------------------
# 3. Agar plate with colonies (the "experimentally" image)
# ----------------------------------------------------------------------------
def agar(w=1400, h=1400, name="culture-plate.jpg"):
    r_ = np.random.default_rng(3)
    ys, xs = np.mgrid[0:h, 0:w]
    cx, cy, R = w / 2, h / 2, min(w, h) * 0.455
    d = np.hypot(xs - cx, ys - cy)

    img = np.zeros((h, w, 3))
    img[...] = np.array([0.055, 0.062, 0.085])           # dark bench
    benchtex = gaussian_filter(r_.normal(0, 1, (h, w)), 3)
    img += benchtex[..., None] * 0.012

    plate = np.clip(1 - (d - R) / 6.0, 0, 1)[..., None]
    agar_col = np.array([0.86, 0.72, 0.36])
    shade = 1.0 - 0.35 * np.clip(d / R, 0, 1) ** 2.2
    tex = gaussian_filter(r_.normal(0, 1, (h, w)), 8)
    agar_layer = agar_col * shade[..., None] + tex[..., None] * 0.035
    # streak marks
    for k in range(4):
        a = math.radians(-28 + k * 16)
        line = np.abs((xs - cx) * math.sin(a) - (ys - cy) * math.cos(a)) - k * 90 + 200
        agar_layer += np.exp(-(line ** 2) / 900)[..., None] * 0.03
    img = img * (1 - plate) + agar_layer * plate

    # colonies
    over = np.zeros((h, w, 3))
    for _ in range(230):
        ang = r_.uniform(0, math.pi * 2)
        rad = R * math.sqrt(r_.uniform(0, 1)) * 0.94
        px, py = cx + math.cos(ang) * rad, cy + math.sin(ang) * rad
        cr = r_.gamma(2.1, 5.0) + 3.5
        cr = min(cr, 42)
        pad = int(cr * 3 + 8)
        x0, x1 = max(0, int(px - pad)), min(w, int(px + pad))
        y0, y1 = max(0, int(py - pad)), min(h, int(py + pad))
        if x1 <= x0 or y1 <= y0:
            continue
        yy, xx = np.mgrid[y0:y1, x0:x1]
        dx, dy = xx - px, yy - py
        theta = np.arctan2(dy, dx)
        wob = 1.0
        for kk in (2, 3, 5, 7):
            wob += 0.055 * math.sin(kk * 1.0) * np.cos(kk * theta + r_.uniform(0, 6.3))
        dd = np.hypot(dx, dy) / (cr * wob)
        mask = np.clip(1 - (dd ** 8), 0, 1)
        dome = np.clip(1 - dd ** 2, 0, 1) ** 0.5
        hue = r_.random()
        if hue < 0.5:
            col = np.array([0.98, 0.96, 0.90])
        elif hue < 0.72:
            col = np.array([0.96, 0.82, 0.42])
        elif hue < 0.86:
            col = np.array([0.75, 0.86, 0.72])
        elif hue < 0.95:
            col = np.array([0.92, 0.55, 0.45])
        else:
            col = np.array([0.55, 0.62, 0.80])
        spec = np.clip(1 - np.hypot(dx + cr * 0.3, dy + cr * 0.3) / (cr * 0.55), 0, 1) ** 2
        patch = mask[..., None] * (col * (0.55 + 0.45 * dome)[..., None]) + spec[..., None] * 0.35
        sh = gaussian_filter(mask, cr * 0.35)
        over[y0:y1, x0:x1] -= sh[..., None] * 0.10
        over[y0:y1, x0:x1] = over[y0:y1, x0:x1] * (1 - mask[..., None]) + patch
    img = img + over * plate

    # glass rim + reflection
    rim = np.exp(-((d - R) ** 2) / 70)[..., None] * 0.30
    img += rim
    gl = np.exp(-(((xs - cx) * 0.5 + (ys - cy) * 1.0 + R * 0.85) ** 2) / 40000)
    img += (gl * np.clip(1 - d / R, 0, 1))[..., None] * 0.10
    img *= vignette(h, w, 0.42, 1.6)[..., None]
    img += grain(h, w, 0.012)
    save(img, name)


# ----------------------------------------------------------------------------
# 4. Computational figure: clustered abundance heatmap + dendrogram
# ----------------------------------------------------------------------------
def heatmap(w=1600, h=1000, name="computational.jpg"):
    r_ = np.random.default_rng(11)
    nrow, ncol = 62, 96
    # block-structured (co-abundance groups) data
    data = r_.normal(0, 0.35, (nrow, ncol))
    for _ in range(9):
        rs, re = sorted(r_.integers(0, nrow, 2))
        cs, ce = sorted(r_.integers(0, ncol, 2))
        if re - rs < 4 or ce - cs < 6:
            continue
        data[rs:re, cs:ce] += r_.normal(0, 1) * 1.5
    data += np.sin(np.linspace(0, 6, ncol))[None, :] * 0.25
    data = gaussian_filter(data, 0.7)
    data = (data - data.min()) / (np.ptp(data) + 1e-9)

    # custom navy -> teal -> cream -> gold colormap
    stops = np.array([
        [0.055, 0.105, 0.240],
        [0.075, 0.360, 0.470],
        [0.400, 0.720, 0.700],
        [0.960, 0.940, 0.880],
        [0.850, 0.680, 0.220],
        [0.560, 0.300, 0.110],
    ])
    t = data * (len(stops) - 1)
    i0 = np.clip(np.floor(t).astype(int), 0, len(stops) - 2)
    f = (t - i0)[..., None]
    grid = stops[i0] * (1 - f) + stops[i0 + 1] * f

    # upscale to pixels
    cell_w, cell_h = 14, 12
    hm_w, hm_h = ncol * cell_w, nrow * cell_h
    hm = np.repeat(np.repeat(grid, cell_h, axis=0), cell_w, axis=1)

    canvas = np.ones((h, w, 3)) * np.array([0.043, 0.078, 0.176])
    ox, oy = 210, 90
    hm_w = min(hm_w, w - ox - 40)
    hm_h = min(hm_h, h - oy - 60)
    canvas[oy:oy + hm_h, ox:ox + hm_w] = hm[:hm_h, :hm_w]

    img = Image.fromarray((np.clip(canvas, 0, 1) * 255).astype(np.uint8))
    dr = ImageDraw.Draw(img)

    # dendrogram on the left, drawn from a random binary merge tree
    def draw_dendro(items, x_right, x_left, y0, y1):
        pos = {i: y0 + (i + 0.5) * (y1 - y0) / len(items) for i in range(len(items))}
        active = list(range(len(items)))
        depth = {i: 0 for i in active}
        while len(active) > 1:
            a, b = sorted(r_.choice(len(active), 2, replace=False))
            ia, ib = active[a], active[b]
            dpt = max(depth[ia], depth[ib]) + 1
            xa = x_right - (x_right - x_left) * min(depth[ia] / 8, 1)
            xb = x_right - (x_right - x_left) * min(depth[ib] / 8, 1)
            xn = x_right - (x_right - x_left) * min(dpt / 8, 1)
            ya, yb = pos[ia], pos[ib]
            col = (140, 175, 205)
            dr.line([xa, ya, xn, ya], fill=col, width=2)
            dr.line([xb, yb, xn, yb], fill=col, width=2)
            dr.line([xn, ya, xn, yb], fill=col, width=2)
            new = max(pos) + 1
            pos[new] = (ya + yb) / 2
            depth[new] = dpt
            active = [x for k, x in enumerate(active) if k not in (a, b)] + [new]

    draw_dendro(range(nrow), ox - 12, 40, oy, oy + hm_h)

    # tick labels look
    for i in range(0, nrow, 2):
        y = oy + i * cell_h + cell_h / 2
        dr.line([ox - 8, y, ox - 3, y], fill=(120, 150, 185), width=1)
    for j in range(0, min(ncol, hm_w // cell_w), 6):
        x = ox + j * cell_w
        dr.line([x, oy + hm_h + 3, x, oy + hm_h + 9], fill=(120, 150, 185), width=1)

    arr = np.asarray(img).astype(np.float64) / 255.0
    arr *= vignette(h, w, 0.30, 1.5)[..., None]
    save(arr, name, quality=90)


# ----------------------------------------------------------------------------
# 5. Portrait placeholders (abstract, on-brand)
# ----------------------------------------------------------------------------
def speaker_tile(name, seed, hue):
    w = h = 640
    r_ = np.random.default_rng(seed)
    ys, xs = np.mgrid[0:h, 0:w]
    base = np.zeros((h, w, 3))
    g = ys / h
    base[...] = np.array(hue)[None, None, :] * (0.35 + 0.65 * (1 - g))[..., None]
    acc = base
    for _ in range(320):
        r = r_.uniform(3, 9)
        cx, cy = r_.uniform(0, w), r_.uniform(0, h)
        ang = r_.uniform(0, 6.283)
        ln = r * r_.uniform(2, 6)
        col = np.array([1.0, 0.98, 0.92]) * r_.uniform(0.3, 0.9)
        res = capsule_field(h, w, cx - math.cos(ang) * ln / 2, cy - math.sin(ang) * ln / 2,
                            cx + math.cos(ang) * ln / 2, cy + math.sin(ang) * ln / 2, r)
        if res is None:
            continue
        (ymin, ymax, xmin, xmax), inten = res
        acc[ymin:ymax, xmin:xmax] += inten[..., None] * col * 0.30
    acc = gaussian_filter(acc, (1.2, 1.2, 0))
    acc *= vignette(h, w, 0.35, 1.5)[..., None]
    save(acc, name, quality=84)


if __name__ == "__main__":
    print("generating imagery ...")
    hero()
    hero(w=1600, h=900, name="hero-mobile.jpg", seed=42)
    biofilm()
    agar()
    heatmap()
    speaker_tile("speaker-korem.jpg", 101, (0.055, 0.16, 0.34))
    speaker_tile("speaker-suez.jpg", 202, (0.09, 0.22, 0.26))
    speaker_tile("speaker-peter.jpg", 303, (0.20, 0.15, 0.30))
    print("done ->", OUT)
