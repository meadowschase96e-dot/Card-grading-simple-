import { useEffect, useRef, useState } from "react";
import { ChevronLeft, Mic, Volume2, VolumeX } from "lucide-react";
import { askGrade, type ChatCard } from "@/lib/ai/chat";
import { listenCommand, speakInstalled, stopInstalled } from "@/lib/voice";
import type { VaultItem } from "@/lib/grade-types";
import { Button } from "@/components/ui/button";
import { AdMobBanner } from "@/components/admob-banner";
import { recordPlacement } from "@/lib/revenue";

type Turn =
  | { id: string; kind: "q" | "a"; text: string; source?: string }
  | { id: string; kind: "ad"; text: string };

function toBrief(items: VaultItem[]): ChatCard[] {
  return items.map((item) => ({
    subject: item.card.subject,
    year: item.card.year,
    set: item.card.set,
    number: item.card.number,
    company: item.card.company ?? "",
    category: item.card.category,
    rawMint: item.card.prices?.rawMint ?? null,
    psa8: item.card.prices?.psa8 ?? null,
    psa9: item.card.prices?.psa9 ?? null,
    psa10: item.card.prices?.psa10 ?? null,
  }));
}

function ChatBoxAd() {
  return <AdMobBanner placement="chat_box" />;
}

export function GradeChat({ items, onClose }: { items: VaultItem[]; onClose: () => void }) {
  const [turns, setTurns] = useState<Turn[]>([]);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [playback, setPlayback] = useState(true);
  const [hearing, setHearing] = useState(false);
  const asked = useRef(0);
  const ear = useRef<{ stop: () => void } | null>(null);
  const scroller = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight });
  }, [turns, busy]);

  useEffect(() => () => {
    ear.current?.stop();
    stopInstalled();
  }, []);

  async function send(question: string) {
    const text = question.trim();
    if (!text || busy) return;
    setDraft("");
    setError(null);
    asked.current += 1;
    const count = asked.current;
    setTurns((prev) => [...prev, { id: `q-${count}`, kind: "q", text }]);
    setBusy(true);
    try {
      const reply = await askGrade({ data: { question: text, cards: toBrief(items) } });
      const next: Turn[] = [
        {
          id: `a-${count}`,
          kind: "a",
          text: reply.answer,
          source: reply.source === "playback" ? "Playback" : reply.source === "live" ? "Live prices" : "Reader",
        },
      ];
      if (count % 4 === 0) {
        recordPlacement("chat_every_4");
        next.push({ id: `ad-${count}`, kind: "ad", text: "" });
      }
      setTurns((prev) => [...prev, ...next]);
      if (playback) {
        try {
          speakInstalled([text, reply.answer]);
        } catch {
          /* A voice error must not fail the answer. */
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Chat failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="flex min-h-[70dvh] flex-col">
      <div className="mb-3 flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={onClose}
          className="flex h-11 items-center gap-1 font-mono text-[0.65rem] uppercase tracking-[0.16em] text-accent"
        >
          <ChevronLeft className="size-4" />
          Sections
        </button>
        <button
          type="button"
          onClick={() => {
            setPlayback((on) => {
              if (on) stopInstalled();
              return !on;
            });
          }}
          className="flex h-11 items-center gap-2 rounded-md border border-border px-3 font-mono text-[0.62rem] uppercase tracking-[0.14em]"
        >
          {playback ? <Volume2 className="size-4 text-accent" /> : <VolumeX className="size-4" />}
          {playback ? "Male voice" : "Voice off"}
        </button>
      </div>
      <h2 className="font-display text-3xl uppercase tracking-[0.06em]">Grade chat</h2>
      <p className="mt-1 text-sm text-muted">
        Ask about the cards on file. The phone’s installed male voice reads the question and the answer. No API key.
      </p>

      <div ref={scroller} className="mt-4 flex max-h-[52dvh] flex-1 flex-col gap-2 overflow-y-auto pr-1">
        {turns.length === 0 ? (
          <div className="space-y-2">
            {["What cards do I have?", "Highest PSA 10?", "Show baseball"].map((prompt) => (
              <button
                key={prompt}
                type="button"
                onClick={() => void send(prompt)}
                className="block h-11 rounded-md border border-border px-3 text-left text-sm"
              >
                {prompt}
              </button>
            ))}
          </div>
        ) : null}
        {turns.map((turn) =>
          turn.kind === "ad" ? (
            <aside key={turn.id} className="rounded-md border border-border bg-bg px-2 py-2">
              <AdMobBanner placement="chat_every_4" />
            </aside>
          ) : (
            <div key={turn.id} className={turn.kind === "q" ? "ml-8 self-end" : "mr-8 self-start"}>
              <div
                className={`rounded-md px-3 py-2 text-sm ${turn.kind === "q" ? "bg-accent text-accent-fg" : "border border-border bg-surface"}`}
              >
                {turn.kind === "a" && turn.source ? (
                  <p className="mb-1 font-mono text-[0.58rem] uppercase tracking-[0.14em] text-accent">{turn.source}</p>
                ) : null}
                <p>{turn.text}</p>
              </div>
              {turn.kind === "a" ? (
                <button
                  type="button"
                  onClick={() => speakInstalled([turn.text])}
                  className="mt-1 font-mono text-[0.58rem] uppercase tracking-[0.14em] text-subtle"
                >
                  Play back
                </button>
              ) : null}
            </div>
          ),
        )}
        {busy ? <p className="font-mono text-[0.62rem] uppercase tracking-[0.14em] text-subtle">Reading…</p> : null}
      </div>

      {error ? <p className="mt-2 text-sm text-danger">{error}</p> : null}

      <div className="mt-3">
        <ChatBoxAd />
      </div>
      <form
        className="mt-3 flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          void send(draft);
        }}
      >
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={hearing ? "Listening…" : "Ask about a grade"}
          className="h-12 min-w-0 flex-1 rounded-md border border-border bg-surface px-3 text-base outline-none focus:border-accent"
        />
        <Button
          type="button"
          variant="secondary"
          disabled={busy}
          onClick={() => {
            if (hearing) {
              ear.current?.stop();
              ear.current = null;
              setHearing(false);
              return;
            }
            const rec = listenCommand((said) => {
              setHearing(false);
              ear.current = null;
              void send(said);
            });
            if (!rec) {
              setError("Voice command is off in this browser.");
              return;
            }
            ear.current = rec;
            setHearing(true);
          }}
        >
          <Mic className="size-4" />
          {hearing ? "Stop" : "Say"}
        </Button>
        <Button type="submit" disabled={busy || draft.trim().length < 2}>
          Ask
        </Button>
      </form>
    </section>
  );
}
