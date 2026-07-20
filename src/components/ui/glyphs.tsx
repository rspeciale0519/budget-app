/*
  The chrome's tiny wayfinding icons, drawn as strokes in the current text color
  so they weigh the same as the labels beside them. One source keeps the top bar
  and any other chrome that needs them in agreement.
*/

const STROKE = {
  strokeWidth: 1.6,
  strokeLinecap: "round",
  strokeLinejoin: "round",
  fill: "none",
  stroke: "currentColor",
} as const;

/** Four panes — the all-books rollup. */
export function GridGlyph({ className }: { className?: string }) {
  return (
    <svg width="13" height="13" viewBox="0 0 14 14" {...STROKE} aria-hidden className={className}>
      <path d="M2 2h4v4H2zM8 2h4v4H8zM2 8h4v4H2zM8 8h4v4H8z" />
    </svg>
  );
}

/** Two panes side by side — the tile view. */
export function TilesGlyph({ className }: { className?: string }) {
  return (
    <svg width="13" height="13" viewBox="0 0 14 14" {...STROKE} aria-hidden className={className}>
      <path d="M2 2.5h4.25v9H2zM7.75 2.5H12v9H7.75z" />
    </svg>
  );
}

/** Two panes stacked — the tile view's other direction. */
export function StackGlyph({ className }: { className?: string }) {
  return (
    <svg width="13" height="13" viewBox="0 0 14 14" {...STROKE} aria-hidden className={className}>
      <path d="M2.5 2h9v4.25h-9zM2.5 7.75h9V12h-9z" />
    </svg>
  );
}
