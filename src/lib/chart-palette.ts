/*
  Categorical colours for charts (spending-by-category slices, goal bars).

  This is the ONE place these hues live. They are distinct from the semantic
  theme tokens in globals.css on purpose: those encode meaning (in / out / wrong)
  and there are only a handful, whereas a pie needs many mutually-distinguishable
  hues that carry no meaning beyond "a different category."

  They are assigned server-side and emitted as SVG fills, so they can't read CSS
  vars — hence a plain array. To restyle every chart, edit this list and nothing
  else. Ordered and tuned to sit calmly on the Sterling ivory paper.
*/
export const CATEGORY_PALETTE = [
  "#1f6b4a", // green
  "#b98a16", // gold
  "#345b7e", // slate blue
  "#5b4c7a", // plum
  "#2c7a73", // teal
  "#b0556b", // rose
  "#476baf", // blue
  "#8a8577", // warm grey
] as const;

/** Stable colour for a category id — same id always maps to the same hue. */
export function categoryColor(id: string): string {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return CATEGORY_PALETTE[h % CATEGORY_PALETTE.length]!;
}

/** Colour for the nth item in an ordered list (goals, legends). */
export function paletteAt(index: number): string {
  return CATEGORY_PALETTE[index % CATEGORY_PALETTE.length]!;
}
