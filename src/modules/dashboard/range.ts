import { startOfMonth, endOfMonth } from "date-fns";
import { prisma } from "@/lib/prisma";
import { startOfDay, endOfDay, fmtDate } from "@/lib/date";
import { getAllEventsRange } from "@/modules/events/queries";

/*
  The Overview's period control.

  The handoff shows four segments — Season / This month / Last event / Custom —
  and says they filter the whole page. They are resolved to a concrete date
  window here so the KPI strip, the P&L statement and the top-items list all
  read from one range rather than each deciding for itself.

  State lives in the query string, not a cookie: a range is something you want
  to link to and go back from, and it keeps these pages a plain server render.
*/

export const RANGE_KEYS = ["season", "month", "last-event", "custom"] as const;
export type RangeKey = (typeof RANGE_KEYS)[number] | "event";

export type ResolvedRange = {
  key: RangeKey;
  start: Date;
  end: Date;
  /** Left half of the breadcrumb, e.g. "Season 2025" or "September 2026". */
  scopeLabel: string;
  /** Which events the window covers, e.g. "All events" or one event's name. */
  subjectLabel: string;
  /** "Sep 6 – Oct 18" */
  dateLabel: string;
  /** Set when the range is one specific event, so item sales can scope to it. */
  eventId: string | null;
  /** True when the requested range had no data to resolve against. */
  empty: boolean;
};

function parseKey(v?: string | string[] | null): RangeKey | null {
  const raw = Array.isArray(v) ? v[0] : v;
  return (RANGE_KEYS as readonly string[]).includes(raw ?? "") ? (raw as RangeKey) : null;
}

function parseDay(v?: string | string[] | null): Date | null {
  const raw = Array.isArray(v) ? v[0] : v;
  if (!raw) return null;
  const t = new Date(raw).getTime();
  return Number.isNaN(t) ? null : new Date(t);
}

function spanLabel(start: Date, end: Date) {
  const sameYear = start.getFullYear() === end.getFullYear();
  return `${fmtDate(start, sameYear ? "MMM d" : "MMM d, yyyy")} – ${fmtDate(end, "MMM d, yyyy")}`;
}

export async function resolveRange(
  businessId: string,
  params: Record<string, string | string[] | undefined>,
  /* The header's event switcher writes a cookie that scopes several screens.
     It still wins here when the URL says nothing, so arriving at the Overview
     with an event selected doesn't silently widen back to the whole season —
     but an explicit segment click always overrides it. */
  activeEvent?: { id: string; name: string; startDate: Date; endDate: Date } | null,
): Promise<ResolvedRange> {
  const explicit = parseKey(params.range);
  const now = new Date();

  if (!explicit && activeEvent) {
    return {
      key: "event",
      start: startOfDay(activeEvent.startDate),
      end: endOfDay(activeEvent.endDate),
      scopeLabel: "Event",
      subjectLabel: activeEvent.name,
      dateLabel: spanLabel(activeEvent.startDate, activeEvent.endDate),
      eventId: activeEvent.id,
      empty: false,
    };
  }

  const key = explicit ?? "season";

  if (key === "month") {
    const start = startOfMonth(now);
    const end = endOfMonth(now);
    return {
      key,
      start,
      end,
      scopeLabel: fmtDate(now, "MMMM yyyy"),
      subjectLabel: "All events",
      dateLabel: spanLabel(start, end),
      eventId: null,
      empty: false,
    };
  }

  if (key === "last-event") {
    // The most recently finished event; if nothing has finished yet, the one
    // that started most recently — otherwise a business mid-season would get
    // an empty page from a control that looks like it should show something.
    const event =
      (await prisma.event.findFirst({
        where: { businessId, endDate: { lte: now } },
        orderBy: { endDate: "desc" },
      })) ??
      (await prisma.event.findFirst({ where: { businessId }, orderBy: { startDate: "desc" } }));
    if (event) {
      return {
        key,
        start: startOfDay(event.startDate),
        end: endOfDay(event.endDate),
        scopeLabel: "Last event",
        subjectLabel: event.name,
        dateLabel: spanLabel(event.startDate, event.endDate),
        eventId: event.id,
        empty: false,
      };
    }
  }

  if (key === "custom") {
    const from = parseDay(params.from);
    const to = parseDay(params.to);
    if (from && to && from <= to) {
      const start = startOfDay(from);
      const end = endOfDay(to);
      return {
        key,
        start,
        end,
        scopeLabel: "Custom range",
        subjectLabel: "All events",
        dateLabel: spanLabel(start, end),
        eventId: null,
        empty: false,
      };
    }
    // Fall through to the season window so the page still renders while the
    // custom dates are being picked, but keep the segment selected.
    const season = await getAllEventsRange(businessId);
    const start = season ? startOfDay(season.start) : startOfDay(new Date(now.getFullYear(), 0, 1));
    const end = season ? endOfDay(season.end) : endOfDay(now);
    return {
      key,
      start,
      end,
      scopeLabel: "Custom range",
      subjectLabel: "All events",
      dateLabel: "pick two dates",
      eventId: null,
      empty: false,
    };
  }

  const season = await getAllEventsRange(businessId);
  const start = season ? startOfDay(season.start) : startOfDay(new Date(now.getFullYear(), 0, 1));
  const end = season ? endOfDay(season.end) : endOfDay(now);
  return {
    key: "season",
    start,
    end,
    scopeLabel: `Season ${end.getFullYear()}`,
    subjectLabel: "All events",
    dateLabel: spanLabel(start, end),
    eventId: null,
    empty: !season,
  };
}
