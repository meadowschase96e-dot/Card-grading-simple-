import { useEffect, useState } from "react";
import { Archive, ChevronLeft, ChevronRight, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import type { GradeResponse, ListingChannel, PriceTier, SideReport, VaultItem } from "@/lib/grade-types";
import { CHANNELS, deepQuote, fieldLabels, money, priceRows, sportLabel } from "@/lib/grade-types";
import { cropToBlackMat, stampIndex } from "@/lib/image";
import { openChannel } from "@/lib/listings";
import { cgcDetail } from "@/lib/knowledge/cgc";
import { speakCard } from "@/lib/voice";
import { useSession } from "@/lib/session-store";
import { useVault } from "@/lib/vault-store";
import { Button } from "@/components/ui/button";

function SideMatrix({ title, side }: { title: string; side: SideReport }) {
  const cells = [
    ["Centering", side.centering],
    ["Corners", side.corners],
    ["Edges", side.edges],
    ["Surface", side.surface],
  ] as const;
  return (
    <div>
      <p className="font-mono text-[0.62rem] uppercase tracking-[0.16em] text-subtle">{title}</p>
      <div className="mt-1 grid grid-cols-4 gap-1">
        {cells.map(([label, value]) => (
          <div key={label} className="rounded-md border border-border px-1 py-2 text-center">
            <p className="font-mono text-[0.52rem] uppercase tracking-[0.08em] text-subtle">{label}</p>
            <p className="font-display text-xl leading-none">{value}</p>
          </div>
        ))}
      </div>
      {side.integrity ? <p className="mt-1 text-sm text-muted">{side.integrity}</p> : null}
    </div>
  );
}

type Props = {
  image: string;
  result: GradeResponse;
  vaultId?: string | null;
  indexed?: boolean;
  back?: string | null;
  deep?: boolean;
  onClose?: () => void;
};

export function GradeReport({ image, result, vaultId, indexed = false, back, deep = false, onClose }: Props) {
  const selectedIndex = useSession((s) => s.selectedIndex);
  const setSelectedIndex = useSession((s) => s.setSelectedIndex);
  const resetDraft = useSession((s) => s.resetDraft);
  const scanLane = useSession((s) => s.scanLane);
  const draftBack = useSession((s) => s.draftBack);
  const saveCard = useVault((s) => s.saveCard);
  const remove = useVault((s) => s.remove);
  const submitListing = useVault((s) => s.submitListing);
  const items = useVault((s) => s.items);
  const [saving, setSaving] = useState(false);
  const [mats, setMats] = useState<Record<number, string>>({});
  const [savedIds, setSavedIds] = useState<Record<number, string>>({});
  const [tier, setTier] = useState<PriceTier>("rawMint");

  const cards = result.cards;
  const card = cards[Math.min(selectedIndex, cards.length - 1)] ?? cards[0]!;
  const batch = result.layout === "binder9" ? cards.filter((c) => c.identified) : [card];
  const shown = indexed ? image : (mats[card.slot] ?? image);
  const activeId = vaultId ?? savedIds[card.slot] ?? null;
  const listing = items.find((item) => item.id === activeId)?.listing ?? null;
  const prices = card.prices ?? { rawMint: null, psa7: null, psa8: null, psa9: null, psa10: null };
  const isDeep = deep || scanLane === "deep";
  const quote = isDeep && card.category !== "comic" && card.category !== "game" && card.category !== "system" ? deepQuote(card) : null;
  const rows = priceRows(card.category);
  const fields = fieldLabels(card.category);
  const priceNote = rows === priceRows("baseball") ? "live PSA prices" : "live prices";

  useEffect(() => {
    if (indexed) return;
    let cancel = false;
    void (async () => {
      const next: Record<number, string> = {};
      for (const entry of result.cards) {
        if (!entry.identified && !entry.bbox) continue;
        let plate = await cropToBlackMat(image, entry.bbox);
        if (!isDeep) plate = await stampIndex(plate, entry.year, entry.set, entry.number);
        next[entry.slot] = plate;
      }
      if (!cancel) setMats(next);
    })();
    return () => {
      cancel = true;
    };
  }, [image, indexed, result, isDeep]);

  function close() {
    onClose?.();
    resetDraft();
  }

  async function save() {
    setSaving(true);
    try {
      const next = { ...savedIds };
      for (const entry of batch) {
        if (next[entry.slot]) continue;
        let mat = mats[entry.slot];
        if (!mat) {
          mat = await cropToBlackMat(image, entry.bbox);
          if (!isDeep) mat = await stampIndex(mat, entry.year, entry.set, entry.number);
        }
        next[entry.slot] = saveCard({
          image: mat,
          card: entry,
          model: result.model,
          mat: true,
          lane: scanLane === "deep" ? "deep" : "standard",
          backImage: (back ?? draftBack) || undefined,
        });
      }
      setSavedIds(next);
      toast.success(
        scanLane === "deep"
          ? "Filed in the Deep Core vault"
          : batch.length > 1
            ? `Saved ${batch.length} cards to the portfolio`
            : `Saved to ${sportLabel(card)}`,
      );
    } catch {
      toast.error("Could not save to this device");
    } finally {
      setSaving(false);
    }
  }

  function submit(channel: ListingChannel) {
    if (!activeId) return;
    const useTier = quote?.tier ?? tier;
    const price = prices[useTier];
    if (price == null) {
      toast.error("No price on that tier");
      return;
    }
    submitListing(activeId, channel, useTier);
    const label = CHANNELS.find((c) => c.id === channel)?.label ?? channel;
    const query = [card.year, card.company, card.subject, card.set, card.number].filter(Boolean).join(" ");
    openChannel(channel, query);
    toast.success(`Opening ${label}`);
  }

  return (
    <div className="fixed inset-0 z-30 overflow-y-auto bg-bg">
      <div className="mx-auto flex min-h-dvh max-w-5xl flex-col lg:grid lg:grid-cols-[1.05fr_0.95fr] lg:items-stretch">
        <div className="relative min-h-[46vh] bg-bg lg:min-h-dvh">
          <img src={shown} alt={card.subject} className="absolute inset-0 size-full bg-bg object-contain" />
          <div className="absolute inset-x-3 bottom-16 rounded-md border border-border bg-bg/90 px-3 py-2">
            <p className="font-mono text-[0.58rem] uppercase tracking-[0.16em] text-subtle">{fields.company}</p>
            <p className="font-display text-xl uppercase leading-none">{card.company || "—"}</p>
            <p className="mt-2 font-mono text-[0.58rem] uppercase tracking-[0.16em] text-subtle">{fields.subject}</p>
            <p className="font-display text-xl uppercase leading-none">{card.identified ? card.subject : "—"}</p>
            <p className="mt-2 font-mono text-[0.58rem] uppercase tracking-[0.16em] text-subtle">{fields.year}</p>
            <p className="font-display text-xl uppercase leading-none text-accent">{card.year || "—"}</p>
            <p className="mt-2 font-mono text-[0.58rem] uppercase tracking-[0.16em] text-subtle">{fields.set}</p>
            <p className="font-display text-xl uppercase leading-none text-accent">{card.set || "—"}</p>
            <p className="mt-2 font-mono text-[0.58rem] uppercase tracking-[0.16em] text-subtle">{fields.number}</p>
            <p className="font-display text-xl uppercase leading-none text-accent">{card.number ? `#${card.number}` : "—"}</p>
            <div className="mt-2 grid grid-cols-4 gap-1">
              {quote ? (
                <div className="col-span-4">
                  <p className="font-mono text-[0.52rem] uppercase tracking-[0.08em] text-subtle">{quote.label}</p>
                  <p className="font-display text-lg tabular-nums leading-none">{money(quote.price)}</p>
                </div>
              ) : (
                rows.map((row) => (
                  <div key={row.id}>
                    <p className="font-mono text-[0.52rem] uppercase tracking-[0.08em] text-subtle">{row.label}</p>
                    <p className="font-display text-sm tabular-nums leading-none">{money(prices[row.id])}</p>
                  </div>
                ))
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={() => close()}
            className="absolute left-3 top-3 flex size-11 items-center justify-center rounded-md border border-border bg-bg/80"
            aria-label="Close report"
          >
            <X className="size-4" />
          </button>
          {cards.length > 1 ? (
            <div className="absolute inset-x-0 bottom-3 flex items-center justify-center gap-2">
              <Button
                size="icon"
                variant="secondary"
                onClick={() => setSelectedIndex(Math.max(0, selectedIndex - 1))}
                disabled={selectedIndex === 0}
                aria-label="Previous card"
              >
                <ChevronLeft className="size-4" />
              </Button>
              <span className="rounded-md border border-border bg-bg/80 px-2 py-1 font-mono text-[0.65rem] uppercase tracking-[0.16em]">
                {selectedIndex + 1} / {cards.length}
              </span>
              <Button
                size="icon"
                variant="secondary"
                onClick={() => setSelectedIndex(Math.min(cards.length - 1, selectedIndex + 1))}
                disabled={selectedIndex >= cards.length - 1}
                aria-label="Next card"
              >
                <ChevronRight className="size-4" />
              </Button>
            </div>
          ) : null}
        </div>

        <div className="flex flex-col gap-4 px-4 py-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] lg:px-6 lg:py-8">
          <div>
            <p className="font-mono text-[0.62rem] uppercase tracking-[0.2em] text-accent">{sportLabel(card)}</p>
            <h2 className="mt-1 font-display text-4xl uppercase leading-none tracking-[0.04em]">
              {card.identified ? card.subject : "No card found"}
            </h2>
            <p className="mt-2 font-mono text-[0.62rem] uppercase tracking-[0.14em] text-subtle">
              {card.fromIndex
                ? "Installed index · " + priceNote
                : result.read === "catalog"
                  ? "Catalog reader · " + priceNote
                  : result.read === "vision"
                    ? "Saved to catalog · " + priceNote
                    : priceNote}
            </p>
          </div>

          <dl className="grid grid-cols-2 gap-2">
            <Fact label={fields.company} value={card.company || "—"} />
            <Fact label={fields.subject} value={card.identified ? card.subject : "—"} />
            <Fact label={fields.set} value={card.set || "—"} />
            <Fact label={fields.year} value={card.year || "—"} />
            <Fact label={fields.number} value={card.number ? `#${card.number}` : "—"} />
          </dl>
          <button
            type="button"
            onClick={() => speakCard(card, isDeep ? "deep" : "standard")}
            className="h-11 rounded-md border border-border font-mono text-[0.65rem] uppercase tracking-[0.14em] text-accent"
          >
            Play back
          </button>
          {cgcDetail(card) ? <p className="text-sm text-muted">{cgcDetail(card)}</p> : null}

          {back ? (
            <div>
              <p className="mb-2 font-mono text-[0.62rem] uppercase tracking-[0.16em] text-subtle">Back</p>
              <img src={back} alt="Card back" className="aspect-[2.5/3.5] w-28 bg-bg object-contain" />
            </div>
          ) : null}

          <div className="grid grid-cols-2 gap-2">
            {quote ? (
              <div className="col-span-2 rounded-md border border-accent px-3 py-3">
                <p className="font-mono text-[0.62rem] uppercase tracking-[0.16em] text-subtle">{quote.label}</p>
                <p className="mt-1 font-display text-3xl tabular-nums leading-none">{money(quote.price)}</p>
                <p className="mt-2 text-sm text-muted">Raw mint {money(prices.rawMint)}. Grade 10 uses the PSA 8 price. Grade 9 and grade 8 use the PSA 7 price.</p>
                {quote.price != null && prices.rawMint != null && quote.price > prices.rawMint ? (
                  <p className="mt-1 font-mono text-[0.62rem] uppercase tracking-[0.14em] text-accent">Above raw mint</p>
                ) : null}
              </div>
            ) : (
              rows.map((row) => (
                <button
                  key={row.id}
                  type="button"
                  onClick={() => setTier(row.id)}
                  className={`rounded-md border px-3 py-3 text-left ${tier === row.id ? "border-accent" : "border-border bg-surface"}`}
                >
                  <p className="font-mono text-[0.62rem] uppercase tracking-[0.16em] text-subtle">{row.label}</p>
                  <p className="mt-1 font-display text-2xl tabular-nums leading-none">{money(prices[row.id])}</p>
                </button>
              ))
            )}
          </div>

          {card.frontReport ? <SideMatrix title="Front" side={card.frontReport} /> : null}
          {card.backReport ? <SideMatrix title="Back" side={card.backReport} /> : null}

          {activeId ? (
            <div className="space-y-2">
              <p className="font-mono text-[0.62rem] uppercase tracking-[0.16em] text-subtle">
                Submit {quote ? quote.label : rows.find((row) => row.id === tier)?.label}
                {listing ? ` · queued ${CHANNELS.find((c) => c.id === listing.channel)?.label}` : ""}
              </p>
              <div className="grid grid-cols-2 gap-2">
                {CHANNELS.map((channel) => (
                  <Button
                    key={channel.id}
                    variant={listing?.channel === channel.id ? "default" : "secondary"}
                    className="px-1 text-[0.62rem]"
                    onClick={() => submit(channel.id)}
                    disabled={(quote ? prices[quote.tier] : prices[tier]) == null}
                  >
                    {channel.label}
                  </Button>
                ))}
              </div>
            </div>
          ) : null}

          <div className="mt-auto flex gap-2 pt-2">
            {vaultId ? (
              <Button
                variant="danger"
                className="flex-1"
                onClick={() => {
                  remove(vaultId);
                  toast.success("Removed from portfolio");
                  close();
                }}
              >
                <Trash2 className="size-4" />
                Remove
              </Button>
            ) : (
              <Button className="flex-1" onClick={() => void save()} disabled={saving || !card.identified || Boolean(activeId)}>
                <Archive className="size-4" />
                {activeId ? "Saved" : batch.length > 1 ? `Save ${batch.length}` : "Save to portfolio"}
              </Button>
            )}
            <Button variant="secondary" className="flex-1" onClick={() => close()}>
              Done
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-border bg-surface px-3 py-2.5">
      <dt className="font-mono text-[0.62rem] uppercase tracking-[0.16em] text-subtle">{label}</dt>
      <dd className="mt-1 truncate text-sm text-fg">{value}</dd>
    </div>
  );
}

export function VaultItemReport({ item, onClose }: { item: VaultItem; onClose: () => void }) {
  const result: GradeResponse = {
    ok: true,
    layout: "single",
    model: item.model,
    cards: [item.card],
    latencyMs: 0,
  };
  return (
    <GradeReport
      image={item.image}
      result={result}
      vaultId={item.id}
      indexed={item.mat === true}
      back={item.backImage}
      deep={item.lane === "deep"}
      onClose={onClose}
    />
  );
}
