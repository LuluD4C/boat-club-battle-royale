# Boat Club Battle Royale

A phone web app for a Fortnite-style drinking game across Cambridge boat clubs.
Players sign up with their name and college, get drawn into random crews of four,
and move around a real map of Cambridge. A storm shrinks the play zone. Pubs are the
drop points: the map shows how many crews are in each one, and once you're inside
you can challenge a crew to a Boat Race, Arm Wrestle, Flip Cup and so on. Each player
has one life. The last crew with anyone left wins.

## Files

| File | What it is |
| --- | --- |
| `index.html`, `styles.css`, `app.js` | The app. Plain HTML/JS, no build step. |
| `config.js` | **Edit this.** Firebase keys, organiser PIN, starting zone, games list. |
| `pubs-cambridge.json` | Saved list of 102 Cambridge pubs and bars from OpenStreetMap. Used if the live lookup fails. |
| `firestore.rules` | Database rules to paste into Firebase. |
| `fonts/` | Put `BurbankBigCondensed-Black.woff2` here if you have a licence (see below). |

## Try it on your computer

```bash
cd C:\Users\lulum\Projects\boat-club-battle-royale
python -m http.server 5173
```

Open http://localhost:5173. With no Firebase config it runs in **demo mode**:
everything is saved in that one browser. Tap **Staff login**, enter the name **Admin** and the PIN from `config.js`,
then use the HQ tab's demo tools (add bots, put bot crews in pubs, teleport yourself)
to try a duel without walking anywhere.

## Set up for the real game (about 15 minutes)

### 1. Create a Firebase project (free)
1. Go to https://console.firebase.google.com and click **Create a project**.
2. In the project, open **Build → Firestore Database → Create database**.
   Pick the `eur3 (europe-west)` location and start in **production mode**.
3. Open the **Rules** tab, paste the contents of `firestore.rules`, and click **Publish**.
   Change the date in the rules to the day after your game.
4. Open **Project settings** (gear icon) → **Your apps** → click the `</>` web icon,
   register an app, and copy the `firebaseConfig` object.
5. Paste it into `config.js` as `FIREBASE_CONFIG`, and change `STAFF_PIN`.

### 2. Put it online (GPS needs https)
The easiest option is **Netlify Drop**: go to https://app.netlify.com/drop and drag the
whole `boat-club-battle-royale` folder onto the page. You get an `https://….netlify.app`
link to send to everyone. To update it later, drag the folder again.

Firebase Hosting works too: `npx firebase-tools login`, then `npx firebase-tools init hosting`
(public directory: `.`) and `npx firebase-tools deploy`.

### 3. On the night
1. Staff open the link and tap **Staff login**. Everyone uses the same PIN (`STAFF_PIN`, 2468 by default):
   - name **Admin** → the organiser account (HQ, zone planner, the storm, pubs, crews)
   - any other name → a marshal
2. Players open the link, sign up and tap **Share my location** (they have to allow it).
3. In **HQ**:
   - **Open zone planner** (or the yellow pencil button on the map). Drag the yellow pin
     or tap the map to move the zone, and use the slider to resize it. The panel shows how
     many pubs are inside and roughly how long it takes to walk across. Tap a pub pin to
     tick it in or out of play. When you're happy, tap **Save start zone**.
   - Or use the pub checklist in HQ: filter by *In zone / Ticked / All*, search, and tick.
     Aim for 10 to 15 drop pubs.
   - **Randomise crews** once everyone's in.
   - **Send the storm**: open the zone planner, drag and resize the circle to where the
     zone should close to, choose "Storm moves in" and "Shrinks over", then tap
     **Send the storm here** (tap twice to confirm). "Set as the zone now" moves the zone
     instantly with no storm, which is handy before the game starts.
   - **In the storm** lists everyone standing outside the zone. Tap **Storm out** to
     knock them out.
   - Sort out any disputed duels.

## How duels work
1. Your crew walks into a drop pub. The pub sheet shows the crews inside (within 45 m).
2. Tap **Challenge** on another crew and pick a game.
3. They get a popup: **Accept** or **Forfeit** (forfeit costs them a rower).
4. After playing, either crew taps **We won** or **We lost**. If the winners report it,
   the losers confirm or dispute. A dispute goes to the organisers.
5. The losing crew picks one rower to knock out. One life each.

## Marshals (live loot drops)
Marshals are people walking around with the drinks. They tap **Staff login** and enter
their own name with the staff PIN.
- Everyone sees each marshal on the map as a **supply drop** crate, with their name,
  whether they're stocked, running low, empty or on a break, and walking directions.
- A marshal chooses **Live GPS** (the crate follows them) or **Fixed spot** (they pin
  where they're standing, so GPS drift doesn't make the crate jump about).
- The **Marshal** tab lets them:
  - **Judge a duel**: any open duel, nearest first. Tap who won, then pick who's out.
  - **Referee on the spot**: two crews turn up, pick them (closest listed first) and the
    game, then tap the winner. No need for the crews to use the pub challenge flow.
  - **Storm patrol**: alive players outside the zone, nearest first, with **Storm out**.
  - **Near you**: alive players within 200 m, with **Out** for rule breaks.
  - **Revive**: a knocked-out player who reaches the marshal (within 60 m) can be brought
    back, once per player, while their crew is still alive. Change `revivesPerPlayer` and
    `reviveRadiusM` in `config.js`. **The catch:** their whole crew is **Exposed** for
    10 minutes. Everyone sees them on the map, they can't forfeit challenges, and shields
    don't work (`rebootExposedMin`).
  - **Station at a pub**: pick a drop pub from the list and the crate sits next to it.
    The pub's sheet shows "Marshal … is here · reboots".
- Organisers see and can remove marshals in HQ.

## Loot chests
- Every ticked drop pub has a chest with 5 opens (`chestOpens`), **one open per crew**.
- To open it, a crew member who's still alive must be **inside the pub by GPS** (within
  45 m). The app rolls the loot, so nobody can pick what they get.
- The small number on the bottom left of each pub pin is how many opens are left. It turns
  yellow when the chest is low and grey when it's empty.
- If two crews grab the last open at the same moment, the later one gets a message and
  the item is given back, so a chest never goes over its limit.
- Admin, from a pub's sheet: **− open / + open** changes that chest's size, **Refill**
  resets it so every crew can open it again. HQ has **Refill every chest** for new phases.

### Loot table (edit `LOOT` in `config.js` to rename, retune or reweight)
| Item | Rarity | What it does |
| --- | --- | --- |
| Shield Potion | Uncommon | When your crew loses, drink it to save the rower who'd go out. |
| Med Kit | Rare | Revive one knocked-out crewmate anywhere. No exposure. |
| Recon Scanner | Rare | See every crew on the map for 5 minutes. |
| Boogie Bomb | Epic | Throw it with a challenge. The other crew can't forfeit. |
| Rocket Launcher | Epic | Fire at any crew on the map. They lose a rower, no duel needed. A shield blocks it. |
| Golden SCAR | Legendary | Win your next duel and the losing crew loses two rowers. |

Loot belongs to the crew and shows on the Crew tab. Shields are offered automatically
when you lose, and the Golden SCAR fires automatically on your next win. Recon, Med Kit and
Rocket Launcher have a button.

**Item art:** put PNGs in `img/loot/` (`shield.png`, `medkit.png`, `recon.png`, `boogie.png`,
`rocket.png`, `scar.png`) and they replace the drawn icons. Missing files fall back
automatically. See `img/loot/README.txt`. The Boogie Bomb is a toggle when you send a challenge.

## Things to know
- **Fortnite's font** is Burbank Big Condensed, which is commercial and can't be bundled.
  The app uses Anton, a close free match. If you buy Burbank, drop the file in `fonts/`
  with the name `BurbankBigCondensed-Black.woff2` and it's used automatically.
- **Map tiles** come from OpenStreetMap's free servers, which are fine for one evening.
  For a different map style, get a free MapTiler key and set `tiles` in `config.js`.
- **GPS on phones**: the page has to stay open for locations to update. iPhones pause
  web pages in the background, so tell players to keep the tab open.
  Indoor GPS can drift 20–50 m. The 45 m pub radius allows for that, and you can change it in `config.js`.
- **Security**: there are no accounts. Anyone with the link can join, and the staff
  PIN only guards the controls in the app itself. Anyone who knows the PIN can log in
  as Admin, so keep it to organisers and marshals. That's fine for a friendly game;
  just don't post the link publicly.
- Map data © OpenStreetMap contributors.
