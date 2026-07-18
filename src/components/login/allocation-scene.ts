/**
 * The sign-in backdrop: a budget funding itself. Dollar signs rain down, each
 * sorts into a category column, and a column only grows when a dollar actually
 * lands in it — so a column's height IS its dollar count. Every column is dealt
 * a random number of dollars, so the skyline is uneven; when fully funded it
 * holds, then drains and refills. It reads the app's Sterling tokens straight
 * from CSS, so it follows light/dark and any future palette change with no edits.
 *
 * Canvas rather than DOM: dozens of glowing, moving marks per frame is exactly
 * what a canvas is for. Returns null if 2D context is unavailable so the caller
 * can fall back to a plain background — a sign-in must never depend on this.
 */

export interface AllocationHandle {
  destroy(): void;
}

interface Col {
  x: number;
  hue: string;
  label: string;
  quota: number;
  assigned: number;
  inflight: number;
  filled: number;
  fill: number;
  pulse: number;
  phase: number;
}

interface Bill {
  x: number;
  y: number;
  col: Col;
  hue: string;
  vy: number;
  wob: number;
  size: number;
  sway: number;
}

type Rgb = [number, number, number];

// Money in / money out / neutral accents, straight from the theme.
const HUE_VARS = ["--credit", "--now", "--debit", "--scheduled"];
const CATEGORIES = [
  "RENT", "GROCERIES", "SAVINGS", "UTILITIES", "TRANSPORT", "DINING",
  "TAXES", "INSURANCE", "HEALTH", "TRAVEL", "PHONE", "GIFTS",
];
const STEP = 0.06; // a column grows this much for each dollar that lands

function shuffled<T>(input: T[]): T[] {
  const a = input.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j]!, a[i]!];
  }
  return a;
}

export function startAllocationScene(canvas: HTMLCanvasElement): AllocationHandle | null {
  const rawCtx = canvas.getContext("2d");
  if (!rawCtx) return null;
  // Bind to a non-null const so the narrowing carries into the closures below.
  const ctx: CanvasRenderingContext2D = rawCtx;
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  let W = 0;
  let H = 0;
  let cols: Col[] = [];
  let bills: Bill[] = [];
  let phase: "fill" | "hold" | "drain" = "fill";
  let holdUntil = 0;
  let raf = 0;
  let disposed = false;
  let last = 0;

  const colors: Record<string, Rgb> = {};
  const sprites: Record<string, HTMLCanvasElement> = {};

  function readVar(name: string): Rgb {
    const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    const m = /^#?([0-9a-f]{6})$/i.exec(v);
    if (!m?.[1]) return [128, 128, 128];
    const n = parseInt(m[1], 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }

  function readColors() {
    for (const h of HUE_VARS) colors[h] = readVar(h);
    for (const k of Object.keys(sprites)) delete sprites[k];
  }

  // Soft glow disc, cached per hue. drawImage of a sprite is far cheaper than a
  // fresh radial gradient per mark per frame.
  function glow(hue: string): HTMLCanvasElement {
    const cached = sprites[hue];
    if (cached) return cached;
    const [r, g, b] = colors[hue] ?? [128, 128, 128];
    const s = document.createElement("canvas");
    const R = 64;
    s.width = R * 2;
    s.height = R * 2;
    const sc = s.getContext("2d");
    if (sc) {
      const grad = sc.createRadialGradient(R, R, 0, R, R, R);
      grad.addColorStop(0, `rgba(${r},${g},${b},1)`);
      grad.addColorStop(0.35, `rgba(${r},${g},${b},0.35)`);
      grad.addColorStop(1, `rgba(${r},${g},${b},0)`);
      sc.fillStyle = grad;
      sc.fillRect(0, 0, R * 2, R * 2);
    }
    sprites[hue] = s;
    return s;
  }

  function drawGlow(hue: string, x: number, y: number, r: number, a: number) {
    ctx.globalAlpha = a;
    ctx.drawImage(glow(hue), x - r, y - r, r * 2, r * 2);
    ctx.globalAlpha = 1;
  }

  function init() {
    const n = Math.max(5, Math.round(W / 170));
    const labels = shuffled(CATEGORIES);
    cols = [];
    for (let i = 0; i < n; i++) {
      cols.push({
        x: (i + 0.5) / n,
        hue: HUE_VARS[i % HUE_VARS.length]!,
        label: labels[i % labels.length]!,
        quota: 2 + Math.floor(Math.random() * 9), // random dollars this column will get
        assigned: 0,
        inflight: 0,
        filled: 0,
        fill: 0,
        pulse: 0,
        phase: Math.random() * 6.28,
      });
    }
    bills = [];
    phase = "fill";
  }

  function spawn() {
    // one column, at most two dollars in flight, so each lands as a clean step
    const need = cols.filter((c) => c.assigned < c.quota && c.inflight < 2);
    if (!need.length) return;
    const c = need[Math.floor(Math.random() * need.length)]!;
    c.assigned++;
    c.inflight++;
    bills.push({
      x: c.x + (Math.random() - 0.5) * 0.14,
      y: -0.05,
      col: c,
      hue: c.hue,
      vy: 0.0019 + Math.random() * 0.0012,
      wob: Math.random() * 6.28,
      size: 13 + Math.random() * 8,
      sway: 0.3 + Math.random() * 0.5,
    });
  }

  function render(dt: number, t: number) {
    const f = dt / 16;
    const base = H * 0.98;

    if (reduce) {
      for (const c of cols) {
        c.filled = c.quota;
        c.fill = c.quota * STEP;
      }
    } else if (phase === "fill") {
      if (bills.length < 14 && Math.random() < 0.1) spawn();
      if (bills.length === 0 && cols.every((c) => c.filled >= c.quota)) {
        phase = "hold";
        holdUntil = t + 3200;
      }
    } else if (phase === "hold") {
      if (t > holdUntil) {
        phase = "drain";
        bills = [];
        for (const c of cols) {
          c.filled = 0;
          c.assigned = 0;
          c.inflight = 0;
        }
      }
    } else if (cols.every((c) => c.fill < 0.004)) {
      init();
    }

    // columns — height is purely a function of dollars landed
    for (const c of cols) {
      c.pulse *= 0.9;
      const targetH = c.filled * STEP;
      c.fill += (targetH - c.fill) * 0.035 * f; // grow slowly, one dollar-step at a time
      if (c.fill < 0.001 && targetH === 0) {
        c.fill = 0;
        continue;
      }
      const funded = c.quota > 0 && c.filled >= c.quota;
      const h = Math.max(0, c.fill + (funded ? 0.008 * Math.sin(t * 0.0006 + c.phase) : 0));
      const cx = c.x * W;
      const top = base - h * H;
      const [r, g, b] = colors[c.hue] ?? [128, 128, 128];
      const w = Math.min(94, (W / cols.length) * 0.56);
      const grad = ctx.createLinearGradient(0, base, 0, top);
      grad.addColorStop(0, `rgba(${r},${g},${b},0.17)`);
      grad.addColorStop(1, `rgba(${r},${g},${b},0.02)`);
      ctx.fillStyle = grad;
      ctx.fillRect(cx - w / 2, top, w, base - top);
      drawGlow(c.hue, cx, top, 28, 0.12 + 0.05 * Math.sin(t * 0.001 + c.x * 6) + c.pulse * 0.4);
      ctx.fillStyle = `rgba(${r},${g},${b},${0.5 + c.pulse * 0.4})`;
      ctx.fillRect(cx - w / 2, top, w, 1.5 + c.pulse * 1.5);
      // vertical category name — revealed once the column is tall enough to hold it
      ctx.font = "600 16px system-ui, -apple-system, sans-serif";
      ctx.letterSpacing = "2.5px";
      const tw = ctx.measureText(c.label).width;
      const la = Math.max(0, Math.min(1, (h * H - (tw + 20)) / 40)) * 0.42;
      if (la > 0.01) {
        ctx.save();
        ctx.translate(cx, base - 16);
        ctx.rotate(-Math.PI / 2);
        ctx.textAlign = "left";
        ctx.textBaseline = "middle";
        ctx.fillStyle = `rgba(${r},${g},${b},${la})`;
        ctx.fillText(c.label, 0, 0);
        ctx.restore();
      }
      ctx.letterSpacing = "0px";
    }

    // falling dollar signs — sort toward their column, land, raise it one step
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    for (let i = bills.length - 1; i >= 0; i--) {
      const bl = bills[i]!;
      const c = bl.col;
      bl.wob += 0.04 * f;
      bl.x += (c.x - bl.x) * 0.02 * f;
      bl.y += bl.vy * f;
      const topN = 0.98 - c.fill;
      let a = Math.min(1, (bl.y + 0.05) / 0.14);
      if (bl.y > topN) a *= Math.max(0, 1 - (bl.y - topN) / 0.05);
      const px = bl.x * W;
      const py = bl.y * H;
      const [r, g, b] = colors[bl.hue] ?? [128, 128, 128];
      drawGlow(bl.hue, px, py, bl.size * 0.95, 0.3 * a);
      ctx.save();
      ctx.translate(px, py);
      ctx.rotate(Math.sin(bl.wob) * 0.12 * bl.sway);
      ctx.fillStyle = `rgba(${r},${g},${b},${a})`;
      ctx.font = `600 ${bl.size}px system-ui, -apple-system, sans-serif`;
      ctx.fillText("$", 0, 0);
      ctx.restore();
      if (bl.y > topN + 0.05) {
        c.inflight--;
        if (c.filled < c.quota) c.filled++;
        c.pulse = 1;
        bills.splice(i, 1);
      }
    }
  }

  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = canvas.clientWidth;
    H = canvas.clientHeight;
    canvas.width = Math.max(1, Math.round(W * dpr));
    canvas.height = Math.max(1, Math.round(H * dpr));
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    init();
  }

  function frame(t: number) {
    if (disposed) return;
    const dt = Math.min(40, last ? t - last : 16);
    last = t;
    ctx.clearRect(0, 0, W, H);
    render(dt, t);
    raf = requestAnimationFrame(frame);
  }

  function onVisibility() {
    if (disposed) return;
    if (document.hidden) {
      cancelAnimationFrame(raf);
    } else {
      last = 0;
      raf = requestAnimationFrame(frame);
    }
  }

  readColors();
  resize();
  raf = requestAnimationFrame(frame);

  const ro = new ResizeObserver(() => resize());
  ro.observe(canvas);
  const mo = new MutationObserver(() => readColors());
  mo.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  document.addEventListener("visibilitychange", onVisibility);

  return {
    destroy() {
      disposed = true;
      cancelAnimationFrame(raf);
      ro.disconnect();
      mo.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
    },
  };
}
