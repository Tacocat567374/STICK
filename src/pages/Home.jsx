import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import GameCanvas from '@/components/game/GameCanvas';
import { SoloSession, PALETTE } from '@/game/net';

const DEMO_ROSTER = [
  { id: 'p1', name: 'A', color: PALETTE[0], isBot: true },
  { id: 'p2', name: 'B', color: PALETTE[1], isBot: true },
  { id: 'p3', name: 'C', color: PALETTE[2], isBot: true },
];

const CONTROLS = [
  { k: 'A / D', v: 'Move' },
  { k: 'W', v: 'Jump' },
  { k: 'Mouse', v: 'Aim' },
  { k: 'Click', v: 'Swing / Shoot' },
];

export default function Home() {
  const demo = useMemo(() => new SoloSession({ roster: DEMO_ROSTER, localId: 'p1', arenaIndex: 0 }), []);

  return (
    <div className="relative h-[100dvh] w-full overflow-hidden bg-background">
      <GameCanvas
        session={demo}
        localId="p1"
        showNames={false}
        interactive={false}
        className="absolute inset-0 h-full w-full"
      />
      <div className="absolute inset-0 bg-gradient-to-b from-background/85 via-background/70 to-background/95" />

      <div className="relative z-10 flex h-full flex-col items-center justify-center px-6">
        <div className="w-full max-w-2xl text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-primary/40 bg-primary/10 px-3.5 py-1 text-[11px] font-bold uppercase tracking-[0.28em] text-primary">
            Physics brawler
          </span>
          <h1 className="mt-5 font-display text-5xl uppercase leading-[0.92] tracking-tight text-foreground sm:text-7xl">
            Stick
            <span className="text-primary"> Arena</span>
          </h1>
          <p className="mx-auto mt-4 max-w-md text-sm leading-relaxed text-muted-foreground sm:text-base">
            Ragdoll stick figures, guns and melee, weapon drops from the sky. Knock everyone else
            off the arena — last stick standing takes the round.
          </p>

          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link to="/solo" className="w-full sm:w-auto">
              <button
                type="button"
                className="w-full rounded-full bg-primary px-8 py-3.5 font-display text-sm uppercase tracking-widest text-primary-foreground shadow-[0_10px_40px_-12px_rgba(184,255,61,0.8)] transition hover:brightness-110 active:scale-[0.98] sm:w-auto"
              >
                Solo vs Bots
              </button>
            </Link>
            <Link to="/online" className="w-full sm:w-auto">
              <button
                type="button"
                className="w-full rounded-full border border-white/20 bg-white/5 px-8 py-3.5 font-display text-sm uppercase tracking-widest text-foreground backdrop-blur transition hover:border-primary/60 hover:text-primary active:scale-[0.98] sm:w-auto"
              >
                Play Online
              </button>
            </Link>
          </div>

          <div className="mx-auto mt-10 grid max-w-lg grid-cols-2 gap-2 sm:grid-cols-4">
            {CONTROLS.map((c) => (
              <div
                key={c.k}
                className="rounded-xl border border-white/10 bg-black/40 px-3 py-2.5 backdrop-blur-sm"
              >
                <div className="text-[11px] font-bold uppercase tracking-widest text-primary">{c.k}</div>
                <div className="text-[11px] text-muted-foreground">{c.v}</div>
              </div>
            ))}
          </div>

          <p className="mt-6 text-[11px] uppercase tracking-[0.24em] text-muted-foreground/60">
            On a phone? Left thumb moves, right thumb aims and fires.
          </p>
        </div>
      </div>
    </div>
  );
}