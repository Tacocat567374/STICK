import React, { useRef, useState } from 'react';

// Twin-stick touch layer: left half moves, right half aims and fires.
export default function TouchControls({ inputRef, showSlam = false }) {
  const stateRef = useRef({ move: null, aim: null });
  const [ui, setUi] = useState({ move: null, aim: null });

  const start = (side) => (e) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    const r = e.currentTarget.getBoundingClientRect();
    const stick = { id: e.pointerId, ox: e.clientX - r.left, oy: e.clientY - r.top, x: e.clientX - r.left, y: e.clientY - r.top };
    stateRef.current[side] = stick;
    setUi({ ...stateRef.current });
    const i = inputRef.current;
    if (side === 'aim') i.attack = true;
  };

  const move = (side) => (e) => {
    const s = stateRef.current[side];
    if (!s || s.id !== e.pointerId) return;
    const r = e.currentTarget.getBoundingClientRect();
    s.x = e.clientX - r.left;
    s.y = e.clientY - r.top;
    setUi({ ...stateRef.current });
    const i = inputRef.current;
    if (side === 'move') {
      const dx = s.x - s.ox;
      i.left = dx < -14;
      i.right = dx > 14;
      i.jump = s.y - s.oy < -46;
    } else {
      const dx = s.x - s.ox;
      const dy = s.y - s.oy;
      if (Math.hypot(dx, dy) > 12) i.aim = Math.atan2(dy, dx);
    }
  };

  const end = (side) => (e) => {
    const s = stateRef.current[side];
    if (!s || s.id !== e.pointerId) return;
    stateRef.current[side] = null;
    setUi({ ...stateRef.current });
    const i = inputRef.current;
    if (side === 'move') {
      i.left = false;
      i.right = false;
      i.jump = false;
    } else {
      i.attack = false;
    }
  };

  const Stick = ({ s, tone }) =>
    s ? (
      <>
        <span
          className="pointer-events-none absolute rounded-full border-2 border-white/30"
          style={{ left: s.ox - 40, top: s.oy - 40, width: 80, height: 80 }}
        />
        <span
          className="pointer-events-none absolute rounded-full"
          style={{ left: s.x - 22, top: s.y - 22, width: 44, height: 44, background: tone }}
        />
      </>
    ) : null;

  return (
    <div className="absolute inset-0 select-none">
      <div
        className="absolute bottom-0 left-0 top-0 w-1/2"
        onPointerDown={start('move')}
        onPointerMove={move('move')}
        onPointerUp={end('move')}
        onPointerCancel={end('move')}
      >
        <Stick s={ui.move} tone="rgba(255,255,255,0.25)" />
        <span className="absolute bottom-6 left-6 text-[11px] font-semibold uppercase tracking-widest text-white/45">
          Move / Jump
        </span>
      </div>
      <div
        className="absolute bottom-0 right-0 top-0 w-1/2"
        onPointerDown={start('aim')}
        onPointerMove={move('aim')}
        onPointerUp={end('aim')}
        onPointerCancel={end('aim')}
      >
        <Stick s={ui.aim} tone="rgba(184,255,61,0.35)" />
        <span className="absolute bottom-6 right-6 text-[11px] font-semibold uppercase tracking-widest text-white/45">
          Aim / Fire
        </span>
      </div>
      <button
        type="button"
        className="absolute right-5 top-5 z-10 rounded-full border border-white/25 bg-black/45 px-4 py-2.5 text-[11px] font-bold uppercase tracking-widest text-white/80 active:scale-95"
        onPointerDown={(e) => {
          e.preventDefault();
          inputRef.current.throw = true;
        }}
        onPointerUp={() => {
          inputRef.current.throw = false;
        }}
        onPointerCancel={() => {
          inputRef.current.throw = false;
        }}
      >
        Throw
      </button>
      {showSlam && (
        <button
          type="button"
          className="absolute right-5 top-20 z-10 rounded-full border border-accent bg-accent/20 px-4 py-2.5 text-[11px] font-bold uppercase tracking-widest text-accent active:scale-95"
          onPointerDown={(e) => {
            e.preventDefault();
            inputRef.current.special = true;
          }}
          onPointerUp={() => {
            inputRef.current.special = false;
          }}
          onPointerCancel={() => {
            inputRef.current.special = false;
          }}
        >
          Slam
        </button>
      )}
    </div>
  );
}