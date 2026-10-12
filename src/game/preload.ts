/** Preloads every image before play so nothing pops in. Failures never block. */
import { FATHU_URLS, loadSprite } from "./sprites";
import { PHOTO_URLS, registerPhoto, type PhotoKey } from "./photos";

function loadImg(url: string, timeout = 9000): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    let done = false;
    const finish = (ok: boolean) => {
      if (done) return;
      done = true;
      resolve(ok ? img : null);
    };
    img.onload = () => finish(true);
    img.onerror = () => finish(false);
    window.setTimeout(() => finish(false), timeout);
    img.src = url;
  });
}

export async function preloadAll(onProgress: (p: number) => void) {
  const jobs: Promise<unknown>[] = [];
  let done = 0;
  const total = Object.keys(PHOTO_URLS).length + 3 + 1;
  const tick = () => {
    done++;
    onProgress(done / total);
  };
  for (const [k, url] of Object.entries(PHOTO_URLS)) {
    jobs.push(
      loadImg(url).then((img) => {
        if (img) registerPhoto(k as PhotoKey, img);
        tick();
      }),
    );
  }
  for (const url of Object.values(FATHU_URLS)) {
    jobs.push(
      loadImg(url).then(() => {
        loadSprite(url); // warm the sprite cache
        tick();
      }),
    );
  }
  jobs.push(
    (async () => {
      try {
        const f = (document as Document & { fonts?: FontFaceSet }).fonts;
        if (f) await Promise.race([f.load("40px Bangers"), new Promise((r) => setTimeout(r, 2500))]);
      } catch {
        /* ignore */
      }
      tick();
    })(),
  );
  await Promise.all(jobs);
}
