import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';

const MAX_PLAYERS = 8;

export default function RoomBrowser({ onJoin, onCreate, busy, error }) {
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [roomName, setRoomName] = useState('');
  const [code, setCode] = useState('');

  useEffect(() => {
    let alive = true;
    const load = async () => {
      try {
        const list = await base44.entities.Arena.filter({ status: 'open' }, '-updated_date', 30);
        if (!alive) return;
        const cutoff = Date.now() - 15 * 60 * 1000;
        setRooms(
          list.filter(
            (r) =>
              r.status === 'open' &&
              (r.player_count || 1) < MAX_PLAYERS &&
              new Date(r.updated_date || r.created_date).getTime() > cutoff
          )
        );
      } catch {
        if (alive) setRooms([]);
      } finally {
        if (alive) setLoading(false);
      }
    };
    load();
    const unsub = base44.entities.Arena.subscribe(() => load());
    const iv = setInterval(load, 6000);
    return () => {
      alive = false;
      if (typeof unsub === 'function') unsub();
      else if (unsub && typeof unsub.unsubscribe === 'function') unsub.unsubscribe();
      clearInterval(iv);
    };
  }, []);

  return (
    <div className="flex min-h-[100dvh] w-full justify-center bg-background px-5 py-10">
      <div className="w-full max-w-2xl">
        <button
          type="button"
          onClick={() => window.history.back()}
          className="text-[11px] font-bold uppercase tracking-[0.24em] text-muted-foreground transition hover:text-primary"
        >
          ← Back
        </button>

        <h1 className="mt-4 font-display text-4xl uppercase tracking-tight text-foreground sm:text-5xl">
          Online <span className="text-primary">Arenas</span>
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Jump into an open room, or open your own and share the invite code with friends.
        </p>
        {error && <p className="mt-3 text-sm text-destructive">{error}</p>}

        <div className="mt-7 rounded-2xl border border-white/10 bg-card/60 p-4 backdrop-blur">
          <div className="text-[11px] font-bold uppercase tracking-[0.24em] text-muted-foreground">
            Open your own room
          </div>
          <div className="mt-2 flex flex-col gap-2 sm:flex-row">
            <input
              value={roomName}
              onChange={(e) => setRoomName(e.target.value)}
              placeholder="Room name"
              maxLength={28}
              className="flex-1 rounded-xl border border-white/12 bg-black/40 px-4 py-2.5 text-sm text-foreground outline-none transition placeholder:text-muted-foreground/60 focus:border-primary/60"
            />
            <button
              type="button"
              disabled={busy}
              onClick={() => onCreate(roomName.trim())}
              className="rounded-xl bg-primary px-6 py-2.5 font-display text-xs uppercase tracking-widest text-primary-foreground transition hover:brightness-110 disabled:opacity-50"
            >
              {busy ? 'Opening…' : 'Create room'}
            </button>
          </div>
        </div>

        <div className="mt-7">
          <div className="flex items-center justify-between">
            <div className="text-[11px] font-bold uppercase tracking-[0.24em] text-muted-foreground">
              Rooms looking for fighters
            </div>
            {loading && <span className="text-[11px] text-muted-foreground/60">Loading…</span>}
          </div>

          <div className="mt-3 flex flex-col gap-2">
            {!loading && rooms.length === 0 && (
              <div className="rounded-2xl border border-dashed border-white/12 px-5 py-10 text-center text-sm text-muted-foreground">
                No open rooms right now — open one and invite a friend.
              </div>
            )}
            {rooms.map((r) => (
              <button
                key={r.id}
                type="button"
                onClick={() => onJoin(r.id, r.id)}
                className="group flex items-center justify-between gap-4 rounded-2xl border border-white/10 bg-card/50 px-5 py-4 text-left transition hover:border-primary/50 hover:bg-card/80"
              >
                <div>
                  <div className="font-display text-base uppercase tracking-wide text-foreground">
                    {r.room_name || 'Arena'}
                  </div>
                  <div className="text-[11px] uppercase tracking-widest text-muted-foreground">
                    host {r.host_name || 'unknown'} · {r.player_count || 1}/{MAX_PLAYERS} fighters
                  </div>
                </div>
                <span className="rounded-full border border-white/15 px-4 py-1.5 text-[11px] font-bold uppercase tracking-widest text-muted-foreground transition group-hover:border-primary group-hover:text-primary">
                  Join
                </span>
              </button>
            ))}
          </div>
        </div>

        <div className="mt-8 rounded-2xl border border-white/10 bg-card/60 p-4 backdrop-blur">
          <div className="text-[11px] font-bold uppercase tracking-[0.24em] text-muted-foreground">
            Have an invite code?
          </div>
          <div className="mt-2 flex flex-col gap-2 sm:flex-row">
            <input
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="Paste invite code"
              className="flex-1 rounded-xl border border-white/12 bg-black/40 px-4 py-2.5 font-mono text-sm text-foreground outline-none transition placeholder:text-muted-foreground/60 focus:border-primary/60"
            />
            <button
              type="button"
              disabled={busy || code.trim().length < 6}
              onClick={() => onJoin(code.trim(), null)}
              className="rounded-xl border border-white/20 px-6 py-2.5 font-display text-xs uppercase tracking-widest text-foreground transition hover:border-primary hover:text-primary disabled:opacity-40"
            >
              Join
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}