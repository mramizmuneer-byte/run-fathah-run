/**
 * The two bosses. Swap the placeholders later by putting real image URLs in
 * `images` — no code changes needed. If an image is null or fails to load the
 * game draws the built-in cartoon placeholder instead.
 */

export interface BossConfig {
  id: "murali" | "sumeet";
  name: string;
  /** Image URLs. null = use the drawn cartoon placeholder. */
  images: {
    front: string | null;
    chase: string | null;
    angry: string | null;
  };
  scale: number;
  catchphrase: string;
  lines: string[];
  /** Placeholder art palette (ignored once real images are supplied). */
  palette: {
    skin: string;
    hair: string;
    shirt: string;
    accent: string;
    trousers: string;
  };
}

export const CATCHPHRASE = "What PAA?!";
export const CATCHPHRASE_SHOUT = "WHAT PAA?!";
export const CATCHPHRASE_MEEK = "...what paa?";
export const GAME_OVER_SECOND_LINE = "Meeting at 6 PM.";

/** Roughly one in three bubbles uses the catchphrase. */
export const CATCHPHRASE_RATE = 0.34;
/** Roughly one in fifteen boss lines is the golden confetti bubble. */
export const GOLDEN_BUBBLE_RATE = 1 / 15;

export const CATCHPHRASE_COMBOS: string[] = [
  "What PAA?! Work's not done yet!",
  "What PAA?! Where are you going?!",
  "What PAA?! The GST return is due today!",
  "Hey! Wait, work's not done yet! What PAA?!",
  "What PAA?!",
  "What PAA?! Just one small task!",
];

export const DUET: { a: string; b: string } = { a: "Fathu!", b: "Come back!" };

export const SHARED_LINES: string[] = [
  "Hey! Wait, work's not done yet!",
  "Hey! Wait, work's not done yet!",
  "Hey! Wait, work's not done yet!",
  "Just one small task!",
  "Where are you going?! The client call is in 5 minutes!",
  "Did you update the tracker?",
  "It's a quick 5-minute thing!",
  "You haven't handed over your notes!",
  "The GST return is due today!",
  "Have you reconciled the accounts?",
  "The audit isn't finished!",
  "Just one small filing left!",
];

export const BOSSES: BossConfig[] = [
  {
    id: "murali",
    name: "MURALI",
    images: { front: null, chase: null, angry: null },
    scale: 1.0,
    catchphrase: CATCHPHRASE,
    lines: SHARED_LINES,
    palette: {
      skin: "#c98d63",
      hair: "#3a2b22",
      shirt: "#f5f1e8",
      accent: "#a8322c",
      trousers: "#3b3a44",
    },
  },
  {
    id: "sumeet",
    name: "SUMEET",
    images: { front: null, chase: null, angry: null },
    scale: 1.12,
    catchphrase: CATCHPHRASE,
    lines: SHARED_LINES,
    palette: {
      skin: "#b97c4f",
      hair: "#241c18",
      shirt: "#eef3f6",
      accent: "#2f4d6b",
      trousers: "#26303a",
    },
  },
];
