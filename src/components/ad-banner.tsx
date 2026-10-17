import { useEffect, useState } from "react";

const SPOTS = [
  "Vault+ on Origin — inventory sync for the Don Nico grid",
  "Matte black sleeves, cut for the portfolio",
  "Queue the card — eBay, Mercari, Marketplace, Posh",
  "Scan. Price. File. Card Grading Simple",
];

const SECONDS = 15;

export function AdTicker() {
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const id = window.setInterval(() => setTick((value) => value + 1), 1000);
    return () => window.clearInterval(id);
  }, []);

  const index = Math.floor(tick / SECONDS) % SPOTS.length;
  const left = SECONDS - (tick % SECONDS);
  const line = SPOTS[index] ?? SPOTS[0];

  return (
    <aside
      className="fixed inset-x-0 bottom-0 z-[70] flex h-12 items-center gap-3 border-t border-border bg-bg/95 px-3 pb-[env(safe-area-inset-bottom)]"
      aria-label="Sponsored ticker"
    >
      <span className="shrink-0 rounded-sm bg-accent px-1.5 py-0.5 font-mono text-[0.58rem] uppercase tracking-[0.14em] text-accent-fg">
        Ad
      </span>
      <span className="shrink-0 font-display text-lg tabular-nums leading-none text-accent">{left}</span>
      <div className="min-w-0 flex-1 overflow-hidden">
        <div key={index} className="gms-ticker-track">
          <p className="px-4 font-mono text-[0.68rem] uppercase tracking-[0.14em] text-fg">{line}</p>
          <p className="px-4 font-mono text-[0.68rem] uppercase tracking-[0.14em] text-fg" aria-hidden>
            {line}
          </p>
        </div>
      </div>
    </aside>
  );
}
