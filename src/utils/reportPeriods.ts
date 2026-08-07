export type ReportPeriod = "today" | "week" | "month";

/** Monday-start week containing `date`. */
function startOfWeek(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function toIsoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** Resolves a period into an inclusive `[from, to]` ISO date range plus a human label, anchored
 *  to the given date (normally "now") — shared between the dashboard's Today/Week/Month tabs and
 *  the admin Reports page so both agree on what "this week" means (Monday-start). */
export function rangeForPeriod(period: ReportPeriod, anchor: Date = new Date()): { from: string; to: string; label: string } {
  if (period === "today") {
    const iso = toIsoDate(anchor);
    return { from: iso, to: iso, label: "Today" };
  }
  if (period === "week") {
    const from = startOfWeek(anchor);
    const to = new Date(from);
    to.setDate(to.getDate() + 6);
    return {
      from: toIsoDate(from),
      to: toIsoDate(to),
      label: `${from.toLocaleDateString(undefined, { month: "short", day: "numeric" })} – ${to.toLocaleDateString(undefined, { month: "short", day: "numeric" })}`,
    };
  }
  const from = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
  const to = new Date(anchor.getFullYear(), anchor.getMonth() + 1, 0);
  return { from: toIsoDate(from), to: toIsoDate(to), label: from.toLocaleDateString(undefined, { month: "long", year: "numeric" }) };
}
