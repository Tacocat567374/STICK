import { Actor } from 'base44:runtime/actors';

const MAX_USERS = 8;
const COLORS = 8;

// One arena room. The actor owns the lobby (seats, names, host) and relays
// gameplay: guests send inputs up, the host sends authoritative snapshots down.
export default class StickArena extends Actor {
  users = new Map(); // conn.id (or "bot-N") -> { seat, name, color, bot }
  nextSeat = 1;
  phase = 'lobby';

  async handleStart() {
    const savedUsers = await this.storage.get('users');
    if (savedUsers) this.users = new Map(savedUsers);
    const savedPhase = await this.storage.get('phase');
    if (savedPhase) this.phase = savedPhase;
    const live = new Set(this.getConnections().map((c) => c.id));
    for (const id of [...this.users.keys()]) {
      if (id.startsWith('bot-')) continue;
      if (!live.has(id)) this.users.delete(id);
    }
    // No humans present → clear stale bots so the next joiner gets a clean room.
    const liveHumans = [...this.users.keys()].filter((id) => !id.startsWith('bot-') && live.has(id));
    if (liveHumans.length === 0) {
      for (const id of [...this.users.keys()]) {
        if (id.startsWith('bot-')) this.users.delete(id);
      }
      this.phase = 'lobby';
      await this.storage.put('phase', this.phase);
    }
    const seats = [...this.users.values()].map((u) => u.seat);
    this.nextSeat = (seats.length ? Math.max(...seats) : 0) + 1;
  }

  hostSeat() {
    // Only a live (connected) human can be the host — never a stale bot seat
    // left over from a previous session, which has no connection to send to.
    const live = new Set(this.getConnections().map((c) => c.id));
    let min = Infinity;
    for (const [id, u] of this.users) {
      if (live.has(id) && u.seat < min) min = u.seat;
    }
    return min === Infinity ? 0 : min;
  }

  hostConn() {
    const hs = this.hostSeat();
    for (const conn of this.getConnections()) {
      const u = this.users.get(conn.id);
      if (u && u.seat === hs) return conn;
    }
    return null;
  }

  playerList() {
    return [...this.users.values()]
      .sort((a, b) => a.seat - b.seat)
      .map((u) => ({ seat: u.seat, name: u.name, color: u.color, bot: !!u.bot, ping: u.ping || 0 }));
  }

  broadcastPlayers() {
    this.broadcast({ type: 'players', players: this.playerList(), host: this.hostSeat(), phase: this.phase });
  }

  saveUsers() {
    return this.storage.put('users', [...this.users.entries()]);
  }

  async handleConnect(conn) {
    if (!this.users.has(conn.id) && this.users.size >= MAX_USERS) {
      conn.reject(4001, 'room full');
      return;
    }
    if (!this.users.has(conn.id)) {
      const seat = this.nextSeat++;
      this.users.set(conn.id, { seat, name: 'Fighter', color: (seat - 1) % COLORS, bot: false });
      await this.saveUsers();
    }
    const u = this.users.get(conn.id);
    conn.send({ type: 'you', seat: u.seat, host: this.hostSeat() === u.seat, phase: this.phase });
    this.broadcastPlayers();
  }

  async handleMessage(conn, msg) {
    if (typeof msg !== 'object' || msg === null) return;
    const u = this.users.get(conn.id);
    if (!u) return;

    if (msg.type === 'ping') {
      conn.send({ type: 'pong', t: msg.t });
      return;
    }
    if (msg.type === 'myping') {
      u.ping = Math.round(msg.ms) || 0;
      await this.saveUsers();
      this.broadcastPlayers();
      return;
    }

    if (msg.type === 'hello') {
      const name = String(msg.name == null ? 'Fighter' : msg.name).slice(0, 14).trim() || 'Fighter';
      u.name = name;
      if (Number.isInteger(msg.color)) u.color = ((msg.color % COLORS) + COLORS) % COLORS;
      await this.saveUsers();
      this.broadcastPlayers();
      return;
    }

    const isHost = this.hostSeat() === u.seat;

    if (msg.type === 'input') {
      const host = this.hostConn();
      if (host && host.id !== conn.id) {
        const k = msg.keys || {};
        host.send({
          type: 'input',
          seat: u.seat,
          keys: {
            l: k.l ? 1 : 0,
            r: k.r ? 1 : 0,
            j: k.j ? 1 : 0,
            a: k.a ? 1 : 0,
            t: k.t ? 1 : 0,
          },
          aim: Number(msg.aim) || 0,
        });
      }
      return;
    }

    if ((msg.type === 'snap' || msg.type === 'event') && isHost) {
      for (const c of this.getConnections()) {
        if (c.id !== conn.id) c.send({ type: msg.type, data: msg.data });
      }
      return;
    }

    if (msg.type === 'start' && isHost) {
      this.phase = 'playing';
      await this.storage.put('phase', this.phase);
      this.broadcastPlayers();
      return;
    }

    if (msg.type === 'bots' && isHost) {
      const want = Math.max(0, Math.min(7, Number(msg.count) || 0));
      for (const id of [...this.users.keys()]) {
        if (id.startsWith('bot-')) this.users.delete(id);
      }
      for (let i = 0; i < want; i++) {
        const seat = this.nextSeat++;
        this.users.set(`bot-${seat}`, { seat, name: `Bot ${i + 1}`, color: (seat - 1) % COLORS, bot: true });
      }
      await this.saveUsers();
      this.broadcastPlayers();
      return;
    }
  }

  async handleClose(conn) {
    const u = this.users.get(conn.id);
    if (!u) return;
    const wasHost = this.hostSeat() === u.seat;
    this.users.delete(conn.id);
    if (wasHost) {
      // The simulation lived on the old host — send everyone back to the lobby
      // and clear bots so the new host starts fresh.
      this.phase = 'lobby';
      await this.storage.put('phase', this.phase);
      for (const id of [...this.users.keys()]) {
        if (id.startsWith('bot-')) this.users.delete(id);
      }
    }
    await this.saveUsers();
    this.broadcastPlayers();
  }
}