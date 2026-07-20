/**
 * Turn a noisy bank description into a durable rule pattern by dropping the parts
 * that change from one transaction to the next — dates, store/reference numbers,
 * bank prefixes, a trailing state — leaving the stable merchant core. Heuristic
 * and always editable by the user; pure (no server deps) so both the client
 * "Always" popover and the service can use it.
 */
export function suggestRulePattern(description: string): string {
  let s = ` ${description.trim()} `;
  s = s.replace(/\b\d{1,2}\/\d{1,2}(\/\d{2,4})?\b/g, " "); // dates
  s = s.replace(/#?\b\d{3,}\b/g, " "); // card/store/reference numbers
  s = s.replace(/^\s*(POS(\s+DEBIT)?|ACH(\s+(DEBIT|CREDIT))?|DEBIT(\s+CARD)?|CHECKCARD|PURCHASE|PAYMENT)\b/i, " ");
  s = s.replace(/\b[A-Z]{2}\b\s*$/, " "); // trailing US state
  const words = s.replace(/\s+/g, " ").trim().split(" ").filter(Boolean);
  const core = words.slice(0, 3).join(" ").trim();
  return core || description.trim();
}
