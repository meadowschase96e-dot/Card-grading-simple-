import { useEffect, useRef, useState } from "react";
import { flipSpot, peekSpot, spotLabel, type AdSpot } from "@/lib/ad-spots";

const GATE_SECONDS = 30;
const CLIP_SECONDS = 15;

export function AdCarousel({
  mode,
  spot,
  onFinished,
}: {
  mode: "banner" | "locked";
  spot?: AdSpot;
  onFinished?: () => void;
}) {
  const [active, setActive] = useState<AdSpot>(spot ?? peekSpot());
  const [left, setLeft] = useState(GATE_SECONDS);
  const [muted, setMuted] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);
  const onFinishedRef = useRef(onFinished);
  onFinishedRef.current = onFinished;

  useEffect(() => {
    if (spot) setActive(spot);
  }, [spot]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const plays = 2;
    let played = 0;
    let stopped = false;
    const play = () => {
      video.muted = true;
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
      const len = Number.isFinite(video.duration) && video.duration > 0 ? video.duration : CLIP_SECONDS;
      const remain = len - video.currentTime + Math.max(0, plays - played - 1) * len;
      setLeft(Math.max(0, Math.ceil(remain)));
    };
    const onEnded = () => {
      if (stopped) return;
      played += 1;
      if (played < plays) {
        play();
        return;
      }
      if (mode === "banner") {
        stopped = true;
        setActive(flipSpot());
        setLeft(GATE_SECONDS);
        return;
      }
      stopped = true;
      video.pause();
      onFinishedRef.current?.();
    };
    video.addEventListener("ended", onEnded);
    video.addEventListener("timeupdate", onTime);
    play();
    return () => {
      stopped = true;
      video.removeEventListener("ended", onEnded);
      video.removeEventListener("timeupdate", onTime);
    };
  }, [active, mode]);

  const locked = mode === "locked";

  if (!locked) {
    return (
      <section
        className="flex h-24 items-center gap-3 border-y border-border bg-bg px-2"
        aria-label={`${spotLabel(active)} commercial`}
      >
        <div className="relative h-16 w-28 shrink-0 overflow-hidden rounded-sm bg-bg">
          <video
            key={active}
            ref={videoRef}
            className="absolute inset-0 size-full object-cover"
            src="/commercials/pre-roll.mp4"
            playsInline
            muted
            preload="auto"
          />
        </div>
        <p className="min-w-0 truncate font-mono text-[0.62rem] uppercase tracking-[0.16em] text-accent">
          Ad · {spotLabel(active)}
        </p>
        <span className="ml-auto font-display text-lg tabular-nums leading-none">{left}</span>
        <button
          type="button"
          onClick={() => {
            const video = videoRef.current;
            if (!video) return;
            video.muted = !video.muted;
            setMuted(video.muted);
            void video.play().catch(() => undefined);
          }}
          className="h-8 shrink-0 rounded-md border border-border px-2 font-mono text-[0.6rem] uppercase tracking-[0.14em]"
        >
          {muted ? "Unmute" : "Mute"}
        </button>
      </section>
    );
  }

  return (
    <section className="shrink-0 border-b border-border bg-bg" aria-label={`${spotLabel(active)} commercial`}>
      <div className="flex items-center justify-between gap-3 px-3 py-1.5">
        <p className="font-mono text-[0.62rem] uppercase tracking-[0.18em] text-accent">
          Ad · {spotLabel(active)}
        </p>
        <div className="flex items-center gap-2">
          <span className="font-display text-lg tabular-nums leading-none">{left}</span>
          <button
            type="button"
            onClick={() => {
              const video = videoRef.current;
              if (!video) return;
              video.muted = !video.muted;
              setMuted(video.muted);
              void video.play().catch(() => undefined);
            }}
            className="h-8 rounded-md border border-border px-2 font-mono text-[0.6rem] uppercase tracking-[0.14em]"
          >
            {muted ? "Unmute" : "Mute"}
          </button>
        </div>
      </div>
      <div className="relative h-[38vh] bg-bg">
        <video
          key={active}
          ref={videoRef}
          className="absolute inset-0 size-full object-cover"
          src="/commercials/pre-roll.mp4"
          playsInline
          muted
          preload="auto"
        />
      </div>
      <div className="flex justify-center gap-1.5 py-1.5">
        {(["standard", "deep"] as const).map((id) => (
          <span key={id} className={`h-1.5 w-6 rounded-full ${id === active ? "bg-accent" : "bg-border"}`} />
        ))}
      </div>
    </section>
  );
}
