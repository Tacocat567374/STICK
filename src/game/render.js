import { skeletonPose, LIMBS, BODY_H } from './fighter';
import { drawWeapon } from './weapons';

function rrect(ctx, x, y, w, h, r) {
  const rr = Math.min(r, h / 2, w / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.lineTo(x + w - rr, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + rr);
  ctx.lineTo(x + w, y + h - rr);
  ctx.quadraticCurveTo(x + w, y + h, x + w - rr, y + h);
  ctx.lineTo(x + rr, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - rr);
  ctx.lineTo(x, y + rr);
  ctx.quadraticCurveTo(x, y, x + rr, y);
  ctx.closePath();
}

export function computeView(cw, ch, arena) {
  const scale = Math.min(cw / arena.width, ch / arena.height);
  return {
    scale,
    ox: (cw - arena.width * scale) / 2,
    oy: (ch - arena.height * scale) / 2,
  };
}

export function toWorld(px, py, view) {
  return { x: (px - view.ox) / view.scale, y: (py - view.oy) / view.scale };
}

const decoCache = new WeakMap();
function decorations(arena) {
  if (decoCache.has(arena)) return decoCache.get(arena);
  let seed = 0;
  for (let i = 0; i < arena.id.length; i++) seed = (seed * 31 + arena.id.charCodeAt(i)) % 99991;
  const rnd = () => {
    seed = (seed * 1103515245 + 12345) % 2147483648;
    return seed / 2147483648;
  };
  const shapes = [];
  for (let i = 0; i < 14; i++) {
    const w = 60 + rnd() * 150;
    shapes.push({ x: rnd() * arena.width, w, h: 80 + rnd() * 340 });
  }
  const deco = { shapes };
  decoCache.set(arena, deco);
  return deco;
}

function drawSky(ctx, arena) {
  const g = ctx.createLinearGradient(0, 0, 0, arena.height);
  g.addColorStop(0, arena.sky[0]);
  g.addColorStop(1, arena.sky[1]);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, arena.width, arena.height);

  ctx.globalAlpha = 0.16;
  ctx.fillStyle = arena.glow;
  ctx.beginPath();
  ctx.arc(arena.width * 0.76, arena.height * 0.26, 150, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 0.1;
  ctx.beginPath();
  ctx.arc(arena.width * 0.76, arena.height * 0.26, 250, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;

  const deco = decorations(arena);
  ctx.fillStyle = '#000';
  ctx.globalAlpha = 0.16;
  for (const s of deco.shapes) {
    ctx.fillRect(s.x, arena.height - s.h - 40, s.w, s.h);
  }
  ctx.globalAlpha = 1;
}

// Interactive arena furniture: bounce pads, launch cannons, spinning hazard bars.
function drawProps(ctx, arena, time) {
  const props = arena.props;
  if (!props || !props.length) return;
  for (const p of props) {
    if (p.type === 'bounce') {
      ctx.fillStyle = '#15131c';
      rrect(ctx, p.x, p.y, p.w, p.h, 8);
      ctx.fill();
      ctx.fillStyle = arena.glow;
      rrect(ctx, p.x + 3, p.y + 2, p.w - 6, p.h - 10, 6);
      ctx.fill();
      ctx.strokeStyle = arena.glow;
      ctx.lineWidth = 2;
      for (let i = 0; i < 3; i++) {
        const x = p.x + 14 + i * ((p.w - 28) / 2);
        ctx.beginPath();
        ctx.moveTo(x, p.y + p.h - 6);
        ctx.lineTo(x, p.y + p.h + 5);
        ctx.stroke();
      }
    } else if (p.type === 'cannon') {
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.angle);
      ctx.fillStyle = '#15131c';
      ctx.fillRect(0, -11, 46, 22);
      ctx.fillStyle = arena.accent;
      ctx.fillRect(38, -13, 10, 26);
      ctx.fillStyle = '#15131c';
      ctx.beginPath();
      ctx.arc(-4, 0, 15, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = arena.glow;
      ctx.beginPath();
      ctx.arc(-4, 0, 7, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    } else if (p.type === 'spinner') {
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate((time || 0) * (p.speed || 1.8));
      ctx.fillStyle = arena.edge;
      rrect(ctx, -p.len, -7, p.len * 2, 14, 6);
      ctx.fill();
      ctx.fillStyle = '#15131c';
      for (let i = 0; i < 4; i++) {
        ctx.beginPath();
        ctx.arc(-p.len + 16 + i * ((p.len * 2 - 32) / 3), 2, 3.4, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
      ctx.fillStyle = '#15131c';
      ctx.beginPath();
      ctx.arc(p.x, p.y, 9, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = arena.glow;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 4.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

function drawPlatforms(ctx, arena) {
  for (const p of arena.platforms) {
    ctx.fillStyle = arena.block;
    rrect(ctx, p.x, p.y, p.w, p.h, 9);
    ctx.fill();
    ctx.fillStyle = arena.edge;
    rrect(ctx, p.x + 3, p.y + 1, p.w - 6, 5, 3);
    ctx.fill();
    ctx.globalAlpha = 0.12;
    ctx.fillStyle = arena.edge;
    ctx.fillRect(p.x + 10, p.y + 12, p.w - 20, 2);
    ctx.globalAlpha = 1;
  }
  for (const h of arena.hazards) {
    if (h.type === 'spike') {
      ctx.fillStyle = arena.edge;
      const n = Math.floor(h.w / 22);
      for (let i = 0; i < n; i++) {
        const x = h.x + i * 22;
        ctx.beginPath();
        ctx.moveTo(x, h.y + 22);
        ctx.lineTo(x + 11, h.y - 14);
        ctx.lineTo(x + 22, h.y + 22);
        ctx.closePath();
        ctx.fill();
      }
      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      ctx.fillRect(h.x, h.y + 20, h.w, h.h);
    } else {
      ctx.fillStyle = 'rgba(0,0,0,0.68)';
      ctx.fillRect(h.x, h.y, h.w, h.h);
    }
  }
}

function drawFighter(ctx, f, showName) {
  const pose = skeletonPose(f);
  const s = f.scale || 1;
  const blink = f.spawnT > 0 && Math.floor(f.spawnT * 14) % 2 === 0;
  ctx.globalAlpha = blink ? 0.45 : 1;

  // ground shadow
  ctx.globalAlpha *= 0.9;
  ctx.fillStyle = 'rgba(0,0,0,0.28)';
  ctx.beginPath();
  ctx.ellipse(f.x, f.y + (BODY_H * s) / 2 + 2, 16 * s, 5 * s, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = blink ? 0.45 : 1;

  const ink = f.hurtT > 0 ? '#ff5d73' : '#15131c';
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.strokeStyle = ink;
  ctx.lineWidth = 5.5 * s;

  ctx.beginPath();
  ctx.moveTo(pose.pelvis.x, pose.pelvis.y);
  ctx.lineTo(pose.chest.x, pose.chest.y);
  ctx.stroke();

  ctx.lineWidth = 4.2 * s;
  ctx.beginPath();
  ctx.moveTo(pose.shoulderL.x, pose.shoulderL.y);
  ctx.lineTo(pose.handL.x, pose.handL.y);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(pose.shoulderR.x, pose.shoulderR.y);
  ctx.lineTo(pose.handR.x, pose.handR.y);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(pose.pelvis.x, pose.pelvis.y);
  ctx.lineTo(pose.kneeL.x, pose.kneeL.y);
  ctx.lineTo(pose.footL.x, pose.footL.y);
  ctx.moveTo(pose.pelvis.x, pose.pelvis.y);
  ctx.lineTo(pose.kneeR.x, pose.kneeR.y);
  ctx.lineTo(pose.footR.x, pose.footR.y);
  ctx.stroke();

  // neck + head
  ctx.lineWidth = 5 * s;
  ctx.beginPath();
  ctx.moveTo(pose.chest.x, pose.chest.y);
  ctx.lineTo(pose.head.x, pose.head.y + 3 * s);
  ctx.stroke();
  ctx.fillStyle = ink;
  ctx.beginPath();
  ctx.arc(pose.head.x, pose.head.y, 8.5 * s, 0, Math.PI * 2);
  ctx.fill();

  // colour trim: scarf
  ctx.strokeStyle = f.color;
  ctx.lineWidth = 4 * s;
  ctx.beginPath();
  ctx.moveTo(pose.chest.x - 7 * s, pose.chest.y + 1 * s);
  ctx.lineTo(pose.chest.x + 7 * s, pose.chest.y + 1 * s);
  ctx.stroke();
  const wind = Math.max(-1, Math.min(1, -f.vx / 600));
  ctx.beginPath();
  ctx.moveTo(pose.chest.x - 6 * s * wind, pose.chest.y + 1 * s);
  ctx.quadraticCurveTo(
    pose.chest.x - (14 + wind * 10) * s,
    pose.chest.y + 4 * s,
    pose.chest.x - (22 + wind * 26) * s,
    pose.chest.y - 3 * s + Math.sin((f.runPhase || 0) * 2) * 3 * s
  );
  ctx.lineWidth = 3.4 * s;
  ctx.stroke();

  // eyes
  ctx.fillStyle = f.color;
  const eyeDx = Math.cos(f.aim) * 2.6 * s;
  const eyeDy = Math.sin(f.aim) * 1.6 * s;
  ctx.beginPath();
  ctx.arc(pose.head.x - 3 * s + eyeDx, pose.head.y - 1.5 * s + eyeDy, 1.5 * s, 0, Math.PI * 2);
  ctx.arc(pose.head.x + 3 * s + eyeDx, pose.head.y - 1.5 * s + eyeDy, 1.5 * s, 0, Math.PI * 2);
  ctx.fill();

  drawWeapon(ctx, f.weapon, pose.handR.x, pose.handR.y, f.aim, f.facing);

  // health pip + name
  if (showName) {
    const w = 44 * s;
    const bx = f.x - w / 2;
    const by = f.y - 46 * s;
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    rrect(ctx, bx, by, w, 5 * s, 2.5 * s);
    ctx.fill();
    ctx.fillStyle = f.color;
    rrect(ctx, bx, by, Math.max(0, (f.hp / (f.maxHp || 100)) * w), 5 * s, 2.5 * s);
    ctx.fill();
    ctx.textAlign = 'center';
    if (s > 1.2) {
      ctx.fillStyle = '#ffd166';
      ctx.font = `700 ${Math.round(11 * s)}px "Space Grotesk", system-ui, sans-serif`;
      ctx.fillText('BOSS', f.x, by - 7 * s);
    }
    ctx.font = '700 12px "Space Grotesk", system-ui, sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,0.92)';
    ctx.fillText(f.name, f.x, by - (s > 1.2 ? 20 * s : 6));
  }
  ctx.globalAlpha = 1;
}

function drawDoll(ctx, doll, color) {
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.strokeStyle = '#15131c';
  ctx.lineWidth = 5;
  for (const [a, b] of LIMBS) {
    const pa = doll.pts[doll.idx[a]];
    const pb = doll.pts[doll.idx[b]];
    if (!pa || !pb) continue;
    ctx.beginPath();
    ctx.moveTo(pa.x, pa.y);
    ctx.lineTo(pb.x, pb.y);
    ctx.stroke();
  }
  const head = doll.pts[doll.idx.head];
  if (head) {
    ctx.fillStyle = '#15131c';
    ctx.beginPath();
    ctx.arc(head.x, head.y, 8.5, 0, Math.PI * 2);
    ctx.fill();
  }
  const chest = doll.pts[doll.idx.chest];
  if (chest && color) {
    ctx.strokeStyle = color;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(chest.x - 7, chest.y + 1);
    ctx.lineTo(chest.x + 7, chest.y + 1);
    ctx.stroke();
  }
}

function drawCrate(ctx, c) {
  ctx.save();
  ctx.translate(c.x, c.y);
  if (c.boss) {
    ctx.rotate(c.spin || 0);
    // golden boss head
    ctx.fillStyle = '#ffd166';
    ctx.beginPath();
    ctx.arc(0, 0, 16, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#15131c';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(-10, -5);
    ctx.lineTo(-3, -1);
    ctx.moveTo(10, -5);
    ctx.lineTo(3, -1);
    ctx.stroke();
    ctx.fillStyle = '#ff5d73';
    ctx.beginPath();
    ctx.arc(-5, 3, 2.4, 0, Math.PI * 2);
    ctx.arc(5, 3, 2.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    return;
  }
  ctx.rotate(c.spin || 0);
  ctx.fillStyle = '#f4f1e8';
  rrect(ctx, -14, -12, 28, 24, 5);
  ctx.fill();
  ctx.fillStyle = '#b8ff3d';
  ctx.fillRect(-14, -12, 28, 4);
  ctx.fillStyle = '#15131c';
  ctx.font = '700 13px "Space Grotesk", system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText((c.label || '?').slice(0, 4), 0, 1);
  ctx.restore();
}

function drawThrown(ctx, t) {
  ctx.save();
  ctx.translate(t.x, t.y);
  ctx.rotate(t.spin || 0);
  ctx.fillStyle = t.color || '#f4f1e8';
  rrect(ctx, -11, -4, 22, 8, 3);
  ctx.fill();
  ctx.fillStyle = '#15131c';
  ctx.fillRect(-2, -3, 4, 6);
  ctx.restore();
}

function drawBullets(ctx, bullets) {
  ctx.lineCap = 'round';
  for (const b of bullets) {
    const tx = b.x - b.vx * 0.016;
    const ty = b.y - b.vy * 0.016;
    ctx.strokeStyle = 'rgba(255,255,255,0.35)';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(tx, ty);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
    ctx.strokeStyle = b.color || '#ffd166';
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.moveTo(tx, ty);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
  }
}

function drawParticles(ctx, particles) {
  for (const p of particles) {
    const a = Math.max(0, p.life / p.maxLife);
    ctx.globalAlpha = a;
    ctx.fillStyle = p.color;
    const s = p.size * (0.4 + a * 0.6);
    if (p.type === 'ring') {
      ctx.strokeStyle = p.color;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(p.x, p.y, (1 - a) * 40 + 6, 0, Math.PI * 2);
      ctx.stroke();
    } else if (p.type === 'shock') {
      const r = (1 - a) * (p.radius || 200) + 8;
      ctx.strokeStyle = p.color;
      ctx.lineWidth = 2 + a * 8;
      ctx.beginPath();
      ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = a * 0.4;
      ctx.lineWidth = 2 + a * 16;
      ctx.beginPath();
      ctx.arc(p.x, p.y, r * 0.72, 0, Math.PI * 2);
      ctx.stroke();
    } else {
      ctx.fillRect(p.x - s / 2, p.y - s / 2, s, s);
    }
  }
  ctx.globalAlpha = 1;
}

export function drawScene(ctx, scene, view, opts = {}) {
  const canvasW = opts.canvasW || ctx.canvas.width;
  const canvasH = opts.canvasH || ctx.canvas.height;
  const arena = scene.arena;

  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = '#07060f';
  ctx.fillRect(0, 0, canvasW, canvasH);

  const shake = scene.shake || { x: 0, y: 0 };
  ctx.save();
  ctx.translate(view.ox + shake.x, view.oy + shake.y);
  ctx.scale(view.scale, view.scale);
  ctx.beginPath();
  ctx.rect(0, 0, arena.width, arena.height);
  ctx.clip();

  drawSky(ctx, arena);

  const local = scene.fighters.find((f) => f.id === opts.localId);
  if (local && local.alive && opts.reticle) {
    ctx.strokeStyle = 'rgba(255,255,255,0.55)';
    ctx.lineWidth = 1.4;
    ctx.setLineDash([6, 8]);
    ctx.beginPath();
    ctx.moveTo(local.x, local.y - 6);
    ctx.lineTo(opts.reticle.x, opts.reticle.y);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.beginPath();
    ctx.arc(opts.reticle.x, opts.reticle.y, 7, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(opts.reticle.x - 12, opts.reticle.y);
    ctx.lineTo(opts.reticle.x - 3, opts.reticle.y);
    ctx.moveTo(opts.reticle.x + 3, opts.reticle.y);
    ctx.lineTo(opts.reticle.x + 12, opts.reticle.y);
    ctx.moveTo(opts.reticle.x, opts.reticle.y - 12);
    ctx.lineTo(opts.reticle.x, opts.reticle.y - 3);
    ctx.moveTo(opts.reticle.x, opts.reticle.y + 3);
    ctx.lineTo(opts.reticle.x, opts.reticle.y + 12);
    ctx.stroke();
  }

  drawPlatforms(ctx, arena);
  drawProps(ctx, arena, scene.time || 0);

  for (const c of scene.crates) drawCrate(ctx, c);

  for (const r of scene.ragdolls) drawDoll(ctx, r.doll, r.color);

  for (const f of scene.fighters) {
    if (!f.alive) continue;
    drawFighter(ctx, f, opts.showNames !== false);
  }

  for (const t of scene.thrown || []) drawThrown(ctx, t);

  drawBullets(ctx, scene.bullets);
  drawParticles(ctx, scene.particles);

  ctx.restore();
}