// One compact frame of the world — what the host broadcasts over the wire and
// what the recorder stores for replays. Both share this exact shape.

import { getArena } from './arenas';
import { makeRagdoll, stepRagdoll } from './physics';
import { RAGDOLL_LINKS } from './fighter';

function roundPose(p) {
  const out = {};
  for (const k of Object.keys(p)) out[k] = { x: Math.round(p[k].x), y: Math.round(p[k].y) };
  return out;
}

export function serializeGame(g) {
  return {
    a: g.arenaIndex,
    md: g.mode,
    st: g.state,
    tm: Math.max(0, g.timer),
    t: Math.round(g.time * 100) / 100,
    rd: g.round,
    wn: g.winsNeeded,
    w: g.winner,
    fx: g.drainFx(),
    f: g.fighters.map((f) => ({
      i: f.id,
      n: f.name,
      c: f.color,
      x: Math.round(f.x * 10) / 10,
      y: Math.round(f.y * 10) / 10,
      vx: Math.round(f.vx),
      vy: Math.round(f.vy),
      fc: f.facing,
      ai: Math.round(f.aim * 100) / 100,
      hp: Math.max(0, Math.round(f.hp)),
      mh: f.maxHp,
      sc: Math.round(f.scale * 100) / 100,
      al: f.alive,
      wn: f.wins,
      w: f.weapon,
      am: f.ammo,
      og: f.onGround,
      rp: Math.round(f.runPhase * 100) / 100,
      aa: Math.round(f.attackAnim * 100) / 100,
      ht: Math.round(f.hurtT * 100) / 100,
      spt: Math.round(f.spawnT * 100) / 100,
      ps: f.personality,
      // Death travels with the frame, so replays (and late joiners) still get
      // the ragdoll fling instead of the fighter just vanishing.
      dp: f.deathPose ? roundPose(f.deathPose) : null,
      di: f.lastImpulse || null,
    })),
    b: g.bullets.map((b) => ({ x: Math.round(b.x), y: Math.round(b.y), vx: b.vx, vy: b.vy, c: b.color })),
    cr: g.crates.map((c) => ({ x: c.x, y: c.y, spin: c.spin || 0, l: c.label, b: c.boss ? 1 : 0 })),
    th: g.thrown.map((t) => ({
      x: Math.round(t.x),
      y: Math.round(t.y),
      vx: Math.round(t.vx),
      vy: Math.round(t.vy),
      w: t.weapon,
      c: t.color,
      sp: Math.round((t.spin || 0) * 100) / 100,
    })),
  };
}

const EMPTY_HUD = {
  state: 'waiting',
  timer: 0,
  round: 0,
  mode: 'brawl',
  arenaName: 'Waiting…',
  winsNeeded: 3,
  alive: 0,
  winner: null,
  players: [],
};

// Turns a stream of frames (live network, or a recorded clip) back into a
// renderable scene: smooths fighter positions and keeps the short-lived visuals
// (ragdolls, particles) ticking between frames.
export class SnapshotView {
  constructor() {
    this.latest = null;
    this.display = new Map();
    this.ragdolls = [];
    this.particles = [];
    this.bullets = [];
    this.crates = [];
    this.thrown = [];
    this.dead = new Set();
  }

  applySnapshot(data) {
    this.latest = data;
    // A new round means everyone is back on their feet, even if a frame or two
    // got missed — otherwise the next death would not spawn a ragdoll.
    if (data.rd !== this.roundSeen) {
      this.roundSeen = data.rd;
      this.dead.clear();
    }
    if (data.b) {
      this.bullets = data.b.map((b) => ({ x: b.x, y: b.y, vx: b.vx, vy: b.vy, color: b.c }));
    } else {
      this.bullets = [];
    }
    if (data.cr) {
      this.crates = data.cr.map((c) => ({ x: c.x, y: c.y, spin: c.spin, label: c.l, boss: !!c.b }));
    } else {
      this.crates = [];
    }
    if (data.th) {
      this.thrown = data.th.map((t) => ({ x: t.x, y: t.y, vx: t.vx, vy: t.vy, weapon: t.w, color: t.c, spin: t.sp }));
    } else {
      this.thrown = [];
    }
    if (data.fx) {
      for (const f of data.fx) {
        this.particles.push({
          x: f.x,
          y: f.y,
          vx: (Math.random() - 0.5) * 180,
          vy: (Math.random() - 0.5) * 180,
          life: 0.4,
          maxLife: 0.4,
          color: f.c,
          size: f.s,
        });
      }
      if (this.particles.length > 240) this.particles.splice(0, this.particles.length - 240);
    }
    this.spawnDeaths();
  }

  // A fighter that just went down gets its ragdoll spun up from the frame data.
  spawnDeaths() {
    const list = this.latest && this.latest.f;
    if (!list) return;
    for (const f of list) {
      if (f.al) {
        this.dead.delete(f.i);
        continue;
      }
      if (!f.dp || !f.di || this.dead.has(f.i)) continue;
      this.dead.add(f.i);
      this.ragdolls.push({ doll: makeRagdoll(f.dp, RAGDOLL_LINKS, f.di), color: f.c });
      if (this.ragdolls.length > 8) this.ragdolls.shift();
    }
  }

  advance(dt) {
    const arena = getArena(this.latest ? this.latest.a : 0);
    for (const d of this.ragdolls) stepRagdoll(d.doll, arena.platforms, arena.killY);
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= dt;
      if (p.life <= 0) {
        this.particles.splice(i, 1);
        continue;
      }
      p.vy += 620 * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
    }

    if (!this.latest) return;
    const k = Math.min(1, 22 * dt);
    for (const f of this.latest.f) {
      let d = this.display.get(f.i);
      if (!d) {
        d = { ...f, x: f.x, y: f.y };
        this.display.set(f.i, d);
      }
      d.x += (f.x - d.x) * k;
      d.y += (f.y - d.y) * k;
      Object.assign(d, f, { x: d.x, y: d.y });
    }
  }

  scene() {
    const s = this.latest;
    const arena = getArena(s ? s.a : 0);
    const fighters = s
      ? s.f.map((f) => ({
          id: f.i,
          name: f.n,
          color: f.c,
          x: this.display.get(f.i) ? this.display.get(f.i).x : f.x,
          y: this.display.get(f.i) ? this.display.get(f.i).y : f.y,
          vx: f.vx,
          vy: f.vy,
          facing: f.fc,
          aim: f.ai,
          hp: f.hp,
          maxHp: f.mh || 100,
          scale: f.sc || 1,
          alive: f.al,
          weapon: f.w,
          ammo: f.am,
          onGround: f.og,
          runPhase: f.rp,
          attackAnim: f.aa,
          hurtT: f.ht,
          spawnT: f.spt,
          wins: f.wn,
        }))
      : [];
    return {
      arena,
      arenaIndex: s ? s.a : 0,
      time: s ? s.t || 0 : 0,
      fighters,
      ragdolls: this.ragdolls,
      bullets: this.bullets,
      crates: this.crates,
      thrown: this.thrown,
      particles: this.particles,
      shake: { x: 0, y: 0, mag: 0 },
    };
  }

  hud() {
    const s = this.latest;
    if (!s) return EMPTY_HUD;
    return {
      state: s.st,
      timer: s.tm,
      round: s.rd,
      mode: s.md || 'brawl',
      arenaName: getArena(s.a).name,
      winsNeeded: s.wn,
      alive: s.f.filter((f) => f.al).length,
      winner: s.w,
      players: s.f.map((f) => ({
        id: f.i,
        name: f.n,
        color: f.c,
        hp: f.hp,
        maxHp: f.mh || 100,
        alive: f.al,
        wins: f.wn,
        isBot: false,
        boss: (f.sc || 1) > 1,
        weapon: f.w,
        ammo: f.am,
        personality: f.ps,
      })),
    };
  }
}