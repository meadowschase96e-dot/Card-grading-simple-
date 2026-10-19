import { useEffect, useRef } from "react";
import { ADMOB_APP_ID, ADMOB_BANNER_SLOT, ADMOB_BANNER_UNIT, ADMOB_PUBLISHER_ID, type PlacementId } from "@/lib/admob";

let scriptStarted = false;

function ensureAdsScript() {
  if (scriptStarted || typeof document === "undefined") return;
  scriptStarted = true;
  if (document.getElementById("gms-adsbygoogle")) return;
  const script = document.createElement("script");
  script.id = "gms-adsbygoogle";
  script.async = true;
  script.crossOrigin = "anonymous";
  script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADMOB_PUBLISHER_ID}`;
  document.head.appendChild(script);
}

/** One live banner request. The ad fills itself. This does not invent a creative. */
export function AdMobBanner({ placement, compact = false }: { placement: PlacementId; compact?: boolean }) {
  const pushed = useRef(false);

  useEffect(() => {
    const bridge = (
      window as Window & { median?: { admob?: { banner?: { enable?: () => void; disable?: () => void } } } }
    ).median;
    bridge?.admob?.banner?.enable?.();
    ensureAdsScript();
    let tries = 0;
    const timer = window.setInterval(() => {
      tries += 1;
      const ads = (window as Window & { adsbygoogle?: unknown[] }).adsbygoogle;
      if (ads && !pushed.current) {
        pushed.current = true;
        try {
          ads.push({});
        } catch {
          /* This slot was already requested. */
        }
        window.clearInterval(timer);
      } else if (tries > 20) {
        window.clearInterval(timer);
      }
    }, 300);
    return () => {
      window.clearInterval(timer);
      bridge?.admob?.banner?.disable?.();
    };
  }, []);

  return (
    <aside
      data-admob-app-id={ADMOB_APP_ID}
      data-admob-unit={ADMOB_BANNER_UNIT}
      data-admob-placement={placement}
      className={compact ? "h-6 min-w-0 flex-1 overflow-hidden" : "min-w-0 flex-1 overflow-hidden"}
    >
      <ins
        className={compact ? "adsbygoogle block h-6 w-full overflow-hidden" : "adsbygoogle block min-h-[50px] w-full"}
        style={compact ? { display: "block", height: 24, maxHeight: 24 } : { display: "block" }}
        data-ad-client={ADMOB_PUBLISHER_ID}
        data-ad-slot={ADMOB_BANNER_SLOT}
        data-ad-format="horizontal"
        data-full-width-responsive="true"
        data-adtest="on"
      />
    </aside>
  );
}
