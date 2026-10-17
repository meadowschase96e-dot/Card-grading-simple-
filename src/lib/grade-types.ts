export type CardCategory =
  | "baseball"
  | "basketball"
  | "football"
  | "hockey"
  | "soccer"
  | "tcg"
  | "comic"
  | "game"
  | "system"
  | "sports"
  | "entertainment"
  | "other";

export type PortfolioSport =
  | "baseball"
  | "basketball"
  | "football"
  | "hockey"
  | "soccer"
  | "tcg"
  | "comic"
  | "game"
  | "system"
  | "other";

export const PORTFOLIO_SPORTS: { id: PortfolioSport; label: string }[] = [
  { id: "baseball", label: "Baseball" },
  { id: "basketball", label: "Basketball" },
  { id: "football", label: "Football" },
  { id: "hockey", label: "Hockey" },
  { id: "soccer", label: "Soccer" },
  { id: "tcg", label: "TCG" },
  { id: "comic", label: "Comics" },
  { id: "game", label: "Games" },
  { id: "system", label: "Systems" },
  { id: "other", label: "Other" },
];

export type CardPrices = {
  rawMint: number | null;
  psa7: number | null;
  psa8: number | null;
  psa9: number | null;
  psa10: number | null;
};

export type PriceTier = keyof CardPrices;

export type ListingChannel = "ebay" | "mercari" | "marketplace" | "posh";

export type CardListing = {
  channel: ListingChannel;
  tier: PriceTier;
  price: number;
  submittedAt: number;
};

export const CHANNELS: { id: ListingChannel; label: string }[] = [
  { id: "ebay", label: "eBay" },
  { id: "mercari", label: "Mercari" },
  { id: "marketplace", label: "Marketplace" },
  { id: "posh", label: "Posh" },
];

export const PRICE_TIERS: { id: PriceTier; label: string }[] = [
  { id: "rawMint", label: "Raw mint" },
  { id: "psa8", label: "PSA 8" },
  { id: "psa9", label: "PSA 9" },
  { id: "psa10", label: "PSA 10" },
];

/** Cards keep PSA labels. Comics, games, and systems use their own comps in the same fields. */
export function priceRows(category: CardCategory): { id: PriceTier; label: string }[] {
  if (category === "comic") {
    return [
      { id: "rawMint", label: "Raw" },
      { id: "psa8", label: "CGC 9.6" },
      { id: "psa9", label: "CGC 9.8" },
      { id: "psa10", label: "CGC 9.9" },
    ];
  }
  if (category === "game") {
    return [
      { id: "rawMint", label: "Loose" },
      { id: "psa8", label: "CIB" },
      { id: "psa9", label: "Sealed" },
      { id: "psa10", label: "CGC 9.8" },
    ];
  }
  if (category === "system") {
    return [
      { id: "rawMint", label: "Loose" },
      { id: "psa8", label: "With cords" },
      { id: "psa9", label: "Boxed" },
      { id: "psa10", label: "CGC sealed" },
    ];
  }
  return PRICE_TIERS;
}

export function fieldLabels(category: CardCategory): {
  company: string;
  subject: string;
  set: string;
  year: string;
  number: string;
} {
  if (category === "comic") {
    return { company: "Publisher", subject: "Title", set: "Series", year: "Year", number: "Issue" };
  }
  if (category === "game") {
    return { company: "Publisher", subject: "Title", set: "Platform", year: "Year", number: "Number" };
  }
  if (category === "system") {
    return { company: "Maker", subject: "Console", set: "Model", year: "Year", number: "Number" };
  }
  return { company: "Manufacturer", subject: "Character", set: "Set", year: "Year", number: "Number" };
}

export type Subgrades = {
  centering: number;
  corners: number;
  edges: number;
  surface: number;
};

export type SideReport = {
  overall: number;
  centering: number;
  corners: number;
  edges: number;
  surface: number;
  integrity: string;
};

export type BBox = {
  x: number;
  y: number;
  w: number;
  h: number;
};

export type GradedCard = {
  slot: number;
  identified: boolean;
  subject: string;
  year: string;
  set: string;
  number: string;
  company: string;
  category: CardCategory;
  prices: CardPrices;
  variant: string;
  overall: number;
  subgrades: Subgrades;
  centering: string;
  defects: string[];
  notes: string;
  confidence: number;
  bbox?: BBox;
  frontReport?: SideReport;
  backReport?: SideReport;
  /** True when company, set, or year came from the installed print file. */
  fromIndex?: boolean;
};

export type GradeResponse = {
  ok: true;
  layout: "single" | "binder9";
  model: string;
  cards: GradedCard[];
  latencyMs: number;
  /** catalog = reader replayed a stored identification. vision = first read, then saved. */
  read?: "catalog" | "vision";
};

export type GradeError = {
  ok: false;
  error: string;
  status?: number;
};

export type GradeResult = GradeResponse | GradeError;

export type PingResult = {
  ok: boolean;
  hasKey: boolean;
  status?: number;
  error?: string;
  models: string[];
  defaultModel: string;
  latencyMs: number;
  checkedAt: number;
};

export type VaultItem = {
  id: string;
  savedAt: number;
  image: string;
  card: GradedCard;
  model: string;
  listing?: CardListing | null;
  /** True once the image is a matte-black index crop. */
  mat?: boolean;
  /** Deep Core cards are two-sided and live in that vault. */
  lane?: "standard" | "deep";
  backImage?: string;
};

export const GRADE_LABELS: { min: number; code: string; name: string }[] = [
  { min: 10, code: "GEM-MT", name: "Gem Mint" },
  { min: 9.5, code: "MINT+", name: "Mint+" },
  { min: 9, code: "MINT", name: "Mint" },
  { min: 8.5, code: "NM-MT+", name: "Near Mint-Mint+" },
  { min: 8, code: "NM-MT", name: "Near Mint-Mint" },
  { min: 7, code: "NM", name: "Near Mint" },
  { min: 6, code: "EX-MT", name: "Excellent-Mint" },
  { min: 5, code: "EX", name: "Excellent" },
  { min: 4, code: "VG-EX", name: "Very Good-Excellent" },
  { min: 3, code: "VG", name: "Very Good" },
  { min: 2, code: "GOOD", name: "Good" },
  { min: 1, code: "FR", name: "Fair" },
  { min: 0, code: "PR", name: "Poor" },
];

export function portfolioSport(card: Pick<GradedCard, "category">): PortfolioSport {
  const id = card.category;
  if (
    id === "baseball" ||
    id === "basketball" ||
    id === "football" ||
    id === "hockey" ||
    id === "soccer" ||
    id === "tcg" ||
    id === "comic" ||
    id === "game" ||
    id === "system"
  ) {
    return id;
  }
  return "other";
}

export function sportLabel(card: Pick<GradedCard, "category">): string {
  return PORTFOLIO_SPORTS.find((s) => s.id === portfolioSport(card))?.label ?? "Other";
}

export function money(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n) || n <= 0) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: n >= 100 ? 0 : 2,
  }).format(n);
}

export function emptyPrices(): CardPrices {
  return { rawMint: null, psa7: null, psa8: null, psa9: null, psa10: null };
}

/** Deep Core scale is only 8, 9, or 10. */
export function snapDeep(n: number): 8 | 9 | 10 {
  if (!Number.isFinite(n) || n < 8.5) return 8;
  if (n < 9.5) return 9;
  return 10;
}

export function sideReport(card: GradedCard): SideReport {
  const base = card.overall >= 8 ? snapDeep(card.overall) : 8;
  const mark = (n: number) => (n >= 8 ? snapDeep(n) : base);
  return {
    overall: base,
    centering: mark(card.subgrades.centering),
    corners: mark(card.subgrades.corners),
    edges: mark(card.subgrades.edges),
    surface: mark(card.subgrades.surface),
    integrity: card.notes,
  };
}

/** Total grade is the lowest sub-grade across both sides. */
export function totalDeep(front: SideReport, back?: SideReport): 8 | 9 | 10 {
  const marks = [front, back]
    .flatMap((side) => (side ? [side.centering, side.corners, side.edges, side.surface] : []))
    .filter((n) => n >= 8);
  return snapDeep(marks.length ? Math.min(...marks) : front.overall);
}
export function deepQuote(card: GradedCard): {
  grade: 8 | 9 | 10;
  tier: "psa7" | "psa8";
  label: string;
  price: number | null;
} {
  const grade: 8 | 9 | 10 = card.overall >= 9.5 ? 10 : card.overall >= 8.5 ? 9 : 8;
  if (grade === 10) {
    return { grade, tier: "psa8", label: "Grade 10 · PSA 8 price", price: card.prices?.psa8 ?? null };
  }
  return { grade, tier: "psa7", label: `Grade ${grade} · PSA 7 price`, price: card.prices?.psa7 ?? null };
}

export function emptyCard(slot = 0): GradedCard {
  return {
    slot,
    identified: false,
    subject: "Unidentified",
    year: "",
    set: "",
    number: "",
    company: "",
    category: "other",
    prices: emptyPrices(),
    variant: "unknown",
    overall: 0,
    subgrades: { centering: 0, corners: 0, edges: 0, surface: 0 },
    centering: "",
    defects: [],
    notes: "",
    confidence: 0,
  };
}
