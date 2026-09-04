import { format, startOfDay, endOfDay, subDays, addDays, differenceInMinutes, eachDayOfInterval } from "date-fns";

export const businessDay = (d: Date | string) => startOfDay(typeof d === "string" ? new Date(d) : d);
export const businessDayEnd = (d: Date | string) => endOfDay(typeof d === "string" ? new Date(d) : d);

export function lastNDays(n: number): { from: Date; to: Date } {
  const to = endOfDay(new Date());
  const from = startOfDay(subDays(to, n - 1));
  return { from, to };
}

export function dayRange(from: Date, to: Date): Date[] {
  return eachDayOfInterval({ start: startOfDay(from), end: startOfDay(to) });
}

export function fmtDate(d: Date | string, pattern = "MMM d, yyyy"): string {
  return format(typeof d === "string" ? new Date(d) : d, pattern);
}

export function fmtTime(d: Date | string, pattern = "h:mm a"): string {
  return format(typeof d === "string" ? new Date(d) : d, pattern);
}

export function fmtDateTime(d: Date | string): string {
  return format(typeof d === "string" ? new Date(d) : d, "MMM d, yyyy h:mm a");
}

export { startOfDay, endOfDay, subDays, addDays, differenceInMinutes };

/** A YYYY-MM-DD filter param, or undefined when absent/malformed. Prevents an
 *  unparseable query string from reaching Prisma and 500-ing the route. */
export function safeDateParam(v?: string | null): string | undefined {
  if (!v) return undefined;
  const t = new Date(v).getTime();
  return Number.isNaN(t) ? undefined : v;
}
