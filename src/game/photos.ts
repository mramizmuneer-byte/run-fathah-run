/**
 * Real office / street photos, used as blurred, darkened, warm-graded
 * backdrops. Each backdrop falls back to a drawn gradient if the photo fails.
 */
import corridor from "@/assets/office_corridor_overview.jpg.asset.json";
import nameplate from "@/assets/office_nameplate.jpg.asset.json";
import grass from "@/assets/office_grass_mat_corridor.jpg.asset.json";
import deadEnd from "@/assets/office_dead_end_parapet.jpg.asset.json";
import streetView from "@/assets/street_view_from_balcony.jpg.asset.json";
import streetBelow from "@/assets/street_below_residential.jpg.asset.json";

export const PHOTO_URLS = {
  corridor: corridor.url,
  nameplate: nameplate.url,
  grass: grass.url,
  deadEnd: deadEnd.url,
  streetView: streetView.url,
  streetBelow: streetBelow.url,
};
export type PhotoKey = keyof typeof PHOTO_URLS;

const raw = new Map<PhotoKey, HTMLImageElement>();
const graded = new Map<string, HTMLCanvasElement>();

export function registerPhoto(key: PhotoKey, img: HTMLImageElement) {
  raw.set(key, img);
}
export function rawPhoto(key: PhotoKey) {
  return raw.get(key) ?? null;
}

/**
 * A blurred + graded version of a photo at the given output size.
 * blur: downscale factor (bigger = blurrier). dark: 0..1 darkening.
 */
export function backdrop(
  key: PhotoKey,
  w: number,
  h: number,
  blur = 10,
  dark = 0.35,
  warm = 0.22,
): HTMLCanvasElement | null {
  const id = `${key}:${w}:${h}:${blur}:${dark}:${warm}`;
  const hit = graded.get(id);
  if (hit) return hit;
  const img = raw.get(key);
  if (!img || !img.naturalWidth || typeof document === "undefined") return null;
  // cover-fit crop
  const ir = img.naturalWidth / img.naturalHeight;
  const or = w / h;
  let sw = img.naturalWidth;
  let sh = img.naturalHeight;
  if (ir > or) sw = sh * or;
  else sh = sw / or;
  const sx = (img.naturalWidth - sw) / 2;
  const sy = (img.naturalHeight - sh) / 2;

  const small = document.createElement("canvas");
  small.width = Math.max(4, Math.round(w / blur));
  small.height = Math.max(4, Math.round(h / blur));
  const sc = small.getContext("2d")!;
  sc.imageSmoothingQuality = "high";
  sc.drawImage(img, sx, sy, sw, sh, 0, 0, small.width, small.height);

  const out = document.createElement("canvas");
  out.width = w;
  out.height = h;
  const c = out.getContext("2d")!;
  c.imageSmoothingEnabled = true;
  c.imageSmoothingQuality = "high";
  c.drawImage(small, 0, 0, w, h);
  // warm film grade
  c.globalCompositeOperation = "multiply";
  c.fillStyle = `rgba(255,196,140,${warm * 2})`;
  c.fillRect(0, 0, w, h);
  c.globalCompositeOperation = "source-over";
  c.fillStyle = `rgba(22,12,6,${dark})`;
  c.fillRect(0, 0, w, h);
  graded.set(id, out);
  return out;
}
