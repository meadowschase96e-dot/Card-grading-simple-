import { getSql } from "@/lib/db";
import { emptyCard, emptyPrices, type CardCategory, type GradedCard } from "@/lib/grade-types";
import { uid } from "@/lib/utils";

const MATCH_BITS = 12;

type PrintRow = {
  id: string;
  print: string;
  subject: string;
  year: string;
  set_name: string;
  card_number: string;
  company: string;
  category: string;
  playback: unknown;
};

export function hamming(a: string, b: string): number {
  if (a.length !== b.length || a.length === 0) return 64;
  let bits = 0;
  for (let i = 0; i < a.length; i += 1) {
    let x = parseInt(a[i] ?? "0", 16) ^ parseInt(b[i] ?? "0", 16);
    if (!Number.isFinite(x)) return 64;
    while (x) {
      bits += x & 1;
      x >>= 1;
    }
  }
  return bits;
}

export function identityKey(card: Pick<GradedCard, "subject" | "year" | "set" | "number" | "company">): string {
  return [card.year, card.set, card.number, card.company, card.subject]
    .map((part) => part.toLowerCase().replace(/[^a-z0-9]+/g, ""))
    .join("|");
}

function cardFromRow(row: PrintRow, slot = 0): GradedCard {
  let stored: Partial<GradedCard> = {};
  try {
    stored =
      typeof row.playback === "string"
        ? (JSON.parse(row.playback) as Partial<GradedCard>)
        : ((row.playback ?? {}) as Partial<GradedCard>);
  } catch {
    stored = {};
  }
  const category = (row.category || stored.category || "other") as CardCategory;
  return {
    ...emptyCard(slot),
    ...stored,
    slot,
    identified: true,
    subject: row.subject || stored.subject || "Unknown",
    year: row.year || stored.year || "",
    set: row.set_name || stored.set || "",
    number: row.card_number || stored.number || "",
    company: row.company || stored.company || "",
    category,
    prices: emptyPrices(),
  };
}

export async function lookupCard(print: string): Promise<GradedCard | null> {
  if (!/^[0-9a-f]{16}$/.test(print)) return null;
  const sql = await getSql();
  const rows = await sql<PrintRow>`
    select c.id, p.print, c.subject, c.year, c.set_name, c.card_number, c.company, c.category, c.playback
    from card_prints p
    join card_catalog c on c.id = p.catalog_id
    order by c.updated_at desc
    limit 500
  `;
  let best: PrintRow | null = null;
  let bestBits = 64;
  for (const row of rows) {
    const bits = hamming(print, row.print);
    if (bits < bestBits) {
      bestBits = bits;
      best = row;
    }
  }
  if (!best || bestBits > MATCH_BITS) return null;
  await sql`update card_catalog set hits = hits + 1, updated_at = now() where id = ${best.id}`;
  return cardFromRow(best);
}

export async function rememberCard(print: string, card: GradedCard): Promise<void> {
  if (!card.identified) return;
  const subject = card.subject.trim();
  if (subject.length < 2 || /^(unidentified|unknown|no card)$/i.test(subject)) return;
  const key = identityKey(card);
  if (key.replace(/\|/g, "").length < 3) return;

  const playback = JSON.stringify({
    ...card,
    prices: emptyPrices(),
    overall: 0,
    subgrades: { centering: 0, corners: 0, edges: 0, surface: 0 },
    frontReport: undefined,
    backReport: undefined,
    defects: [],
    notes: "",
  });
  const sql = await getSql();
  const id = uid("cat");
  const rows = await sql<{ id: string }>`
    insert into card_catalog (
      id, identity_key, subject, year, set_name, card_number, company, category, playback
    ) values (
      ${id}, ${key}, ${subject}, ${card.year}, ${card.set}, ${card.number}, ${card.company}, ${card.category}, ${playback}
    )
    on conflict (identity_key) do update set
      subject = excluded.subject,
      year = excluded.year,
      set_name = excluded.set_name,
      card_number = excluded.card_number,
      company = excluded.company,
      category = excluded.category,
      playback = excluded.playback,
      hits = card_catalog.hits + 1,
      updated_at = now()
    returning id
  `;
  const catalogId = rows[0]?.id;
  if (!catalogId || !/^[0-9a-f]{16}$/.test(print)) return;
  await sql`
    insert into card_prints (print, catalog_id) values (${print}, ${catalogId})
    on conflict (print) do nothing
  `;
}
