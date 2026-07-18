/*
  The sign-in backdrop. Not decoration for its own sake — it is the product's
  thesis as a picture: faint statement rules, and a single balance line that
  rises to the right. Money, understood, moving forward.

  Deliberately calm and near-still: the line draws itself once on load, then
  holds. No loop, no rotation, nothing to fall into. Every colour reads from a
  theme token (via the Tailwind stroke/fill utilities and CSS vars), so it
  follows light/dark and any future palette change with zero edits here.
*/

const RULES = Array.from({ length: 9 }, (_, i) => 120 + i * 84);

export function LoginBackdrop() {
  return (
    <svg
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 h-full w-full"
      viewBox="0 0 1440 900"
      preserveAspectRatio="xMidYMid slice"
    >
      <defs>
        <linearGradient id="ledger-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" style={{ stopColor: "var(--credit)" }} stopOpacity="0.16" />
          <stop offset="1" style={{ stopColor: "var(--credit)" }} stopOpacity="0" />
        </linearGradient>
        <radialGradient id="ledger-glow" cx="50%" cy="46%" r="55%">
          <stop offset="0" style={{ stopColor: "var(--surface)" }} stopOpacity="0.85" />
          <stop offset="100%" style={{ stopColor: "var(--surface)" }} stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* Ruled statement paper — quiet, evenly spaced, dead still. */}
      <g className="stroke-rule" strokeWidth="1">
        {RULES.map((y) => (
          <line key={y} x1="0" y1={y} x2="1440" y2={y} />
        ))}
      </g>

      {/* The balance, rising. Filled with a whisper of green. */}
      <path
        d="M0,724 C220,700 360,708 560,656 C760,604 900,612 1080,520 C1220,448 1330,432 1440,372 L1440,900 L0,900 Z"
        fill="url(#ledger-fill)"
      />
      <path
        d="M0,724 C220,700 360,708 560,656 C760,604 900,612 1080,520 C1220,448 1330,432 1440,372"
        fill="none"
        className="ledger-line stroke-credit"
        strokeWidth="2.5"
        strokeLinecap="round"
        pathLength={1}
      />

      {/* A few ledger entries along the way. */}
      {[
        [560, 656],
        [1080, 520],
        [1440, 372],
      ].map(([cx, cy]) => (
        <circle key={cx} cx={cx} cy={cy} r="4" className="fill-credit" />
      ))}

      {/* Settle the centre so the sign-in card always sits on calm ground. */}
      <rect x="0" y="0" width="1440" height="900" fill="url(#ledger-glow)" />
    </svg>
  );
}
