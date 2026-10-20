import React, { useMemo, useRef, useState } from 'react';
import GameCanvas from './GameCanvas';
import { ReplaySession } from '@/game/replay';

export default function ReplayOverlay({ clip, onClose }) {
  const session = useMemo(() => new ReplaySession(clip), [clip]);
  const canvasRef = useRef(null);
  const recRef = useRef(null);
  const chunksRef = useRef([]);
  const [info, setInfo] = useState({ progress: 0, done: false });
  const [saving, setSaving] = useState(false);
  const [paused, setPaused] = useState(false);

  const canRecord = typeof window !== 'undefined' && typeof window.MediaRecorder !== 'undefined';

  const handleHud = (h) => {
    setInfo({ progress: h.progress || 0, done: !!h.done });
    const rec = recRef.current;
    if (h.done && rec && rec.state === 'recording') rec.stop();
  };

  const toggle = () => {
    if (info.done) {
      session.restart();
      setPaused(false);
      return;
    }
    const next = !paused;
    setPaused(next);
    session.setPaused(next);
  };

  const saveVideo = () => {
    const canvas = canvasRef.current;
    if (!canvas || !canRecord || saving) return;
    const mime = window.MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
      ? 'video/webm;codecs=vp9'
      : 'video/webm';
    const rec = new window.MediaRecorder(canvas.captureStream(30), {
      mimeType: mime,
      videoBitsPerSecond: 6000000,
    });
    chunksRef.current = [];
    rec.ondataavailable = (e) => {
      if (e.data && e.data.size) chunksRef.current.push(e.data);
    };
    rec.onstop = () => {
      recRef.current = null;
      setSaving(false);
      const url = URL.createObjectURL(new Blob(chunksRef.current, { type: 'video/webm' }));
      const a = document.createElement('a');
      a.href = url;
      a.download = `stick-brawl-replay-${Date.now()}.webm`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 15000);
    };
    recRef.current = rec;
    setSaving(true);
    setPaused(false);
    session.restart();
    rec.start();
  };

  const close = () => {
    if (recRef.current && recRef.current.state === 'recording') recRef.current.stop();
    onClose();
  };

  const seconds = Math.max(1, Math.round(clip.frames.length / 20));

  return (
    <div className="absolute inset-0 z-30 flex flex-col bg-black/95">
      <div className="pointer-events-none absolute inset-0">
        <GameCanvas
          session={session}
          localId="p1"
          onHud={handleHud}
          interactive={false}
          captureRef={canvasRef}
          className="h-full w-full"
        />
      </div>

      <div className="pointer-events-none relative z-10 flex items-start justify-between gap-3 p-3 sm:p-4">
        <div className="rounded-full border border-white/10 bg-black/60 px-3 py-1.5 backdrop-blur-md">
          <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-primary">Replay</span>
          <span className="mx-2 text-white/25">|</span>
          <span className="text-[11px] font-semibold uppercase tracking-widest text-white/60">
            last {seconds}s
          </span>
        </div>
        <button
          type="button"
          onClick={close}
          className="pointer-events-auto rounded-full border border-white/15 bg-black/60 px-3.5 py-1.5 text-[11px] font-bold uppercase tracking-widest text-white/70 backdrop-blur-md transition hover:border-white/40 hover:text-white"
        >
          Close
        </button>
      </div>

      <div className="relative z-10 mt-auto flex flex-col gap-3 p-4">
        <div className="h-1 w-full overflow-hidden rounded-full bg-white/15">
          <div
            className="h-full rounded-full bg-primary transition-all duration-150"
            style={{ width: `${Math.min(100, Math.round((info.progress || 0) * 100))}%` }}
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={toggle}
            className="rounded-full border border-white/20 bg-white/5 px-5 py-2.5 text-[11px] font-bold uppercase tracking-widest text-white transition hover:border-white/50"
          >
            {info.done ? 'Play again' : paused ? 'Play' : 'Pause'}
          </button>
          <button
            type="button"
            onClick={saveVideo}
            disabled={!canRecord || saving}
            className="rounded-full bg-primary px-5 py-2.5 text-[11px] font-bold uppercase tracking-widest text-primary-foreground transition hover:brightness-110 disabled:opacity-40"
          >
            {saving ? 'Recording…' : 'Save to device'}
          </button>
          {!canRecord && (
            <span className="text-[11px] uppercase tracking-widest text-white/45">
              Video export isn&apos;t supported in this browser
            </span>
          )}
          {saving && (
            <span className="text-[11px] uppercase tracking-widest text-white/45">playing through once…</span>
          )}
        </div>
      </div>
    </div>
  );
}