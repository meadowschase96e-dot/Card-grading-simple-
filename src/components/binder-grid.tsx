import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, ScanLine } from "lucide-react";
import { armDeskBack } from "@/lib/desk-back";
import { channelHome } from "@/lib/listings";
import { useVault } from "@/lib/vault-store";
import {
  CHANNELS,
  money,
  PORTFOLIO_SPORTS,
  portfolioSport,
  sportLabel,
  type ListingChannel,
  type PortfolioSport,
  type VaultItem,
} from "@/lib/grade-types";
import { COMIC_LINES, GAME_LINES, PRINT_LINES, PRINT_YEAR, SYSTEM_LINES } from "@/lib/knowledge";
import { cn } from "@/lib/utils";

type Section =
  | { kind: "sport"; id: PortfolioSport; label: string }
  | { kind: "channel"; id: ListingChannel; label: string };

export function Portfolio({
  selectedId,
  onOpenItem,
  onScan,
  onNine,
  onDeep,
  onChat,
}: {
  selectedId: string | null;
  onOpenItem: (id: string) => void;
  onScan: () => void;
  onNine: () => void;
  onDeep: () => void;
  onChat: () => void;
}) {
  const items = useVault((s) => s.items);
  const [section, setSection] = useState<Section | null>(null);
  const [deepOpen, setDeepOpen] = useState(false);

  useEffect(() => {
    if (section || deepOpen) armDeskBack();
  }, [section, deepOpen]);

  useEffect(() => {
    const home = () => {
      setSection(null);
      setDeepOpen(false);
    };
    window.addEventListener("gms-home", home);
    return () => window.removeEventListener("gms-home", home);
  }, []);
  const deepItems = items.filter((item) => item.lane === "deep");

  const sports = PORTFOLIO_SPORTS.map((sport) => ({
    kind: "sport" as const,
    id: sport.id,
    label: sport.label,
    count: items.filter((item) => portfolioSport(item.card) === sport.id).length,
  }));
  const channels = CHANNELS.map((channel) => ({
    kind: "channel" as const,
    id: channel.id,
    label: channel.label,
    count: items.filter((item) => item.listing?.channel === channel.id).length,
  }));

  const visible = section
    ? items.filter((item) =>
        section.kind === "sport"
          ? portfolioSport(item.card) === section.id
          : item.listing?.channel === section.id,
      )
    : [];

  if (deepOpen) {
    return (
      <div>
        <button
          type="button"
          onClick={() => setDeepOpen(false)}
          className="mb-4 flex h-11 items-center gap-1 font-mono text-[0.65rem] uppercase tracking-[0.16em] text-accent"
        >
          <ChevronLeft className="size-4" />
          Sections
        </button>
        <div className="mb-4 flex items-end justify-between">
          <h2 className="font-display text-3xl uppercase tracking-[0.06em]">Deep Core</h2>
          <p className="font-mono text-[0.65rem] uppercase tracking-[0.14em] text-subtle">{deepItems.length}</p>
        </div>
        <p className="mb-4 text-sm text-muted">
          Front and back. A 60 second spot plays on each photo. {PRINT_LINES.length} print lines, 1948 through {PRINT_YEAR}, are stored in this install.
        </p>
        {deepItems.length === 0 ? (
          <div className="rounded-xl border border-border bg-surface px-4 py-6">
            <p className="text-sm text-muted">The Deep Core vault is empty.</p>
          </div>
        ) : (
          <div className="mb-4 grid grid-cols-3 gap-2">
            {deepItems.map((item) => (
              <button key={item.id} type="button" onClick={() => onOpenItem(item.id)} className="overflow-hidden rounded-md border border-border bg-bg text-left">
                <img src={item.image} alt={item.card.subject} className="aspect-[2.5/3.5] w-full object-contain" />
                <p className="truncate px-1 py-1 font-mono text-[0.58rem] uppercase">{item.card.subject}</p>
              </button>
            ))}
          </div>
        )}
        <button
          type="button"
          onClick={onDeep}
          className="flex h-12 w-full items-center justify-center gap-2 rounded-md border border-accent bg-accent text-accent-fg font-display uppercase tracking-[0.14em]"
        >
          <ScanLine className="size-4" />
          Front and back
        </button>
      </div>
    );
  }

  if (!section) {
    return (
      <div className="space-y-6">
        <BinderPage items={items} onOpenItem={onOpenItem} />
        <div>
          <p className="font-mono text-[0.62rem] uppercase tracking-[0.2em] text-accent">Sections</p>
          <h2 className="mt-1 font-display text-2xl uppercase tracking-[0.06em]">Portfolio</h2>
        </div>
        <button
          type="button"
          onClick={() => setDeepOpen(true)}
          className="gms-divider flex h-14 w-full items-center justify-between rounded-md border border-border px-4 pl-5 text-left"
        >
          <span className="font-display text-xl uppercase tracking-[0.06em]">Deep Core vault</span>
          <span className="font-mono text-sm text-subtle">{deepItems.length}</span>
        </button>
        <button
          type="button"
          onClick={onChat}
          className="flex h-14 w-full items-center justify-between rounded-md border border-accent/50 bg-surface px-4 text-left"
        >
          <span className="font-display text-xl uppercase tracking-[0.06em]">Grade chat</span>
          <ChevronRight className="size-4 text-accent" />
        </button>
        <div className="space-y-2">
          {sports.map((row) => (
            <SectionRow key={row.id} label={row.label} count={row.count} onClick={() => setSection(row)} />
          ))}
        </div>
        <div>
          <p className="mb-2 font-mono text-[0.62rem] uppercase tracking-[0.2em] text-subtle">Submissions</p>
          <div className="space-y-2">
            {channels.map((row) => (
              <SectionRow key={row.id} label={row.label} count={row.count} href={channelHome(row.id)} />
            ))}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={onScan}
            className="flex h-12 items-center justify-center gap-2 rounded-md border border-accent bg-accent text-accent-fg font-display uppercase tracking-[0.12em]"
          >
            <ScanLine className="size-4" />
            One card
          </button>
          <button
            type="button"
            onClick={onNine}
            className="flex h-12 items-center justify-center gap-2 rounded-md border border-border bg-surface font-display uppercase tracking-[0.12em]"
          >
            <ScanLine className="size-4" />
            Nine card
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => setSection(null)}
        className="mb-4 flex h-11 items-center gap-1 font-mono text-[0.65rem] uppercase tracking-[0.16em] text-accent"
      >
        <ChevronLeft className="size-4" />
        Sections
      </button>
      <div className="mb-4 flex items-end justify-between">
        <h2 className="font-display text-3xl uppercase tracking-[0.06em]">{section.label}</h2>
        <p className="font-mono text-[0.65rem] uppercase tracking-[0.14em] text-subtle">{visible.length}</p>
      </div>
      {visible.length === 0 ? (
        <div className="rounded-xl border border-border bg-surface px-4 py-6">
          <p className="text-sm text-muted">Nothing in {section.label} yet.</p>
          {section.kind === "sport" ? (
            <>
              <p className="mt-2 text-sm text-muted">
                {section.id === "comic"
                  ? `${COMIC_LINES.length} comic lines are stored on this install. A scan is cropped on a matte black plate here, then remembered for the next copy.`
                  : section.id === "game"
                    ? `${GAME_LINES.length} game lines are stored on this install. A scan is cropped on a matte black plate here, then remembered for the next copy.`
                    : section.id === "system"
                      ? `${SYSTEM_LINES.length} systems are stored on this install. A scan is cropped on a matte black plate here, then remembered for the next copy.`
                      : "The matte crop stays in the app. A repeat scan is read from the catalog."}
              </p>
              <button
                type="button"
                onClick={onScan}
                className="mt-4 h-11 rounded-md border border-border px-4 font-display text-sm uppercase tracking-[0.14em]"
              >
                {section.id === "comic" ? "Scan a comic" : section.id === "game" ? "Scan a game" : section.id === "system" ? "Scan a system" : "Scan a card"}
              </button>
            </>
          ) : (
            <p className="mt-2 text-sm text-muted">Open a saved card and queue it here.</p>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
          {visible.map((item) => {
            const selected = item.id === selectedId;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onOpenItem(item.id)}
                aria-pressed={selected}
                className={cn(
                  "overflow-hidden rounded-md border bg-bg text-left",
                  selected ? "border-accent ring-2 ring-accent" : "border-border",
                )}
              >
                <img src={item.image} alt="" className="aspect-[5/7] w-full bg-bg object-contain" />
                <span className="block truncate px-1.5 pt-1.5 font-display text-sm uppercase leading-none">
                  {item.card.subject}
                </span>
                <span className="block truncate px-1.5 pb-1.5 font-mono text-[0.6rem] text-accent">
                  {section.kind === "channel"
                    ? money(item.listing?.price)
                    : `${money(item.card.prices?.rawMint)} · ${sportLabel(item.card)}`}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function BinderPage({ items, onOpenItem }: { items: VaultItem[]; onOpenItem: (id: string) => void }) {
  const pockets = Array.from({ length: 9 }, (_, index) => items[index] ?? null);
  return (
    <div className="gms-binder" aria-label="Vault binder">
      <div className="gms-rings" aria-hidden>
        <span />
        <span />
        <span />
      </div>
      <div className="gms-pockets">
        {pockets.map((item, index) =>
          item ? (
            <button key={item.id} type="button" onClick={() => onOpenItem(item.id)} className="gms-sleeve">
              <img src={item.image} alt={item.card.subject} />
            </button>
          ) : (
            <div key={`empty-${index}`} className="gms-sleeve" aria-hidden>
              <span className="gms-sleeve-empty" />
            </div>
          ),
        )}
      </div>
    </div>
  );
}

function SectionRow({
  label,
  count,
  onClick,
  href,
}: {
  label: string;
  count: number;
  onClick?: () => void;
  href?: string;
}) {
  const className =
    "gms-divider flex h-14 w-full items-center justify-between rounded-md border border-border px-4 pl-5 text-left";
  const body = (
    <>
      <span className="font-display text-xl uppercase tracking-[0.06em]">{label}</span>
      <span className="flex items-center gap-2">
        <span className="font-mono text-sm tabular-nums text-accent">{count}</span>
        <ChevronRight className="size-4 text-subtle" />
      </span>
    </>
  );
  if (href) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className={className}>
        {body}
      </a>
    );
  }
  return (
    <button type="button" onClick={onClick} className={className}>
      {body}
    </button>
  );
}
