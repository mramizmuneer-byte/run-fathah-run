/** Real-photo Bangalore obstacles, the Rapido power-up and the ICAI study modules. */
import autoAsset from "@/assets/auto_rear.png.asset.json";
import busAsset from "@/assets/bmtc_rear.png.asset.json";
import captainAsset from "@/assets/rapido_captain.png.asset.json";
import rideAsset from "@/assets/rapido_ride.png.asset.json";
import book1 from "@/assets/icai_book_1.jpg.asset.json";
import book2 from "@/assets/icai_book_2.jpg.asset.json";
import book3 from "@/assets/icai_book_3.jpg.asset.json";
import { loadSprite, type Sprite } from "./sprites";

let cache: {
  auto: Sprite;
  bus: Sprite;
  captain: Sprite;
  ride: Sprite;
  books: Sprite[];
} | null = null;

export function blrArt() {
  if (!cache)
    cache = {
      auto: loadSprite(autoAsset.url),
      bus: loadSprite(busAsset.url),
      captain: loadSprite(captainAsset.url),
      ride: loadSprite(rideAsset.url),
      books: [book1, book2, book3].map((b) => loadSprite(b.url)),
    };
  return cache;
}

/** Study modules, in the order they are found. Add more covers here later. */
export const ICAI_BOOKS = ["Paper 1 · Financial Reporting", "Strategic Cost & Performance Mgmt", "Paper 3 · Advanced Auditing"];

/** Distance between study modules (m). */
export const BOOK_EVERY = 1300;
