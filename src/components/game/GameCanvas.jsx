import React, { useEffect, useRef, useState } from 'react';
import { computeView, toWorld, drawScene } from '@/game/render';
import TouchControls from './TouchControls';

export default function GameCanvas({
  session,
  localId,
  onHud,
  showNames = true,
  interactive = true,
  className = '',
  paused = false,
  captureRef,
}) {
  const canvasRef = useRef(null);
  const wrapRef = useRef(null);
  const inputRef = useRef({
    left: false,
    right: false,
    jump: false,
    attack: false,
    throw: false,
    special: false,
    aim: 0,
  });
  const mouseRef = useRef({ x: 0, y: 0, has: false });
  const hudRef = useRef(onHud);
  const pausedRef = useRef(paused);
  const [touch, setTouch] = useState(false);
  const [isBoss, setIsBoss] = useState(false);
  const bossRef = useRef(false);
  hudRef.current = onHud;
  pausedRef.current = paused;

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setTouch(window.matchMedia && window.matchMedia('(pointer: coarse)').matches);
    }
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap || !session) return undefined;
    if (captureRef) captureRef.current = canvas;
    const ctx = canvas.getContext('2d');
    let raf = 0;
    let last = performance.now();
    let hudT = 0;

    const resize = () => {
      const r = wrap.getBoundingClientRect();
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      canvas.width = Math.max(1, Math.round(r.width * dpr));
      canvas.height = Math.max(1, Math.round(r.height * dpr));
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(wrap);

    const keys = {};
    const sync = () => {
      inputRef.current.left = !!(keys.a || keys.arrowleft);
      inputRef.current.right = !!(keys.d || keys.arrowright);
      inputRef.current.jump = !!(keys.w || keys.arrowup || keys[' ']);
    };
    const onKeyDown = (e) => {
      const k = e.key.toLowerCase();
      if (['arrowleft', 'arrowright', 'arrowup', 'arrowdown', ' '].includes(k)) e.preventDefault();
      keys[k === 'spacebar' ? ' ' : k] = true;
      if (k === 'q') inputRef.current.throw = true;
      if (k === 'e') inputRef.current.special = true;
      sync();
    };
    const onKeyUp = (e) => {
      const k = e.key.toLowerCase();
      keys[k === 'spacebar' ? ' ' : k] = false;
      if (k === 'q') inputRef.current.throw = false;
      if (k === 'e') inputRef.current.special = false;
      sync();
    };

    const toCanvas = (e) => {
      const r = canvas.getBoundingClientRect();
      return {
        x: (e.clientX - r.left) * (canvas.width / Math.max(1, r.width)),
        y: (e.clientY - r.top) * (canvas.height / Math.max(1, r.height)),
      };
    };
    const onMove = (e) => {
      const p = toCanvas(e);
      mouseRef.current = { x: p.x, y: p.y, has: true };
    };
    const onDown = (e) => {
      if (e.button === 0) {
        inputRef.current.attack = true;
        onMove(e);
      }
    };
    const onUp = (e) => {
      if (e.button === 0) inputRef.current.attack = false;
    };
    const onLeave = () => {
      inputRef.current.attack = false;
      mouseRef.current.has = false;
    };

    if (interactive) {
      window.addEventListener('keydown', onKeyDown);
      window.addEventListener('keyup', onKeyUp);
      canvas.addEventListener('mousemove', onMove);
      canvas.addEventListener('mousedown', onDown);
      window.addEventListener('mouseup', onUp);
      canvas.addEventListener('mouseleave', onLeave);
      canvas.addEventListener('contextmenu', (e) => e.preventDefault());
    }

    const loop = (now) => {
      const dt = Math.min(0.05, Math.max(0, (now - last) / 1000));
      last = now;

      let reticle = null;
      const pre = session.scene();
      const local = pre.fighters.find((f) => f.id === localId);
      const amBoss = !!(local && local.alive && (local.scale || 1) > 1);
      if (amBoss !== bossRef.current) {
        bossRef.current = amBoss;
        setIsBoss(amBoss);
      }
      if (interactive && local && mouseRef.current.has && canvas.width > 0) {
        const view = computeView(canvas.width, canvas.height, pre.arena);
        reticle = toWorld(mouseRef.current.x, mouseRef.current.y, view);
        inputRef.current.aim = Math.atan2(reticle.y - (local.y - 8), reticle.x - local.x);
      }
      session.setInput({ ...inputRef.current });
      if (!pausedRef.current) session.tick(dt);

      const scene = session.scene();
      const view = computeView(canvas.width, canvas.height, scene.arena);
      drawScene(ctx, scene, view, {
        canvasW: canvas.width,
        canvasH: canvas.height,
        localId,
        reticle,
        showNames,
      });

      hudT += dt;
      if (hudRef.current && hudT > 0.1) {
        hudT = 0;
        hudRef.current(session.hud());
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('mouseup', onUp);
      canvas.removeEventListener('mousemove', onMove);
      canvas.removeEventListener('mousedown', onDown);
      canvas.removeEventListener('mouseleave', onLeave);
    };
  }, [session, localId, interactive, showNames, captureRef]);

  return (
    <div ref={wrapRef} className={`overflow-hidden ${className}`}>
      <div className="relative h-full w-full">
        <canvas ref={canvasRef} className="block h-full w-full touch-none" />
        {interactive && touch && <TouchControls inputRef={inputRef} showSlam={isBoss} />}
      </div>
    </div>
  );
}