/**
 * ALL editable game text lives here.
 * Change anything in this file without touching game code.
 */

export const FIRM = {
  name: "MURALI AND SUMEET",
  subtitle: "CHARTERED ACCOUNTANTS",
};

export const TITLE = "ESCAPE FROM M&S";
export const TAGLINE = "Escape before he says it again.";
export const CREDIT = "Starring @fathu_.xb · Made by Ramiz, Don & Navaneeth";
export const GIFT_LINE = "A parting gift from the team";

export const FAREWELL = {
  heading: "From the team",
  message:
    "Fathu, the office is about to get a lot quieter, and the chai a lot colder. Thank you for the work, the laughs and every 'give me 5 minutes' that took 45. Go build your next big thing. We'll keep the bosses busy.",
};

export const WISHES: { text: string; from: string }[] = [
  { text: "May your new inbox be empty and your chai always hot.", from: "Ramiz" },
  { text: "May every deadline at your next job be at least a week away.", from: "Don" },
  { text: "The office won't be the same. Come back for lunch!", from: "Navaneeth" },
  { text: "You found the one exit nobody else dared to use. Legend.", from: "Ramiz" },
  { text: "Keep your phone on silent and your dreams on loud.", from: "Don" },
];

export const WISH_ROTATE_MS = 4000;

export const MILESTONES: string[] = [
  "500m: Officially out of the building, Fathu!",
  "1000m: No emails. No calls. Suspicious. Even 'What PAA' has gone quiet.",
  "1500m: Even Silk Board traffic can't stop him!",
  "2000m: Murali got a scooter and Sumeet got an auto!",
];

/** Cycled after the fixed milestones above run out. */
export const MILESTONES_EXTRA: string[] = [
  "Still running. The tracker remains un-updated.",
  "Somewhere a client call is starting without him.",
  "The chai stall salutes you.",
  "Two bosses, one scooter, zero chance.",
  "The GST return has given up too.",
  "Silk Board could not hold him. Nothing can.",
  "Another 500m of glorious unemployment.",
  "Audit pending. Fathu: not pending.",
];

export const LEAP = {
  prompt: "TAP TO LEAP!",
  good: "PERFECT LEAP!",
  bad: "STUMBLE!",
};

export const STAGE_TITLES = {
  1: "3RD-FLOOR BALCONY",
  2: "THE LEAP",
  3: "BANGALORE ROAD",
};

export const PHONE_CALLS: string[] = [
  "Call me back!",
  "Missed call (14)",
  "Pick up paa...",
  "One minute only!",
];

/** Obstacle display names, by kind key. */
export const OBSTACLE_NAMES: Record<string, string> = {
  files: "AUDIT FILES",
  gst: "GST RETURNS",
  notice: "TAX NOTICE",
  calculator: "CALCULATOR",
  plant: "POTTED PLANT",
  chair: "OFFICE CHAIR",
  trolley: "TROLLEY",
  ac: "AC CABINET",
  pipe: "LOW PIPE",
  email: "URGENT EMAIL",
  plane: "PAPER PLANE",
  branch: "BRANCH",
  crow: "CROW",
  vine: "HANGING VINE",
  pothole: "POTHOLE",
  breaker: "SPEED BREAKER",
  auto: "AUTO-RICKSHAW",
  scooter: "PARKED SCOOTER",
  bus: "CITY BUS",
  cow: "COW",
  dog: "STRAY DOG",
  rider: "DELIVERY RIDER",
  cart: "VENDOR CART",
  cable: "LOW CABLE",
  walker: "PEDESTRIAN",
};

export const EMAIL_TEXTS = ["URGENT: Audit Pending", "Filing Deadline Tonight!"];

export const COLLECTIBLE_NAMES = {
  coin: "FREEDOM",
  chai: "CHAI",
  stamp: "Refund Approved",
  letter: "Relieving Letter",
  shield: "PAA",
  filter: "FILTER COFFEE",
  dosa: "DOSA",
  vada: "VADA PAV",
  leaf: "LEAF",
};

export const EASTER_EGG = {
  lettersNeeded: 5,
  stamp: "RESIGNATION ACCEPTED",
  bonus: 500,
};

export const UI = {
  play: "PLAY",
  retry: "RETRY",
  gameOverTitle: "CAUGHT!",
  distance: "DISTANCE",
  best: "BEST",
  coins: "COINS",
  letters: "LETTERS",
  tapHint: "Swipe to move · up to jump · down to slide",
  keyHint: "Arrow keys / WASD",
};

export const SCORING = {
  coin: 10,
  chai: 15,
  stamp: 25,
  letter: 150,
  food: 30,
  leaf: 5,
};

export const STAGE1_LENGTH = 420; // metres of corridor
export const STAGE2_LENGTH = 260; // metres of tree descent
export const SHIELD_SECONDS = 5;
export const FLASHLIGHT_SECONDS = 5;
export const CLEAN_RUN_RECOVER_SECONDS = 15;
export const BOSS_VEHICLE_AT = 2000;
