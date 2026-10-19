/** Android application id. Use this in AdMob and the Play listing. */
export const ANDROID_PACKAGE_NAME = "com.donnico.gradingmadesimple";

/** AdMob application id. Public. Ad unit ids use a slash. */
export const ADMOB_APP_ID = "ca-app-pub-7153024616679706~1734392603";

export const ADMOB_PUBLISHER_ID = "ca-pub-7153024616679706";

/**
 * The only banner unit supplied for this app.
 * Every banner placement requests this unit. No other unit ids were issued.
 */
export const ADMOB_BANNER_UNIT = "ca-app-pub-7153024616679706/2132480876";

/** @deprecated Use ADMOB_BANNER_UNIT. Kept so older chat imports still resolve. */
export const ADMOB_CHAT_UNIT = ADMOB_BANNER_UNIT;

export const ADMOB_BANNER_SLOT = "2132480876";

export type PlacementId =
  | "ticker_15"
  | "carousel_30"
  | "vault_gate_30"
  | "standard_scan_15"
  | "deep_front_60"
  | "deep_back_60"
  | "chat_every_4"
  | "chat_box";

export type AdFormat = "banner" | "commercial";

export type Placement = {
  id: PlacementId;
  label: string;
  format: AdFormat;
  seconds: number;
  pages: string;
};

/** Every surface that earns. Banner rows share the one live unit. */
export const PLACEMENTS: readonly Placement[] = [
  { id: "ticker_15", label: "Bottom ticker", format: "banner", seconds: 15, pages: "Every page after the vault opens" },
  { id: "carousel_30", label: "Top carousel", format: "banner", seconds: 30, pages: "Every page. Locks on the camera until the shot" },
  { id: "vault_gate_30", label: "Vault gate", format: "commercial", seconds: 30, pages: "Before the vault" },
  { id: "standard_scan_15", label: "Standard scan", format: "commercial", seconds: 15, pages: "One-card and nine-card scan" },
  { id: "deep_front_60", label: "Deep Core front", format: "commercial", seconds: 60, pages: "Deep Core front photo" },
  { id: "deep_back_60", label: "Deep Core back", format: "commercial", seconds: 60, pages: "Deep Core back photo" },
  { id: "chat_every_4", label: "Chat every 4 questions", format: "banner", seconds: 0, pages: "Grade chat" },
  { id: "chat_box", label: "Chat box", format: "banner", seconds: 0, pages: "Grade chat composer" },
];

export function placementById(id: PlacementId): Placement {
  const found = PLACEMENTS.find((item) => item.id === id);
  if (!found) throw new Error(`Unknown placement ${id}`);
  return found;
}
