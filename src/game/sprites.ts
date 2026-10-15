import backAsset from "@/assets/fathu2-back.png.asset.json";
import sideAsset from "@/assets/fathu2-side.png.asset.json";
import frontAsset from "@/assets/fathu2-front.png.asset.json";

export interface Sprite {
  img: HTMLImageElement | null;
  ready: boolean;
}

const cache = new Map<string, Sprite>();

export function loadSprite(url: string | null): Sprite {
  if (!url) return { img: null, ready: false };
  const hit = cache.get(url);
  if (hit) return hit;
  const s: Sprite = { img: null, ready: false };
  cache.set(url, s);
  if (typeof window === "undefined") return s;
  const img = new Image();
  img.crossOrigin = "anonymous";
  img.onload = () => {
    s.img = img;
    s.ready = true;
  };
  img.onerror = () => {
    s.img = null;
    s.ready = false;
  };
  img.src = url;
  return s;
}

export const FATHU_URLS = {
  back: backAsset.url,
  side: sideAsset.url,
  front: frontAsset.url,
};

export function loadFathu() {
  return {
    back: loadSprite(FATHU_URLS.back),
    side: loadSprite(FATHU_URLS.side),
    front: loadSprite(FATHU_URLS.front),
  };
}
