/** Parse a display money string (e.g. "$1,234.56") into a number. */
export function parseMoney(money: string): number {
  const n = Number(money.replace(/[^0-9.-]/g, ""));
  return Number.isFinite(n) ? n : 0;
}

/** Detect whether a money string carries a "$" so we can re-prefix animations. */
export function moneyFormatter(sample: string): (n: number) => string {
  const hasDollar = sample.includes("$");
  const hasComma = sample.includes(",");
  const decimals = (sample.split(".")[1] ?? "").replace(/[^0-9]/g, "").length;
  return (n: number): string => {
    const fixed = decimals > 0 ? n.toFixed(decimals) : Math.round(n).toString();
    const [intPart = "0", decPart] = fixed.split(".");
    const grouped = hasComma ? Number(intPart).toLocaleString("en-US") : intPart;
    const body = decPart ? `${grouped}.${decPart}` : grouped;
    return hasDollar ? `$${body}` : body;
  };
}
