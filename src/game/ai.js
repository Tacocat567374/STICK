import { WEAPONS } from './weapons';

// Kept in sync with the engine: bullets are pulled down this much per second.
const BULLET_G = 340;
// How high a fully held jump carries a fighter — used to judge reachable ledges.
const CLIMB = 320;

// Useful shooting distance per gun, and how much a dropped weapon is worth.
const GUN_RANGE = {
  pistol: 900, smg: 850, shotgun: 420, rifle: 1300,
  revolver: 1100, lmg: 900, crossbow: 1400, plasma: 800,
  sniper: 2000, blunderbuss: 380, needlegun: 1200, tesla: 850,
  minigun: 700, flamethrower: 420, rocket: 1100, grenadelauncher: 900,
};
const RANK = {
  fists: 0, dagger: 1, claws: 1, knife: 1, club: 2, bat: 2, machete: 2, nunchaku: 2,
  hammer: 3, axe: 3, sword: 3, katana: 3, spear: 3, scythe: 3,
  pistol: 4, blunderbuss: 4, smg: 5, revolver: 5, lmg: 5, plasma: 5, needlegun: 5, tesla: 5,
  shotgun: 5, minigun: 5, flamethrower: 5, grenadelauncher: 6, crossbow: 6, rifle: 6, rocket: 6, sniper: 7,
};

// Per-difficulty tuning: how often the bot re-decides, how much its aim wanders,
// whether it dodges incoming fire, and how close it wants to stand.
const PROFILES = {
  easy: { react: 0.36, jitter: 0.17, dodge: false, aggro: 1.4, swing: 0.5 },
  normal: { react: 0.18, jitter: 0.07, dodge: true, aggro: 1.0, swing: 1.0 },
  hard: { react: 0.12, jitter: 0.012, dodge: true, aggro: 0.9, swing: 1.0 },
};

// Four distinct bot personalities. Difficulty controls execution skill (reaction,
// aim steadiness, dodge timing); personality controls strategy and style.
//   aggro  — preferred-distance multiplier (low = get in their face, high = keep away)
//   dodge  — chance to evade incoming fire
//   jump   — random hop frequency while fighting
//   seek   — actively hunts weapon crates when unarmed
//   boss   — chases the boss head
//   retreat— backs off when an enemy closes in (kiting)
//   finisher — targets the weakest enemy instead of the nearest
//   preferGun — wants a gun in hand; will drop a melee weapon for one
export const PERSONALITIES = {
  rusher: { label: 'RUSHER', aggro: 0.42, dodge: 0.12, jump: 0.55, seek: false, boss: true, retreat: 0, finisher: false, preferGun: false },
  sniper: { label: 'SNIPER', aggro: 2.3, dodge: 0.95, jump: 0.08, seek: true, boss: false, retreat: 1, finisher: true, preferGun: true },
  hunter: { label: 'HUNTER', aggro: 1.1, dodge: 0.55, jump: 0.3, seek: true, boss: true, retreat: 0.3, finisher: true, preferGun: false },
  brute: { label: 'BRUTE', aggro: 0.72, dodge: 0.05, jump: 0.14, seek: false, boss: true, retreat: 0, finisher: false, preferGun: false },
};

export const PERSONALITY_IDS = ['rusher', 'sniper', 'hunter', 'brute'];

export function randomPersonality() {
  return PERSONALITY_IDS[Math.floor(Math.random() * PERSONALITY_IDS.length)];
}

function hits(boxes, x, y) {
  for (const p of boxes) {
    if (x > p.x && x < p.x + p.w && y > p.y && y < p.y + p.h) return true;
  }
  return false;
}

export function isSolid(arena, x, y) {
  return hits(arena.platforms, x, y);
}

export function isDeadly(arena, x, y) {
  for (const h of arena.hazards) {
    if (h.kill && x > h.x && x < h.x + h.w && y > h.y && y < h.y + h.h) return true;
  }
  return false;
}

function norm(a) {
  while (a > Math.PI) a -= Math.PI * 2;
  while (a < -Math.PI) a += Math.PI * 2;
  return a;
}

// Floor probe just under the feet, so thin slabs still count as ground.
function floorAt(arena, x, y) {
  return isSolid(arena, x, y + 34) && !isDeadly(arena, x, y + 34);
}

// How far the floor runs before it stops (0 = it keeps going).
function edgeAhead(arena, x, y, dir, reach) {
  for (let d = 12; d <= (reach || 120); d += 12) {
    if (!isSolid(arena, x + dir * d, y + 34)) return d;
  }
  return 0;
}

// First safe landing spot past a gap — tells a hop apart from a cliff. Counts
// ledges we can hop up to and drops we can clear, so a bot stuck on a bridge
// still crosses to a platform a level below instead of freezing at the lip.
function landingBeyond(arena, x, y, dir) {
  for (let d = 36; d <= 380; d += 12) {
    const px = x + dir * d;
    if (floorAt(arena, px, y)) return d;
    if (d > 320) continue;
    for (const p of arena.platforms) {
      if (px < p.x - 8 || px > p.x + p.w + 8) continue;
      if (isDeadly(arena, px, p.y - 20)) continue;
      const rise = y - p.y;
      const drop = p.y - y;
      if (rise > 20 && rise < CLIMB && d <= 200) return d;
      if (drop > 30 && drop < 240 && d <= 260) return d;
    }
  }
  return 0;
}

// Distance to safe ground straight down (0 = nothing but a long fall).
function floorBelow(arena, x, y) {
  for (let d = 40; d <= 620; d += 40) {
    const yy = y + d;
    if (isDeadly(arena, x, yy)) return 0;
    if (isSolid(arena, x, yy)) return d;
  }
  return 0;
}

function hazardAhead(arena, x, y, dir, reach) {
  for (let d = 12; d <= (reach || 84); d += 12) {
    if (isDeadly(arena, x + dir * d, y + 34) || isDeadly(arena, x + dir * d, y)) return true;
  }
  return false;
}

// Is the floor between two spots walkable and safe?
function floorRun(arena, x0, x1, y) {
  for (let x = Math.min(x0, x1) + 12; x < Math.max(x0, x1); x += 14) {
    if (!floorAt(arena, x, y)) return false;
  }
  return true;
}

// A ledge within jump reach, aiming at a spot well inside it rather than at its
// lip. `rise` > 40 restricts it to ledges near that height (0 = any of them).
function ledgeAbove(arena, x, y, rise) {
  let pick = null;
  let best = Infinity;
  for (const p of arena.platforms) {
    const gap = y - p.y;
    if (gap < 30 || gap > CLIMB) continue;
    if (rise > 40 && Math.abs(gap - rise) > 100) continue;
    const cx = Math.max(p.x + 26, Math.min(x, p.x + p.w - 26));
    const d = Math.abs(cx - x);
    if (d > 260) continue;
    const score = d + Math.abs(gap - (rise > 40 ? rise : gap)) * 0.5;
    if (score < best && !isDeadly(arena, cx, p.y - 20)) {
      best = score;
      pick = { cx, y: p.y, gap };
    }
  }
  return pick;
}

function lineClear(arena, x0, y0, x1, y1) {
  const dx = x1 - x0;
  const dy = y1 - y0;
  const steps = Math.max(2, Math.ceil(Math.hypot(dx, dy) / 22));
  for (let i = 1; i < steps; i++) {
    if (isSolid(arena, x0 + (dx * i) / steps, y0 + (dy * i) / steps)) return false;
  }
  return true;
}

// Aim angle that leads a moving target and lifts for bullet drop.
function solveShot(w, ox, oy, tx, ty, tvx, tvy) {
  const speed = w.speed || 1400;
  let ax = tx - ox;
  let ay = ty - oy;
  let t = Math.hypot(ax, ay) / speed;
  for (let i = 0; i < 3; i++) {
    ax = tx + tvx * t - ox;
    ay = ty + tvy * t - oy - 0.5 * BULLET_G * t * t;
    t = Math.max(0.02, Math.hypot(ax, ay) / speed);
  }
  return Math.atan2(ay, ax);
}

// Is a bullet about to arrive? Bots step out of the way instead of standing still.
function incomingShot(bot, world) {
  const list = world.bullets;
  if (!list || !list.length) return false;
  for (const b of list) {
    if (b.owner === bot.id) continue;
    const dx = bot.x - b.x;
    const dy = bot.y - b.y;
    const d = Math.hypot(dx, dy);
    if (d < 1 || d > 520) continue;
    const closing = (b.vx * dx + b.vy * dy) / d;
    if (closing < 120) continue;
    const t = d / closing;
    if (t > 0.38) continue;
    const px = b.x + b.vx * t;
    const py = b.y + b.vy * t + 0.5 * BULLET_G * t * t;
    if (Math.abs(px - bot.x) < 48 && Math.abs(py - bot.y) < 48) return true;
  }
  return false;
}

// A dropped weapon nearby that is actually an upgrade.
function bestCrate(bot, world, wantGun) {
  if (!world.crates || !world.crates.length) return null;
  const mine = RANK[bot.weapon] || 0;
  let pick = null;
  let best = 520;
  for (const c of world.crates) {
    if (!c.rest || c.boss) continue;
    const r = RANK[c.weapon] || 0;
    // A gun-preferring bot ignores melee crates; a melee bot takes any upgrade.
    if (wantGun) {
      const cw = WEAPONS[c.weapon];
      if (!cw || cw.kind !== 'gun') continue;
    } else if (r <= mine) continue;
    const d = Math.hypot(c.x - bot.x, c.y - bot.y);
    if (d > best || Math.abs(c.y - bot.y) > 24) continue;
    if (!floorRun(world.arena, bot.x, c.x, bot.y)) continue;
    best = d;
    pick = c;
  }
  return pick;
}

// One frame of "brain" for an AI fighter. Returns an input object.
export function botInput(bot, world, dt, difficulty = 'normal') {
  if (!bot.personality) bot.personality = randomPersonality();
  const pers = PERSONALITIES[bot.personality] || PERSONALITIES.hunter;
  const profile = PROFILES[difficulty] || PROFILES.normal;
  const input = { left: false, right: false, jump: false, attack: false, throw: false, aim: bot.aim };
  const arena = world.arena;
  const enemies = world.fighters.filter((f) => f.alive && f !== bot && f.spawnT <= 0);
  if (!enemies.length) return input;

  // Target selection: finishers pick the weakest enemy, everyone else the nearest.
  let target = enemies[0];
  if (pers.finisher) {
    target = enemies.reduce((a, b) => (a.hp <= b.hp ? a : b));
  } else {
    let best = Infinity;
    for (const e of enemies) {
      const d = Math.hypot(e.x - bot.x, e.y - bot.y);
      if (d < best) { best = d; target = e; }
    }
  }
  const dist = Math.hypot(target.x - bot.x, target.y - bot.y);

  // Nerve, refreshed a few times a second so bots read as lively rather than robotic.
  bot.botTimer = (bot.botTimer || 0) - dt;
  if (bot.botTimer <= 0) {
    bot.botTimer = profile.react + Math.random() * 0.16;
    bot.botJitter = (Math.random() - 0.5) * profile.jitter;
    bot.botStride = Math.random() < 0.5 ? 1 : -1;
    bot.botSwing = Math.random() < profile.swing;
  }
  bot.jumpHoldT = Math.max(0, (bot.jumpHoldT || 0) - dt);
  bot.dodgeT = Math.max(0, (bot.dodgeT || 0) - dt);

  const w = WEAPONS[bot.weapon] || WEAPONS.fists;
  const gun = w.kind === 'gun' && bot.ammo > 0;
  const reach = gun ? GUN_RANGE[w.id] || 950 : (w.range || 40) + 6;
  const chestY = bot.y - 7;
  const dir = Math.sign(target.x - bot.x) || 1;

  // Aim: lead the target, lift for bullet drop, then re-solve from the real muzzle.
  let aim;
  if (gun) {
    let ox = bot.x;
    let oy = chestY;
    for (let i = 0; i < 2; i++) {
      aim = solveShot(w, ox, oy, target.x, target.y - 2, target.vx, target.vy);
      ox = bot.x + Math.cos(aim) * 15;
      oy = chestY + Math.sin(aim) * 15;
    }
  } else {
    aim = Math.atan2(target.y - 2 + target.vy * 0.07 - chestY, target.x + target.vx * 0.07 - bot.x);
  }
  input.aim = aim + bot.botJitter;

  const clearance = lineClear(
    arena,
    bot.x + Math.cos(aim) * 15,
    chestY + Math.sin(aim) * 15,
    target.x,
    target.y - 6
  );

  // Preferred engagement distance: personality sets the style, difficulty the edge.
  const want = gun
    ? Math.min(reach * 0.6 * pers.aggro * profile.aggro, reach * 0.85)
    : reach * 0.7 * pers.aggro * profile.aggro;
  const band = gun ? 130 : 24;
  let move;
  // Kiters back off when an enemy slips inside their comfort zone.
  if (pers.retreat > 0.5 && dist < want * 0.55) {
    move = -dir;
  } else if (dist > want + band) {
    move = dir;
  } else if (dist < want - band) {
    move = -dir;
  } else {
    move = bot.botStride;
  }
  let jump = false;
  let route = null;

  // Crates: boss head first (for those who want it), then weapons for the needy.
  const needGun = pers.preferGun && !gun;
  const needWeapon = pers.seek && bot.weapon === 'fists';
  const seekCrate = needGun || needWeapon;
  const bossCrate =
    bot.onGround && pers.boss && world.crates
      ? world.crates.find(
          (c) => c.boss && c.rest && Math.abs(c.y - bot.y) < 24 && floorRun(arena, bot.x, c.x, bot.y)
        )
      : null;
  const crate = bossCrate || (bot.onGround && seekCrate ? bestCrate(bot, world, needGun) : null);

  if (profile.dodge && pers.dodge > 0.3 && incomingShot(bot, world) && bot.dodgeT <= 0) {
    bot.dodgeT = 0.24;
    bot.dodgeDir = -move || -dir;
  }

  if (crate) {
    move = Math.sign(crate.x - bot.x) || move;
    if (Math.abs(crate.x - bot.x) < 24) move = 0;
  } else if (bot.dodgeT > 0) {
    move = bot.dodgeDir;
    if (bot.onGround && Math.random() < 0.3) jump = true;
  } else if (bot.onGround && bot.y - target.y > 70 && dist < 360 && pers.retreat < 0.7) {
    // They are up on a ledge — climb after them (snipers hold ground and shoot up).
    route = ledgeAbove(arena, bot.x, bot.y, bot.y - target.y);
    if (route) {
      move = Math.abs(route.cx - bot.x) < 14 ? 0 : Math.sign(route.cx - bot.x);
      jump = true;
    }
  }

  // Personality hops: rushers bounce around to close distance and juke shots.
  if (bot.onGround && !jump && Math.random() < pers.jump * dt * 3) jump = true;

  // Keep both feet on something safe: no strolling into spikes or off a cliff.
  if (bot.onGround) {
    if (move !== 0) {
      const md = Math.sign(move);
      if (hazardAhead(arena, bot.x, bot.y, md)) {
        move = -md;
      } else {
        const edge = edgeAhead(arena, bot.x, bot.y, md, 260);
        if (edge) {
          const land = md === dir || crate ? landingBeyond(arena, bot.x, bot.y, md) : 0;
          if (route) {
            if (edge < 12) move = 0;
          } else if (land && land < 300) {
            if (edge < 34) jump = true;
          } else if (edge < 20 + Math.abs(bot.vx) * 0.18) {
            const dropDown = target.y > bot.y + 60 && floorBelow(arena, bot.x + md * 60, bot.y);
            const detour = dropDown || dist < 380 ? null : ledgeAbove(arena, bot.x, bot.y, 0);
            if (detour) {
              move = Math.abs(detour.cx - bot.x) < 14 ? 0 : Math.sign(detour.cx - bot.x);
              if (Math.abs(detour.cx - bot.x) < 60) jump = true;
            } else if (!dropDown) {
              move = 0;
              if (edge < 12) move = -md;
            }
          }
        }
      }
    }
  } else if (bot.dodgeT <= 0) {
    const below = floorBelow(arena, bot.x, bot.y);
    if (below && bot.vy > 0 && below < 320) {
      const ahead = floorBelow(arena, bot.x + bot.vx * 0.3, bot.y);
      move = ahead === 0 ? -Math.sign(bot.vx) : 0;
    }
  }

  if (jump && bot.onGround) bot.jumpHoldT = 0.16;
  input.jump = jump || bot.jumpHoldT > 0;
  if (move > 0) input.right = true;
  else if (move < 0) input.left = true;

  // Swing or fire only when the shot can actually land.
  if (gun) {
    const steady = Math.abs(bot.botJitter) < Math.max(0.018, 16 / Math.max(80, dist));
    input.attack = clearance && steady && dist < reach;
  } else {
    input.attack = dist < reach && bot.botSwing !== false;
  }
  return input;
}