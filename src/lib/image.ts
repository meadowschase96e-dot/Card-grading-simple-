import type { BBox } from "@/lib/grade-types";

const MAX_EDGE_GRADE = 1280;
const MAT = "#080808";
const INDEX_W = 560;
const INDEX_H = 784;

type Rect = { x: number; y: number; w: number; h: number };

function load(src: string | Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Could not read image"));
    if (typeof src === "string") {
      img.src = src;
    } else {
      img.src = URL.createObjectURL(src);
    }
  });
}

async function toJpeg(
  source: CanvasImageSource,
  width: number,
  height: number,
  maxEdge: number,
  quality: number,
): Promise<string> {
  const scale = Math.min(1, maxEdge / Math.max(width, height));
  const w = Math.max(1, Math.round(width * scale));
  const h = Math.max(1, Math.round(height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas unavailable");
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(source, 0, 0, w, h);
  return canvas.toDataURL("image/jpeg", quality);
}

export async function compressForGrade(input: Blob | string): Promise<string> {
  if (typeof input !== "string" && input.size > 12_582_912) {
    throw new Error("Image is too large. Use a photo under 12 MB.");
  }
  const img = await load(input);
  try {
    return await toJpeg(img, img.naturalWidth, img.naturalHeight, MAX_EDGE_GRADE, 0.82);
  } finally {
    if (typeof input !== "string") URL.revokeObjectURL(img.src);
  }
}

export async function frameFromVideo(video: HTMLVideoElement): Promise<string> {
  return toJpeg(video, video.videoWidth || 1280, video.videoHeight || 720, MAX_EDGE_GRADE, 0.82);
}

export async function fetchAsDataUrl(path: string): Promise<string> {
  const res = await fetch(path);
  if (!res.ok) throw new Error("Sample card missing");
  return compressForGrade(await res.blob());
}

function clampRect(rect: Rect, iw: number, ih: number): Rect {
  const x = Math.max(0, Math.min(iw - 1, rect.x));
  const y = Math.max(0, Math.min(ih - 1, rect.y));
  return {
    x,
    y,
    w: Math.max(1, Math.min(iw - x, rect.w)),
    h: Math.max(1, Math.min(ih - y, rect.h)),
  };
}

function expand(rect: Rect, iw: number, ih: number, pad: number): Rect {
  const px = rect.w * pad;
  const py = rect.h * pad;
  return clampRect(
    {
      x: rect.x - px,
      y: rect.y - py,
      w: rect.w + px * 2,
      h: rect.h + py * 2,
    },
    iw,
    ih,
  );
}

function bboxRect(bbox: BBox | undefined, iw: number, ih: number): Rect | null {
  if (!bbox) return null;
  const rect = {
    x: bbox.x * iw,
    y: bbox.y * ih,
    w: bbox.w * iw,
    h: bbox.h * ih,
  };
  if (![rect.x, rect.y, rect.w, rect.h].every(Number.isFinite)) return null;
  if (rect.w < iw * 0.08 || rect.h < ih * 0.08) return null;
  if (rect.w > iw * 0.98 && rect.h > ih * 0.98) return null;
  return expand(clampRect(rect, iw, ih), iw, ih, 0.025);
}

function detectCardBounds(data: Uint8ClampedArray, iw: number, ih: number): Rect {
  const step = 3;
  const colHits = new Uint16Array(iw);
  const rowHits = new Uint16Array(ih);
  let total = 0;
  for (let y = 0; y < ih; y += step) {
    for (let x = 0; x < iw; x += step) {
      const i = (y * iw + x) * 4;
      const r = data[i] ?? 0;
      const g = data[i + 1] ?? 0;
      const b = data[i + 2] ?? 0;
      const max = r > g ? (r > b ? r : b) : g > b ? g : b;
      const min = r < g ? (r < b ? r : b) : g < b ? g : b;
      const lum = (r * 54 + g * 183 + b * 19) >> 8;
      const sat = max === 0 ? 0 : (max - min) / max;
      if (lum > 32 || sat > 0.22) {
        rowHits[y] = (rowHits[y] ?? 0) + 1;
        colHits[x] = (colHits[x] ?? 0) + 1;
        total += 1;
      }
    }
  }
  if (total < 40) return { x: 0, y: 0, w: iw, h: ih };
  const rowNeed = Math.max(2, Math.floor(iw / step / 30));
  const colNeed = Math.max(2, Math.floor(ih / step / 30));
  let minX = iw;
  let minY = ih;
  let maxX = 0;
  let maxY = 0;
  for (let y = 0; y < ih; y += step) {
    if ((rowHits[y] ?? 0) < rowNeed) continue;
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
  }
  for (let x = 0; x < iw; x += step) {
    if ((colHits[x] ?? 0) < colNeed) continue;
    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
  }
  if (maxX <= minX || maxY <= minY) return { x: 0, y: 0, w: iw, h: ih };
  return expand(clampRect({ x: minX, y: minY, w: maxX - minX, h: maxY - minY }, iw, ih), iw, ih, 0.02);
}

/** Crop one card and center it on a matte-black 5:7 index plate. */
export async function cropToBlackMat(dataUrl: string, bbox?: BBox): Promise<string> {
  const img = await load(dataUrl);
  const iw = img.naturalWidth;
  const ih = img.naturalHeight;
  const src = document.createElement("canvas");
  src.width = iw;
  src.height = ih;
  const sctx = src.getContext("2d", { willReadFrequently: true });
  if (!sctx) throw new Error("Canvas unavailable");
  sctx.drawImage(img, 0, 0);
  const rect = bboxRect(bbox, iw, ih) ?? detectCardBounds(sctx.getImageData(0, 0, iw, ih).data, iw, ih);
  const out = document.createElement("canvas");
  out.width = INDEX_W;
  out.height = INDEX_H;
  const octx = out.getContext("2d");
  if (!octx) throw new Error("Canvas unavailable");
  octx.fillStyle = MAT;
  octx.fillRect(0, 0, INDEX_W, INDEX_H);
  octx.imageSmoothingEnabled = true;
  octx.imageSmoothingQuality = "high";
  const margin = 0.055;
  const maxW = INDEX_W * (1 - margin * 2);
  const maxH = INDEX_H * (1 - margin * 2);
  const scale = Math.min(maxW / rect.w, maxH / rect.h);
  const dw = rect.w * scale;
  const dh = rect.h * scale;
  octx.drawImage(src, rect.x, rect.y, rect.w, rect.h, (INDEX_W - dw) / 2, (INDEX_H - dh) / 2, dw, dh);
  return out.toDataURL("image/jpeg", 0.86);
}

/** Year, set, and card number, printed on the black plate under the card. */
export async function stampIndex(dataUrl: string, year: string, set: string, number = ""): Promise<string> {
  const line = [year.trim(), set.trim(), number.trim() ? `#${number.trim().replace(/^#/, "")}` : ""].filter(Boolean).join("  ·  ");
  if (!line) return dataUrl;
  const img = await load(dataUrl);
  const canvas = document.createElement("canvas");
  canvas.width = img.naturalWidth;
  canvas.height = img.naturalHeight;
  const ctx = canvas.getContext("2d");
  if (!ctx) return dataUrl;
  ctx.drawImage(img, 0, 0);
  const band = Math.max(36, Math.round(canvas.height * 0.055));
  ctx.fillStyle = MAT;
  ctx.fillRect(0, canvas.height - band, canvas.width, band);
  ctx.fillStyle = "#F3EAD8";
  ctx.font = `600 ${Math.max(14, Math.round(band * 0.42))}px "IBM Plex Sans", sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(line, canvas.width / 2, canvas.height - band / 2);
  return canvas.toDataURL("image/jpeg", 0.86);
}

/** 64-bit difference hash of the photo, used by the catalog reader. */
export async function cardPrint(dataUrl: string): Promise<string> {
  const img = await load(dataUrl);
  const w = 9;
  const h = 8;
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("Canvas unavailable");
  ctx.drawImage(img, 0, 0, w, h);
  const data = ctx.getImageData(0, 0, w, h).data;
  const gray: number[] = [];
  for (let i = 0; i < w * h; i += 1) {
    const offset = i * 4;
    gray.push(0.299 * data[offset]! + 0.587 * data[offset + 1]! + 0.114 * data[offset + 2]!);
  }
  let bits = "";
  for (let y = 0; y < h; y += 1) {
    for (let x = 0; x < w - 1; x += 1) {
      bits += gray[y * w + x]! < gray[y * w + x + 1]! ? "1" : "0";
    }
  }
  let hex = "";
  for (let i = 0; i < 64; i += 4) hex += parseInt(bits.slice(i, i + 4), 2).toString(16);
  return hex;
}

/** Front and back, side by side, on one black plate for a Deep Core read. */
export async function placeTwoSides(front: string, back: string): Promise<string> {
  const [a, b] = await Promise.all([load(front), load(back)]);
  const gap = 24;
  const cardW = 520;
  const cardH = 728;
  const out = document.createElement("canvas");
  out.width = cardW * 2 + gap * 3;
  out.height = cardH + gap * 2;
  const ctx = out.getContext("2d");
  if (!ctx) throw new Error("Canvas unavailable");
  ctx.fillStyle = MAT;
  ctx.fillRect(0, 0, out.width, out.height);
  const draw = (img: HTMLImageElement, x: number) => {
    const scale = Math.min(cardW / img.naturalWidth, cardH / img.naturalHeight);
    const dw = img.naturalWidth * scale;
    const dh = img.naturalHeight * scale;
    ctx.drawImage(img, x + (cardW - dw) / 2, gap + (cardH - dh) / 2, dw, dh);
  };
  draw(a, gap);
  draw(b, gap * 2 + cardW);
  return out.toDataURL("image/jpeg", 0.86);
}
