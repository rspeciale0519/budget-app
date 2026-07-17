/**
 * Guilloché — the engraved rosette line-work on banknotes, share certificates
 * and cheques. It is the native visual language of money, and it is real
 * geometry: the interference of contour families cut by a rose-engine lathe.
 *
 * Drawn as an implicit field rather than traced curves. For each pixel we
 * evaluate several contour families and light the pixel where it falls near a
 * contour, antialiased against the field's own screen-space derivative. That
 * gives true hairlines at any resolution with no geometry at all.
 *
 * Petal counts are primes (7 / 11 / 13 / 17). Their interference never repeats,
 * which is exactly why real guilloché reads as alive instead of tiled.
 */

export const VERTEX_SHADER = `#version 300 es
precision highp float;
const vec2 VERTS[3] = vec2[3](vec2(-1.0, -1.0), vec2(3.0, -1.0), vec2(-1.0, 3.0));
void main() {
  gl_Position = vec4(VERTS[gl_VertexID], 0.0, 1.0);
}`;

export const FRAGMENT_SHADER = `#version 300 es
precision highp float;

out vec4 fragColor;

uniform vec2  uResolution;
uniform float uTime;
uniform float uSeed;
uniform vec3  uPaper;
uniform vec3  uLineA;
uniform vec3  uLineB;
uniform float uIntensity;

#define TAU 6.28318530718

mat2 rot(float a) {
  float c = cos(a), s = sin(a);
  return mat2(c, -s, s, c);
}

/*
  Light the pixel where the field crosses a contour. fwidth() gives the field's
  rate of change across one pixel, so the line stays exactly one pixel wide at
  any zoom or device ratio — the engraver's constant-width cut.

  The second term is the important one: once contours pack tighter than the
  pixel grid can resolve, sampling them produces moiré, not detail. Rather than
  render a lie, the line fades out as it approaches that limit. This is why the
  plate stays clean at the dense outer radius instead of tearing into aliasing.
*/
float hairline(float f, float soft) {
  float w = fwidth(f);
  float d = abs(fract(f) - 0.5);
  float line = 1.0 - smoothstep(0.0, w * soft, d);
  return line * (1.0 - smoothstep(0.28, 0.5, w));
}

/*
  One rosette family: concentric contours displaced by a petal wave.

  ampRatio is a FRACTION OF RING SPACING, not a world-unit distance. That
  distinction is the whole difference between engraving and string art: once the
  ripple approaches the spacing, neighbouring contours cross and the rosette
  collapses into noise. Real engine-turning keeps it well under a third.
*/
float rosette(vec2 p, float petals, float ampRatio, float freq, float phase) {
  float a = atan(p.y, p.x);
  float r = length(p);
  float amp = ampRatio / freq;
  float rr = r
    + amp * sin(petals * a + phase)
    + amp * 0.34 * sin(petals * 2.0 * a - phase * 1.31);
  return hairline(rr * freq, 1.25);
}

/* The spiral a rose engine leaves as the mandrel advances under the cutter. */
float spiral(vec2 p, float freq, float twist, float phase) {
  float a = atan(p.y, p.x);
  float r = length(p);
  return hairline(r * freq + twist * a / TAU + phase, 1.25);
}

void main() {
  vec2 uv = (gl_FragCoord.xy * 2.0 - uResolution) / min(uResolution.x, uResolution.y);
  float t = uTime;

  vec2 p = uv * 1.25;
  p *= rot(t * 0.012 + uSeed * 0.7);

  /* Two engines, counter-rotating, slightly offset — the interlace of a real plate. */
  vec2 pa = p;
  vec2 pb = (p - vec2(0.045, -0.03)) * rot(-t * 0.021);

  /* Ripple stays under a third of ring spacing, so contours never cross. */
  float a = 0.0;
  a += rosette(pa, 7.0, 0.30, 16.0, t * 0.085 + uSeed);
  a += rosette(pa * 1.04, 13.0, 0.22, 11.0, -t * 0.061 + uSeed * 1.7);

  float b = 0.0;
  b += rosette(pb, 11.0, 0.26, 21.0, -t * 0.052 + uSeed * 2.3);
  b += spiral(pb, 9.0, 5.0, t * 0.037);

  a = clamp(a, 0.0, 1.0);
  b = clamp(b, 0.0, 1.0);

  float r = length(uv);

  /*
    A rosette is a medallion, not a wash. Engravers leave the centre clear —
    that is where the denomination and the signature go. Here it is where the
    wordmark and the sign-in card go, so the plate opens to bare paper for them
    and does its work in the ring outside.
  */
  float clear = smoothstep(0.16, 0.78, r);
  float ring = clear * (1.0 - smoothstep(0.95, 1.9, r) * 0.75);

  vec3 col = uPaper;
  col += uLineA * a * ring * 0.85 * uIntensity;
  col += uLineB * b * ring * 0.5 * uIntensity;

  /* Ink pooling where the two engines cross — the darkest cuts on a real plate. */
  col += uLineA * a * b * ring * 0.45 * uIntensity;

  /* Settle the far corners so the medallion reads as an object on paper. */
  col *= 1.0 - smoothstep(0.9, 1.8, r) * 0.5;

  /* Ordered dither. Without it, a field this dark bands visibly on 8-bit panels. */
  float dither = fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233))) * 43758.5453);
  col += (dither - 0.5) / 255.0;

  fragColor = vec4(col, 1.0);
}`;
