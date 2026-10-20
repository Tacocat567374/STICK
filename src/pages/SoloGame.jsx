import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import GameCanvas from '@/components/game/GameCanvas';
import Hud from '@/components/game/Hud';
import ReplayOverlay from '@/components/game/ReplayOverlay';
import { SoloSession, PALETTE } from '@/game/net';
import { MODES, BOT_POOL, getMode } from '@/game/modes';

export default function SoloGame() {
  const navigate = useNavigate();
  const [mode, setMode] = useState('brawl');
  const [count, setCount] = useState(4);
  const [difficulty, setDifficulty] = useState('normal');
  const [seed, setSeed] = useState(0);
  const [started, setStarted] = useState(false);
  const [hud, setHud] = useState(null);
  const [replay, setReplay] = useState(null);

  const survival = mode === 'survival';

  const session = useMemo(() => {
    if (!started) return null;
    const active = getMode(mode);
    const roster = [{ id: 'p1', name: 'You', color: PALETTE[0], isBot: false }];
    const bots = survival ? 1 : count - 1;
    for (let i = 0; i < bots; i++) {
      const t = BOT_POOL[i % BOT_POOL.length];
      roster.push({
        id: `p${i + 2}`,
        name: t.name,
        color: PALETTE[(i + 1) % PALETTE.length],
        isBot: true,
        personality: t.personality,
      });
    }
    return new SoloSession({
      roster,
      localId: 'p1',
      arenaIndex: 0,
      winsNeeded: active.wins,
      difficulty,
      mode,
    });
  }, [started, count, difficulty, seed, mode, survival]);

  if (!started) {
    return (
      <div className="flex min-h-[100dvh] w-full items-center justify-center bg-background px-6 py-10">
        <div className="w-full max-w-md rounded-3xl border border-white/10 bg-card/70 p-7 backdrop-blur-xl">
          <button
            type="button"
            onClick={() => navigate('/')}
            className="text-[11px] font-bold uppercase tracking-[0.24em] text-muted-foreground transition hover:text-primary"
          >
            ← Back
          </button>
          <h1 className="mt-4 font-display text-3xl uppercase tracking-tight text-foreground">Solo Brawl</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Fight a crowd of bots. Weapons drop in from the sky — grab them, or swing with your fists.
          </p>

          <div className="mt-6">
            <div className="text-[11px] font-bold uppercase tracking-[0.24em] text-muted-foreground">Game mode</div>
            <div className="mt-2 flex flex-col gap-2">
              {MODES.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setMode(m.id)}
                  className={`rounded-xl border px-4 py-3 text-left transition ${
                    mode === m.id
                      ? 'border-primary bg-primary/15'
                      : 'border-white/10 bg-white/5 hover:border-white/30'
                  }`}
                >
                  <span
                    className={`block font-display text-sm uppercase tracking-wide ${
                      mode === m.id ? 'text-primary' : 'text-foreground'
                    }`}
                  >
                    {m.label}
                  </span>
                  <span className="mt-0.5 block text-[11px] leading-snug text-muted-foreground">{m.blurb}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="mt-5">
            <div className="text-[11px] font-bold uppercase tracking-[0.24em] text-muted-foreground">
              Fighters in the arena
            </div>
            {survival ? (
              <div className="mt-2 rounded-xl border border-dashed border-white/12 px-4 py-3 text-[11px] leading-snug text-muted-foreground">
                Survival starts you against one bot and adds another every wave.
              </div>
            ) : (
              <div className="mt-2 grid grid-cols-3 gap-2">
                {[2, 3, 4].map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setCount(n)}
                    className={`rounded-xl border px-3 py-3 font-display text-lg transition ${
                      count === n
                        ? 'border-primary bg-primary/15 text-primary'
                        : 'border-white/10 bg-white/5 text-foreground hover:border-white/30'
                    }`}
                  >
                    {n}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="mt-5">
            <div className="text-[11px] font-bold uppercase tracking-[0.24em] text-muted-foreground">
              Bot difficulty
            </div>
            <div className="mt-2 grid grid-cols-3 gap-2">
              {[
                { id: 'easy', label: 'Easy' },
                { id: 'normal', label: 'Normal' },
                { id: 'hard', label: 'Hard' },
              ].map((d) => (
                <button
                  key={d.id}
                  type="button"
                  onClick={() => setDifficulty(d.id)}
                  className={`rounded-xl border px-3 py-2.5 font-display text-sm uppercase tracking-wide transition ${
                    difficulty === d.id
                      ? 'border-primary bg-primary/15 text-primary'
                      : 'border-white/10 bg-white/5 text-foreground hover:border-white/30'
                  }`}
                >
                  {d.label}
                </button>
              ))}
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              setHud(null);
              setStarted(true);
            }}
            className="mt-6 w-full rounded-full bg-primary px-8 py-3.5 font-display text-sm uppercase tracking-widest text-primary-foreground transition hover:brightness-110 active:scale-[0.98]"
          >
            Start fight
          </button>

          <p className="mt-4 text-center text-[11px] uppercase tracking-[0.2em] text-muted-foreground/70">
            A / D move · W jump · mouse aim · click to fight · Q throw · E boss slam
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative h-[100dvh] w-full overflow-hidden bg-black">
      <GameCanvas
        session={session}
        localId="p1"
        onHud={setHud}
        paused={!!replay}
        className="absolute inset-0 h-full w-full"
      />
      <Hud
        hud={hud}
        localId="p1"
        exitLabel="Quit"
        onExit={() => navigate('/')}
        onReplay={() => {
          const clip = session && session.replayClip();
          if (clip) setReplay(clip);
        }}
        onRematch={() => {
          setHud(null);
          setReplay(null);
          setSeed((s) => s + 1);
        }}
      />
      {replay && <ReplayOverlay clip={replay} onClose={() => setReplay(null)} />}
    </div>
  );
}