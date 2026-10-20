import { Game } from './engine';
import { serializeGame, SnapshotView } from './snapshot';
import { ReplayRecorder } from './replay';

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
  constructor({ roster, localId, arenaIndex = 0, winsNeeded = 3, difficulty = 'normal', mode = 'brawl' }) {
    this.localId = localId;
    this.game = new Game({ roster, localId, arenaIndex, winsNeeded, difficulty, mode });
    this.rec = new ReplayRecorder();
    this.recT = 0;
  }
  tick(dt) {
    this.game.tick(dt);
    this.recT += dt;
    if (this.recT >= 1 / SEND_HZ) {
      this.recT = 0;
      this.rec.push(serializeGame(this.game));
    }
  }
  setInput(input) {
    this.game.setInput(this.localId, input);
  }
  replayClip() {
    return this.rec.clip();
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
  constructor({ room, roster, localId, winsNeeded = 3, mode = 'brawl' }) {
    this.room = room;
    this.localId = localId;
    this.game = new Game({ roster, localId, arenaIndex: 0, winsNeeded, mode });
    this.rec = new ReplayRecorder();
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

  replayClip() {
    return this.rec.clip();
  }

  tick(dt) {
    this.game.tick(dt);
    this.game.drainEvents(); // deaths ride along in the snapshot; just keep the queue empty
    this.snapT += dt;
    if (this.snapT >= 1 / SEND_HZ) {
      this.snapT = 0;
      const frame = serializeGame(this.game);
      this.rec.push(frame);
      this.room.send({ type: 'snap', data: frame });
    }
  }

  scene() {
    return this.game.scene();
  }

  hud() {
    return this.game.hud();
  }
}

// ---------- Online guest (renders streamed state) ----------
export class GuestSession extends SnapshotView {
  constructor({ room }) {
    super();
    this.room = room;
    this.rec = new ReplayRecorder();
    this.sendT = 0;
    this.input = {
      left: false,
      right: false,
      jump: false,
      attack: false,
      throw: false,
      special: false,
      aim: 0,
    };
  }

  onSnapshot(data) {
    super.applySnapshot(data);
    this.rec.push(data);
  }

  setInput(input) {
    this.input = input;
  }

  replayClip() {
    return this.rec.clip();
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
          s: this.input.special ? 1 : 0,
        },
        aim: Math.round((this.input.aim || 0) * 100) / 100,
      });
    }
    super.advance(dt);
  }
}