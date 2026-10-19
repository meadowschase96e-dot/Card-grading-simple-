const FEMALE =
  /female|samantha|victoria|karen|moira|zira|susan|fiona|kate|serena|allison|ava|salli|nicky|sara|joanna|kendra|ivy|emma|amy|olivia|sophie|tessa|veena|google us english|english united states|english \(united states\)|en-us-x-sfg|en-us-x-iob|en-gb-x-gba|en-gb-x-gbb/i;
const NOVELTY =
  /fred|ralph|albert|bahh|bells|boing|bubbles|wobble|zarvox|trinoids|whisper|superstar|organ|cellos|junior|good news|pipe organ/i;
const NATURAL: Array<[RegExp, number]> = [
  [/guy|david|mark|christopher|andrew/i, 60],
  [/brian|eric|tony|james|george/i, 44],
  [/en-us-x-iom|en-us-x-tpd|en-us-x-iog|en-gb-x-rjs|en-gb-x-gbd|standard-[bdij]|wavenet-[abdij]|neural2-[dij]/i, 50],
  [/alex|aaron|nathan|evan|ryan/i, 24],
  [/daniel|google uk english male|arthur|gordon|rishi|tom\b/i, 16],
  [/\bmale\b/i, 12],
];

function english(voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice[] {
  return voices.filter((voice) => /en/i.test(voice.lang));
}

function maleScore(voice: SpeechSynthesisVoice): number {
  const label = `${voice.name} ${voice.voiceURI}`;
  if (FEMALE.test(label) || NOVELTY.test(label)) return -1;
  let score = 0;
  for (const [pattern, points] of NATURAL) {
    if (pattern.test(label)) score = Math.max(score, points);
  }
  if (score === 0) return 0;
  if (/enhanced|premium|neural|online/i.test(label)) score += 8;
  if (/en-US|en_US/i.test(voice.lang)) score += 4;
  return score;
}

/** The male voice only. The female voice is not used. */
export function installedMaleVoice(): SpeechSynthesisVoice | null {
  if (typeof window === "undefined" || !window.speechSynthesis) return null;
  const ranked = english(window.speechSynthesis.getVoices())
    .map((voice) => ({ voice, score: maleScore(voice) }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score);
  return ranked[0]?.voice ?? null;
}

function utterance(text: string): SpeechSynthesisUtterance | null {
  const voice = installedMaleVoice();
  if (!voice || FEMALE.test(`${voice.name} ${voice.voiceURI}`)) return null;
  const line = new SpeechSynthesisUtterance(text);
  line.voice = voice;
  line.lang = voice.lang;
  line.rate = 0.95;
  line.pitch = 0.92;
  line.volume = 1;
  return line;
}

function sentences(parts: string[]): string[] {
  return parts
    .flatMap((part) => part.split(/(?<=[.!?])\s+/))
    .map((line) => line.trim())
    .filter(Boolean);
}

let spokenTurn = 0;
let clip: HTMLAudioElement | null = null;

/** Queue every line on the male voice. */
export function speakInstalled(parts: string[], tune?: { rate?: number; pitch?: number; onStart?: () => void }) {
  if (typeof window === "undefined" || !window.speechSynthesis) return;
  const synth = window.speechSynthesis;
  const lines = sentences(parts);
  if (!lines.length) return;
  const mine = ++spokenTurn;
  const run = () => {
    if (mine !== spokenTurn) return;
    if (clip) {
      clip.pause();
      clip = null;
    }
    const queue = () => {
      if (mine !== spokenTurn) return;
      lines.forEach((text, index) => {
        const spoken = utterance(text);
        if (!spoken) return;
        if (tune?.rate) spoken.rate = tune.rate;
        if (tune?.pitch) spoken.pitch = tune.pitch;
        if (index === 0 && tune?.onStart) spoken.onstart = () => tune.onStart?.();
        synth.speak(spoken);
      });
    };
    if (synth.speaking || synth.pending) {
      synth.cancel();
      window.setTimeout(queue, 50);
      return;
    }
    queue();
  };
  synth.getVoices();
  if (synth.getVoices().length > 0) {
    run();
    return;
  }
  synth.addEventListener("voiceschanged", () => run(), { once: true });
}

const GREETING = [
  "Thank you for doing the next generation in card grading. These are your valuables.",
  "Card Grading Simple offers a better price than raw mint pricing on today's market, with our Deep Core grade.",
  "Informed Deep Core scanning is far superior to other competitors' human error, and it is free to everyone, with a few short commercials.",
  "A slab will be returned, coded, blueprinted, and recorded, with a serial number and a downloadable certificate.",
  "Button links go to all major platforms for card sales, and to our live marketplace.",
  "Our marketplace showcases every newly listed C G S card, and listed cards from all major marketplaces.",
];

/** Male voice when the main page opens. Recording first. Phone male voice if that cannot play. Never a female voice. */
export function speakVaultGreeting(onStart?: () => void) {
  if (typeof window === "undefined") return;
  stopInstalled();
  const audio = new Audio("/voice/greeting.mp3");
  clip = audio;
  audio.onplay = () => onStart?.();
  void audio.play().catch(() => undefined);
}

export function stopInstalled() {
  spokenTurn += 1;
  if (clip) {
    clip.pause();
    clip = null;
  }
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

