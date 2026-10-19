import { Game } from './engine';
import { getArena } from './arenas';
import { makeRagdoll, stepRagdoll } from './physics';
import { RAGDOLL_LINKS } from './fighter';

export const PALETTE = [
  '#b8ff3d',
  '#ff5d73',
  '#6fe8ff',
  '#ffd166',
  '#c9a7ff',
  '#8ef0c0',
  '#ff8a5c',
  '#f4f1e8',
];

export function fighterId(seat) {
  return `p${seat}`;
}

const SEND_HZ = 20;

// ---------- Solo ----------
export class SoloSession {
  constructor({ roster, localId, arenaIndex = 0, winsNeeded = 3, difficulty = 'normal' }) {
    this.localId = localId;
    this.game = new Game({ roster, localId, arenaIndex, winsNeeded, difficulty });
  }
  tick(dt) {
    this.game.tick(dt);
  }
  setInput(input) {
    this.game.setInput(this.localId, input);
  }
  scene() {
    return this.game.scene();
  }
  hud() {
    return this.game.hud();
  }
}

// ---------- Online host (authoritative simulation + snapshot broadcast) ----------
export class HostSession {
  constructor({ room, roster, localId, winsNeeded = 3 }) {
    this.room = room;
    this.localId = localId;
    this.game = new Game({ roster, localId, arenaIndex: 0, winsNeeded });
    this.seatOf = {};
    roster.forEach((r) => {
      this.seatOf[r.id] = r.seat;
    });
    this.snapT = 0;
  }

  setRoster(players) {
    const wanted = new Set(players.map((p) => fighterId(p.seat)));
    // drop fighters whose seat is gone
    this.game.fighters = this.game.fighters.filter((f) => wanted.has(f.id));
    for (const p of players) {
      const id = fighterId(p.seat);
      this.seatOf[id] = p.seat;
      if (!this.game.fighters.find((f) => f.id === id)) {
        const spawns = this.game.arena.spawns;
        const s = spawns[(p.seat * 3) % spawns.length];
        this.game.addFighter({
          id,
          name: p.name,
          color: PALETTE[p.color % PALETTE.length],
          isBot: !!p.bot,
          x: s.x,
          y: s.y - 220,
        });
      } else {
        const f = this.game.fighters.find((x) => x.id === id);
        f.name = p.name;
        f.color = PALETTE[p.color % PALETTE.length];
      }
    }
  }

  setRemoteInput(seat, input) {
    this.game.setInput(fighterId(seat), input);
  }

  setInput(input) {
    this.game.setInput(this.localId, input);
  }

  tick(dt) {
    this.game.tick(dt);
    const events = this.game.drainEvents();
    for (const e of events) {
      if (e.type === 'death') {
        this.room.send({
          type: 'event',
          data: { t: 'death', id: e.id, color: e.color, pose: e.pose, imp: e.imp },
        });
      } else if (e.type === 'roundStart') {
        this.room.send({ type: 'event', data: { t: 'roundStart', round: e.round, arenaIndex: e.arenaIndex } });
      }
    }
    this.snapT += dt;
    if (this.snapT >= 1 / SEND_HZ) {
      this.snapT = 0;
      const fx = this.game.drainFx();
      this.room.send({ type: 'snap', data: this.serialize(fx) });
    }
  }

  serialize(fx) {
    const g = this.game;
    return {
      a: g.arenaIndex,
      st: g.state,
      tm: Math.max(0, g.timer),
      rd: g.round,
      wn: g.winsNeeded,
      w: g.winner,
      fx,
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

  scene() {
    return this.game.scene();
  }

  hud() {
    return this.game.hud();
  }
}

// ---------- Online guest (renders streamed state) ----------
export class GuestSession {
  constructor({ room }) {
    this.room = room;
    this.latest = null;
    this.display = new Map();
    this.ragdolls = [];
    this.particles = [];
    this.bullets = [];
    this.crates = [];
    this.thrown = [];
    this.sendT = 0;
    this.input = { left: false, right: false, jump: false, attack: false, throw: false, aim: 0 };
  }

  onSnapshot(data) {
    this.latest = data;
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
  }

  onEvent(data) {
    if (data && data.t === 'death' && data.pose && data.imp) {
      this.ragdolls.push({ doll: makeRagdoll(data.pose, RAGDOLL_LINKS, data.imp), color: data.color });
      if (this.ragdolls.length > 8) this.ragdolls.shift();
    }
  }

  setInput(input) {
    this.input = input;
  }

  tick(dt) {
    this.sendT += dt;
    if (this.sendT >= 1 / SEND_HZ) {
      this.sendT = 0;
      this.room.send({
        type: 'input',
        keys: {
          l: this.input.left ? 1 : 0,
          r: this.input.right ? 1 : 0,
          j: this.input.jump ? 1 : 0,
          a: this.input.attack ? 1 : 0,
          t: this.input.throw ? 1 : 0,
        },
        aim: Math.round((this.input.aim || 0) * 100) / 100,
      });
    }

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
    if (!s) {
      return { state: 'waiting', timer: 0, round: 0, arenaName: 'Waiting…', winsNeeded: 3, alive: 0, winner: null, players: [] };
    }
    return {
      state: s.st,
      timer: s.tm,
      round: s.rd,
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