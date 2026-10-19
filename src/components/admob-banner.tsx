import { useEffect, useRef } from "react";
import { ADMOB_APP_ID, ADMOB_BANNER_SLOT, ADMOB_BANNER_UNIT, ADMOB_PUBLISHER_ID, enableNativeBanner, type PlacementId } from "@/lib/admob";

let scriptStarted = false;

function ensureAdsScript() {
  if (scriptStarted || typeof document === "undefined") return;
  scriptStarted = true;
  const host = window as Window & { adsbygoogle?: unknown[] };
  host.adsbygoogle = host.adsbygoogle || [];
  if (document.getElementById("gms-adsbygoogle")) return;
  const script = document.createElement("script");
  script.id = "gms-adsbygoogle";
  script.async = true;
  script.crossOrigin = "anonymous";
  script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADMOB_PUBLISHER_ID}`;
  document.head.appendChild(script);
}

/** Live AdMob banner request for this placement. Google fills it. Nothing is drawn in its place. */
export function AdMobBanner({ placement, compact = false }: { placement: PlacementId; compact?: boolean }) {
  const pushed = useRef(false);
  const slot = useRef<HTMLModElement>(null);

  useEffect(() => {
    enableNativeBanner();
    ensureAdsScript();
    let tries = 0;
    const timer = window.setInterval(() => {
      tries += 1;
      const ads = (window as Window & { adsbygoogle?: unknown[] }).adsbygoogle;
      if (ads && slot.current && !pushed.current) {
        pushed.current = true;
        try {
          ads.push({});
        } catch {
          /* This slot was already requested. */
        }
        window.clearInterval(timer);
      } else if (tries > 40) {
        window.clearInterval(timer);
      }
    }, 250);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <aside
      data-admob-app-id={ADMOB_APP_ID}
      data-admob-unit={ADMOB_BANNER_UNIT}
      data-admob-placement={placement}
      className={compact ? "h-full min-h-0 min-w-0 flex-1 overflow-hidden" : "min-h-[50px] min-w-0 flex-1 overflow-hidden"}
    >
      <ins
        ref={slot}
        className="adsbygoogle block h-full w-full"
        style={compact ? { display: "block", height: "100%", maxHeight: 100 } : { display: "block", minHeight: 50 }}
        data-ad-client={ADMOB_PUBLISHER_ID}
        data-ad-slot={ADMOB_BANNER_SLOT}
        data-ad-format="horizontal"
        data-full-width-responsive="true"
        data-adtest="on"
      />
    </aside>
  );
}