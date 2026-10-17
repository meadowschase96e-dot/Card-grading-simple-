const MALE = /male|david|daniel|alex|fred|james|guy|rishi|george|arthur|aaron|bruce|ralph|gordon|reed|christopher|andrew|brian|eric|albert|tom\b/i;
const FEMALE = /female|samantha|victoria|karen|moira|zira|susan|fiona|kate|serena|allison|ava|salli|nicky/i;
/** Rougher installed male voices. First match wins. */
const GRIT = [/fred/i, /ralph/i, /bruce/i, /albert/i, /daniel/i, /arthur/i, /gordon/i, /david/i];

function english(voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice[] {
  const en = voices.filter((voice) => /en/i.test(voice.lang));
  return en.length ? en : voices;
}

function maleOnly(list: SpeechSynthesisVoice[]): SpeechSynthesisVoice[] {
  return list.filter((voice) => MALE.test(voice.name) && !FEMALE.test(voice.name));
}

/** Device-installed male voice. No network and no API key. */
export function installedMaleVoice(): SpeechSynthesisVoice | null {
  if (typeof window === "undefined" || !window.speechSynthesis) return null;
  const voices = english(window.speechSynthesis.getVoices());
  const local = voices.filter((voice) => voice.localService);
  const pool = maleOnly(local).length ? maleOnly(local) : maleOnly(voices);
  for (const pattern of GRIT) {
    const hit = pool.find((voice) => pattern.test(voice.name));
    if (hit) return hit;
  }
  return pool[0] ?? local.find((voice) => !FEMALE.test(voice.name)) ?? null;
}

function utterance(text: string, tune?: { rate: number; pitch: number }): SpeechSynthesisUtterance {
  const voice = installedMaleVoice();
  const line = new SpeechSynthesisUtterance(text);
  if (voice) {
    line.voice = voice;
    line.lang = voice.lang;
  } else {
    line.lang = "en-US";
  }
  const gravel = voice && /fred|ralph|bruce|albert/i.test(voice.name);
  line.rate = tune?.rate ?? (gravel ? 0.9 : 0.86);
  line.pitch = tune?.pitch ?? (gravel ? 0.82 : 0.62);
  line.volume = 1;
  return line;
}

/** Queue spoken lines on the installed voice. */
export function speakInstalled(parts: string[], tune?: { rate: number; pitch: number; onStart?: () => void }) {
  if (typeof window === "undefined" || !window.speechSynthesis) return;
  const synth = window.speechSynthesis;
  const run = () => {
    synth.cancel();
    let started = false;
    for (const text of parts) {
      const line = text.trim();
      if (!line) continue;
      const spoken = utterance(line, tune);
      if (!started && tune?.onStart) {
        started = true;
        spoken.onstart = () => tune.onStart?.();
      }
      synth.speak(spoken);
    }
  };
  if (synth.getVoices().length === 0) {
    synth.addEventListener("voiceschanged", () => run(), { once: true });
    synth.getVoices();
    return;
  }
  run();
}

const GREETING = [
  "Thank you for doing the next generation in card grading. These are your valuables.",
  "Card Grading Simple offers a better price than raw mint pricing on today's market, with our Deep Core grade.",
  "Informed Deep Core scanning is far superior to other competitors' human error, and it is free to everyone, with a few short commercials.",
  "A slab will be returned, coded, blueprinted, and recorded, with a serial number and a downloadable certificate.",
  "Button links go to all major platforms for card sales, and to our live marketplace.",
  "Our marketplace showcases every newly listed C G S card, and listed cards from all major marketplaces.",
];

/** Older grit. One welcome when the vault opens. No API key. */
export function speakVaultGreeting(onStart?: () => void) {
  speakInstalled(GREETING, { rate: 0.78, pitch: 0.54, onStart });
}

export function stopInstalled() {
  window.speechSynthesis?.cancel();
}

type Heard = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
};

function listener(): Heard | null {
  if (typeof window === "undefined") return null;
  const host = window as Window & {
    SpeechRecognition?: new () => Heard;
    webkitSpeechRecognition?: new () => Heard;
  };
  const Ctor = host.SpeechRecognition ?? host.webkitSpeechRecognition;
  if (!Ctor) return null;
  const rec = new Ctor();
  rec.lang = "en-US";
  return rec;
}

/** One spoken command. The browser's installed recognizer. No API key. */
export function listenCommand(onText: (said: string) => void): { stop: () => void } | null {
  const rec = listener();
  if (!rec) return null;
  rec.continuous = false;
  rec.interimResults = false;
  rec.onresult = (event) => {
    const said = event.results[0]?.[0]?.transcript?.trim() ?? "";
    if (said) onText(said);
  };
  try {
    rec.start();
  } catch {
    return null;
  }
  return { stop: () => rec.stop() };
}

/** Read the card back: name, year, set, number, then the prices. */
export function speakCard(
  card: {
    subject: string;
    year: string;
    set: string;
    number: string;
    overall?: number;
    prices?: { rawMint: number | null; psa8: number | null; psa9: number | null; psa10: number | null } | null;
  },
  lane: "standard" | "deep" = "standard",
) {
  const bits = [card.subject, card.year, card.set, card.number ? `number ${card.number}` : ""].filter(Boolean);
  if (lane === "deep" && card.overall) bits.push(`grade ${card.overall}`);
  const prices = card.prices;
  if (lane !== "deep" && prices) {
    if (prices.rawMint) bits.push(`raw ${prices.rawMint} dollars`);
    if (prices.psa8) bits.push(`P S A 8, ${prices.psa8} dollars`);
    if (prices.psa9) bits.push(`P S A 9, ${prices.psa9} dollars`);
    if (prices.psa10) bits.push(`P S A 10, ${prices.psa10} dollars`);
  }
  if (bits.length) speakInstalled(bits);
}

