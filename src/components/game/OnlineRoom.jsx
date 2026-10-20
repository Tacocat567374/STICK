import React, { useEffect, useRef, useState } from 'react';
import { base44 } from '@/api/base44Client';
import GameCanvas from './GameCanvas';
import Hud from './Hud';
import ReplayOverlay from './ReplayOverlay';
import { HostSession, GuestSession, fighterId, PALETTE } from '@/game/net';

export default function OnlineRoom({ roomId, registryId, onExit }) {
  const roomRef = useRef(null);
  const hostRef = useRef(null);
  const guestRef = useRef(null);
  const meRef = useRef({ seat: 0, host: false });
  const playersRef = useRef([]);
  const nameRef = useRef('Fighter');

  const [me, setMe] = useState({ seat: 0, host: false });
  const [players, setPlayers] = useState([]);
  const [phase, setPhase] = useState('lobby');
  const [session, setSession] = useState(null);
  const [hud, setHud] = useState(null);
  const [copied, setCopied] = useState(false);
  const [myPing, setMyPing] = useState(null);
  const [replay, setReplay] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const u = await base44.auth.me();
        if (!cancelled && u && u.full_name) {
          nameRef.current = String(u.full_name).split(' ')[0].slice(0, 14);
        }
      } catch {
        /* anonymous visitors keep the default name */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let connId = sessionStorage.getItem('arenaConnId');
    if (!connId) {
      connId =
        (typeof crypto !== 'undefined' && crypto.randomUUID && crypto.randomUUID()) ||
        `c${Date.now()}${Math.floor(Math.random() * 1000)}`;
      sessionStorage.setItem('arenaConnId', connId);
    }
    const room = base44.actors.StickArena(roomId).connect({ id: connId });
    roomRef.current = room;

    const sub = room.subscribe((msg) => {
      if (!msg || !msg.type) return;
      if (msg.type === 'you') {
        meRef.current = { seat: msg.seat, host: msg.host };
        setMe({ seat: msg.seat, host: msg.host });
        room.send({ type: 'hello', name: nameRef.current, color: (msg.seat - 1) % PALETTE.length });
      } else if (msg.type === 'players') {
        playersRef.current = msg.players;
        setPlayers(msg.players);
        setPhase(msg.phase);
        // Only recompute host once we know our own seat (the "you" message
        // arrives first, but guard against a race where "players" lands before it).
        if (meRef.current.seat > 0) {
          const host = msg.host === meRef.current.seat;
          meRef.current = { seat: meRef.current.seat, host };
          setMe({ seat: meRef.current.seat, host });
        }
        if (hostRef.current) hostRef.current.setRoster(msg.players);
      } else if (msg.type === 'input') {
        if (hostRef.current) {
          hostRef.current.setRemoteInput(msg.seat, {
            left: !!msg.keys.l,
            right: !!msg.keys.r,
            jump: !!msg.keys.j,
            attack: !!msg.keys.a,
            throw: !!msg.keys.t,
            special: !!msg.keys.s,
            aim: msg.aim,
          });
        }
      } else if (msg.type === 'snap') {
        if (guestRef.current) guestRef.current.onSnapshot(msg.data);
      } else if (msg.type === 'pong') {
        const rtt = Math.max(1, Math.round(performance.now() - msg.t));
        setMyPing(rtt);
        if (roomRef.current) roomRef.current.send({ type: 'myping', ms: rtt });
      }
    });

    return () => {
      if (sub && typeof sub.unsubscribe === 'function') sub.unsubscribe();
      room.close();
      roomRef.current = null;
    };
  }, [roomId]);

  useEffect(() => {
    const iv = setInterval(() => {
      if (roomRef.current) roomRef.current.send({ type: 'ping', t: performance.now() });
    }, 1500);
    return () => clearInterval(iv);
  }, [roomId]);

  useEffect(() => {
    if (phase !== 'playing' || !roomRef.current) {
      hostRef.current = null;
      guestRef.current = null;
      setSession(null);
      return;
    }
    if (me.host) {
      const roster = playersRef.current.map((p) => ({
        id: fighterId(p.seat),
        name: p.name,
        color: PALETTE[p.color % PALETTE.length],
        seat: p.seat,
        isBot: !!p.bot,
      }));
      const h = new HostSession({ room: roomRef.current, roster, localId: fighterId(me.seat) });
      hostRef.current = h;
      guestRef.current = null;
      setHud(null);
      setSession(h);
    } else {
      const g = new GuestSession({ room: roomRef.current });
      guestRef.current = g;
      hostRef.current = null;
      setHud(null);
      setSession(g);
    }
  }, [phase, me.host, me.seat]);

  useEffect(() => {
    if (!registryId || !me.host) return;
    base44.entities.Arena.update(registryId, {
      player_count: players.length,
      status: phase === 'playing' ? 'playing' : 'open',
      host_name: nameRef.current,
    }).catch(() => {});
  }, [registryId, me.host, players.length, phase]);

  const leave = async () => {
    if (registryId && meRef.current.host) {
      try {
        await base44.entities.Arena.update(registryId, { status: 'closed' });
      } catch {
        /* the room row is only a listing */
      }
    }
    onExit();
  };

  const startMatch = () => {
    if (!roomRef.current) return;
    roomRef.current.send({ type: 'start' });
  };

  const setBots = (n) => {
    if (!roomRef.current) return;
    roomRef.current.send({ type: 'bots', count: n });
  };

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(roomId);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  };

  if (phase !== 'playing' || !session) {
    return (
      <div className="flex min-h-[100dvh] w-full items-center justify-center bg-background px-5 py-10">
        <div className="w-full max-w-lg rounded-3xl border border-white/10 bg-card/70 p-7 backdrop-blur-xl">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-[11px] font-bold uppercase tracking-[0.24em] text-primary">
                {me.host ? 'You are the host' : 'Waiting room'}
              </div>
              <h1 className="mt-1 font-display text-2xl uppercase tracking-tight text-foreground">
                {players.length} in the room
              </h1>
            </div>
            <button
              type="button"
              onClick={leave}
              className="rounded-full border border-white/15 px-4 py-1.5 text-[11px] font-bold uppercase tracking-widest text-muted-foreground transition hover:border-destructive hover:text-destructive"
            >
              Leave
            </button>
          </div>

          <button
            type="button"
            onClick={copyCode}
            className="mt-5 flex w-full items-center justify-between gap-3 rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-left transition hover:border-primary/50"
          >
            <span className="min-w-0">
              <span className="block text-[10px] font-bold uppercase tracking-[0.24em] text-muted-foreground">
                Invite code
              </span>
              <span className="block truncate font-mono text-xs text-foreground/80">{roomId}</span>
            </span>
            <span className="shrink-0 text-[11px] font-bold uppercase tracking-widest text-primary">
              {copied ? 'Copied' : 'Copy'}
            </span>
          </button>

          <div className="mt-5 flex flex-col gap-2">
            {players.length === 0 && (
              <div className="rounded-xl border border-dashed border-white/12 px-4 py-6 text-center text-sm text-muted-foreground">
                Connecting…
              </div>
            )}
            {players.map((p) => (
              <div
                key={p.seat}
                className="flex items-center gap-3 rounded-xl border border-white/10 bg-black/25 px-4 py-2.5"
              >
                <span
                  className="h-3 w-3 rounded-full"
                  style={{ background: PALETTE[p.color % PALETTE.length] }}
                />
                <span className="flex-1 truncate text-sm font-semibold text-foreground">{p.name}</span>
                {p.seat === me.seat && (
                  <span className="text-[10px] font-bold uppercase tracking-widest text-primary">you</span>
                )}
                {p.bot && (
                  <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">bot</span>
                )}
                {me.host && p.seat !== me.seat && (
                  <span className="text-[10px] uppercase tracking-widest text-muted-foreground/60">joined</span>
                )}
                {(() => {
                  const ping = p.seat === me.seat ? myPing : p.ping;
                  return ping != null && ping > 0 ? (
                    <span
                      className={`text-[10px] font-bold tabular-nums ${
                        ping < 80 ? 'text-primary' : ping < 160 ? 'text-accent' : 'text-destructive'
                      }`}
                    >
                      {ping}ms
                    </span>
                  ) : null;
                })()}
              </div>
            ))}
          </div>

          {me.host ? (
            <div className="mt-6">
              <div className="text-[11px] font-bold uppercase tracking-[0.24em] text-muted-foreground">
                Fill empty slots with bots
              </div>
              <div className="mt-2 grid grid-cols-4 gap-2">
                {[0, 1, 2, 3].map((n) => {
                  const active = players.filter((p) => p.bot).length === n;
                  return (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setBots(n)}
                      className={`rounded-xl border px-3 py-2.5 font-display text-base transition ${
                        active
                          ? 'border-primary bg-primary/15 text-primary'
                          : 'border-white/10 bg-white/5 text-foreground hover:border-primary/60 hover:text-primary'
                      }`}
                    >
                      {n}
                    </button>
                  );
                })}
              </div>
              <button
                type="button"
                disabled={players.length < 2}
                onClick={startMatch}
                className="mt-5 w-full rounded-full bg-primary px-8 py-3.5 font-display text-sm uppercase tracking-widest text-primary-foreground transition hover:brightness-110 disabled:opacity-40"
              >
                {players.length < 2 ? 'Need one more fighter' : 'Start the match'}
              </button>
            </div>
          ) : (
            <div className="mt-6 rounded-xl border border-white/10 bg-black/25 px-4 py-4 text-center text-sm text-muted-foreground">
              Waiting for the host to start the match…
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="relative h-[100dvh] w-full overflow-hidden bg-black">
      <GameCanvas
        session={session}
        localId={fighterId(me.seat)}
        onHud={setHud}
        className="absolute inset-0 h-full w-full"
      />
      <Hud
        hud={hud}
        localId={fighterId(me.seat)}
        exitLabel="Leave room"
        onExit={leave}
        onReplay={() => {
          const clip = session && session.replayClip();
          if (clip) setReplay(clip);
        }}
      />
      {replay && <ReplayOverlay clip={replay} onClose={() => setReplay(null)} />}
    </div>
  );
}