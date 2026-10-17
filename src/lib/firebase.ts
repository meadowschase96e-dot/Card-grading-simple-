import { useEffect, useState } from "react";

export type FirebasePublicConfig = {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
};

function read(name: string): string {
  const env = import.meta.env as Record<string, string | undefined>;
  return env[name]?.trim() ?? "";
}

/** Public web config. Empty until the Firebase console values are set. */
export function firebasePublicConfig(): FirebasePublicConfig | null {
  const apiKey = read("VITE_FIREBASE_API_KEY");
  const authDomain = read("VITE_FIREBASE_AUTH_DOMAIN");
  const projectId = read("VITE_FIREBASE_PROJECT_ID");
  const storageBucket = read("VITE_FIREBASE_STORAGE_BUCKET");
  const messagingSenderId = read("VITE_FIREBASE_MESSAGING_SENDER_ID");
  const appId = read("VITE_FIREBASE_APP_ID");
  if (!apiKey || !authDomain || !projectId || !appId) return null;
  return { apiKey, authDomain, projectId, storageBucket, messagingSenderId, appId };
}

export function useFirebaseProject(): { ready: boolean; projectId: string; error: string | null } {
  const projectId = firebasePublicConfig()?.projectId ?? "";
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const config = firebasePublicConfig();
    if (!config) return;
    let cancel = false;
    void (async () => {
      try {
        const { getApps, initializeApp } = await import("firebase/app");
        if (getApps().length === 0) initializeApp(config);
      } catch (err) {
        if (!cancel) setError(err instanceof Error ? err.message : "Firebase did not start.");
      }
    })();
    return () => {
      cancel = true;
    };
  }, [projectId]);

  return { ready: Boolean(projectId) && !error, projectId, error };
}
