import { createServerClient } from "@supabase/ssr";
import { getCookies, setCookie } from "@tanstack/react-start/server";
import { supabaseKey, supabaseUrl } from "@/lib/supabase/env";

export function createClient() {
  return createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() {
        return Object.entries(getCookies()).map(([name, value]) => ({ name, value }));
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            setCookie(name, value, options);
          }
        } catch {
          // Called outside a request. Session refresh still works from middleware-style callers.
        }
      },
    },
  });
}
