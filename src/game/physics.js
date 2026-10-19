// Lightweight verlet solver used for ragdoll deaths and debris.
// The whole game runs on a fixed 1/60 step, so per-step constants are fine.

const GRAVITY = 0.62; // px per step^2
const DAMP = 0.985;
const ITER = 6;

export function makePoint(x, y) {
  return { x, y, px: x, py: y };
}

export function makeRagdoll(pose, links, impulse) {
  const names = Object.keys(pose);
  const pts = {};
  for (const n of names) {
    const p = pose[n];
    const pt = makePoint(p.x, p.y);
    // carry the death impulse into the previous position so it moves
    pt.px = p.x - (impulse.x * (0.6 + Math.random() * 0.7)) / 3;
    pt.py = p.y - (impulse.y * (0.6 + Math.random() * 0.7)) / 3;
    pts[n] = pt;
  }
  const idx = {};
  names.forEach((n, i) => (idx[n] = i));
  const arr = names.map((n) => pts[n]);
  const cons = links
    .map(([a, b]) => {
      if (!pts[a] || !pts[b]) return null;
      return [idx[a], idx[b], Math.hypot(pts[a].x - pts[b].x, pts[a].y - pts[b].y)];
    })
    .filter(Boolean);
  return { names, pts: arr, idx, cons, rest: 0.985 };
}

function pushOut(p, box) {
  const l = p.x - box.x;
  const r = box.x + box.w - p.x;
  const t = p.y - box.y;
  const b = box.y + box.h - p.y;
  if (l <= 0 || r <= 0 || t <= 0 || b <= 0) return false;
  const m = Math.min(l, r, t, b);
  if (m === t) {
    p.y = box.y;
    p.px += (p.x - p.px) * 0.55;
    p.py = p.y - (p.y - p.py) * 0.25;
  } else if (m === b) {
    p.y = box.y + box.h;
  } else if (m === l) {
    p.x = box.x;
    p.px = p.x - (p.x - p.px) * 0.4;
  } else {
    p.x = box.x + box.w;
    p.px = p.x - (p.x - p.px) * 0.4;
  }
  return true;
}

export function stepRagdoll(doll, boxes, killY) {
  for (const p of doll.pts) {
    const vx = (p.x - p.px) * DAMP;
    const vy = (p.y - p.py) * DAMP;
    p.px = p.x;
    p.py = p.y;
    p.x += vx;
    p.y += vy + GRAVITY;
  }
  for (let it = 0; it < ITER; it++) {
    for (const [a, b, len] of doll.cons) {
      const pa = doll.pts[a];
      const pb = doll.pts[b];
      const dx = pb.x - pa.x;
      const dy = pb.y - pa.y;
      const d = Math.hypot(dx, dy) || 0.0001;
      const k = ((d - len) / d) * 0.5;
      const ox = dx * k;
      const oy = dy * k;
      pa.x += ox;
      pa.y += oy;
      pb.x -= ox;
      pb.y -= oy;
    }
    for (const p of doll.pts) {
      for (const box of boxes) pushOut(p, box);
      if (killY && p.y > killY) {
        p.y = killY;
        p.py = p.y;
        p.px += (p.x - p.px) * 0.6;
      }
    }
  }
}

export function ragdollSettled(doll, boxes) {
  let moving = 0;
  for (const p of doll.pts) {
    if (Math.abs(p.x - p.px) > 0.35 || Math.abs(p.y - p.py) > 0.35) moving++;
  }
  return moving === 0;
}