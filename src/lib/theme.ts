export type Theme = "dark" | "light";

export const THEME_STORAGE_KEY = "ledger:theme";

/**
 * Runs before first paint to stamp `data-theme` on <html>. Inlined in <head> so
 * a stored light preference never flashes through the dark default.
 *
 * Kept as a string (not a component) because it must execute synchronously,
 * ahead of hydration. Wrapped in try/catch: localStorage throws in some
 * embedded and privacy-hardened browsers, and a theme is not worth a blank page.
 */
export const THEME_BOOT_SCRIPT = `(function(){try{var t=localStorage.getItem(${JSON.stringify(
  THEME_STORAGE_KEY,
)});if(!t){t=window.matchMedia("(prefers-color-scheme: light)").matches?"light":"dark";}document.documentElement.setAttribute("data-theme",t);}catch(e){}})();`;

export function applyTheme(theme: Theme): void {
  document.documentElement.setAttribute("data-theme", theme);
  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    // Preference is best-effort; the theme still applies for this session.
  }
}
