"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export interface ForecastPoint {
  label: string;
  value: number;
  display: string;
}

interface Geometry {
  x: (i: number) => number;
  y: (v: number) => number;
  n: number;
  min: number;
  max: number;
}

const PAD = { top: 18, right: 14, bottom: 24, left: 14 };

function readColor(el: HTMLElement, name: string, fallback: string): string {
  const v = getComputedStyle(el).getPropertyValue(name).trim();
  return v || fallback;
}

function geometry(points: ForecastPoint[], w: number, h: number): Geometry {
  const values = points.map((p) => p.value);
  const rawMin = Math.min(...values);
  const rawMax = Math.max(...values);
  // A hair of headroom so the peak and trough never kiss the frame.
  const pad = (rawMax - rawMin || Math.abs(rawMax) || 1) * 0.12;
  const min = rawMin - pad;
  const max = rawMax + pad;
  const plotW = w - PAD.left - PAD.right;
  const plotH = h - PAD.top - PAD.bottom;
  const n = points.length;
  return {
    n,
    min,
    max,
    x: (i) => PAD.left + (n <= 1 ? 0 : (i / (n - 1)) * plotW),
    y: (v) => PAD.top + (1 - (v - min) / (max - min || 1)) * plotH,
  };
}

/**
 * The cash-flow forecast, drawn on a canvas.
 *
 * The forecast is entirely ahead of the reader, so "now" is the left edge and
 * the plot runs into the future. The one idea this chart encodes that a plain
 * line chart does not: certainty decays with time. The area fill fades as it
 * projects rightward, because a balance three days out is a near-fact and one
 * twenty-eight days out is a guess — and the chart should not pretend otherwise.
 */
export function ForecastChart({
  points,
  lowestLabel,
}: {
  points: ForecastPoint[];
  lowestLabel: string;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [hover, setHover] = useState<number | null>(null);
  const hoverRef = useRef<number | null>(null);
  const progressRef = useRef(0);

  const lowestIndex = points.reduce(
    (lo, p, i) => (p.value < points[lo]!.value ? i : lo),
    0,
  );

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap || points.length === 0) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = wrap.clientWidth;
    const h = wrap.clientHeight;
    if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) {
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);

    const credit = readColor(wrap, "--credit", "#5eead4");
    const now = readColor(wrap, "--now", "#7da2ff");
    const rule = readColor(wrap, "--rule", "#1e2634");
    const ink = readColor(wrap, "--ink", "#eaeef6");
    const muted = readColor(wrap, "--ink-muted", "#8792a8");

    const g = geometry(points, w, h);
    const progress = progressRef.current;
    const revealX = PAD.left + (w - PAD.left - PAD.right) * progress;
    const baseline = h - PAD.bottom;

    // Horizontal grid — the ledger's ruled lines.
    ctx.strokeStyle = rule;
    ctx.lineWidth = 1;
    for (let i = 1; i <= 3; i++) {
      const y = PAD.top + ((h - PAD.top - PAD.bottom) * i) / 4;
      ctx.beginPath();
      ctx.moveTo(PAD.left, y);
      ctx.lineTo(w - PAD.right, y);
      ctx.stroke();
    }

    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, revealX, h); // reveal left-to-right on load
    ctx.clip();

    const linePath = () => {
      ctx.beginPath();
      points.forEach((p, i) => {
        const px = g.x(i);
        const py = g.y(p.value);
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      });
    };

    // Area fill: credit hue, fading rightward as certainty drops into the future.
    linePath();
    ctx.lineTo(g.x(g.n - 1), baseline);
    ctx.lineTo(g.x(0), baseline);
    ctx.closePath();
    const fill = ctx.createLinearGradient(PAD.left, 0, w - PAD.right, 0);
    fill.addColorStop(0, hexA(credit, 0.28));
    fill.addColorStop(1, hexA(credit, 0.02));
    ctx.fillStyle = fill;
    ctx.fill();

    // The trajectory line.
    linePath();
    ctx.strokeStyle = credit;
    ctx.lineWidth = 2;
    ctx.lineJoin = "round";
    ctx.shadowColor = hexA(credit, 0.5);
    ctx.shadowBlur = 12;
    ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.restore();

    // The present moment, as a physical edge.
    const nowX = g.x(0);
    ctx.strokeStyle = now;
    ctx.lineWidth = 1.5;
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.moveTo(nowX, PAD.top - 6);
    ctx.lineTo(nowX, baseline);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = now;
    // Canvas font strings don't resolve CSS vars, so name a concrete stack.
    ctx.font = "600 9px ui-monospace, 'SF Mono', monospace";
    ctx.textBaseline = "alphabetic";
    ctx.fillText("NOW", nowX + 4, PAD.top - 8);

    // The trough — the moment the account is thinnest, and the only marked point.
    // Drawn in neutral ink (not alert red): a low balance is a fact to notice, not
    // an error. It's the same point the "Lowest: $X on <date>" caption names.
    if (progress >= 1) {
      const lx = g.x(lowestIndex);
      const ly = g.y(points[lowestIndex]!.value);
      ctx.beginPath();
      ctx.arc(lx, ly, 6, 0, Math.PI * 2);
      ctx.fillStyle = hexA(ink, 0.16);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(lx, ly, 3.5, 0, Math.PI * 2);
      ctx.fillStyle = ink;
      ctx.fill();
    }

    // Hover: a tracer and a highlighted node.
    const hi = hoverRef.current;
    if (hi != null && points[hi]) {
      const hx = g.x(hi);
      const hy = g.y(points[hi]!.value);
      ctx.strokeStyle = hexA(muted, 0.4);
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(hx, PAD.top);
      ctx.lineTo(hx, baseline);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(hx, hy, 4, 0, Math.PI * 2);
      ctx.fillStyle = credit;
      ctx.strokeStyle = readColor(wrap, "--surface", "#0d1119");
      ctx.lineWidth = 2;
      ctx.fill();
      ctx.stroke();
    }
  }, [points, lowestIndex]);

  // Intro reveal, once, respecting reduced motion.
  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      progressRef.current = 1;
      draw();
      return;
    }
    let raf = 0;
    let started = 0;
    const DURATION = 900;
    const tick = (t: number) => {
      if (!started) started = t;
      const e = Math.min(1, (t - started) / DURATION);
      progressRef.current = 1 - Math.pow(1 - e, 3); // easeOutCubic
      draw();
      if (e < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [draw]);

  // Redraw on container resize and theme change.
  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap) return;
    const ro = new ResizeObserver(() => draw());
    ro.observe(wrap);
    const mo = new MutationObserver(() => draw());
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    return () => {
      ro.disconnect();
      mo.disconnect();
    };
  }, [draw]);

  function onMove(e: React.PointerEvent) {
    const wrap = wrapRef.current;
    if (!wrap) return;
    const rect = wrap.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const g = geometry(points, rect.width, rect.height);
    let nearest = 0;
    let best = Infinity;
    for (let i = 0; i < points.length; i++) {
      const d = Math.abs(g.x(i) - x);
      if (d < best) {
        best = d;
        nearest = i;
      }
    }
    hoverRef.current = nearest;
    setHover(nearest);
    draw();
  }

  function onLeave() {
    hoverRef.current = null;
    setHover(null);
    draw();
  }

  const active = hover != null ? points[hover] : null;

  return (
    <div
      ref={wrapRef}
      className="relative h-[168px] w-full touch-none"
      onPointerMove={onMove}
      onPointerLeave={onLeave}
    >
      <canvas
        ref={canvasRef}
        className="h-full w-full"
        role="img"
        aria-label={`Cash-flow forecast for the next 30 days. Lowest projected balance ${lowestLabel}.`}
      />
      {active ? (
        <div
          className="pointer-events-none absolute top-1 rounded-md border border-rule-strong bg-surface px-2 py-1 shadow-lift"
          style={{ left: `${(hover! / Math.max(points.length - 1, 1)) * 100}%`, transform: "translateX(-50%)" }}
        >
          <div className="tabular text-[13px] font-semibold text-ink">{active.display}</div>
          <div className="text-[10px] text-muted">{active.label}</div>
        </div>
      ) : null}
    </div>
  );
}

/** Apply an alpha to a `#rrggbb`, falling back to the color itself if it isn't hex. */
function hexA(hex: string, alpha: number): string {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex);
  if (!m?.[1]) return hex;
  const n = parseInt(m[1], 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
}
