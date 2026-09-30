// Game configuration. Edit this file before the event.
//
// 1. Paste your Firebase web config below (Firebase console → Project settings →
//    Your apps → Web app → "SDK setup and configuration" → Config).
//    Leave it as null to run in DEMO mode: everything is stored in this browser
//    only, which is fine for trying the app out but not for playing.
// 2. Change STAFF_PIN. Staff tap "Staff login" and enter a name plus this PIN:
//    - name "Admin"  -> organiser account: HQ, zone planner, sends the storm
//    - any other name -> marshal: a supply drop on the map, judges duels, revives

// Web keys are meant to be public; the Firestore rules (firestore.rules) control access.
export const FIREBASE_CONFIG = {
  apiKey: "AIzaSyBUET3ieymWKlk_hOKQHuwuEn5JfH0GgWQ",
  authDomain: "bcbr-5a5b6.firebaseapp.com",
  projectId: "bcbr-5a5b6",
  storageBucket: "bcbr-5a5b6.firebasestorage.app",
  messagingSenderId: "375294899160",
  appId: "1:375294899160:web:2dae9b8ee823effa3338ad"
};

export const STAFF_PIN = "2468";   // one PIN for all staff. Change it before the night.
export const ADMIN_NAME = "Admin"; // log in with this name to get the organiser account.

// Game id lets you run several games from one Firebase project (e.g. a test run).
export const GAME_ID = "main";

export const DEFAULTS = {
  // Starting zone: city centre around the Market, 1.1 km radius. Change it in the
  // app with the zone planner (HQ → Open zone planner), no need to edit this.
  center: [52.2072, 0.1188],
  radiusM: 1100,
  // How close (metres) a crew member must be to a pub to count as "in" it.
  pubRadiusM: 45,
  // A location older than this is treated as unknown.
  staleMs: 3 * 60 * 1000,
  // How many times one player can be revived by a marshal. 0 turns revives off.
  revivesPerPlayer: 1,
  // A knocked-out player must be this close (metres) to a marshal to be revived.
  reviveRadiusM: 60,
  // After a marshal revives someone, their crew is "Exposed" for this many minutes:
  // everyone sees them on the map, they can't forfeit challenges, shields don't work.
  rebootExposedMin: 10,
  // Loot chests: every drop pub gets one with this many opens (one per crew).
  // Change a single pub's chest, or refill it, from its sheet on the map (Admin).
  chestOpens: 5,
  // How long a Recon Scanner shows every crew on the map.
  reconMin: 5,
  // Map tiles. Standard OpenStreetMap tiles work with no key and are fine for one
  // evening's game. For a nicer style, get a free MapTiler key and use e.g.
  // tiles: { url: "https://api.maptiler.com/maps/streets-v2/{z}/{x}/{y}.png?key=YOUR_KEY",
  //          attribution: "© MapTiler © OpenStreetMap contributors", maxZoom: 20 }
  tiles: null
};

export const GAMES = [
  { id: "boatrace", name: "Boat Race", desc: "Relay chug. Stroke drinks first, bow last. First crew to finish wins." },
  { id: "armwrestle", name: "Arm Wrestle", desc: "Each crew picks a champion. Best of three." },
  { id: "flipcup", name: "Flip Cup", desc: "Line up opposite each other. Drink, flip, next rower." },
  { id: "rps", name: "Rock Paper Scissors", desc: "Captains, best of five. Fast and brutal." },
  { id: "quiz", name: "Pub Quiz Question", desc: "The bar staff or a neutral crew asks one question. First right answer wins." }
];

// Loot found in chests. `weight` sets how common each item is (higher = more often).
// Rarity sets the tile colour: common, uncommon, rare, epic, legendary.
// `img`: put a PNG at this path (e.g. Fortnite item art) and it replaces the drawn icon.
// Missing files fall back to the built-in icon automatically.
export const LOOT = [
  { id: "shield", name: "Shield Potion",   rarity: "uncommon",  weight: 32, img: "img/loot/shield.png", desc: "When your crew loses a duel, drink it to save the rower who'd go out." },
  { id: "medkit", name: "Med Kit",         rarity: "rare",      weight: 18, img: "img/loot/medkit.png", desc: "Revive one knocked-out crewmate, wherever you are. No exposure." },
  { id: "recon",  name: "Recon Scanner",   rarity: "rare",      weight: 18, img: null /* no PNG yet: drawn icon */,  desc: "See every crew on the map for 5 minutes. Go hunting." },
  { id: "boogie", name: "Boogie Bomb",     rarity: "epic",      weight: 12, img: "img/loot/boogie.png", desc: "Throw it with a challenge. The other crew can't forfeit." },
  { id: "rocket", name: "Rocket Launcher", rarity: "epic",      weight: 9,  img: "img/loot/rocket.png", desc: "Fire at any crew on the map. They lose a rower, no duel needed." },
  { id: "scar",   name: "Golden SCAR",     rarity: "legendary", weight: 7,  img: "img/loot/scar.png",   desc: "Win your next duel and the losing crew loses two rowers." }
];
