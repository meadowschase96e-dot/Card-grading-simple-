import { useState, type FormEvent } from "react";
import { useRouter } from "@tanstack/react-router";
import { GROK_PROVIDERS, authClient, authEnabled, signIn } from "@/lib/auth/client";
import { GmsMark } from "@/components/gms-mark";
import { Button } from "@/components/ui/button";
import { VAULT_AD_KEY } from "@/lib/vault-store";
import { useFirebaseProject } from "@/lib/firebase";

export function LoginScreen() {
  const router = useRouter();
  const [mode, setMode] = useState<"register" | "signin">("register");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const firebase = useFirebaseProject();

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!email.includes("@") || password.length < 8) {
      setError("Use a real email and a password of at least 8 characters.");
      return;
    }
    if (mode === "register" && name.trim().length < 2) {
      setError("Name the account.");
      return;
    }
    setBusy(true);
    try {
      const result =
        mode === "register"
          ? await authClient.signUp.email({ email, password, name: name.trim() })
          : await authClient.signIn.email({ email, password });
      if (result.error) {
        setError(result.error.message ?? "That account could not be opened.");
        setBusy(false);
        return;
      }
      sessionStorage.removeItem(VAULT_AD_KEY);
      await router.navigate({ to: "/" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign-in failed.");
      setBusy(false);
    }
  }

  return (
    <main className="gms-grid-bg flex min-h-dvh flex-col px-4 py-8">
      <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center">
        <div className="mb-8 flex items-center gap-3">
          <GmsMark />
          <div>
            <p className="font-mono text-[0.62rem] uppercase tracking-[0.2em] text-accent">Don Nico AI</p>
            <h1 className="font-display text-3xl uppercase leading-none tracking-[0.06em]">Sign in</h1>
          </div>
        </div>

        <p className="mb-5 text-sm text-muted">
          Register an email account. A 30-second commercial plays before the vault opens.
        </p>

        {authEnabled ? (
          <form onSubmit={(e) => void submit(e)} className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setMode("register")}
                className={`h-11 rounded-md border font-mono text-[0.65rem] uppercase tracking-[0.16em] ${mode === "register" ? "border-accent text-accent" : "border-border text-muted"}`}
              >
                Register
              </button>
              <button
                type="button"
                onClick={() => setMode("signin")}
                className={`h-11 rounded-md border font-mono text-[0.65rem] uppercase tracking-[0.16em] ${mode === "signin" ? "border-accent text-accent" : "border-border text-muted"}`}
              >
                Sign in
              </button>
            </div>

            {mode === "register" ? (
              <label className="block">
                <span className="font-mono text-[0.62rem] uppercase tracking-[0.16em] text-subtle">Name</span>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  autoComplete="name"
                  className="mt-1 h-12 w-full rounded-md border border-border bg-surface px-3 text-base text-fg outline-none focus:border-accent"
                />
              </label>
            ) : null}

            <label className="block">
              <span className="font-mono text-[0.62rem] uppercase tracking-[0.16em] text-subtle">Email</span>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                required
                className="mt-1 h-12 w-full rounded-md border border-border bg-surface px-3 text-base text-fg outline-none focus:border-accent"
              />
            </label>

            <label className="block">
              <span className="font-mono text-[0.62rem] uppercase tracking-[0.16em] text-subtle">Password</span>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete={mode === "register" ? "new-password" : "current-password"}
                required
                minLength={8}
                className="mt-1 h-12 w-full rounded-md border border-border bg-surface px-3 text-base text-fg outline-none focus:border-accent"
              />
            </label>

            {error ? <p className="text-sm text-danger">{error}</p> : null}

            <Button type="submit" size="lg" className="w-full" disabled={busy}>
              {busy ? "Opening…" : mode === "register" ? "Create account" : "Enter"}
            </Button>
          </form>
        ) : (
          <p className="text-sm text-muted">Sign-in is disabled.</p>
        )}

        <div className="my-6 flex items-center gap-3">
          <span className="h-px flex-1 bg-border" />
          <span className="font-mono text-[0.6rem] uppercase tracking-[0.16em] text-subtle">or</span>
          <span className="h-px flex-1 bg-border" />
        </div>

        <div className="space-y-2">
          {GROK_PROVIDERS.map((p) => (
            <button
              key={p.providerId}
              type="button"
              onClick={() => {
                setError(null);
                setBusy(true);
                sessionStorage.removeItem(VAULT_AD_KEY);
                void signIn(p.providerId, { callbackURL: "/" }).catch((err: unknown) => {
                  setBusy(false);
                  setError(err instanceof Error ? err.message : "Google sign-in did not open.");
                });
              }}
              disabled={busy}
              className="h-12 w-full rounded-md border border-border bg-surface font-mono text-[0.7rem] uppercase tracking-[0.14em] text-fg"
            >
              Continue with {p.label}
            </button>
          ))}
        </div>
        <p className="mt-4 text-center font-mono text-[0.6rem] uppercase tracking-[0.14em] text-subtle">
          {firebase.error
            ? "Firebase did not start"
            : firebase.ready
              ? `Firebase · ${firebase.projectId}`
              : "Firebase is not linked yet"}
        </p>
      </div>
    </main>
  );
}
