import { getArena } from './arenas';
import { Fighter } from './fighter';
import { botInput } from './ai';
import { WEAPONS, pickDrop } from './weapons';
import { stepRagdoll } from './physics';

const EMPTY = { left: false, right: false, jump: false, attack: false, throw: false };
const FIXED = 1 / 60;

export class Game {
  constructor({ arenaIndex = 0, roster = [], localId = 'p1', winsNeeded = 3, onEvent, difficulty = 'normal' } = {}) {
    this.arenaIndex = arenaIndex;
    this.nextArena = arenaIndex;
    this.arena = getArena(arenaIndex);
    this.winsNeeded = winsNeeded;
    this.localId = localId;
    this.onEvent = onEvent || null;
    this.difficulty = difficulty;
    this.inputs = {};
    this.events = [];
    this.fighters = roster.map((r, i) => new Fighter({ ...r, id: r.id }));
    this.bullets = [];
    this.crates = [];
    this.thrown = [];
    this.particles = [];
    this.fxOut = [];
    this.shakeAmt = 0;
    this.hitstop = 0;
    this.time = 0;
    this.round = 0;
    this.crateT = 4;
    this.bossCrateT = 16;
    this.acc = 0;
    this.winner = null;
    this.flash = null;
    this.flashT = 0;
    this.beginRound();
  }

  beginRound() {
    this.arenaIndex = this.nextArena;
    this.nextArena = this.arenaIndex + 1;
    this.arena = getArena(this.arenaIndex);
    this.round += 1;
    const spawns = [...this.arena.spawns].sort(() => Math.random() - 0.5);
    const pick = this.fighters.map((_, i) => i).sort(() => Math.random() - 0.5);
    this.fighters.forEach((f, i) => {
      const s = spawns[pick[i] % spawns.length];
      f.worldWidth = this.arena.width;
      f.reset(s.x, s.y);
    });
    this.bullets = [];
    this.crates = [];
    this.thrown = [];
    this.particles = [];
    this.crateT = 3;
    this.state = 'countdown';
    this.timer = 3;
    this.emit({ type: 'roundStart', round: this.round, arenaIndex: this.arenaIndex });
  }

  // ---- world API used by fighters ----
  fx(type, x, y, color, scale = 1) {
    if (type === 'ring') {
      this.particles.push({
        x,
        y,
        vx: 0,
        vy: 0,
        life: 0.45,
        maxLife: 0.45,
        color: color || '#ffffff',
        size: 3 * scale,
        type: 'ring',
      });
      return;
    }
    const n = type === 'swing' ? 3 : type === 'blood' ? 7 : type === 'dust' ? 5 : 3;
    const quick = type === 'swing';
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const sp = quick
        ? 30 + Math.random() * 70
        : (type === 'blood' ? 90 + Math.random() * 240 : 40 + Math.random() * 150) * scale;
      const life = quick ? 0.16 : type === 'blood' ? 0.6 : 0.4;
      this.particles.push({
        x,
        y,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp - (type === 'dust' ? 90 : 40),
        life,
        maxLife: life,
        color: color || '#ffffff',
        size: (quick ? 2 : type === 'blood' ? 3.4 : 2.6) * scale,
        type: 'chip',
      });
    }
    if (this.particles.length > 320) this.particles.splice(0, this.particles.length - 320);
    if (this.fxOut.length < 24) this.fxOut.push({ x, y, c: color || '#ffffff', s: 2.6 * scale });
  }

  drainFx() {
    const out = this.fxOut.slice();
    this.fxOut.length = 0;
    return out;
  }

  shake(amount) {
    this.shakeAmt = Math.min(30, Math.max(this.shakeAmt, amount));
  }

  spawnBullet(b) {
    b.life = 2.4;
    this.bullets.push(b);
  }

  spawnThrown(t) {
    t.life = 3;
    t.spin = 0;
    this.thrown.push(t);
  }

  dropWeapon(x, y, weaponId) {
    this.crates.push({
      x,
      y,
      vy: -240,
      weapon: weaponId,
      label: WEAPONS[weaponId].name,
      spin: 0,
      rest: false,
    });
  }

  dropBoss(x, y) {
    this.crates.push({ x, y, vy: -200, boss: true, label: 'BOSS', spin: 0, rest: false });
  }

  onDeath(fighter, killer) {
    this.hitstop = 0.07;
    this.emit({
      type: 'death',
      id: fighter.id,
      killer: killer ? killer.id : null,
      color: fighter.color,
      pose: fighter.deathPose,
      imp: fighter.lastImpulse,
    });
  }

  emit(e) {
    this.events.push(e);
    if (this.onEvent) this.onEvent(e);
  }

  drainEvents() {
    const out = this.events.slice();
    this.events.length = 0;
    return out;
  }

  setInput(id, input) {
    this.inputs[id] = input;
  }

  addFighter({ id, name, color, isBot = false, x, y, personality = null }) {
    const f = new Fighter({ id, name, color, isBot, personality });
    f.worldWidth = this.arena.width;
    f.reset(x, y);
    f.spawnT = 1.5;
    this.fighters.push(f);
    return f;
  }

  tick(dt) {
    this.acc += Math.min(0.25, dt);
    while (this.acc >= FIXED) {
      this.step(FIXED);
      this.acc -= FIXED;
    }
  }

  step(dt) {
    if (this.hitstop > 0) {
      this.hitstop -= dt;
      this.decayShake(dt);
      return;
    }
    this.time += dt;
    this.decayShake(dt);
    if (this.flashT > 0) this.flashT = Math.max(0, this.flashT - dt);

    if (this.state === 'countdown') {
      this.timer -= dt;
      this.simulate(dt, true);
      if (this.timer <= 0) {
        this.state = 'fight';
        this.timer = 0;
        this.flash = 'FIGHT!';
        this.flashT = 0.85;
        this.emit({ type: 'fight' });
      }
    } else if (this.state === 'fight') {
      this.crateT -= dt;
      if (this.crateT <= 0 && this.crates.length < 4) {
        this.dropWeapon(140 + Math.random() * (this.arena.width - 280), -60, pickDrop());
        this.crateT = 5 + Math.random() * 4;
      }
      this.bossCrateT -= dt;
      if (
        this.bossCrateT <= 0 &&
        !this.crates.some((c) => c.boss) &&
        !this.fighters.some((f) => f.alive && f.scale > 1)
      ) {
        this.dropBoss(140 + Math.random() * (this.arena.width - 280), -60);
        this.bossCrateT = 22 + Math.random() * 8;
      }
      this.simulate(dt, false);
      const alive = this.fighters.filter((f) => f.alive);
      if (alive.length <= 1) {
        const winner = alive[0] || null;
        if (winner) winner.wins += 1;
        this.emit({ type: 'round', winner: winner ? winner.id : null, wins: winner ? winner.wins : 0 });
        if (winner && winner.wins >= this.winsNeeded) {
          this.state = 'matchover';
          this.winner = winner.id;
          this.timer = 0;
          this.emit({ type: 'match', winner: winner.id });
        } else {
          this.state = 'roundover';
          this.timer = 3;
        }
      }
    } else if (this.state === 'roundover') {
      this.timer -= dt;
      this.simulate(dt, true);
      if (this.timer <= 0) this.beginRound();
    } else {
      this.simulate(dt, true);
    }
  }

  simulate(dt, frozen) {
    for (const f of this.fighters) {
      if (!f.alive) continue;
      const stored = this.inputs[f.id];
      let input;
      if (frozen) input = { ...EMPTY, aim: stored ? stored.aim : undefined };
      else if (f.isBot) input = botInput(f, this, dt, this.difficulty);
      else input = stored || EMPTY;
      f.update(dt, input, this);
    }
    this.updateBullets(dt);
    this.updateCrates(dt);
    this.updateThrown(dt);
    this.updateParticles(dt);
    for (const f of this.fighters) {
      if (f.doll) stepRagdoll(f.doll, this.arena.platforms, this.arena.killY);
    }
  }

  updateBullets(dt) {
    for (let i = this.bullets.length - 1; i >= 0; i--) {
      const b = this.bullets[i];
      b.vy += 340 * dt;
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      b.life -= dt;
      let gone = b.life <= 0 || b.y > this.arena.killY;
      if (!gone) {
        for (const p of this.arena.platforms) {
          if (b.x > p.x && b.x < p.x + p.w && b.y > p.y && b.y < p.y + p.h) {
            this.fx('spark', b.x, b.y, '#ffe9a8', 0.7);
            gone = true;
            break;
          }
        }
      }
      if (!gone) {
        for (const f of this.fighters) {
          if (!f.alive || f.id === b.owner || f.spawnT > 0) continue;
          if (Math.abs(f.x - b.x) < 16 && Math.abs(f.y - b.y) < 25) {
            const m = Math.hypot(b.vx, b.vy) || 1;
            const owner = this.fighters.find((o) => o.id === b.owner) || null;
            f.takeHit(b.dmg, b.vx / m, b.vy / m, b.knock, owner, this);
            gone = true;
            break;
          }
        }
      }
      if (gone) this.bullets.splice(i, 1);
    }
  }

  updateCrates(dt) {
    for (const c of this.crates) {
      if (!c.rest) {
        c.vy += 1500 * dt;
        c.y += c.vy * dt;
        c.spin = (c.spin || 0) + dt * 2.4;
        for (const p of this.arena.platforms) {
          if (c.x > p.x && c.x < p.x + p.w && c.y > p.y - 14 && c.y < p.y + p.h) {
            c.y = p.y - 12;
            c.vy = 0;
            c.rest = true;
            c.spin = 0;
            this.fx('dust', c.x, c.y + 10, '#ffffff', 0.7);
            break;
          }
        }
      }
      if (c.dead) continue;
      for (const f of this.fighters) {
        if (f.alive && Math.abs(f.x - c.x) < 26 && Math.abs(f.y - c.y) < 36) {
          if (c.boss) {
            f.becomeBoss();
            this.fx('ring', c.x, c.y, '#ffd166', 1.8);
          } else {
            f.give(c.weapon);
            this.fx('ring', c.x, c.y, '#b8ff3d', 1);
          }
          c.dead = true;
          break;
        }
      }
    }
    this.crates = this.crates.filter((c) => !c.dead && c.y < this.arena.killY);
  }

  updateThrown(dt) {
    for (let i = this.thrown.length - 1; i >= 0; i--) {
      const t = this.thrown[i];
      t.vy += 1500 * dt;
      t.vx *= 1 - 0.3 * dt; // mild air drag so throws arc naturally
      t.x += t.vx * dt;
      t.y += t.vy * dt;
      // spin faster while moving — tumbles through the air, rolls on the ground
      t.spin += dt * (8 + Math.abs(t.vx) * 0.05) * (t.vx >= 0 ? 1 : -1);
      t.life -= dt;

      let settled = t.life <= 0 || t.y > this.arena.killY;

      if (!settled) {
        for (const p of this.arena.platforms) {
          if (t.x > p.x - 6 && t.x < p.x + p.w + 6 && t.y > p.y - 14 && t.y < p.y + p.h + 6) {
            const prevY = t.y - t.vy * dt;
            const prevX = t.x - t.vx * dt;
            if (prevY <= p.y - 12 && t.vy > 0) {
              // bounce off the top — settle only when slow enough to rest
              t.y = p.y - 12;
              if (Math.abs(t.vy) < 200 && Math.abs(t.vx) < 110) {
                settled = true;
              } else {
                t.vy = -Math.abs(t.vy) * 0.38;
                t.vx *= 0.62;
                this.fx('dust', t.x, t.y + 10, '#ffffff', 0.5);
              }
            } else if (prevX <= p.x && t.vx > 0) {
              t.x = p.x - 12;
              t.vx = -Math.abs(t.vx) * 0.4;
            } else if (prevX >= p.x + p.w && t.vx < 0) {
              t.x = p.x + p.w + 12;
              t.vx = Math.abs(t.vx) * 0.4;
            } else if (t.vy < 0) {
              t.y = p.y + p.h + 12;
              t.vy = Math.abs(t.vy) * 0.3;
            }
            break;
          }
        }
      }

      if (!settled) {
        for (const f of this.fighters) {
          if (!f.alive || f.id === t.owner || f.spawnT > 0) continue;
          if (Math.abs(f.x - t.x) < 18 && Math.abs(f.y - t.y) < 30) {
            const speed = Math.hypot(t.vx, t.vy) || 1;
            // faster throws hit harder — a point-blank lob taps, a full-power
            // throw can chunk a third of the target's health.
            const impactDmg = Math.max(t.dmg, (speed / 900) * t.dmg * 2.2);
            const owner = this.fighters.find((o) => o.id === t.owner) || null;
            f.takeHit(impactDmg, t.vx / speed, t.vy / speed, Math.max(t.knock, speed * 0.5), owner, this);
            settled = true;
            break;
          }
        }
      }

      if (settled) {
        if (t.y < this.arena.killY && t.weapon) {
          this.crates.push({
            x: t.x,
            y: t.y,
            vy: 0,
            weapon: t.weapon,
            label: WEAPONS[t.weapon].name,
            spin: 0,
            rest: true,
          });
        }
        this.fx('dust', t.x, t.y + 8, '#ffffff', 0.6);
        this.thrown.splice(i, 1);
      }
    }
  }

  updateParticles(dt) {
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
      p.vx *= 1 - 1.6 * dt;
    }
  }

  decayShake(dt) {
    this.shakeAmt = Math.max(0, this.shakeAmt - dt * 46);
  }

  shakeOffset() {
    const a = this.shakeAmt;
    if (a <= 0) return { x: 0, y: 0 };
    return { x: (Math.random() - 0.5) * a, y: (Math.random() - 0.5) * a };
  }

  scene() {
    return {
      arena: this.arena,
      arenaIndex: this.arenaIndex,
      fighters: this.fighters,
      ragdolls: this.fighters.filter((f) => f.doll).map((f) => ({ doll: f.doll, color: f.color })),
      bullets: this.bullets,
      crates: this.crates,
      thrown: this.thrown,
      particles: this.particles,
      shake: this.shakeOffset(),
    };
  }

  hud() {
    return {
      state: this.state,
      timer: Math.max(0, this.timer),
      round: this.round,
      arenaName: this.arena.name,
      winsNeeded: this.winsNeeded,
      alive: this.fighters.filter((f) => f.alive).length,
      winner: this.winner,
      flash: this.flashT > 0 ? this.flash : null,
      players: this.fighters.map((f) => ({
        id: f.id,
        name: f.name,
        color: f.color,
        hp: Math.max(0, Math.round(f.hp)),
        maxHp: f.maxHp,
        alive: f.alive,
        wins: f.wins,
        isBot: f.isBot,
        boss: f.scale > 1,
        weapon: f.weapon,
        ammo: f.ammo,
        personality: f.personality,
      })),
    };
  }
}