import { useEffect, useRef, useState } from "react";
import type { PlacementId } from "@/lib/admob";
import { recordPlacement } from "@/lib/revenue";

const SPOT_SECONDS = 15;

export function CommercialBreak({
  onDone,
  kicker = "Scan ad gate · 30s",
  detail = "Card scan stays locked until both 15s spots finish.",
  seconds = 30,
  placement = "vault_gate_30",
}: {
  onDone: () => void;
  kicker?: string;
  detail?: string;
  seconds?: number;
  placement?: PlacementId;
}) {
  const gate = Math.max(SPOT_SECONDS, seconds);
  const spots = Math.max(1, Math.round(gate / SPOT_SECONDS));
  const videoRef = useRef<HTMLVideoElement>(null);
  const doneRef = useRef(false);
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;
  const [left, setLeft] = useState(gate);
  const [spot, setSpot] = useState(1);
  const [muted, setMuted] = useState(true);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    let played = 0;
    let closed = false;
    const finish = () => {
      if (closed || doneRef.current) return;
      doneRef.current = true;
      closed = true;
      video.pause();
      recordPlacement(placement);
      onDoneRef.current();
    };
    const play = () => {
      video.muted = true;
      setMuted(true);
      const start = () => {
        try {
          video.currentTime = 0;
        } catch {
          /* metadata not ready yet */
        }
        void video.play().catch(() => undefined);
      };
      if (video.readyState >= 1) start();
      else video.addEventListener("loadedmetadata", start, { once: true });
    };
    const onTime = () => {
      const len = Number.isFinite(video.duration) && video.duration > 0 ? video.duration : SPOT_SECONDS;
      const remain = len - video.currentTime + Math.max(0, spots - played - 1) * len;
      setLeft(Math.max(0, Math.ceil(remain)));
      setSpot(Math.min(spots, played + 1));
    };
    const onEnded = () => {
      played += 1;
      if (played < spots) {
        setSpot(played + 1);
        play();
        return;
      }
      finish();
    };
    video.addEventListener("ended", onEnded);
    video.addEventListener("timeupdate", onTime);
    play();
    const safety = window.setTimeout(finish, (spots * 16 + 3) * 1000);
    return () => {
      closed = true;
      window.clearTimeout(safety);
      video.removeEventListener("ended", onEnded);
      video.removeEventListener("timeupdate", onTime);
    };
  }, [spots, placement]);

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-bg" role="dialog" aria-label={`${gate} second ad gate`}>
      <div className="flex items-center justify-between px-4 py-3">
        <div>
          <p className="font-mono text-[0.65rem] uppercase tracking-[0.2em] text-accent">{kicker}</p>
          <p className="mt-1 font-mono text-[0.62rem] uppercase tracking-[0.16em] text-muted">
            {SPOT_SECONDS}s spot {spot} of {spots}
          </p>
        </div>
        <p className="font-display text-3xl tabular-nums leading-none">{left}</p>
      </div>
      <div className="relative mx-4 flex-1 overflow-hidden rounded-xl border border-border bg-bg">
        <video
          ref={videoRef}
          className="absolute inset-0 size-full object-contain"
          src="/commercials/pre-roll.mp4"
          playsInline
          muted
          preload="auto"
        />
        <div className="gms-scanlines pointer-events-none absolute inset-0 opacity-30" />
      </div>
      <div className="flex items-center justify-between gap-3 px-4 py-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
        <p className="text-sm text-muted">{detail}</p>
        <button
          type="button"
          className="h-11 shrink-0 rounded-md border border-border px-3 font-mono text-[0.65rem] uppercase tracking-[0.16em] text-fg"
          onClick={() => {
            const video = videoRef.current;
            if (!video) return;
            video.muted = !video.muted;
            setMuted(video.muted);
            void video.play().catch(() => undefined);
          }}
        >
          {muted ? "Sound" : "Mute"}
        </button>
      </div>
    </div>
  );
}
