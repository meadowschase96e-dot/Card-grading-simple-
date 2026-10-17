import { createServerFn } from "@tanstack/react-start";
import type { CardCategory, CardPrices, GradedCard, GradeResult, PingResult, Subgrades } from "@/lib/grade-types";
import { emptyCard, emptyPrices } from "@/lib/grade-types";
import { applyPrintIndex } from "@/lib/knowledge";
import { cgcBrief } from "@/lib/knowledge/cgc";

const MODEL = "grok-4.5";
const GRADE_WINDOW_MS = 10 * 60_000;
const GRADE_CAP = 8;
const gradeHits: number[] = [];

function allowGrade(): boolean {
  const now = Date.now();
  while (gradeHits.length && now - gradeHits[0]! > GRADE_WINDOW_MS) gradeHits.shift();
  if (gradeHits.length >= GRADE_CAP) return false;
  gradeHits.push(now);
  return true;
}

function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.min(1, Math.max(0, n));
}

function grade10(n: unknown): number {
  const x = typeof n === "number" ? n : Number(n);
  if (!Number.isFinite(x)) return 0;
  return Math.min(10, Math.max(0, Math.round(x * 2) / 2));
}

function asString(v: unknown, fallback = ""): string {
  if (typeof v === "string") return v.trim();
  if (typeof v === "number" && Number.isFinite(v)) return String(v);
  return fallback;
}

function asStringList(v: unknown): string[] {
  if (!Array.isArray(v)) {
    if (typeof v === "string" && v.trim()) return [v.trim()];
    return [];
  }
  return v
    .map((item) => asString(item))
    .filter(Boolean)
    .slice(0, 8);
}

function asBBox(v: unknown): GradedCard["bbox"] {
  if (!v || typeof v !== "object") return undefined;
  const o = v as Record<string, unknown>;
  const x = Number(o.x);
  const y = Number(o.y);
  const w = Number(o.w ?? o.width);
  const h = Number(o.h ?? o.height);
  if (![x, y, w, h].every(Number.isFinite)) return undefined;
  return {
    x: clamp01(x),
    y: clamp01(y),
    w: clamp01(w),
    h: clamp01(h),
  };
}

function asSubgrades(v: unknown): Subgrades {
  const o = v && typeof v === "object" ? (v as Record<string, unknown>) : {};
  return {
    centering: grade10(o.centering),
    corners: grade10(o.corners),
    edges: grade10(o.edges),
    surface: grade10(o.surface),
  };
}

function asMoney(v: unknown): number | null {
  if (typeof v === "string") {
    const n = Number(v.replace(/[$,\s]/g, ""));
    return Number.isFinite(n) && n > 0 ? Math.round(n * 100) / 100 : null;
  }
  if (typeof v === "number" && Number.isFinite(v) && v > 0) return Math.round(v * 100) / 100;
  return null;
}

function asPrices(v: unknown, root: Record<string, unknown>): CardPrices {
  const o = v && typeof v === "object" ? (v as Record<string, unknown>) : root;
  return {
    rawMint: asMoney(o.rawMint ?? o.raw ?? o.raw_mint ?? o.mint),
    psa7: asMoney(o.psa7 ?? o.psa_7),
    psa8: asMoney(o.psa8 ?? o.psa_8),
    psa9: asMoney(o.psa9 ?? o.psa_9),
    psa10: asMoney(o.psa10 ?? o.psa_10),
  };
}

function asCategory(v: unknown): CardCategory {
  const s = asString(v).toLowerCase();
  if (s.includes("comic") || s.includes("manga")) return "comic";
  if (s.includes("console") || s.includes("system") || s.includes("hardware")) return "system";
  if (s.includes("video game") || s.includes("videogame") || s === "game" || s.includes("cartridge")) return "game";
  if (s.includes("baseball")) return "baseball";
  if (s.includes("basket")) return "basketball";
  if (s.includes("football") || s.includes("nfl")) return "football";
  if (s.includes("hockey")) return "hockey";
  if (s.includes("soccer") || s.includes("futbol")) return "soccer";
  if (s.includes("pokemon") || s.includes("magic") || s.includes("yugioh") || s.includes("yu-gi") || s === "tcg") {
    return "tcg";
  }
  if (s === "baseball" || s === "basketball" || s === "football" || s === "hockey" || s === "soccer" || s === "tcg" || s === "comic" || s === "game" || s === "system" || s === "other") {
    return s;
  }
  if (s.includes("sport")) return "sports";
  if (s.includes("tv") || s.includes("movie") || s.includes("entertainment")) return "entertainment";
  return "other";
}

function cardNumber(raw: Record<string, unknown>, set: string): string {
  const direct = asString(raw.number ?? raw.cardNumber ?? raw.card_number ?? raw.no ?? raw.num);
  const source = direct || set;
  const marked = source.match(/#\s*([A-Za-z]?\d{1,4}[A-Za-z]?)/);
  const plain = (marked?.[1] ?? direct).replace(/^#/, "").replace(/^(no\.?|card)\s*/i, "").trim();
  return plain;
}

function splitYearSet(year: string, set: string): { year: string; set: string } {
  let y = year.trim();
  let s = set.trim();
  if (!y) {
    const hit = s.match(/\b(?:19|20)\d{2}\b/);
    if (hit?.[0]) {
      y = hit[0];
      s = s.replace(hit[0], "").replace(/\s{2,}/g, " ").replace(/^[\s,·\-]+|[\s,·\-]+$/g, "").trim();
    }
  }
  if (/^\d{2}$/.test(y)) {
    const n = Number(y);
    y = String(n >= 40 ? 1900 + n : 2000 + n);
  }
  return { year: y, set: s };
}

function parseCard(raw: unknown, index: number): GradedCard {
  const o = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const slotNum = Number(o.slot);
  const identified =
    o.identified === true ||
    (o.identified !== false && Boolean(asString(o.subject ?? o.player ?? o.name)));
  const overall = identified ? grade10(o.overall ?? o.grade) : 0;
  const printed = splitYearSet(
    asString(o.year ?? o.yr ?? o.season ?? o.printedYear),
    asString(o.set ?? o.setName ?? o.set_name ?? o.series ?? o.issue ?? o.product),
  );
  const card: GradedCard = {
    slot: Number.isFinite(slotNum) ? Math.min(8, Math.max(0, Math.round(slotNum))) : index,
    identified,
    subject: asString(o.subject ?? o.player ?? o.name, identified ? "Unknown subject" : "No card"),
    year: printed.year,
    set: printed.set,
    number: cardNumber(o, printed.set),
    company: asString(o.company ?? o.manufacturer ?? o.brand),
    category: asCategory(o.category ?? o.sport ?? o.league),
    prices: identified ? asPrices(o.prices, o) : emptyPrices(),
    variant: asString(o.variant, "base") || "base",
    overall,
    subgrades: asSubgrades(o.subgrades),
    centering: asString(o.centering ?? o.centeringRatio),
    defects: asStringList(o.defects),
    notes: asString(o.notes ?? o.summary),
    confidence: clamp01(Number(o.confidence ?? (identified ? 0.6 : 0))),
    bbox: asBBox(o.bbox),
  };
  if (!card.identified) return { ...emptyCard(card.slot), notes: card.notes, bbox: card.bbox };
  return applyPrintIndex(card);
}

function extractJson(text: string): unknown {
  const trimmed = text.trim();
  const fence = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
  const raw = fence?.[1] ?? trimmed;
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start < 0 || end <= start) throw new Error("Grader returned no JSON");
  return JSON.parse(raw.slice(start, end + 1)) as unknown;
}

function normalizeGrade(payload: unknown, mode: "single" | "binder"): Omit<Extract<GradeResult, { ok: true }>, "ok" | "model" | "latencyMs"> {
  const o = payload && typeof payload === "object" ? (payload as Record<string, unknown>) : {};
  const list = Array.isArray(o.cards) ? o.cards : o.subject || o.player ? [o] : [];
  const cards = list.slice(0, mode === "binder" ? 9 : 1).map((item, i) => parseCard(item, i));
  const layout = mode === "binder" ? "binder9" : "single";
  if (cards.length === 0) {
    return { layout, cards: [emptyCard(0)] };
  }
  return { layout, cards };
}

const IDENT_SYSTEM = `You identify collectible cards for a local catalog. Do not price them. Return ONLY JSON, no markdown.
Schema:
{
  "layout": "single" | "binder9",
  "cards": [{
    "slot": 0,
    "identified": true,
    "subject": "card name",
    "year": "1989",
    "set": "set name",
    "number": "57",
    "company": "Topps",
    "category": "baseball" | "basketball" | "football" | "hockey" | "soccer" | "tcg" | "comic" | "game" | "system" | "other",
    "overall": 0,
    "subgrades": { "centering": 0, "corners": 0, "edges": 0, "surface": 0 },
    "notes": "",
    "confidence": 0.0,
    "bbox": { "x": 0.1, "y": 0.1, "w": 0.8, "h": 0.8 }
  }]
}
Rules:
- subject is the character or player name. company is the manufacturer.
- year is the four-digit year printed on the card. set is the set name printed on the card, not the manufacturer.
- Always return year, set, and number on a standard scan when that text is printed. Year is four digits. Set is the set name, not the manufacturer. Number is the card number, without a hash.
- Leave a field empty only when that exact text is not on the card.
- category is the sport, tcg, comic, game, or system.
- A comic: subject is the title, number is the issue, company is the publisher, set is the series.
- A game: subject is the title, set is the platform, company is the publisher.
- A system: subject is the console, set is the model, company is the maker.
- Read number and company off the item. Leave them empty only when unreadable.
- bbox is relative 0–1, tight on the card. Binder slot 0 is top-left, then left-to-right.
- On a Deep Core request, overall and every subgrade are 8, 9, or 10. Otherwise leave overall at 0.
- Copy a visible CGC or PSA grade into notes. Do not invent one.
- Do not mention being an AI.`;

const PRICE_SYSTEM = `You price already-identified collectible cards. Return ONLY JSON, no markdown.
Schema:
{ "cards": [{ "slot": 0, "prices": { "rawMint": 12, "psa7": 28, "psa8": 40, "psa9": 90, "psa10": 250 } }] }
Rules:
- Sports cards stay on PSA comps unless the slab in the photo says CGC.
- A CGC Pristine 10 is not a PSA 10. A CGC Gem Mint 10 is the closer PSA 10 comp.
- Comics: rawMint is raw. psa8 is CGC 9.6. psa9 is CGC 9.8. psa10 is CGC 9.9.
- Games: rawMint is loose. psa8 is complete in box. psa9 is sealed. psa10 is a CGC 9.8.
- Systems: rawMint is a loose console. psa8 includes cords. psa9 is boxed. psa10 is CGC sealed.
- One prices object per input item, same slot order.
- Do not rename the card or add grades. Do not mention being an AI.`;

function applyPrices(cards: GradedCard[], payload: unknown): GradedCard[] {
  const o = payload && typeof payload === "object" ? (payload as Record<string, unknown>) : {};
  const list = Array.isArray(o.cards) ? o.cards : [o];
  return cards.map((card, index) => {
    const raw = list.find((item) => {
      if (!item || typeof item !== "object") return false;
      return Number((item as Record<string, unknown>).slot) === card.slot;
    }) ?? list[index];
    const row = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
    return { ...card, prices: asPrices(row.prices, row) };
  });
}

const GAP_FIELDS = ["subject", "year", "set", "number", "company"] as const;

function missingFields(card: GradedCard): string[] {
  return GAP_FIELDS.filter((key) => {
    const value = card[key].trim();
    return !value || /^(unknown subject|no card|unidentified)$/i.test(value);
  });
}

function mergeGaps(card: GradedCard, raw: Record<string, unknown>): GradedCard {
  const need = new Set(missingFields(card));
  const next = { ...card };
  if (need.has("subject")) {
    const value = asString(raw.subject ?? raw.player ?? raw.name);
    if (value && !/^(unknown|unidentified|no card)$/i.test(value)) next.subject = value;
  }
  if (need.has("year") || need.has("set")) {
    const printed = splitYearSet(asString(raw.year), asString(raw.set ?? raw.setName ?? raw.series));
    if (need.has("year") && printed.year) next.year = printed.year;
    if (need.has("set") && printed.set) next.set = printed.set;
  }
  if (need.has("number")) {
    const value = cardNumber(raw, next.set);
    if (value) next.number = value;
  }
  if (need.has("company")) {
    const value = asString(raw.company ?? raw.manufacturer ?? raw.brand);
    if (value) next.company = value;
  }
  return applyPrintIndex(next);
}

/** External read for blank identity fields only. Installed lines stay as they are. */
async function fillMissing(image: string, cards: GradedCard[]): Promise<GradedCard[]> {
  const needy = cards.filter((card) => card.identified && missingFields(card).length > 0);
  if (needy.length === 0) return cards;
  const ask = needy.map((card) => ({
    slot: card.slot,
    category: card.category,
    have: {
      subject: card.subject,
      year: card.year,
      set: card.set,
      number: card.number,
      company: card.company,
    },
    need: missingFields(card),
  }));
  const result = await xaiChat({
    model: MODEL,
    temperature: 0.1,
    max_tokens: 700,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content: `Fill only the requested missing fields from the photo. Return ONLY JSON, no markdown.
{ "cards": [{ "slot": 0, "subject": "", "year": "", "set": "", "number": "", "company": "" }] }
Leave a field empty when that text is not printed. Do not change a field that already has a value. Do not price. Do not invent a grade, serial, or cert.`,
      },
      {
        role: "user",
        content: [
          { type: "image_url", image_url: { url: image, detail: "high" } },
          { type: "text", text: JSON.stringify(ask) },
        ],
      },
    ],
  });
  if (!result.ok) return cards;
  const body = result.json && typeof result.json === "object" ? (result.json as Record<string, unknown>) : {};
  const list = Array.isArray(body.cards) ? body.cards : [];
  return cards.map((card, index) => {
    const raw = list.find((item) => {
      if (!item || typeof item !== "object") return false;
      return Number((item as Record<string, unknown>).slot) === card.slot;
    }) ?? list[index];
    if (!raw || typeof raw !== "object") return card;
    return mergeGaps(card, raw as Record<string, unknown>);
  });
}

async function priceCards(cards: GradedCard[]): Promise<GradedCard[]> {
  const identified = cards.filter((card) => card.identified);
  if (identified.length === 0) return cards;
  const brief = identified.map((card) => ({
    slot: card.slot,
    subject: card.subject,
    year: card.year,
    set: card.set,
    number: card.number,
    company: card.company,
    category: card.category,
  }));
  const guide = cgcBrief(identified.map((card) => card.category));
  const priced = await xaiChat({
    model: MODEL,
    temperature: 0.2,
    max_tokens: 500,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: PRICE_SYSTEM },
      { role: "user", content: `Current market prices only. Use this installed CGC guide and do not repeat it.\n${guide}\n${JSON.stringify(brief)}` },
    ],
  });
  if (!priced.ok) return cards;
  return applyPrices(cards, priced.json);
}

async function xaiChat(body: Record<string, unknown>): Promise<{ ok: true; json: unknown; status: number } | { ok: false; status: number; error: string }> {
  const apiKey = process.env.XAI_API_KEY;
  if (!apiKey) return { ok: false, status: 503, error: "AI is not available in this environment" };

  const res = await fetch("https://api.x.ai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(50_000),
  });

  const rawText = await res.text();
  if (!res.ok) {
    let detail = `xAI API error ${res.status}`;
    try {
      const err = JSON.parse(rawText) as { error?: { message?: string } };
      if (err.error?.message) detail = err.error.message;
    } catch {
      /* keep status text */
    }
    return { ok: false, status: res.status, error: detail };
  }

  try {
    const json = JSON.parse(rawText) as {
      choices?: { message?: { content?: string | null } }[];
    };
    const content = json.choices?.[0]?.message?.content ?? "";
    if (!content) return { ok: false, status: 502, error: "Empty grader response" };
    return { ok: true, json: extractJson(content), status: res.status };
  } catch (e) {
    return {
      ok: false,
      status: 502,
      error: e instanceof Error ? e.message : "Could not parse grader response",
    };
  }
}

export const pingAi = createServerFn({ method: "POST" }).handler(async (): Promise<PingResult> => {
  const apiKey = process.env.XAI_API_KEY;
  const checkedAt = Date.now();
  if (!apiKey) {
    return {
      ok: false,
      hasKey: false,
      error: "AI is not available in this environment",
      models: [],
      defaultModel: MODEL,
      latencyMs: 0,
      checkedAt,
    };
  }

  const started = Date.now();
  try {
    const res = await fetch("https://api.x.ai/v1/models", {
      headers: { Authorization: `Bearer ${apiKey}` },
      signal: AbortSignal.timeout(12_000),
    });
    const latencyMs = Date.now() - started;
    if (!res.ok) {
      return {
        ok: false,
        hasKey: true,
        status: res.status,
        error: res.status === 401 ? "API key rejected" : `xAI error ${res.status}`,
        models: [],
        defaultModel: MODEL,
        latencyMs,
        checkedAt,
      };
    }
    const body = (await res.json()) as { data?: { id?: string }[] };
    const models = (body.data ?? []).map((m) => m.id).filter((id): id is string => Boolean(id));
    return {
      ok: true,
      hasKey: true,
      status: res.status,
      models,
      defaultModel: models.includes(MODEL) ? MODEL : (models[0] ?? MODEL),
      latencyMs,
      checkedAt,
    };
  } catch (e) {
    return {
      ok: false,
      hasKey: true,
      error: e instanceof Error ? e.message : "Network error contacting xAI",
      models: [],
      defaultModel: MODEL,
      latencyMs: Date.now() - started,
      checkedAt,
    };
  }
});

export const gradeScan = createServerFn({ method: "POST" })
  .validator((input: { image: string; mode: "single" | "binder"; print?: string; lane?: "standard" | "deep" }) => {
    if (!input || typeof input.image !== "string") throw new Error("Missing image");
    if (input.image.length > 1_800_000) throw new Error("Image payload too large");
    if (!input.image.startsWith("data:image/")) throw new Error("Expected a JPEG or PNG data URL");
    if (input.mode !== "single" && input.mode !== "binder") throw new Error("Invalid scan mode");
    const print = typeof input.print === "string" && /^[0-9a-f]{16}$/.test(input.print) ? input.print : "";
    const lane = input.lane === "deep" ? "deep" : "standard";
    return { image: input.image, mode: input.mode, print, lane };
  })
  .handler(async ({ data }): Promise<GradeResult> => {
    if (!allowGrade()) {
      return { ok: false, error: "Grading paused — try again in a few minutes." };
    }

    const started = Date.now();
    try {
      const { lookupCard, rememberCard } = await import("@/lib/catalog.server");
      if (data.mode === "single" && data.print) {
        const known = await lookupCard(data.print);
        if (known) {
          const listed = applyPrintIndex(known);
          const filled = await fillMissing(data.image, [listed]);
          const cards = await priceCards(filled);
          return {
            ok: true,
            model: MODEL,
            layout: "single",
            cards,
            latencyMs: Date.now() - started,
            read: "catalog",
          };
        }
      }

      const userText =
        data.lane === "deep"
          ? "Deep Core. Identify the card. Score this side only. overall and each of centering, corners, edges, and surface must be 8, 9, or 10. Centering is the border ratio. Corners are chips and fray. Edges are silvering and layer split. Surface is scratches, dents, stains, and foil. notes is one line on stock density, trim, or a suspect core. No prices. Include a tight bbox."
          : data.mode === "binder"
            ? "Binder page. Identify each card only. No prices. Slot 0 is top-left."
            : "Single card. Identify it only. No prices. Include a tight bbox. Return the printed year, the set name, and the card number. Do not leave year, set, or number blank when the print is visible.";
      let result = await xaiChat({
        model: MODEL,
        temperature: 0.2,
        max_tokens: 900,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: IDENT_SYSTEM },
          {
            role: "user",
            content: [
              { type: "image_url", image_url: { url: data.image, detail: "high" } },
              { type: "text", text: userText },
            ],
          },
        ],
      });
      if (!result.ok && result.status >= 500) result = await xaiChat({
        model: MODEL,
        temperature: 0.2,
        max_tokens: 900,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: IDENT_SYSTEM },
          {
            role: "user",
            content: [
              { type: "image_url", image_url: { url: data.image, detail: "high" } },
              { type: "text", text: userText },
            ],
          },
        ],
      });
      if (!result.ok) return { ok: false, error: result.error, status: result.status };

      const normalized = normalizeGrade(result.json, data.mode);
      const listed = normalized.cards.map((card) => applyPrintIndex(card));
      const filled = await fillMissing(data.image, listed);
      if (data.mode === "single" && data.print) {
        const lead = filled.find((card) => card.identified);
        if (lead) await rememberCard(data.print, lead);
      }
      const cards = await priceCards(filled);
      return {
        ok: true,
        model: MODEL,
        latencyMs: Date.now() - started,
        read: "vision",
        layout: normalized.layout,
        cards,
      };
    } catch (e) {
      return {
        ok: false,
        error: e instanceof Error ? e.message : "Could not read grade",
      };
    }
  });
