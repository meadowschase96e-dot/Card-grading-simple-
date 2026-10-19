import { createServerFn } from "@tanstack/react-start";
import { supabaseKey, supabaseUrl } from "@/lib/supabase/env";

export const supabaseStatus = createServerFn({ method: "GET" }).handler(async () => {
  const project = supabaseUrl.replace(/^https:\/\//, "").split(".")[0] ?? "";
  if (!supabaseUrl || !supabaseKey) {
    return { ok: false as const, project, error: "Supabase is not configured." };
  }
  const { createClient } = await import("./session");
  const supabase = createClient();
  const { error } = await supabase.auth.getSession();
  if (error) return { ok: false as const, project, error: error.message };
  return { ok: true as const, project, error: "" };
});
