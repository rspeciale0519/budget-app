const FMT = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
  timeZone: "UTC", // DB dates are @db.Date; formatting in UTC avoids off-by-one shifts.
});

/** One human date dialect app-wide: "Jul 18, 2026". Accepts Date or YYYY-MM-DD. */
export function formatDate(d: Date | string): string {
  const date = typeof d === "string" ? new Date(`${d}T00:00:00Z`) : d;
  return FMT.format(date);
}
