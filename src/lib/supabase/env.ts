const FALLBACK_URL = "https://zymeviqbqxugktmizvtv.supabase.co";
const FALLBACK_KEY = "sb_publishable_klc2xzWccABhpST5U4lsXA_ToOuafej";

function read(name: "VITE_SUPABASE_URL" | "VITE_SUPABASE_PUBLISHABLE_KEY", fallback: string) {
  const fromVite =
    typeof import.meta !== "undefined" && import.meta.env
      ? (import.meta.env[name] as string | undefined)
      : undefined;
  const fromNode = typeof process !== "undefined" ? process.env[name] : undefined;
  const value = (fromVite || fromNode || "").trim();
  return value || fallback;
}

/** Card Grading Simple project. Env overrides this when the host injects one. */
export const supabaseUrl = read("VITE_SUPABASE_URL", FALLBACK_URL);
export const supabaseKey = read("VITE_SUPABASE_PUBLISHABLE_KEY", FALLBACK_KEY);
