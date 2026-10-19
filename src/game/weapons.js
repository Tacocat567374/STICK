// Weapon definitions: melee swings and projectile guns.

export const WEAPONS = {
  fists: {
    id: 'fists',
    name: 'Fists',
    kind: 'melee',
    dmg: 9,
    cd: 0.3,
    range: 40,
    knock: 300,
    arc: 1.1,
    color: '#f4f1e8',
  },
  bat: {
    id: 'bat',
    name: 'Bat',
    kind: 'melee',
    dmg: 15,
    cd: 0.5,
    range: 62,
    knock: 620,
    arc: 1.2,
    color: '#c98b4b',
  },
  sword: {
    id: 'sword',
    name: 'Saber',
    kind: 'melee',
    dmg: 28,
    cd: 0.62,
    range: 70,
    knock: 300,
    arc: 1.0,
    color: '#dfe9ff',
  },
  hammer: {
    id: 'hammer',
    name: 'Hammer',
    kind: 'melee',
    dmg: 22,
    cd: 1.0,
    range: 66,
    knock: 900,
    arc: 1.3,
    color: '#9aa0b4',
  },
  knife: {
    id: 'knife',
    name: 'Knife',
    kind: 'melee',
    dmg: 7,
    cd: 0.22,
    range: 36,
    knock: 200,
    arc: 1.2,
    color: '#e8e8ee',
  },
  spear: {
    id: 'spear',
    name: 'Spear',
    kind: 'melee',
    dmg: 24,
    cd: 0.7,
    range: 92,
    knock: 520,
    arc: 0.55,
    color: '#c98b4b',
  },
  machete: {
    id: 'machete',
    name: 'Machete',
    kind: 'melee',
    dmg: 18,
    cd: 0.45,
    range: 62,
    knock: 420,
    arc: 1.1,
    color: '#9aa0b4',
  },
  nunchaku: {
    id: 'nunchaku',
    name: 'Nunchaku',
    kind: 'melee',
    dmg: 6,
    cd: 0.16,
    range: 46,
    knock: 150,
    arc: 1.4,
    color: '#ffd166',
  },
  pistol: {
    id: 'pistol',
    name: 'Pistol',
    kind: 'gun',
    dmg: 15,
    cd: 0.26,
    speed: 1450,
    ammo: 9,
    knock: 150,
    spread: 0.028,
    pellets: 1,
    auto: false,
    color: '#ffd166',
  },
  smg: {
    id: 'smg',
    name: 'SMG',
    kind: 'gun',
    dmg: 8,
    cd: 0.085,
    speed: 1500,
    ammo: 34,
    knock: 80,
    spread: 0.09,
    pellets: 1,
    auto: true,
    color: '#8ef0c0',
  },
  shotgun: {
    id: 'shotgun',
    name: 'Shotgun',
    kind: 'gun',
    dmg: 10,
    cd: 0.85,
    speed: 1200,
    ammo: 6,
    knock: 320,
    spread: 0.15,
    pellets: 8,
    auto: false,
    color: '#ff8a5c',
  },
  rifle: {
    id: 'rifle',
    name: 'Rifle',
    kind: 'gun',
    dmg: 38,
    cd: 1.0,
    speed: 2400,
    ammo: 5,
    knock: 260,
    spread: 0.006,
    pellets: 1,
    auto: false,
    color: '#ff5d73',
  },
  minigun: {
    id: 'minigun',
    name: 'Minigun',
    kind: 'gun',
    dmg: 6,
    cd: 0.04,
    speed: 1700,
    ammo: 60,
    knock: 60,
    spread: 0.13,
    pellets: 1,
    auto: true,
    color: '#8ef0c0',
  },
  flamethrower: {
    id: 'flamethrower',
    name: 'Flame',
    kind: 'gun',
    dmg: 4,
    cd: 0.05,
    speed: 760,
    ammo: 50,
    knock: 20,
    spread: 0.32,
    pellets: 3,
    auto: true,
    color: '#ff8a3c',
  },
  rocket: {
    id: 'rocket',
    name: 'Rocket',
    kind: 'gun',
    dmg: 52,
    cd: 1.2,
    speed: 920,
    ammo: 3,
    knock: 620,
    spread: 0.02,
    pellets: 1,
    auto: false,
    color: '#ff5d73',
  },
  grenadelauncher: {
    id: 'grenadelauncher',
    name: 'Grenade',
    kind: 'gun',
    dmg: 30,
    cd: 0.9,
    speed: 720,
    ammo: 4,
    knock: 420,
    spread: 0.05,
    pellets: 1,
    auto: false,
    color: '#c9a7ff',
  },
  katana: {
    id: 'katana',
    name: 'Katana',
    kind: 'melee',
    dmg: 26,
    cd: 0.42,
    range: 82,
    knock: 360,
    arc: 1.0,
    color: '#dfe9ff',
  },
  axe: {
    id: 'axe',
    name: 'Axe',
    kind: 'melee',
    dmg: 34,
    cd: 0.85,
    range: 64,
    knock: 760,
    arc: 1.1,
    color: '#c98b4b',
  },
  dagger: {
    id: 'dagger',
    name: 'Dagger',
    kind: 'melee',
    dmg: 10,
    cd: 0.18,
    range: 40,
    knock: 180,
    arc: 1.2,
    color: '#e8e8ee',
  },
  scythe: {
    id: 'scythe',
    name: 'Scythe',
    kind: 'melee',
    dmg: 30,
    cd: 0.78,
    range: 100,
    knock: 480,
    arc: 1.5,
    color: '#c9a7ff',
  },
  club: {
    id: 'club',
    name: 'Club',
    kind: 'melee',
    dmg: 16,
    cd: 0.52,
    range: 58,
    knock: 820,
    arc: 1.25,
    color: '#8b6f47',
  },
  claws: {
    id: 'claws',
    name: 'Claws',
    kind: 'melee',
    dmg: 8,
    cd: 0.14,
    range: 38,
    knock: 120,
    arc: 1.3,
    color: '#ff8a5c',
  },
  revolver: {
    id: 'revolver',
    name: 'Revolver',
    kind: 'gun',
    dmg: 34,
    cd: 0.5,
    speed: 1800,
    ammo: 6,
    knock: 280,
    spread: 0.012,
    pellets: 1,
    auto: false,
    color: '#ffd166',
  },
  lmg: {
    id: 'lmg',
    name: 'LMG',
    kind: 'gun',
    dmg: 11,
    cd: 0.06,
    speed: 1600,
    ammo: 80,
    knock: 90,
    spread: 0.11,
    pellets: 1,
    auto: true,
    color: '#8ef0c0',
  },
  crossbow: {
    id: 'crossbow',
    name: 'Crossbow',
    kind: 'gun',
    dmg: 44,
    cd: 0.95,
    speed: 2000,
    ammo: 5,
    knock: 340,
    spread: 0.004,
    pellets: 1,
    auto: false,
    color: '#dfe9ff',
  },
  plasma: {
    id: 'plasma',
    name: 'Plasma',
    kind: 'gun',
    dmg: 16,
    cd: 0.11,
    speed: 1300,
    ammo: 40,
    knock: 50,
    spread: 0.06,
    pellets: 1,
    auto: true,
    color: '#6fe8ff',
  },
  sniper: {
    id: 'sniper',
    name: 'Sniper',
    kind: 'gun',
    dmg: 75,
    cd: 1.4,
    speed: 3200,
    ammo: 4,
    knock: 400,
    spread: 0.002,
    pellets: 1,
    auto: false,
    color: '#ff5d73',
  },
  blunderbuss: {
    id: 'blunderbuss',
    name: 'Blunder',
    kind: 'gun',
    dmg: 8,
    cd: 0.95,
    speed: 1000,
    ammo: 5,
    knock: 280,
    spread: 0.22,
    pellets: 12,
    auto: false,
    color: '#ff8a5c',
  },
  needlegun: {
    id: 'needlegun',
    name: 'Needle',
    kind: 'gun',
    dmg: 7,
    cd: 0.07,
    speed: 2200,
    ammo: 30,
    knock: 40,
    spread: 0.03,
    pellets: 1,
    auto: true,
    color: '#b8ff3d',
  },
  tesla: {
    id: 'tesla',
    name: 'Tesla',
    kind: 'gun',
    dmg: 14,
    cd: 0.13,
    speed: 1500,
    ammo: 28,
    knock: 70,
    spread: 0.04,
    pellets: 2,
    auto: true,
    color: '#6fe8ff',
  },
};

export const DROP_WEAPONS = [
  'bat', 'sword', 'hammer', 'knife', 'spear', 'machete', 'nunchaku',
  'katana', 'axe', 'dagger', 'scythe', 'club', 'claws',
  'smg', 'pistol', 'shotgun', 'rifle', 'minigun', 'flamethrower', 'rocket', 'grenadelauncher',
  'revolver', 'lmg', 'crossbow', 'plasma', 'sniper', 'blunderbuss', 'needlegun', 'tesla',
];

export function pickDrop() {
  return DROP_WEAPONS[Math.floor(Math.random() * DROP_WEAPONS.length)];
}

// Draws the weapon held in a hand, rotated along the aim direction.
export function drawWeapon(ctx, weaponId, hx, hy, angle, facing) {
  const w = WEAPONS[weaponId] || WEAPONS.fists;
  ctx.save();
  ctx.translate(hx, hy);
  ctx.rotate(angle);
  ctx.lineCap = 'round';
  if (w.kind === 'gun') {
    ctx.fillStyle = '#20202b';
    ctx.strokeStyle = '#f4f1e8';
    ctx.lineWidth = 1.4;
    if (weaponId === 'rifle') {
      ctx.fillRect(-6, -3, 32, 6);
      ctx.fillRect(6, -9, 8, 6);
      ctx.fillStyle = w.color;
      ctx.fillRect(0, -2, 6, 4);
    } else if (weaponId === 'shotgun') {
      ctx.fillRect(-8, -3.5, 28, 7);
      ctx.fillStyle = '#c98b4b';
      ctx.fillRect(-16, -3, 10, 6);
    } else if (weaponId === 'smg') {
      ctx.fillRect(-4, -3, 22, 6);
      ctx.fillRect(-2, 2, 6, 9);
      ctx.fillStyle = w.color;
      ctx.fillRect(0, -2, 5, 4);
    } else if (weaponId === 'minigun') {
      ctx.fillRect(-8, -5, 28, 10);
      ctx.fillStyle = w.color;
      ctx.fillRect(-2, -3, 8, 6);
      ctx.fillStyle = '#20202b';
      ctx.fillRect(18, -4, 16, 3);
      ctx.fillRect(18, 1, 16, 3);
    } else if (weaponId === 'flamethrower') {
      ctx.fillRect(-8, -5, 24, 10);
      ctx.fillStyle = w.color;
      ctx.fillRect(14, -3, 12, 6);
      ctx.fillStyle = '#20202b';
      ctx.fillRect(-6, 3, 7, 10);
    } else if (weaponId === 'rocket') {
      ctx.fillRect(-10, -6, 34, 12);
      ctx.fillStyle = w.color;
      ctx.fillRect(20, -4, 8, 8);
      ctx.fillStyle = '#20202b';
      ctx.fillRect(-12, 3, 6, 6);
    } else if (weaponId === 'grenadelauncher') {
      ctx.fillRect(-8, -5, 22, 10);
      ctx.fillStyle = '#20202b';
      ctx.beginPath();
      ctx.arc(16, 0, 7, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = w.color;
      ctx.beginPath();
      ctx.arc(16, 0, 4, 0, Math.PI * 2);
      ctx.fill();
    } else if (weaponId === 'revolver') {
      ctx.fillRect(-5, -4, 20, 8);
      ctx.fillStyle = w.color;
      ctx.fillRect(-2, -3, 6, 6);
      ctx.fillStyle = '#20202b';
      ctx.fillRect(-4, 4, 8, 7);
    } else if (weaponId === 'lmg') {
      ctx.fillRect(-10, -5, 34, 10);
      ctx.fillStyle = '#20202b';
      ctx.fillRect(-4, 5, 8, 16);
      ctx.fillStyle = w.color;
      ctx.fillRect(0, -3, 6, 6);
    } else if (weaponId === 'crossbow') {
      ctx.fillStyle = '#c98b4b';
      ctx.fillRect(-10, -3, 24, 6);
      ctx.strokeStyle = '#f4f1e8';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-10, -8);
      ctx.lineTo(14, 0);
      ctx.lineTo(-10, 8);
      ctx.stroke();
      ctx.strokeStyle = w.color;
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(14, 0);
      ctx.lineTo(34, 0);
      ctx.stroke();
    } else if (weaponId === 'plasma') {
      ctx.fillRect(-6, -5, 22, 10);
      ctx.fillStyle = w.color;
      ctx.beginPath();
      ctx.arc(20, 0, 6, 0, Math.PI * 2);
      ctx.fill();
    } else if (weaponId === 'sniper') {
      ctx.fillRect(-12, -3, 44, 6);
      ctx.fillStyle = '#20202b';
      ctx.fillRect(8, -10, 10, 6);
      ctx.fillStyle = w.color;
      ctx.fillRect(0, -2, 6, 4);
    } else if (weaponId === 'blunderbuss') {
      ctx.fillStyle = '#c98b4b';
      ctx.fillRect(-8, -5, 16, 10);
      ctx.fillRect(8, -7, 20, 14);
      ctx.fillStyle = '#20202b';
      ctx.fillRect(-6, 3, 7, 9);
    } else if (weaponId === 'needlegun') {
      ctx.fillRect(-4, -3, 20, 6);
      ctx.strokeStyle = w.color;
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(16, 0);
      ctx.lineTo(34, 0);
      ctx.stroke();
    } else if (weaponId === 'tesla') {
      ctx.fillRect(-6, -4, 20, 8);
      ctx.fillStyle = w.color;
      for (let i = 0; i < 3; i++) {
        ctx.beginPath();
        ctx.arc(16 + i * 4, -2 + (i % 2) * 4, 2, 0, Math.PI * 2);
        ctx.fill();
      }
    } else {
      ctx.fillRect(-4, -3, 18, 6);
      ctx.fillRect(-2, 2, 6, 8);
      ctx.fillStyle = w.color;
      ctx.fillRect(1, -2, 5, 4);
    }
  } else if (weaponId === 'fists') {
    ctx.fillStyle = '#f4f1e8';
    ctx.beginPath();
    ctx.arc(3, 0, 3.4, 0, Math.PI * 2);
    ctx.fill();
  } else if (weaponId === 'spear') {
    ctx.strokeStyle = '#c98b4b';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(-8, 0);
    ctx.lineTo(40, -2);
    ctx.stroke();
    ctx.strokeStyle = w.color;
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.moveTo(38, -2);
    ctx.lineTo(54, -3);
    ctx.stroke();
  } else if (weaponId === 'nunchaku') {
    ctx.strokeStyle = '#f4f1e8';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(-4, 0);
    ctx.lineTo(8, 5);
    ctx.moveTo(8, 5);
    ctx.lineTo(24, -5);
    ctx.stroke();
    ctx.strokeStyle = w.color;
    ctx.lineWidth = 3.4;
    ctx.beginPath();
    ctx.arc(-4, 0, 2.6, 0, Math.PI * 2);
    ctx.arc(24, -5, 2.6, 0, Math.PI * 2);
    ctx.stroke();
  } else if (weaponId === 'scythe') {
    ctx.strokeStyle = '#c98b4b';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(-8, 0);
    ctx.lineTo(30, -6);
    ctx.stroke();
    ctx.strokeStyle = w.color;
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.moveTo(30, -6);
    ctx.quadraticCurveTo(52, -18, 56, 2);
    ctx.stroke();
  } else if (weaponId === 'axe') {
    ctx.strokeStyle = '#c98b4b';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(-6, 0);
    ctx.lineTo(24, -2);
    ctx.stroke();
    ctx.fillStyle = w.color;
    ctx.beginPath();
    ctx.moveTo(24, -12);
    ctx.lineTo(38, -8);
    ctx.lineTo(38, 6);
    ctx.lineTo(24, 10);
    ctx.closePath();
    ctx.fill();
  } else if (weaponId === 'claws') {
    ctx.strokeStyle = w.color;
    ctx.lineWidth = 2.4;
    for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      ctx.moveTo(2, -4 + i * 4);
      ctx.lineTo(16, -6 + i * 5);
      ctx.stroke();
    }
  } else {
    const len =
      weaponId === 'knife' ? 16 :
      weaponId === 'dagger' ? 18 :
      weaponId === 'machete' ? 28 :
      weaponId === 'bat' ? 22 :
      weaponId === 'club' ? 24 :
      weaponId === 'katana' ? 36 : 30;
    ctx.strokeStyle = '#f4f1e8';
    ctx.lineWidth = weaponId === 'knife' ? 4 : 5;
    ctx.beginPath();
    ctx.moveTo(-6, 0);
    ctx.lineTo(len, -3);
    ctx.stroke();
    ctx.strokeStyle = w.color;
    ctx.lineWidth = 3.2;
    ctx.beginPath();
    ctx.moveTo(weaponId === 'bat' ? 2 : 8, -2);
    ctx.lineTo(len + 4, -4);
    ctx.stroke();
    if (weaponId === 'hammer') {
      ctx.fillStyle = w.color;
      ctx.fillRect(len + 2, -12, 12, 18);
    }
  }
  ctx.restore();
}