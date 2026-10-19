import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { ApiLiveButton, ApiStatusSheet, useAiPing } from "@/components/api-status";
import { Portfolio } from "@/components/binder-grid";
import { GradeReport, VaultItemReport } from "@/components/grade-report";
import { GradeChat } from "@/components/grade-chat";
import { GmsMark } from "@/components/gms-mark";
import { ScanStage } from "@/components/scan-stage";
import { AdCarousel } from "@/components/ad-carousel";
import { CommercialBreak } from "@/components/commercial-break";
import { LoginScreen } from "@/components/login-screen";
import { UserButton } from "@/lib/auth/gates";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { useSession } from "@/lib/session-store";
import { bindVaultUser, useVault, VAULT_AD_KEY } from "@/lib/vault-store";
import { armDeskBack, watchDeskBack } from "@/lib/desk-back";
import { cropToBlackMat } from "@/lib/image";
import { speakVaultGreeting } from "@/lib/voice";
import { supabaseStatus } from "@/lib/supabase/server";

export const Route = createFileRoute("/")({ component: Home });

function Home() {
  const { user, isPending } = useCurrentUserState();
  const [gate, setGate] = useState<"unknown" | "play" | "clear">("unknown");

  useEffect(() => {
    if (!user?.id) return;
    bindVaultUser(user.id);
    setGate(sessionStorage.getItem(VAULT_AD_KEY) === user.id ? "clear" : "play");
  }, [user?.id]);

  if (isPending) return <BootShell label="Opening the vault" />;
  if (!user) return <LoginScreen />;
  if (gate === "unknown") return <BootShell label="Opening the vault" />;
  if (gate === "play") {
    return (
      <CommercialBreak
        kicker="Vault commercial · 30s"
        detail="The vault stays locked until both 15s spots finish."
        placement="vault_gate_30"
        onDone={() => {
          sessionStorage.setItem(VAULT_AD_KEY, user.id);
          setGate("clear");
        }}
      />
    );
  }
  return <VaultDesk />;
}

function BootShell({ label }: { label: string }) {
  return (
    <main className="gms-grid-bg flex min-h-dvh flex-col items-center justify-center gap-3 px-6 text-center">
      <GmsMark />
      <h1 className="font-display text-3xl uppercase tracking-[0.06em]">Card Grading Simple</h1>
      <p className="font-mono text-[0.65rem] uppercase tracking-[0.18em] text-muted">{label}</p>
    </main>
  );
}

function VaultDesk() {
  useAiPing(true);
  const view = useSession((s) => s.view);
  const openScan = useSession((s) => s.openScan);
  const openDeep = useSession((s) => s.openDeep);
  const draftImage = useSession((s) => s.draftImage);
  const draftResult = useSession((s) => s.draftResult);
  const ping = useSession((s) => s.ping);
  const items = useVault((s) => s.items);
  const adsReady = useSession((s) => s.adsReady);
  const setAdsReady = useSession((s) => s.setAdsReady);
  const [openVaultId, setOpenVaultId] = useState<string | null>(null);
  const [chatOpen, setChatOpen] = useState(false);
  const [dbNote, setDbNote] = useState<string | null>(null);
  const vaultItem = items.find((i) => i.id === openVaultId) ?? null;
  const away = view !== "home" || Boolean(openVaultId) || chatOpen;

  useEffect(() => {
    if (away) armDeskBack();
  }, [away]);

  useEffect(
    () =>
      watchDeskBack(() => {
        useSession.getState().resetDraft();
        setOpenVaultId(null);
        setChatOpen(false);
        window.dispatchEvent(new Event("gms-home"));
      }),
    [],
  );

  useEffect(() => {
    let cancel = false;
    const run = () => {
      const pending = useVault.getState().items.filter((item) => !item.mat);
      void (async () => {
        for (const item of pending) {
          if (cancel) return;
          try {
            const image = await cropToBlackMat(item.image, item.card.bbox);
            if (!cancel) useVault.getState().replaceImage(item.id, image);
          } catch {
            if (!cancel) useVault.getState().replaceImage(item.id, item.image);
          }
        }
      })();
    };
    if (useVault.persist.hasHydrated()) run();
    const unsub = useVault.persist.onFinishHydration(run);
    return () => {
      cancel = true;
      unsub();
    };
  }, []);

  useEffect(() => {
    const show = view === "home" && !openVaultId;
    setAdsReady(show);
    return () => setAdsReady(false);
  }, [view, openVaultId, setAdsReady]);

  useEffect(() => {
    void supabaseStatus().then((status) => {
      setDbNote(status.ok ? "" : status.error);
    });
  }, []);

  useEffect(() => {
    if (sessionStorage.getItem("gms-greet") === "1") return;
    const mark = () => sessionStorage.setItem("gms-greet", "1");
    speakVaultGreeting(mark);
    const onGesture = () => {
      if (sessionStorage.getItem("gms-greet") === "1") return;
      speakVaultGreeting(mark);
    };
    window.addEventListener("pointerdown", onGesture);
    return () => window.removeEventListener("pointerdown", onGesture);
  }, []);

  return (
    <main
      className={`gms-grid-bg min-h-dvh ${adsReady ? "pb-[100px]" : ""}`}
    >
      <div className="mx-auto max-w-5xl px-4 pb-10 sm:px-6">
        <div className={`sticky top-0 z-20 -mx-4 bg-bg px-4 sm:-mx-6 sm:px-6 ${adsReady ? "pt-[max(0.5rem,env(safe-area-inset-top))]" : "pt-4"}`}>
          <header className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <GmsMark />
              <div>
                <p className="font-mono text-[0.62rem] uppercase tracking-[0.2em] text-accent">Don Nico AI</p>
                <h1 className="font-display text-2xl uppercase leading-none tracking-[0.06em] sm:text-3xl">
                  Card Grading Simple
                </h1>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-2 [&_.text-sm]:max-w-[7rem] [&_.text-sm]:truncate">
              <ApiLiveButton />
              <UserButton />
            </div>
          </header>

          <p className="mt-4 max-w-lg pb-3 text-sm text-muted">
            Open a sport or a marketplace. Scan only when you want a new card.
          </p>
          {adsReady ? <AdCarousel mode="banner" /> : null}
        </div>

        {dbNote ? <p className="mt-3 text-sm text-danger">{dbNote}</p> : null}
        {ping && !ping.ok ? (
          <p className="mt-3 text-sm text-danger">
            {ping.error ?? "Don Nico AI is offline."} Open the LIVE badge to verify the key.
          </p>
        ) : null}

        <div className="mt-8">
          {chatOpen ? (
            <GradeChat items={items} onClose={() => setChatOpen(false)} />
          ) : (
            <Portfolio
              selectedId={openVaultId}
              onOpenItem={(id) => setOpenVaultId(id)}
              onScan={() => openScan("single")}
              onNine={() => openScan("binder")}
              onDeep={() => openDeep()}
              onChat={() => setChatOpen(true)}
            />
          )}
          <p className="mt-8 text-center font-mono text-[0.62rem] uppercase tracking-[0.22em] text-subtle">
            Veritas · Fides · Honos
          </p>
        </div>
      </div>

      {view === "scan" ? <ScanStage /> : null}
      {view === "report" && draftResult && (draftImage || draftResult.cards.length > 0) ? (
        <GradeReport image={draftImage ?? ""} result={draftResult} />
      ) : null}
      {view === "status" ? <ApiStatusSheet /> : null}
      {vaultItem ? <VaultItemReport item={vaultItem} onClose={() => setOpenVaultId(null)} /> : null}
    </main>
  );
}
