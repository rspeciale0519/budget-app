import { FRAGMENT_SHADER, VERTEX_SHADER } from "./shader";

export interface GuillochePalette {
  paper: [number, number, number];
  lineA: [number, number, number];
  lineB: [number, number, number];
}

export interface GuillocheOptions {
  palette: GuillochePalette;
  seed: number;
  /** Draw a single frame instead of animating. Set when the user prefers reduced motion. */
  still: boolean;
}

export interface GuillocheHandle {
  destroy(): void;
}

/** `#rrggbb` → normalized RGB. Returns null so callers can fall back rather than render black. */
export function parseHex(hex: string): [number, number, number] | null {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m?.[1]) return null;
  const n = parseInt(m[1], 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}

function compile(gl: WebGL2RenderingContext, type: number, src: string): WebGLShader | null {
  const shader = gl.createShader(type);
  if (!shader) return null;
  gl.shaderSource(shader, src);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    gl.deleteShader(shader);
    return null;
  }
  return shader;
}

function link(gl: WebGL2RenderingContext): WebGLProgram | null {
  const vs = compile(gl, gl.VERTEX_SHADER, VERTEX_SHADER);
  const fs = compile(gl, gl.FRAGMENT_SHADER, FRAGMENT_SHADER);
  if (!vs || !fs) return null;
  const program = gl.createProgram();
  if (!program) return null;
  gl.attachShader(program, vs);
  gl.attachShader(program, fs);
  gl.linkProgram(program);
  gl.deleteShader(vs);
  gl.deleteShader(fs);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    gl.deleteProgram(program);
    return null;
  }
  return program;
}

/**
 * Start the guilloché on `canvas`. Returns null when WebGL2 is unavailable or the
 * program fails to build, so the caller can render its static fallback instead —
 * a sign-in page must never depend on a GPU.
 */
export function startGuilloche(
  canvas: HTMLCanvasElement,
  options: GuillocheOptions,
): GuillocheHandle | null {
  const context = canvas.getContext("webgl2", {
    alpha: false,
    antialias: false,
    depth: false,
    stencil: false,
    powerPreference: "low-power",
  });
  if (!context) return null;
  // Bind to a non-null const so the narrowing carries into the closures below.
  const gl: WebGL2RenderingContext = context;

  const program = link(gl);
  if (!program) return null;

  const vao = gl.createVertexArray();
  const u = {
    resolution: gl.getUniformLocation(program, "uResolution"),
    time: gl.getUniformLocation(program, "uTime"),
    seed: gl.getUniformLocation(program, "uSeed"),
    paper: gl.getUniformLocation(program, "uPaper"),
    lineA: gl.getUniformLocation(program, "uLineA"),
    lineB: gl.getUniformLocation(program, "uLineB"),
    intensity: gl.getUniformLocation(program, "uIntensity"),
  };

  let raf = 0;
  let disposed = false;
  let start = 0;
  let intensity = 0;

  /*
    Cap at 2x. The field is fill-rate bound, so a 3x phone panel triples the cost
    for a difference nobody can see on hairlines this thin.
  */
  function resize(): number {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = Math.max(1, Math.round(canvas.clientWidth * dpr));
    const h = Math.max(1, Math.round(canvas.clientHeight * dpr));
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
    }
    return dpr;
  }

  function draw(now: number) {
    if (disposed) return;
    if (!start) start = now;
    resize();

    // The plate rises out of the dark on load rather than snapping on.
    const elapsed = (now - start) / 1000;
    intensity = options.still ? 1 : Math.min(1, elapsed / 1.6);

    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.useProgram(program);
    gl.bindVertexArray(vao);
    gl.uniform2f(u.resolution, canvas.width, canvas.height);
    gl.uniform1f(u.time, options.still ? 12 : elapsed);
    gl.uniform1f(u.seed, options.seed);
    gl.uniform3fv(u.paper, options.palette.paper);
    gl.uniform3fv(u.lineA, options.palette.lineA);
    gl.uniform3fv(u.lineB, options.palette.lineB);
    gl.uniform1f(u.intensity, intensity);
    gl.drawArrays(gl.TRIANGLES, 0, 3);

    if (!options.still) raf = requestAnimationFrame(draw);
  }

  raf = requestAnimationFrame(draw);

  // A hidden tab must not burn the battery on a background it isn't showing.
  function onVisibility() {
    if (disposed || options.still) return;
    if (document.hidden) {
      cancelAnimationFrame(raf);
    } else {
      start = 0;
      raf = requestAnimationFrame(draw);
    }
  }
  document.addEventListener("visibilitychange", onVisibility);

  const onResize = () => {
    if (options.still && !disposed) raf = requestAnimationFrame(draw);
  };
  window.addEventListener("resize", onResize);

  return {
    destroy() {
      disposed = true;
      cancelAnimationFrame(raf);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("resize", onResize);
      gl.deleteProgram(program);
      gl.deleteVertexArray(vao);
      gl.getExtension("WEBGL_lose_context")?.loseContext();
    },
  };
}
