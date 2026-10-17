import { createRootRoute, HeadContent, Outlet, Scripts } from "@tanstack/react-router";
import { useEffect } from "react";
import { AuthProvider } from "@/lib/auth/provider";
import { PreviewHostBridge } from "@/components/preview-host-bridge";
import { AdTicker } from "@/components/ad-banner";
import { useSession } from "@/lib/session-store";
import { Toaster } from "sonner";
import appCss from "../styles.css?url";
import { ADMOB_APP_ID, ADMOB_PUBLISHER_ID, ANDROID_PACKAGE_NAME } from "@/lib/admob";

const APP_NAME = "Card Grading Simple";

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1, viewport-fit=cover" },
      { title: APP_NAME },
      {
        name: "description",
        content: "Scan. Grade. Vault. Forensic card grading powered by Don Nico AI.",
      },
      { name: "theme-color", content: "#080808" },
      { name: "google-adsense-account", content: ADMOB_PUBLISHER_ID },
      { name: "admob-app-id", content: ADMOB_APP_ID },
      { name: "android-package", content: ANDROID_PACKAGE_NAME },
    ],
    links: [
      { rel: "icon", type: "image/svg+xml", href: "/favicon.svg" },
      { rel: "stylesheet", href: appCss },
      { rel: "manifest", href: "/__grok/manifest.webmanifest" },
      { rel: "apple-touch-icon", href: "/__grok/icon-180.png" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
    ],
  }),
  component: () => (
    <html lang="en" className="dark antialiased" suppressHydrationWarning>
      <head>
        <HeadContent />
      </head>
      <body className="bg-bg text-fg font-sans">
        <PreviewHostBridge />
        <AppFonts />
        <AdChrome />
        <AuthProvider>
          <Outlet />
        </AuthProvider>
        <Toaster
          theme="dark"
          position="top-center"
          toastOptions={{
            style: {
              background: "#16161a",
              border: "1px solid #1c1c1f",
              color: "#ffffff",
              fontFamily: "IBM Plex Sans, sans-serif",
            },
          }}
        />
        <Scripts />
      </body>
    </html>
  ),
});

function AppFonts() {
  useEffect(() => {
    if (document.getElementById("gms-fonts")) return;
    const link = document.createElement("link");
    link.id = "gms-fonts";
    link.rel = "stylesheet";
    link.href =
      "https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@600;700&family=IBM+Plex+Mono:wght@500;600&family=IBM+Plex+Sans:wght@400;500;600&display=swap";
    document.head.appendChild(link);
  }, []);
  return null;
}

function AdChrome() {
  const adsReady = useSession((s) => s.adsReady);
  const cameraLocked = useSession((s) => s.cameraLocked);
  if (!adsReady || cameraLocked) return null;
  return <AdTicker />;
}
