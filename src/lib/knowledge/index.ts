import prints from "./prints.json";
import comics from "./comics.json";
import games from "./games.json";
import systems from "./systems.json";
import type { CardCategory, GradedCard } from "@/lib/grade-types";

export type PrintLine = {
  company: string;
  set: string;
  sport: CardCategory;
  from: number;
  to: number;
};

export const PRINT_LINES = prints as PrintLine[];
export const COMIC_LINES = comics as PrintLine[];
export const GAME_LINES = games as PrintLine[];
export const SYSTEM_LINES = systems as PrintLine[];
export const MEDIA_LINES = [...COMIC_LINES, ...GAME_LINES, ...SYSTEM_LINES];
export const PRINT_YEAR = 2026;

const fold = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, "");

function yearOf(value: string): number | null {
  const hit = value.match(/\b(?:19|20)\d{2}\b/);
  if (!hit) return null;
  const year = Number(hit[0]);
  return year >= 1930 && year <= PRINT_YEAR ? year : null;
}

/** Longest set name wins, so Chrome is not swallowed by the base Topps line. */
export function findPrint(card: Pick<GradedCard, "company" | "set" | "year" | "category">): PrintLine | null {
  const set = fold(card.set);
  const company = fold(card.company);
  const year = yearOf(card.year);
  const ranked = [...PRINT_LINES].sort((a, b) => fold(b.set).length - fold(a.set).length);
  let loose: PrintLine | null = null;
  for (const line of ranked) {
    const lineSet = fold(line.set);
    const lineCompany = fold(line.company);
    if (!lineSet) continue;
    const setHit = set.length > 0 && (set === lineSet || set.includes(lineSet) || lineSet.includes(set));
    const companyHit = company.length > 0 && (company === lineCompany || company.includes(lineCompany) || lineCompany.includes(company));
    if (!setHit && !companyHit) continue;
    if (year != null && (year < line.from || year > line.to)) continue;
    if (card.category !== "other" && card.category !== line.sport && set.length < 4) continue;
    if (setHit && (companyHit || company.length === 0)) return line;
    if (setHit && !loose) loose = line;
  }
  return loose;
}

function findIn(lines: PrintLine[], card: Pick<GradedCard, "company" | "set" | "year" | "subject" | "category">): PrintLine | null {
  const set = fold(card.set);
  const subject = fold(card.subject);
  const company = fold(card.company);
  const year = yearOf(card.year);
  const ranked = [...lines].sort((a, b) => fold(b.set).length - fold(a.set).length);
  let loose: PrintLine | null = null;
  for (const line of ranked) {
    const lineSet = fold(line.set);
    const lineCompany = fold(line.company);
    if (!lineSet) continue;
    const named = set || subject;
    const setHit = named.length > 2 && (named === lineSet || named.includes(lineSet) || lineSet.includes(named));
    const companyHit = company.length > 0 && (company === lineCompany || company.includes(lineCompany));
    if (!setHit) continue;
    if (year != null && (year < line.from || year > line.to)) continue;
    if (card.category !== "other" && card.category !== line.sport) continue;
    if (companyHit || company.length === 0) return line;
    if (!loose) loose = line;
  }
  return loose;
}

export function findMedia(card: Pick<GradedCard, "company" | "set" | "year" | "subject" | "category">): PrintLine | null {
  const pool =
    card.category === "comic"
      ? COMIC_LINES
      : card.category === "game"
        ? GAME_LINES
        : card.category === "system"
          ? SYSTEM_LINES
          : MEDIA_LINES;
  return findIn(pool, card);
}

/** Fill manufacturer, set, and year from the installed print file. Does not invent a price or a card number. */
export function applyPrintIndex<
  T extends Pick<GradedCard, "company" | "set" | "year" | "category" | "subject"> & { notes?: string; fromIndex?: boolean },
>(card: T): T {
  const mediaFirst = card.category === "comic" || card.category === "game" || card.category === "system";
  const line = mediaFirst ? (findMedia(card) ?? findPrint(card)) : (findPrint(card) ?? findMedia(card));
  if (!line) return card;
  const year = yearOf(card.year);
  const media = line.sport === "comic" || line.sport === "game" || line.sport === "system";
  const span = line.from === line.to ? String(line.from) : `${line.from}–${line.to}`;
  const listed = [line.company, line.set, line.sport, span].filter(Boolean).join(" · ");
  return {
    ...card,
    company: card.company || line.company,
    subject: card.subject || (line.sport === "game" || line.sport === "system" ? line.set : card.subject),
    set: card.set || (line.sport === "comic" || !media ? line.set : card.set),
    category: card.category === "other" ? line.sport : card.category,
    year: card.year || (line.from === line.to ? String(line.from) : ""),
    notes: card.notes?.trim() ? card.notes : listed,
    fromIndex: Boolean(year == null || (year >= line.from && year <= line.to)),
  };
}
