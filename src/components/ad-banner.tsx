import { useEffect, useRef, useState } from "react";
import { AdMobBanner } from "@/components/admob-banner";
import { recordPlacement } from "@/lib/revenue";

const SECONDS = 15;

export function AdTicker() {
  const bar = useRef<HTMLElement>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const id = window.setInterval(() => setTick((value) => value + 1), 1000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    const node = bar.current;
    if (!node) return;
    const lock = () => {
      if (node.style.getPropertyValue("height") === "100px" && node.style.getPropertyValue("max-height") === "100px") return;
      node.style.setProperty("height", "100px", "important");
      node.style.setProperty("max-height", "100px", "important");
      node.style.setProperty("overflow", "hidden", "important");
    };
    lock();
    const watcher = new MutationObserver(lock);
    watcher.observe(node, { attributes: true, attributeFilter: ["style"] });
    return () => watcher.disconnect();
  }, []);

  useEffect(() => {
    if (tick > 0 && tick % SECONDS === 0) recordPlacement("ticker_15");
  }, [tick]);

  const left = SECONDS - (tick % SECONDS);

  return (
    <aside
      ref={bar}
      className="gms-ticker fixed inset-x-0 bottom-0 z-[70] flex h-[100px] max-h-[100px] items-center gap-2 overflow-hidden border-t border-border bg-bg/95 px-2"
      aria-label="AdMob banner"
    >
      <span className="shrink-0 rounded-sm bg-accent px-1 py-px font-mono text-[0.5rem] uppercase tracking-[0.14em] text-accent-fg">
        Ad
      </span>
      <span className="shrink-0 font-mono text-[0.65rem] tabular-nums leading-none text-accent">{left}</span>
      <AdMobBanner placement="ticker_15" compact />
    </aside>
  );
}
