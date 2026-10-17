import type { CardCategory, GradedCard } from "@/lib/grade-types";

/** Installed CGC guide. The price call gets a short copy of this. Identity stays in the app. */

export const CGC_CARD = [
  "CGC Cards Pristine 10: 50/50 centering, no flaw at 10x. Gold label. Not the same as a PSA 10.",
  "CGC Cards Gem Mint 10: overall 10, one trait short of Pristine. Closer to a PSA 10.",
  "CGC 9, 8, and 7 step down for centering, corners, edges, and surface.",
  "A visible PSA slab is priced as PSA. A visible CGC slab is priced as that CGC grade.",
].join(" ");

export const CGC_COMIC = [
  "CGC comics run 0.5 to 10.",
  "10 Gem Mint: no manufacturing or handling defect.",
  "9.9 Mint: one very minor manufacturing defect, no handling.",
  "9.8 NM/MT: negligible defects. 9.6 NM+: several minor defects.",
  "Page quality and restoration are separate from the number.",
].join(" ");

export const CGC_GAME = [
  "CGC Video Games grades sealed games, complete-in-box games, and consoles.",
  "Sealed is judged on the seal, the seam, the box crush, and the plastic.",
  "CIB needs the game, the box, and the manual. Loose is the disc or cartridge only.",
  "A console is loose, with cords, boxed, or sealed. A CGC sealed grade is not a loose price.",
].join(" ");

const DETAILS: { match: string; category: CardCategory | "any"; text: string }[] = [
  { match: "topps chrome", category: "baseball", text: "Topps Chrome is the chromium flagship. Refractors and rookies carry the price. A CGC Pristine 10 is stricter than a PSA 10." },
  { match: "bowman chrome", category: "baseball", text: "Bowman Chrome is the prospect chrome set. First Bowman cards are the key book. Grade the surface before the name." },
  { match: "topps", category: "baseball", text: "Flagship Topps. Series 1 and Series 2 share the name. The year on the back is the set year." },
  { match: "prizm", category: "any", text: "Panini Prizm is the silver-style retail and hobby line. The base, the silver, and the numbered parallel are different prices." },
  { match: "national treasures", category: "any", text: "National Treasures is the patch and on-card auto book. Low serial numbers move the price more than the name alone." },
  { match: "donruss optic", category: "any", text: "Donruss Optic is the chrome-stock Donruss line. Rated Rookie is the key subset, not a separate set." },
  { match: "young guns", category: "hockey", text: "Young Guns are the Upper Deck Series 1 and Series 2 rookies. The canvas variant is a different card." },
  { match: "amazing spider-man", category: "comic", text: "Amazing Spider-Man. Issue number is the key. A CGC 9.8 is the usual high-grade comic comp. 9.9 and 10.0 are a different market." },
  { match: "action comics", category: "comic", text: "Action Comics. Early issues are the Superman keys. Restored and unrestored copies are not the same CGC price." },
  { match: "batman", category: "comic", text: "Batman. Price the issue, not the word Batman. Key issues and first appearances outrun a normal issue at the same grade." },
  { match: "spawn", category: "comic", text: "Spawn number 1 is the Image key. Later issues are a different and usually lower market." },
  { match: "x-men", category: "comic", text: "X-Men. Giant-Size and issue 1 are not the same book as a modern issue. Use the printed issue number." },
  { match: "super mario", category: "game", text: "Super Mario. The platform decides the price. A sealed NES cart is not a loose Switch download." },
  { match: "legend of zelda", category: "game", text: "The Legend of Zelda. Complete-in-box needs the box and the manual. Loose is the cart or disc only." },
  { match: "pokemon", category: "game", text: "Pokemon games are not Pokemon cards. Price the platform and whether it is loose, complete, or sealed." },
  { match: "sonic", category: "game", text: "Sonic the Hedgehog. Genesis and later ports are separate markets. Sealed grading follows the CGC seal, not the label art." },
  { match: "playStation 5", category: "system", text: "PlayStation 5. Disc and digital editions are different. Boxed means the console box, not a game." },
  { match: "playstation 5", category: "system", text: "PlayStation 5. Disc and digital editions are different. Boxed means the console box, not a game." },
  { match: "switch", category: "system", text: "Nintendo Switch. The original, the OLED, and the Lite are different consoles. Price the model printed on the unit." },
  { match: "xbox series", category: "system", text: "Xbox Series. Series X and Series S are different prices. A sealed console is not a console with cords only." },
  { match: "nes", category: "system", text: "NES. The front-loader and the top-loader differ. A CIB console needs the box and the controllers that came with it." },
  { match: "genesis", category: "system", text: "Sega Genesis. Model 1, Model 2, and the CD add-on are different hardware." },
  { match: "game boy", category: "system", text: "Game Boy, Game Boy Color, and Game Boy Advance are three systems. Do not price them as one." },
];

export function cgcBrief(categories: Iterable<string>): string {
  const set = new Set(categories);
  const parts = [CGC_CARD];
  if ([...set].some((item) => item === "comic")) parts.push(CGC_COMIC);
  if ([...set].some((item) => item === "game" || item === "system")) parts.push(CGC_GAME);
  if (parts.length === 1 && [...set].some((item) => item === "tcg")) parts.push(CGC_CARD);
  return parts.join(" ");
}

export function cgcDetail(card: Pick<GradedCard, "subject" | "set" | "category">): string | null {
  const hay = `${card.subject} ${card.set}`.toLowerCase();
  const hit = DETAILS.find((row) => hay.includes(row.match) && (row.category === "any" || row.category === card.category));
  if (hit) return hit.text;
  if (card.category === "comic") return CGC_COMIC;
  if (card.category === "game" || card.category === "system") return CGC_GAME;
  return null;
}
