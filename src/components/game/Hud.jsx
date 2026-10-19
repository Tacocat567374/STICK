import React from 'react';
import { WEAPONS } from '@/game/weapons';
import { PERSONALITIES } from '@/game/ai';

function pips(wins, needed, color) {
  return (
    <span className="flex gap-1">
      {Array.from({ length: needed }).map((_, i) => (
        <span
          key={i}
          className="h-1.5 w-4 rounded-full"
          style={{ background: i < wins ? color : 'rgba(255,255,255,0.18)' }}
        />
      ))}
    </span>
  );
}

function Card({ p, needed, isLocal }) {
  const weapon = WEAPONS[p.weapon] || WEAPONS.fists;
  return (
    <div
      className="flex min-w-[150px] flex-col gap-1.5 rounded-xl border px-3 py-2 backdrop-blur-md"
      style={{
        borderColor: isLocal ? p.color : 'rgba(255,255,255,0.12)',
        background: 'rgba(10,9,20,0.62)',
        opacity: p.alive ? 1 : 0.45,
      }}
    >
      <div className="flex items-center justify-between gap-3">
        <span className="flex items-center gap-1.5 text-[12px] font-bold tracking-wide text-white">
          <span className="h-2.5 w-2.5 rounded-full" style={{ background: p.color }} />
          {p.name}
          {p.isBot && (
            <>
              <span className="text-[9px] font-semibold uppercase tracking-wider text-white/40">bot</span>
              {p.personality && PERSONALITIES[p.personality] && (
                <span className="text-[9px] font-bold uppercase tracking-wider text-primary/70">
                  {PERSONALITIES[p.personality].label}
                </span>
              )}
            </>
          )}
          {p.boss && <span className="text-[9px] font-bold uppercase tracking-wider text-accent">boss</span>}
        </span>
        {pips(p.wins, needed, p.color)}
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/15">
        <div
          className="h-full rounded-full transition-all duration-200"
          style={{ width: `${(p.hp / (p.maxHp || 100)) * 100}%`, background: p.color }}
        />
      </div>
      <div className="flex items-center justify-between text-[10px] font-semibold uppercase tracking-widest text-white/45">
        <span>{weapon.name}</span>
        <span>{weapon.kind === 'gun' ? `${p.ammo} rnds` : 'melee'}</span>
      </div>
    </div>
  );
}

export default function Hud({ hud, localId, onExit, onRematch, exitLabel = 'Leave' }) {
  if (!hud) return null;
  const { players = [], state, timer, round, arenaName, winsNeeded, alive, winner, flash } = hud;
  const winnerPlayer = players.find((p) => p.id === winner);

  let banner = null;
  let sub = null;
  if (state === 'countdown') banner = Math.max(1, Math.ceil(timer));
  else if (flash) banner = flash;
  else if (state === 'roundover') {
    banner = 'ROUND OVER';
    sub = 'Next round in a moment';
  } else if (state === 'matchover') {
    banner = `${winnerPlayer ? winnerPlayer.name : 'Nobody'} wins`;
    sub = 'Match complete';
  } else if (state === 'waiting') banner = 'Waiting for the host…';

  return (
    <div className="pointer-events-none absolute inset-0 flex flex-col p-3 sm:p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2 rounded-full border border-white/10 bg-black/50 px-3 py-1 backdrop-blur-md">
            <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-primary">Round {round}</span>
            <span className="h-3 w-px bg-white/20" />
            <span className="text-[11px] font-semibold uppercase tracking-widest text-white/60">{arenaName}</span>
            <span className="h-3 w-px bg-white/20" />
            <span className="text-[11px] font-semibold uppercase tracking-widest text-white/60">{alive} alive</span>
          </div>
        </div>
        {onExit && (
          <button
            type="button"
            onClick={onExit}
            className="pointer-events-auto rounded-full border border-white/15 bg-black/50 px-3.5 py-1.5 text-[11px] font-bold uppercase tracking-widest text-white/70 backdrop-blur-md transition hover:border-white/40 hover:text-white"
          >
            {exitLabel}
          </button>
        )}
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {players.map((p) => (
          <Card key={p.id} p={p} needed={winsNeeded} isLocal={p.id === localId} />
        ))}
      </div>

      {banner && (
        <div className="absolute inset-x-0 top-[38%] flex flex-col items-center gap-2 text-center">
          <div
            className="font-display text-5xl uppercase tracking-tight text-white drop-shadow-[0_4px_24px_rgba(0,0,0,0.85)] sm:text-7xl"
            style={{ WebkitTextStroke: '1px rgba(0,0,0,0.35)' }}
          >
            {banner}
          </div>
          {sub && <div className="text-xs font-semibold uppercase tracking-[0.3em] text-white/70">{sub}</div>}
          {state === 'matchover' && onRematch && (
            <button
              type="button"
              onClick={onRematch}
              className="pointer-events-auto mt-3 rounded-full bg-primary px-6 py-2.5 text-sm font-bold uppercase tracking-widest text-primary-foreground transition hover:brightness-110"
            >
              Rematch
            </button>
          )}
        </div>
      )}
    </div>
  );
}