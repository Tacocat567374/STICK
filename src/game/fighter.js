import { WEAPONS } from './weapons';
import { makeRagdoll } from './physics';

export const BODY_W = 24;
export const BODY_H = 52;
const GRAVITY = 2100;
const RUN_SPEED = 350;
const ACCEL = 3800;
const JUMP_V = 1050;
const JUMP_HOLD_ACCEL = 1400;
const JUMP_HOLD_TIME = 0.14;
const MAX_FALL = 1150;
const MAX_RUN = 360;
const AIR_ACCEL = 3000;
const AIR_DRAG = 5;
const MAX_VX = 1000;
const BOSS_SCALE = 1.8;
const RAGDOLL_LINKS = [
  ['head', 'chest'],
  ['chest', 'pelvis'],
  ['chest', 'shoulderL'],
  ['chest', 'shoulderR'],
  ['shoulderL', 'handL'],
  ['shoulderR', 'handR'],
  ['pelvis', 'kneeL'],
  ['pelvis', 'kneeR'],
  ['kneeL', 'footL'],
  ['kneeR', 'footR'],
  ['head', 'pelvis'],
  ['shoulderL', 'pelvis'],
  ['shoulderR', 'pelvis'],
];

export const LIMBS = [
  ['chest', 'head'],
  ['chest', 'pelvis'],
  ['shoulderL', 'handL'],
  ['shoulderR', 'handR'],
  ['pelvis', 'kneeL'],
  ['kneeL', 'footL'],
  ['pelvis', 'kneeR'],
  ['kneeR', 'footR'],
];

// Pure pose builder — used by the host simulation AND remote renderers,
// so a fighter looks identical whether it is simulated or streamed.
export function skeletonPose(f) {
  const x = f.x;
  const y = f.y;
  const s = f.scale || 1;
  const cx = x;
  const pelvis = { x: cx, y: y + 13 * s };
  const chest = { x: cx, y: y - 7 * s };
  const head = { x: cx + Math.cos(f.aim) * 2 * s, y: y - 22 * s };
  const running = Math.abs(f.vx) > 26 && f.onGround;
  const t = f.runPhase || 0;
  const s1 = running ? Math.sin(t) : 0;
  const s2 = running ? Math.sin(t + Math.PI) : 0;
  const air = !f.onGround;

  const legSpread = air ? -0.35 : 0;
  const kneeL = {
    x: pelvis.x - 3 + s1 * 8 * s,
    y: pelvis.y + (air ? 8 : 15) * s - s1 * 3,
  };
  const footL = {
    x: kneeL.x + (air ? -4 : s1 * 6) * s,
    y: kneeL.y + (air ? 10 : 15) * s - Math.abs(s1) * (air ? 0 : 6),
  };
  const kneeR = {
    x: pelvis.x + 3 + s2 * 8 * s,
    y: pelvis.y + (air ? 8 + legSpread * 6 : 15) * s - s2 * 3,
  };
  const footR = {
    x: kneeR.x + (air ? 6 : s2 * 6) * s,
    y: kneeR.y + (air ? 12 : 15) * s - Math.abs(s2) * (air ? 0 : 6),
  };

  const w = WEAPONS[f.weapon] || WEAPONS.fists;
  const swing = f.attackAnim > 0 ? Math.sin(f.attackAnim * Math.PI) : 0;
  const extend = w.kind === 'melee' ? swing * 15 : -swing * 4;
  const armLen = (15 + extend) * s;
  const aim = f.aim;

  const shoulderR = { x: chest.x, y: chest.y - 1 * s };
  const shoulderL = { x: chest.x, y: chest.y - 1 * s };
  const handR = {
    x: shoulderR.x + Math.cos(aim) * armLen,
    y: shoulderR.y + Math.sin(aim) * armLen,
  };
  const backAngle = aim + Math.PI * 0.72;
  const handL = {
    x: shoulderL.x + Math.cos(backAngle) * 13 * s,
    y: shoulderL.y + Math.sin(backAngle) * 13 * s,
  };

  return { head, chest, pelvis, shoulderL, shoulderR, handL, handR, kneeL, kneeR, footL, footR };
}

export class Fighter {
  constructor({ id, name, color, x, y, isBot = false, personality = null }) {
    this.id = id;
    this.name = name || 'Fighter';
    this.color = color || '#b8ff3d';
    this.isBot = isBot;
    this.personality = personality;
    this.reset(x, y);
  }

  reset(x, y) {
    this.x = x;
    this.y = y;
    this.vx = 0;
    this.vy = 0;
    this.onGround = false;
    this.facing = 1;
    this.aim = 0;
    this.scale = 1;
    this.maxHp = this.lethal ? 1 : 100;
    this.hp = this.maxHp;
    this.alive = true;
    this.weapon = 'fists';
    this.ammo = 0;
    this.cooldown = 0;
    this.attackAnim = 0;
    this.hurtT = 0;
    this.spawnT = 0.7;
    this.coyote = 0;
    this.jumpLock = false;
    this.jumpHold = 0;
    this.jumpBuffer = 0;
    this.runPhase = 0;
    this.doll = null;
    this.pending = [];
    this.throwCd = 0;
    this.throwLock = false;
    this.specialCd = 0;
    this.diving = false;
    this.propCd = 0;
    this.wins = this.wins || 0;
    this.worldWidth = 1600;
  }

  get box() {
    return { x: this.x - BODY_W / 2, y: this.y - BODY_H / 2, w: BODY_W, h: BODY_H };
  }

  give(weaponId) {
    this.weapon = weaponId;
    const w = WEAPONS[weaponId];
    this.ammo = w.kind === 'gun' ? w.ammo : 0;
  }

  becomeBoss() {
    this.scale = BOSS_SCALE;
    this.maxHp = this.lethal ? 1 : 180;
    this.hp = this.maxHp;
  }

  // Boss-only slam: a shockwave that mauls everyone standing too close.
  slam(world) {
    this.specialCd = 1.6;
    this.attackAnim = 1;
    world.hitstop = Math.max(world.hitstop || 0, 0.05);
    world.fx('shock', this.x, this.y + BODY_H / 2 - 8, '#ffd166', this.scale);
    world.shake(24);
    const radius = 210 * this.scale;
    for (const other of world.fighters) {
      if (other === this || !other.alive || other.spawnT > 0) continue;
      const dx = other.x - this.x;
      const dy = other.y - this.y;
      const d = Math.hypot(dx, dy);
      if (d > radius) continue;
      const nx = d > 1 ? dx / d : 1;
      const ny = d > 1 ? dy / d : -0.3;
      other.takeHit(18 * this.scale, nx, ny, 720, this, world);
    }
  }

  update(dt, input, world) {
    if (!this.alive) return;
    this.worldWidth = world.arena.width;
    this.spawnT = Math.max(0, this.spawnT - dt);
    this.hurtT = Math.max(0, this.hurtT - dt);
    this.cooldown = Math.max(0, this.cooldown - dt);
    this.attackAnim = Math.max(0, this.attackAnim - dt * 6);

    const ax = (input.right ? 1 : 0) - (input.left ? 1 : 0);
    const airborne = !this.onGround;
    const drag = airborne ? AIR_DRAG : 11;
    this.vx -= this.vx * Math.min(1, drag * dt);
    if (ax !== 0) {
      const over = ax > 0 ? this.vx >= MAX_RUN : this.vx <= -MAX_RUN;
      if (!over) {
        this.vx += ax * (airborne ? AIR_ACCEL : ACCEL) * dt;
        if (ax > 0) this.vx = Math.min(this.vx, MAX_RUN);
        else this.vx = Math.max(this.vx, -MAX_RUN);
      }
      this.facing = ax;
    }
    this.vx = Math.max(-MAX_VX, Math.min(MAX_VX, this.vx));
    if (input.aim !== undefined) this.aim = input.aim;
    else if (ax !== 0) this.aim = ax > 0 ? 0 : Math.PI;

    this.jumpBuffer = Math.max(0, this.jumpBuffer - dt);
    if (input.jump && !this.jumpLock) {
      if (this.onGround || this.coyote > 0) {
        this.vy = -JUMP_V;
        this.onGround = false;
        this.coyote = 0;
        this.jumpLock = true;
        this.jumpHold = JUMP_HOLD_TIME;
        this.jumpBuffer = 0;
        world && world.fx('dust', this.x, this.y + BODY_H / 2, this.color);
      } else {
        // Pressed just before landing — remember it so the jump fires on touchdown.
        this.jumpBuffer = 0.12;
      }
    }
    if (!input.jump) {
      this.jumpLock = false;
      this.jumpHold = 0;
    }
    if (this.jumpHold > 0 && this.vy < 0) {
      this.vy -= JUMP_HOLD_ACCEL * dt;
      this.jumpHold = Math.max(0, this.jumpHold - dt);
    }

    this.vy += GRAVITY * dt;
    if (this.vy > MAX_FALL) this.vy = MAX_FALL;

    this.moveAndCollide(dt, world.arena.platforms);

    // Buffered jump: if we touched down while a jump was queued, take off now.
    if (this.jumpBuffer > 0 && this.onGround && !this.jumpLock) {
      this.vy = -JUMP_V;
      this.onGround = false;
      this.coyote = 0;
      this.jumpLock = true;
      this.jumpHold = JUMP_HOLD_TIME;
      this.jumpBuffer = 0;
      world && world.fx('dust', this.x, this.y + BODY_H / 2, this.color);
    }

    // Boss special: slam from the ground, or dive down and slam on impact.
    this.specialCd = Math.max(0, this.specialCd - dt);
    if (this.diving && this.onGround) {
      this.diving = false;
      this.slam(world);
    } else if (input.special && this.scale > 1 && this.specialCd <= 0) {
      if (this.onGround) {
        this.slam(world);
      } else {
        this.diving = true;
        this.specialCd = 1.6;
        this.vy = 1500;
        world.fx('ring', this.x, this.y, this.color, 1.4);
      }
    }

    if (this.onGround && Math.abs(this.vx) > 26) this.runPhase += Math.abs(this.vx) * dt * 0.06;
    else this.runPhase += dt * 2;

    if (input.attack && this.cooldown <= 0) this.startAttack(world);

    this.throwCd = Math.max(0, this.throwCd - dt);
    if (input.throw && !this.throwLock && this.weapon !== 'fists' && this.throwCd <= 0) {
      this.throwWeapon(world);
      this.throwLock = true;
      this.throwCd = 0.35;
    }
    if (!input.throw) this.throwLock = false;

    if (this.pending.length) {
      for (let i = this.pending.length - 1; i >= 0; i--) {
        this.pending[i].t -= dt;
        if (this.pending[i].t <= 0) {
          this.resolveMelee(this.pending[i].weapon, world);
          this.pending.splice(i, 1);
        }
      }
    }

    for (const h of world.arena.hazards) {
      if (
        h.kill &&
        this.x > h.x &&
        this.x < h.x + h.w &&
        this.y > h.y - BODY_H / 2 &&
        this.y < h.y + h.h + BODY_H / 2
      ) {
        this.die({ x: 0, y: -260 }, world, true);
        return;
      }
    }
    if (this.y > world.arena.killY) this.die({ x: 0, y: 60 }, world, true);
  }

  moveAndCollide(dt, boxes) {
    const wasGround = this.onGround;
    this.onGround = false;

    this.x += this.vx * dt;
    let b = this.box;
    for (const p of boxes) {
      if (b.x < p.x + p.w && b.x + b.w > p.x && b.y < p.y + p.h && b.y + b.h > p.y) {
        const fromLeft = b.x + b.w - p.x;
        const fromRight = p.x + p.w - b.x;
        if (fromLeft < fromRight) this.x -= fromLeft;
        else this.x += fromRight;
        this.vx *= -0.18;
        b = this.box;
      }
    }

    this.y += this.vy * dt;
    b = this.box;
    for (const p of boxes) {
      if (b.x < p.x + p.w && b.x + b.w > p.x && b.y < p.y + p.h && b.y + b.h > p.y) {
        const fromTop = b.y + b.h - p.y;
        const fromBottom = p.y + p.h - b.y;
        if (fromTop < fromBottom) {
          this.y -= fromTop;
          this.vy = 0;
          this.onGround = true;
        } else {
          this.y += fromBottom;
          this.vy = Math.max(this.vy, 0);
        }
        b = this.box;
      }
    }

    if (this.onGround) this.coyote = 0.1;
    else if (wasGround) this.coyote = 0.1;
    else this.coyote = Math.max(0, this.coyote - dt);

    if (this.x < 10) {
      this.x = 10;
      this.vx = Math.abs(this.vx) * 0.4;
    }
    if (this.x > this.worldWidth - 10) {
      this.x = this.worldWidth - 10;
      this.vx = -Math.abs(this.vx) * 0.4;
    }
  }

  startAttack(world) {
    const w = WEAPONS[this.weapon] || WEAPONS.fists;
    this.cooldown = w.cd;
    this.attackAnim = 1;
    if (w.kind === 'melee') {
      this.pending.push({ t: 0.07, weapon: this.weapon });
      world.fx('swing', this.x, this.y, this.color);
    } else {
      if (this.ammo <= 0) {
        this.weapon = 'fists';
        return;
      }
      this.ammo -= 1;
      this.shoot(w, world);
      if (this.ammo <= 0) this.weapon = 'fists';
    }
  }

  throwWeapon(world) {
    const pose = skeletonPose(this);
    const ox = pose.handR.x;
    const oy = pose.handR.y;
    const w = WEAPONS[this.weapon] || WEAPONS.fists;
    const sp = 900;
    world.spawnThrown({
      x: ox,
      y: oy,
      vx: Math.cos(this.aim) * sp + this.vx * 0.3,
      vy: Math.sin(this.aim) * sp + this.vy * 0.3,
      weapon: this.weapon,
      owner: this.id,
      dmg: 10 + (w.dmg || 8) * 0.4,
      knock: 300,
      color: w.color,
    });
    this.weapon = 'fists';
    this.ammo = 0;
    world.fx('swing', ox, oy, this.color);
  }

  shoot(w, world) {
    const pose = skeletonPose(this);
    const ox = pose.handR.x;
    const oy = pose.handR.y;
    for (let i = 0; i < (w.pellets || 1); i++) {
      const a = this.aim + (Math.random() - 0.5) * (w.spread || 0) * 2;
      world.spawnBullet({
        x: ox,
        y: oy,
        vx: Math.cos(a) * w.speed,
        vy: Math.sin(a) * w.speed,
        dmg: w.dmg * this.scale,
        knock: w.knock,
        owner: this.id,
        color: w.color,
        pierce: !!w.pierce,
      });
    }
    this.vx -= Math.cos(this.aim) * (w.id === 'shotgun' ? 130 : 30);
    world.fx('muzzle', ox, oy, w.color);
  }

  resolveMelee(weaponId, world) {
    const w = WEAPONS[weaponId] || WEAPONS.fists;
    const pose = skeletonPose(this);
    const ox = pose.handR.x;
    const oy = pose.handR.y;
    world.fx('swing', ox, oy, this.color, this.aim);
    for (const other of world.fighters) {
      if (other === this || !other.alive || other.spawnT > 0) continue;
      const dx = other.x - pose.chest.x;
      const dy = other.y - pose.chest.y;
      const dist = Math.hypot(dx, dy);
      if (dist > w.range * this.scale + (BODY_W * this.scale) / 2) continue;
      const ang = Math.atan2(dy, dx);
      let diff = Math.abs(ang - this.aim);
      while (diff > Math.PI) diff = Math.abs(diff - Math.PI * 2);
      if (diff > w.arc / 2 + 0.25) continue;
      const nx = Math.cos(this.aim);
      const ny = Math.sin(this.aim);
      other.takeHit(w.dmg * this.scale, nx, ny, w.knock * this.scale, this, world);
    }
  }

  takeHit(dmg, nx, ny, knock, attacker, world) {
    if (!this.alive || this.spawnT > 0) return;
    this.hp -= dmg;
    this.hurtT = 0.28;
    const k = knock / this.scale;
    this.vx += nx * k;
    this.vy += ny * k * 0.7 - 90;
    if (this.onGround) this.onGround = false;
    world.fx('blood', this.x, this.y, this.color);
    world.shake(knock * 0.02 + 4);
    if (this.hp > 0 && Math.random() < 0.14 && this.weapon !== 'fists') {
      world.dropWeapon(this.x, this.y - 6, this.weapon);
      this.weapon = 'fists';
      this.ammo = 0;
    }
    if (this.hp <= 0) {
      this.hp = 0;
      this.die({ x: nx * knock * 0.5, y: ny * knock * 0.35 - 160 }, world, false, attacker);
    }
  }

  die(impulse, world, silent, attacker) {
    if (!this.alive) return;
    this.alive = false;
    this.hp = 0;
    const pose = skeletonPose(this);
    this.deathPose = pose;
    this.lastImpulse = impulse;
    this.doll = makeRagdoll(pose, RAGDOLL_LINKS, impulse);
    if (this.weapon !== 'fists') world.dropWeapon(this.x, this.y - 10, this.weapon);
    if (this.scale > 1) world.dropBoss(this.x, this.y - 10);
    world.fx('blood', this.x, this.y, this.color, 1.6);
    world.shake(silent ? 4 : 18);
    world.onDeath(this, attacker || null);
  }
}

export { RAGDOLL_LINKS };