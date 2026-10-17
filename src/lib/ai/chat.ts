import { createServerFn } from "@tanstack/react-start";
import { authMiddleware } from "@/lib/auth/middleware";
import { money, type PortfolioSport } from "@/lib/grade-types";
import { uid } from "@/lib/utils";

const MODEL = "grok-4.5";

export type ChatCard = {
  subject: string;
  year: string;
  set: string;
  number: string;
  company: string;
  category: string;
  rawMint: number | null;
  psa8: number | null;
  psa9: number | null;
  psa10: number | null;
};

export type ChatReply = {
  ok: true;
  answer: string;
  source: "playback" | "reader" | "live";
};

const SPORTS = ["baseball", "basketball", "football", "hockey", "soccer", "tcg", "other"] as const;

function briefKey(cards: ChatCard[]): string {
  return cards
    .map((card) => `${card.subject}|${card.number}|${card.psa10 ?? ""}`)
    .join("~")
    .toLowerCase()
    .slice(0, 400);
}

function questionKey(question: string, cards: ChatCard[]): string {
  const q = question.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim().slice(0, 180);
  return `${q}::${briefKey(cards)}`;
}

function line(card: ChatCard): string {
  const prices = [
    card.rawMint != null ? `raw ${money(card.rawMint)}` : "",
    card.psa8 != null ? `PSA 8 ${money(card.psa8)}` : "",
    card.psa9 != null ? `PSA 9 ${money(card.psa9)}` : "",
    card.psa10 != null ? `PSA 10 ${money(card.psa10)}` : "",
  ]
    .filter(Boolean)
    .join(", ");
  const id = [card.year, card.company, card.set, card.number ? `#${card.number}` : ""].filter(Boolean).join(" ");
  return `${card.subject}${id ? ` (${id})` : ""} — ${prices || "no prices yet"}`;
}

function wantsLive(question: string): boolean {
  return /\b(current|today|right now|market|trending|should i sell|worth selling)\b/i.test(question);
}

export function answerFromCards(question: string, cards: ChatCard[]): string {
  if (cards.length === 0) return "No cards in the portfolio yet. Scan one, then ask about its prices.";
  const q = question.toLowerCase();
  const sport = SPORTS.find((name) => q.includes(name));
  const pool = sport ? cards.filter((card) => card.category === sport) : cards;
  const named = pool.filter((card) => card.subject.length > 2 && q.includes(card.subject.toLowerCase()));

  if (named.length) {
    return named.map(line).join(" ");
  }
  if (/\b(highest|top|best|most)\b/.test(q)) {
    const ranked = [...pool].sort((a, b) => (b.psa10 ?? 0) - (a.psa10 ?? 0));
    const top = ranked[0];
    return top ? `Highest PSA 10 in ${sport ?? "the portfolio"}: ${line(top)}` : "No priced cards in that section.";
  }
  if (/\b(how many|count|list|show|what do i|portfolio)\b/.test(q) || sport) {
    if (pool.length === 0) return `Nothing filed under ${sport}.`;
    const preview = pool.slice(0, 6).map((card) => card.subject).join(", ");
    return `${pool.length} card${pool.length === 1 ? "" : "s"}${sport ? ` in ${sport}` : ""}. ${preview}${pool.length > 6 ? "…" : ""}`;
  }
  const preview = pool.slice(0, 4).map(line).join(" ");
  return `${pool.length} card${pool.length === 1 ? "" : "s"} on file. ${preview}`;
}

async function liveAnswer(question: string, cards: ChatCard[]): Promise<string | null> {
  const apiKey = process.env.XAI_API_KEY;
  if (!apiKey) return null;
  const brief = cards.slice(0, 24).map((card) => ({
    subject: card.subject,
    year: card.year,
    set: card.set,
    number: card.number,
    company: card.company,
    category: card.category as PortfolioSport,
    rawMint: card.rawMint,
    psa8: card.psa8,
    psa9: card.psa9,
    psa10: card.psa10,
  }));
  const res = await fetch("https://api.x.ai/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: MODEL,
      temperature: 0.2,
      max_tokens: 280,
      messages: [
        {
          role: "system",
          content:
            "Answer in two short sentences about these portfolio cards. Use the given prices. Do not invent a card that is not in the list. No markdown.",
        },
        { role: "user", content: `${question}\n${JSON.stringify(brief)}` },
      ],
    }),
    signal: AbortSignal.timeout(25_000),
  });
  if (!res.ok) return null;
  const json = (await res.json()) as { choices?: { message?: { content?: string | null } }[] };
  const text = json.choices?.[0]?.message?.content?.trim();
  return text || null;
}

export const askGrade = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { question: string; cards: ChatCard[] }) => {
    const question = input?.question?.trim() ?? "";
    if (question.length < 2 || question.length > 400) throw new Error("Ask a shorter question.");
    const cards = Array.isArray(input.cards) ? input.cards.slice(0, 40) : [];
    return { question, cards };
  })
  .handler(async ({ data, context }): Promise<ChatReply> => {
    const userId = context.userId;
    const key = questionKey(data.question, data.cards);
    const { getSql } = await import("@/lib/db");
    const sql = await getSql();
    const cached = await sql<{ answer: string }>`
      select answer from grade_chat where user_id = ${userId} and question_key = ${key} limit 1
    `;
    if (cached[0]?.answer) {
      return { ok: true, answer: cached[0].answer, source: "playback" };
    }

    const local = answerFromCards(data.question, data.cards);
    const live = wantsLive(data.question) ? await liveAnswer(data.question, data.cards) : null;
    const answer = live ?? local;
    await sql`
      insert into grade_chat (id, user_id, question_key, question, answer)
      values (${uid("chat")}, ${userId}, ${key}, ${data.question}, ${answer})
      on conflict (user_id, question_key) do update set answer = excluded.answer
    `;
    return { ok: true, answer, source: live ? "live" : "reader" };
  });
