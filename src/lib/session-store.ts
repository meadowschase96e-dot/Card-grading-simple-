import { create } from "zustand";
import type { GradeResponse, PingResult } from "@/lib/grade-types";

export type ScanMode = "single" | "binder";
export type ScanLane = "standard" | "deep";
export type View = "home" | "scan" | "report" | "status";

type SessionState = {
  view: View;
  scanMode: ScanMode;
  scanLane: ScanLane;
  draftBack: string | null;
  targetSlot: number | null;
  draftImage: string | null;
  draftResult: GradeResponse | null;
  selectedIndex: number;
  grading: boolean;
  error: string | null;
  ping: PingResult | null;
  pinging: boolean;
  cameraLocked: boolean;
  adsReady: boolean;
  deepSide: "front" | "back";
  deepFrontImage: string | null;
  deepFrontResult: GradeResponse | null;
  setView: (view: View) => void;
  openScan: (mode: ScanMode, slot?: number | null) => void;
  openDeep: () => void;
  setDraftImage: (image: string | null) => void;
  setDraftBack: (image: string | null) => void;
  setGrading: (grading: boolean) => void;
  setError: (error: string | null) => void;
  setResult: (result: GradeResponse | null) => void;
  setSelectedIndex: (index: number) => void;
  setPing: (ping: PingResult | null) => void;
  setPinging: (pinging: boolean) => void;
  setCameraLocked: (locked: boolean) => void;
  setAdsReady: (ready: boolean) => void;
  resetDraft: () => void;
};

export const useSession = create<SessionState>((set) => ({
  view: "home",
  scanMode: "single",
  scanLane: "standard",
  draftBack: null,
  targetSlot: null,
  draftImage: null,
  draftResult: null,
  selectedIndex: 0,
  grading: false,
  error: null,
  ping: null,
  pinging: false,
  cameraLocked: false,
  adsReady: false,
  deepSide: "front",
  deepFrontImage: null,
  deepFrontResult: null,
  setView: (view) => set({ view }),
  openScan: (mode, slot = null) =>
    set({
      view: "scan",
      scanMode: mode,
      targetSlot: typeof slot === "number" ? slot : null,
      scanLane: "standard",
      draftImage: null,
      draftBack: null,
      draftResult: null,
      selectedIndex: 0,
      error: null,
      grading: false,
      deepSide: "front",
      deepFrontImage: null,
      deepFrontResult: null,
    }),
  openDeep: () =>
    set({
      view: "scan",
      scanMode: "single",
      scanLane: "deep",
      targetSlot: null,
      draftImage: null,
      draftBack: null,
      draftResult: null,
      selectedIndex: 0,
      error: null,
      grading: false,
      cameraLocked: false,
      deepSide: "front",
      deepFrontImage: null,
      deepFrontResult: null,
    }),
  setDraftImage: (draftImage) => set({ draftImage }),
  setDraftBack: (draftBack) => set({ draftBack }),
  setGrading: (grading) => set({ grading }),
  setError: (error) => set({ error }),
  setResult: (draftResult) =>
    set({
      draftResult,
      view: draftResult ? "report" : "scan",
      selectedIndex: 0,
      grading: false,
      error: null,
    }),
  setSelectedIndex: (selectedIndex) => set({ selectedIndex }),
  setPing: (ping) => set({ ping, pinging: false }),
  setPinging: (pinging) => set({ pinging }),
  setCameraLocked: (cameraLocked) => set({ cameraLocked }),
  setAdsReady: (adsReady) => set({ adsReady }),
  resetDraft: () =>
    set({
      view: "home",
      scanLane: "standard",
      draftImage: null,
      draftBack: null,
      draftResult: null,
      selectedIndex: 0,
      grading: false,
      error: null,
      targetSlot: null,
      cameraLocked: false,
      deepSide: "front",
      deepFrontImage: null,
      deepFrontResult: null,
    }),
}));
