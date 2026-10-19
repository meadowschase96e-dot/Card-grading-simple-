import { ADMOB_BANNER_UNIT, PLACEMENTS, placementById, type PlacementId } from "@/lib/admob";

const LEDGER_KEY = "cgs-ad-ledger";

export type RevenueEvent = {
  id: string;
  placement: PlacementId;
  format: "banner" | "commercial";
  unitId: string;
  at: number;
  /** Paid value from AdMob, in micros. Null until a paid report arrives. Never guessed. */
  micros: number | null;
};

export type RevenueTotal = {
  impressions: number;
  paidImpressions: number;
  /** Null when AdMob has not reported a paid value. Not the same as zero. */
  usd: number | null;
  byPlacement: { id: PlacementId; label: string; impressions: number; usd: number | null }[];
};

function readLedger(): RevenueEvent[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(LEDGER_KEY);
    const parsed = raw ? (JSON.parse(raw) as RevenueEvent[]) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeLedger(events: RevenueEvent[]) {
  localStorage.setItem(LEDGER_KEY, JSON.stringify(events.slice(-500)));
}

/** One completed placement. micros stays null unless AdMob paid this impression. */
export function recordPlacement(placement: PlacementId, micros: number | null = null) {
  if (typeof window === "undefined") return;
  const spec = placementById(placement);
  const events = readLedger();
  events.push({
    id: `${placement}-${Date.now()}`,
    placement,
    format: spec.format,
    unitId: spec.format === "banner" ? ADMOB_BANNER_UNIT : "",
    at: Date.now(),
    micros: micros != null && Number.isFinite(micros) && micros >= 0 ? micros : null,
  });
  writeLedger(events);
}

/**
 * Total app revenue.
 * AdMob does not send the dollar amount to the page. A paid impression is
 * counted only when its value arrives in micros (1 USD = 1_000_000 micros).
 * Unpaid impressions stay in the count and are not turned into a fake price.
 */
export function totalAppRevenue(): RevenueTotal {
  const events = readLedger();
  const paid = events.filter((event) => event.micros != null);
  const micros = paid.reduce((sum, event) => sum + (event.micros ?? 0), 0);
  return {
    impressions: events.length,
    paidImpressions: paid.length,
    usd: paid.length ? micros / 1_000_000 : null,
    byPlacement: PLACEMENTS.map((spec) => {
      const rows = events.filter((event) => event.placement === spec.id);
      const paidRows = rows.filter((event) => event.micros != null);
      const rowMicros = paidRows.reduce((sum, event) => sum + (event.micros ?? 0), 0);
      return {
        id: spec.id,
        label: spec.label,
        impressions: rows.length,
        usd: paidRows.length ? rowMicros / 1_000_000 : null,
      };
    }),
  };
}
