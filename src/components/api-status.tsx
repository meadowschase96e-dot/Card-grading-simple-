import { useEffect } from "react";
import { RefreshCw, ShieldCheck, ShieldOff } from "lucide-react";
import { pingAi } from "@/lib/ai/actions";
import { useSession } from "@/lib/session-store";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function useAiPing(auto = true) {
  const ping = useSession((s) => s.ping);
  const pinging = useSession((s) => s.pinging);
  const setPing = useSession((s) => s.setPing);
  const setPinging = useSession((s) => s.setPinging);

  async function run() {
    setPinging(true);
    try {
      const result = await pingAi();
      setPing(result);
      return result;
    } catch (e) {
      const failed = {
        ok: false,
        hasKey: false,
        error: e instanceof Error ? e.message : "Ping failed",
        models: [] as string[],
        defaultModel: "grok-4.5",
        latencyMs: 0,
        checkedAt: Date.now(),
      };
      setPing(failed);
      return failed;
    }
  }

  useEffect(() => {
    if (!auto) return;
    if (ping) return;
    void run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auto]);

  return { ping, pinging, run };
}

export function ApiLiveButton({ className }: { className?: string }) {
  const { ping, pinging } = useAiPing(true);
  const setView = useSession((s) => s.setView);

  const live = ping?.ok === true;
  const known = ping !== null;

  return (
    <button
      type="button"
      onClick={() => setView("status")}
      className={cn(
        "inline-flex h-9 items-center gap-2 rounded-md border px-2.5",
        live ? "border-ok/30 bg-ok/10" : known ? "border-danger/30 bg-danger/10" : "border-border bg-elevated",
        className,
      )}
      aria-label="Don Nico AI status"
    >
      <span
        className={cn("gms-pulse", !known || pinging ? "gms-pulse-wait" : live ? "" : "gms-pulse-down")}
      />
      <span className="font-mono text-[0.62rem] uppercase tracking-[0.18em] text-fg">
        {pinging ? "PING" : live ? "LIVE" : known ? "DOWN" : "AI"}
      </span>
    </button>
  );
}

export function ApiStatusSheet() {
  const { ping, pinging, run } = useAiPing(true);
  const setView = useSession((s) => s.setView);
  const live = ping?.ok === true;

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-bg/80 p-4 sm:items-center">
      <div className="w-full max-w-md rounded-xl border border-border bg-surface p-5 shadow-[0_24px_80px_rgba(0,0,0,0.55)]">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <p className="font-display text-2xl uppercase tracking-[0.08em]">Don Nico AI</p>
            <p className="mt-1 text-sm text-muted">Key check against xAI. Nothing is stored. The key never leaves the server.</p>
          </div>
          {live ? <ShieldCheck className="size-5 text-ok" /> : <ShieldOff className="size-5 text-danger" />}
        </div>

        <dl className="grid grid-cols-2 gap-2 text-sm">
          <StatusCell label="Key" value={ping?.hasKey ? "Present" : "Missing"} />
          <StatusCell label="Handshake" value={live ? `HTTP ${ping?.status ?? 200}` : ping?.error ?? "—"} />
          <StatusCell label="Model" value={ping?.defaultModel ?? "grok-4.5"} />
          <StatusCell
            label="Latency"
            value={ping ? `${ping.latencyMs} ms` : pinging ? "Checking" : "—"}
          />
        </dl>

        {ping?.models?.length ? (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {ping.models
              .filter((m) => m.startsWith("grok-4"))
              .slice(0, 8)
              .map((m) => (
                <Badge key={m} variant={m === ping.defaultModel ? "accent" : "default"}>
                  {m}
                </Badge>
              ))}
          </div>
        ) : null}

        {!live && ping?.error ? (
          <p className="mt-3 text-sm text-danger">{ping.error}</p>
        ) : null}

        <div className="mt-5 flex gap-2">
          <Button variant="secondary" className="flex-1" onClick={() => setView("home")}>
            Close
          </Button>
          <Button className="flex-1" onClick={() => void run()} disabled={pinging}>
            <RefreshCw className={cn("size-4", pinging && "animate-spin")} />
            Verify
          </Button>
        </div>
      </div>
    </div>
  );
}

function StatusCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-border bg-elevated px-3 py-2.5">
      <dt className="font-mono text-[0.62rem] uppercase tracking-[0.16em] text-subtle">{label}</dt>
      <dd className="mt-1 truncate text-sm text-fg">{value}</dd>
    </div>
  );
}
