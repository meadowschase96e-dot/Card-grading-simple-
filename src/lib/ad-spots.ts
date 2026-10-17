export type AdSpot = "standard" | "deep";

export const AD_SPOTS: { id: AdSpot; label: string }[] = [
  { id: "standard", label: "Standard" },
  { id: "deep", label: "Deep Core" },
];

let spot: AdSpot = "standard";

export function peekSpot(): AdSpot {
  return spot;
}

export function flipSpot(): AdSpot {
  spot = spot === "standard" ? "deep" : "standard";
  return spot;
}

export function spotLabel(id: AdSpot): string {
  return AD_SPOTS.find((item) => item.id === id)?.label ?? "Standard";
}
