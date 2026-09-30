# Boat Club Battle Royale

A Fortnite-style drinking game for Cambridge boat clubs, played on your phone.

**Play:** https://lulud4c.github.io/boat-club-battle-royale/

Sign up with your name and college and get drawn into a random crew of four. Then roam
a real map of Cambridge while the storm closes in. Pubs are the drop points: loot
chests, rival crews and duels are all inside. One life each. The last crew standing wins.

## How to play
1. Open the link, sign up, and tap **Share my location**. Keep the tab open during the
   game, because phones pause location in background tabs.
2. Once crews are drawn, your crew shows on the **Crew** tab and on the map.
3. **Stay inside the zone.** The purple storm is out of bounds. A dashed circle and a
   countdown warn you where the next zone will be. Get caught outside and a marshal or
   organiser can knock you out.
4. **Head to drop pubs.** Each pub pin shows how many crews are inside, and how many
   opens its loot chest has left.
5. **Duel.** Inside a pub you can see which crews are there and challenge one. They
   accept or forfeit (forfeiting costs a rower). The losing crew picks one rower to go out.

### The games
| Game | How it works |
| --- | --- |
| Boat Race | Relay chug. Stroke drinks first, bow last. First crew to finish wins. |
| Arm Wrestle | Each crew picks a champion. Best of three. |
| Flip Cup | Line up opposite each other. Drink, flip, next rower. |
| Rock Paper Scissors | Captains, best of five. |
| Pub Quiz Question | A neutral asks one question. First right answer wins. |

## Loot
Every drop pub has a chest with 5 opens, **one per crew**. You have to be inside the pub
(by GPS) to open it. The app rolls the loot, and it belongs to your crew.

| Item | Rarity | Effect |
| --- | --- | --- |
| Shield Potion | Uncommon | When you lose a duel, drink it to save the rower who'd go out. |
| Med Kit | Rare | Revive a knocked-out crewmate anywhere. |
| Recon Scanner | Rare | See every crew on the map for 5 minutes. |
| Boogie Bomb | Epic | Throw it with a challenge. The other crew can't forfeit. |
| Rocket Launcher | Epic | Fire at any crew on the map. They lose a rower, no duel needed. |
| Golden SCAR | Legendary | Win your next duel and the losing crew loses two rowers. |

## Marshals
Marshals carry the drinks and show on everyone's map as **supply drops**. They can:
- referee duels on the spot and settle disputes;
- knock out anyone caught in the storm;
- **reboot** a knocked-out player who reaches them (once per player, while their crew is
  still alive). The catch: the rebooted crew is **Exposed** for 10 minutes. Everyone can
  see them, they can't forfeit, and shields don't work.

## Running the night (organisers)
Log in with **Staff login**, using the name **Admin** and the staff PIN. Marshals use
the same PIN with their own name.

1. **Set the zone.** Tap the yellow pencil on the map. Drag and resize the circle, tap
   pubs to tick 10 to 15 of them into play, then tap **Set as the zone now**.
2. **Draw crews** in HQ once everyone has signed up.
3. **Send the storm** as the night goes on: in the zone planner, place the next circle,
   pick when it moves in and how long it takes to shrink, then **Send the storm here**.
4. Watch **HQ** for players in the storm and disputed duels. Refill chests for new phases.

---

## For whoever edits this
- Plain HTML, CSS and JavaScript with no build step: `index.html`, `styles.css`, `app.js`.
- **`config.js`** holds everything you're likely to change: staff PIN, starting zone, pub
  radius, chest size, revive rules, the games list and the loot table.
- Live data (players, crews, zone, duels, loot) is stored in Firebase Firestore. Access
  is set by `firestore.rules`, which is published in the Firebase console.
- Hosting is GitHub Pages: pushing to `main` updates the live site within a minute.
- Run it locally with `python -m http.server 5173` and open http://localhost:5173.
- Item art goes in `img/loot/` (see the README there). Missing images fall back to
  drawn icons.
- `pubs-cambridge.json` is a saved list of Cambridge pubs from OpenStreetMap, used if the
  live pub lookup fails.

Map data © OpenStreetMap contributors. Fortnite item art © Epic Games, used in a free,
unofficial fan game.
