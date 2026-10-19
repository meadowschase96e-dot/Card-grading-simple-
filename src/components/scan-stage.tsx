import { useEffect, useRef, useState } from "react";
import { Camera, ImageUp, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { gradeScan } from "@/lib/ai/actions";
import { compressForGrade, fetchAsDataUrl, frameFromVideo, cardPrint, cropToBlackMat } from "@/lib/image";
import { useSession } from "@/lib/session-store";
import { Button } from "@/components/ui/button";
import { CommercialBreak } from "@/components/commercial-break";
import { peekSpot, flipSpot, type AdSpot } from "@/lib/ad-spots";
import { cn } from "@/lib/utils";
import type { GradeResponse } from "@/lib/grade-types";
import { sideReport, totalDeep } from "@/lib/grade-types";
import { speakCard } from "@/lib/voice";

type SpeechRec = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
};

function recognition(): SpeechRec | null {
  const host = window as Window & {
    SpeechRecognition?: new () => SpeechRec;
    webkitSpeechRecognition?: new () => SpeechRec;
  };
  const Ctor = host.SpeechRecognition ?? host.webkitSpeechRecognition;
  if (!Ctor) return null;
  const rec = new Ctor();
  rec.continuous = true;
  rec.interimResults = true;
  rec.lang = "en-US";
  return rec;
}

export function ScanStage() {
  const scanMode = useSession((s) => s.scanMode);
  const scanLane = useSession((s) => s.scanLane);
  const draftImage = useSession((s) => s.draftImage);
  const grading = useSession((s) => s.grading);
  const error = useSession((s) => s.error);
  const ping = useSession((s) => s.ping);
  const setDraftImage = useSession((s) => s.setDraftImage);
  const setDraftBack = useSession((s) => s.setDraftBack);
  const setGrading = useSession((s) => s.setGrading);
  const setError = useSession((s) => s.setError);
  const resetDraft = useSession((s) => s.resetDraft);
  const setCameraLocked = useSession((s) => s.setCameraLocked);
  const videoRef = useRef<HTMLVideoElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const heard = useRef<SpeechRec | null>(null);
  const pending = useRef<GradeResponse | null>(null);
  const spotDoneRef = useRef(false);
  const busyRef = useRef(false);
  const side = useSession((s) => s.deepSide);
  const [camOn, setCamOn] = useState(false);
  const [camError, setCamError] = useState<string | null>(null);
  const [voiceOn, setVoiceOn] = useState(false);
  const [lockedSpot, setLockedSpot] = useState<AdSpot>("standard");
  const [spotDone, setSpotDone] = useState(false);
  const [looking, setLooking] = useState(false);
  const streamRef = useRef<MediaStream | null>(null);

  function stopListen() {
    const rec = heard.current;
    heard.current = null;
    if (!rec) return;
    rec.onend = null;
    try {
      rec.stop();
    } catch {
      /* already stopped */
    }
    setVoiceOn(false);
  }

  function stopCam() {
    stopListen();
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setCamOn(false);
  }

  useEffect(() => () => {
    stopCam();
    setCameraLocked(false);
  }, [setCameraLocked]);

  function beginLookup() {
    pending.current = null;
    spotDoneRef.current = false;
    setSpotDone(false);
    setLooking(true);
    setLockedSpot(peekSpot());
  }

  function publish(result: GradeResponse) {
    const state = useSession.getState();
    if (state.scanLane === "deep" && state.deepSide !== "back") {
      useSession.setState({
        deepSide: "back",
        deepFrontImage: state.draftImage,
        deepFrontResult: result,
        draftImage: null,
        view: "scan",
      });
      pending.current = null;
      setLooking(false);
      setSpotDone(false);
      spotDoneRef.current = false;
      busyRef.current = false;
      setGrading(false);
      return;
    }
    const backPlate = state.draftBack || state.draftImage;
    const frontPlate = state.deepFrontImage || backPlate;
    const front = state.deepFrontResult?.cards[0];
    const back = result.cards[0];
    let next = result;
    if (state.scanLane === "deep" && front) {
      const keep = (a: string, b: string) => a || b || "";
      const frontSide = sideReport(front);
      const backSide = back ? sideReport(back) : undefined;
      next = {
        ...(state.deepFrontResult ?? result),
        cards: [
          {
            ...front,
            subject: front.subject && front.subject !== "Unknown subject" ? front.subject : (back?.subject ?? front.subject),
            year: keep(front.year, back?.year ?? ""),
            set: keep(front.set, back?.set ?? ""),
            number: keep(front.number, back?.number ?? ""),
            company: keep(front.company, back?.company ?? ""),
            overall: totalDeep(frontSide, backSide),
            frontReport: frontSide,
            backReport: backSide,
            notes: [frontSide.integrity, backSide?.integrity ? `Back: ${backSide.integrity}` : ""].filter(Boolean).join(" "),
          },
        ],
      };
    }
    pending.current = null;
    setLooking(false);
    const card = next.cards.find((item) => item.identified);
    if (card) speakCard(card, state.scanLane);
    useSession.setState({
      draftImage: frontPlate,
      draftBack: state.scanLane === "deep" ? backPlate : state.draftBack,
      draftResult: next,
      view: "report",
      selectedIndex: 0,
      grading: false,
      error: null,
      deepSide: "front",
    });
    busyRef.current = false;
  }

  function finishSpot() {
    spotDoneRef.current = true;
    setSpotDone(true);
    flipSpot();
    const ready = pending.current;
    if (ready) publish(ready);
  }

  async function startCam() {
    setCamError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 }, height: { ideal: 1920 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setCamOn(true);
      const rec = recognition();
      if (rec) {
        rec.onresult = (event) => {
          const last = event.results[event.results.length - 1];
          const said = last?.[0]?.transcript?.toLowerCase() ?? "";
          if (/\b(capture|snap|shoot|shutter|scan|take it|take the picture)\b/.test(said)) void capture();
        };
        rec.onend = () => {
          if (heard.current !== rec) return;
          try {
            rec.start();
          } catch {
            setVoiceOn(false);
          }
        };
        try {
          rec.start();
          heard.current = rec;
          setVoiceOn(true);
        } catch {
          setVoiceOn(false);
        }
      } else {
        setVoiceOn(false);
      }
    } catch {
      setCamError("Camera blocked in this view. Upload a photo instead.");
    }
  }

  async function capture() {
    if (!videoRef.current || busyRef.current) return;
    busyRef.current = true;
    try {
      const frame = await frameFromVideo(videoRef.current);
      stopCam();
      const matted = await cropToBlackMat(frame);
      if (scanLane === "deep" && useSession.getState().deepSide === "back") setDraftBack(matted);
      setDraftImage(matted);
      beginLookup();
      await runGrade(matted);
    } catch (e) {
      busyRef.current = false;
      toast.error(e instanceof Error ? e.message : "Capture failed");
    }
  }

  async function onFile(file: File | undefined) {
    if (!file || looking) return;
    try {
      const data = await compressForGrade(file);
      stopCam();
      const matted = await cropToBlackMat(data);
      if (scanLane === "deep" && useSession.getState().deepSide === "back") setDraftBack(matted);
      setDraftImage(matted);
      beginLookup();
      await runGrade(matted);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not read photo");
    }
  }

  async function runGrade(image: string) {
    if (ping && !ping.ok) {
      setError(ping.error ?? "Don Nico AI is offline. Verify the key first.");
      setLooking(false);
      busyRef.current = false;
      return;
    }
    setGrading(true);
    setError(null);
    try {
      const print = scanMode === "single" ? await cardPrint(image).catch(() => "") : "";
      const result = await gradeScan({ data: { image, mode: scanMode, print, lane: scanLane } });
      if (!result.ok) {
        setError(result.error);
        setGrading(false);
        setLooking(false);
        busyRef.current = false;
        return;
      }
      if (spotDoneRef.current) publish(result);
      else {
        pending.current = result;
        setGrading(false);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Grade request failed");
      setGrading(false);
      setLooking(false);
      busyRef.current = false;
    }
  }

  async function gradeSample() {
    try {
      const image = await fetchAsDataUrl("/sample/nico-vale-rookie.jpg");
      const matted = await cropToBlackMat(image);
      setDraftImage(matted);
      beginLookup();
      await runGrade(matted);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Sample failed");
      setGrading(false);
      setLooking(false);
    }
  }

  const copy =
    scanMode === "binder"
      ? "Nine cards in one frame. Each one is priced and filed into its sport."
      : "One card in the frame. Name, set, company, and the four prices.";

  return (
    <div className="fixed inset-0 z-30 flex flex-col bg-bg">
      <header className="flex items-center justify-between px-4 py-3">
        <button
          type="button"
          onClick={() => {
            stopCam();
            setLooking(false);
            setCameraLocked(false);
            resetDraft();
          }}
          disabled={looking && !spotDone}
          className="flex size-11 items-center justify-center rounded-md border border-border disabled:opacity-40"
          aria-label="Close scanner"
        >
          <X className="size-4" />
        </button>
        <div className="text-center">
          <p className="font-mono text-[0.62rem] uppercase tracking-[0.2em] text-accent">
            {scanLane === "deep" ? `Deep Core · ${side}` : scanMode === "binder" ? "Nine card" : "Single card"}
          </p>
          <p className="font-display text-lg uppercase tracking-[0.1em]">Capture</p>
        </div>
        <span className="w-11" />
      </header>

      <div className="flex flex-1 items-center justify-center px-4">
        <div className="relative aspect-[2.5/3.5] h-[min(62dvh,560px)] overflow-hidden bg-[#080808] shadow-[0_0_0_1px_#1c1c1f]">
          {draftImage ? (
            <img src={draftImage} alt="Captured card" className="absolute inset-0 size-full object-contain" />
          ) : (
            <video
              ref={videoRef}
              className={cn("absolute inset-0 size-full object-cover", !camOn && "hidden")}
              playsInline
              muted
            />
          )}
          {!draftImage && !camOn ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-6 text-center">
              <Camera className="size-8 text-accent" />
              <p className="max-w-xs text-sm text-muted">{copy}</p>
              {camError ? <p className="text-sm text-warn">{camError}</p> : null}
            </div>
          ) : null}
          <div className="pointer-events-none absolute inset-2 rounded-sm border border-accent/80">
            <span className="gms-corner gms-corner-tl" />
            <span className="gms-corner gms-corner-tr" />
            <span className="gms-corner gms-corner-bl" />
            <span className="gms-corner gms-corner-br" />
          </div>
          {grading && spotDone ? (
            <div className="absolute inset-x-0 bottom-3 flex justify-center">
              <span className="inline-flex items-center gap-2 rounded-md border border-accent/40 bg-bg/80 px-3 py-1.5 font-mono text-[0.7rem] uppercase tracking-[0.16em] text-accent">
                <Loader2 className="size-3.5 animate-spin" />
                Reading set and year
              </span>
            </div>
          ) : null}
        </div>
      </div>

      {error ? <p className="px-4 pt-3 text-center text-sm text-danger">{error}</p> : null}

      <div className="grid grid-cols-2 gap-2 p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={(e) => void onFile(e.target.files?.[0])}
        />
        {draftImage ? (
          <p className="col-span-2 text-center font-mono text-[0.62rem] uppercase tracking-[0.14em] text-muted">
            {spotDone ? "Commercial finished. Still reading the card." : "Commercial is playing while the card is read."}
          </p>
        ) : (
          <>
            <Button variant="secondary" onClick={() => (camOn ? void capture() : void startCam())} disabled={looking}>
              <Camera className="size-4" />
              {camOn ? "Capture" : "Camera"}
            </Button>
            <Button variant="secondary" onClick={() => fileRef.current?.click()}>
              <ImageUp className="size-4" />
              Upload
            </Button>
            {scanLane === "deep" ? null : (
              <Button className="col-span-2" variant="outline" onClick={() => void gradeSample()} disabled={grading}>
                Grade sample card
              </Button>
            )}
          </>
        )}
      </div>
      <p className="px-4 pb-3 text-center font-mono text-[0.62rem] uppercase tracking-[0.16em] text-subtle">
        {camOn
          ? voiceOn
            ? `2.5 × 3.5 ${scanLane === "deep" ? side : "frame"}. Say capture.`
            : "2.5 × 3.5 frame. Voice is off in this browser. Tap capture."
          : scanLane === "deep" && side === "back"
            ? "Front is filed. Capture the back. Another 60s spot plays while it is read."
            : scanLane === "deep"
              ? "Deep Core. Front first, then the back. 60s spot on each photo."
              : "Matte crop stays in the app. The key is only for live prices."}
      </p>
      {looking && !spotDone ? (
        <CommercialBreak
          seconds={scanLane === "deep" ? 60 : 15}
          placement={
            scanLane === "deep" ? (side === "back" ? "deep_back_60" : "deep_front_60") : "standard_scan_15"
          }
          kicker={scanLane === "deep" ? `Deep Core · ${side} · 60s` : "Standard · 15s"}
          detail={
            scanLane === "deep"
              ? `The ${side} is being read while this 60 second spot plays.`
              : "The card is priced while this 15 second spot plays."
          }
          onDone={finishSpot}
        />
      ) : null}
    </div>
  );
}
