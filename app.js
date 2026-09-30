import { FIREBASE_CONFIG, STAFF_PIN, ADMIN_NAME, GAME_ID, DEFAULTS, GAMES, LOOT } from './config.js?v=2';

/* ============================================================
   Helpers
   ============================================================ */
const $ = s => document.querySelector(s);
const h = (tag, props, ...kids) => {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(props || {})) {
    if (k === 'class') e.className = v;
    else if (k === 'text') e.textContent = v;
    else if (k === 'style' && typeof v === 'object') { for (const [sk, sv] of Object.entries(v)) sk.startsWith('--') ? e.style.setProperty(sk, sv) : (e.style[sk] = sv); }
    else if (k.startsWith('on')) e.addEventListener(k.slice(2), v);
    else if (v !== false && v != null) e.setAttribute(k, v === true ? '' : v);
  }
  for (const c of kids.flat()) { if (c == null || c === false) continue; e.append(c.nodeType ? c : document.createTextNode(String(c))); }
  return e;
};
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const lsGet = (k, d) => { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch { return d; } };
const lsSet = (k, v) => { try { v == null ? localStorage.removeItem(k) : localStorage.setItem(k, JSON.stringify(v)); } catch {} };
let toastT;
const toast = msg => { const t = $('#toast'); t.textContent = msg; t.hidden = false; clearTimeout(toastT); toastT = setTimeout(() => (t.hidden = true), 3600); };
const clock = t => new Date(t).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
const shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const ago = t => { const s = Math.round((Date.now() - t) / 1000); return s < 60 ? 'just now' : s < 3600 ? Math.round(s / 60) + ' min ago' : clock(t); };
const fmtClock = ms => { const s = Math.max(0, Math.ceil(ms / 1000)); return String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0'); };
const fmtDist = m => m < 1000 ? Math.round(m / 10) * 10 + ' m' : (m / 1000).toFixed(1) + ' km';

// Swap in new content only if it differs, so taps don't land on nodes that were just replaced.
function patch(el, kids) {
  if (el.querySelector('[data-armed]')) return;
  const tmp = document.createElement('div'); tmp.append(...kids.filter(k => k != null && k !== false));
  if (tmp.innerHTML === el.innerHTML) return;
  el.replaceChildren(...tmp.childNodes);
}
function confirmTap(btn, fn, label = 'Tap again to confirm') {
  if (btn.dataset.armed) { delete btn.dataset.armed; btn.textContent = btn.dataset.orig; fn(); return; }
  btn.dataset.orig = btn.textContent; btn.dataset.armed = '1'; btn.textContent = label;
  setTimeout(() => { if (btn.dataset.armed) { delete btn.dataset.armed; btn.textContent = btn.dataset.orig; } }, 3500);
}

/* geo */
const R_EARTH = 6371000, rad = d => d * Math.PI / 180;
function dist(a, b) {
  const [la1, lo1] = Array.isArray(a) ? a : [a.lat, a.lon], [la2, lo2] = Array.isArray(b) ? b : [b.lat, b.lon];
  const dLa = rad(la2 - la1), dLo = rad(lo2 - lo1);
  const x = Math.sin(dLa / 2) ** 2 + Math.cos(rad(la1)) * Math.cos(rad(la2)) * Math.sin(dLo / 2) ** 2;
  return 2 * R_EARTH * Math.asin(Math.sqrt(x));
}
function bearing(a, b) {
  const [la1, lo1] = a, [la2, lo2] = b, y = Math.sin(rad(lo2 - lo1)) * Math.cos(rad(la2));
  const x = Math.cos(rad(la1)) * Math.sin(rad(la2)) - Math.sin(rad(la1)) * Math.cos(rad(la2)) * Math.cos(rad(lo2 - lo1));
  return ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'][Math.round(((Math.atan2(y, x) * 180 / Math.PI + 360) % 360) / 45) % 8];
}
const offset = ([lat, lon], dx, dy) => [lat + dy / 111320, lon + dx / (111320 * Math.cos(rad(lat)))];
const circlePts = (c, r, n = 96) => Array.from({ length: n }, (_, i) => { const a = 2 * Math.PI * i / n; return offset(c, r * Math.sin(a), r * Math.cos(a)); });

/* ============================================================
   Game vocabulary
   ============================================================ */
const COLLEGES = ["Christ's", 'Churchill', 'Clare', 'Clare Hall', 'Corpus Christi', 'Darwin', 'Downing', 'Emmanuel', 'First and Third Trinity', 'Fitzwilliam', 'Girton', 'Gonville and Caius', 'Homerton', 'Hughes Hall', 'Jesus', "King's", 'Lady Margaret', 'Lucy Cavendish', 'Magdalene', 'Murray Edwards', 'Newnham', 'Pembroke', 'Peterhouse', "Queens'", 'Robinson', "St Catharine's", "St Edmund's", 'Selwyn', 'Sidney Sussex', 'Trinity Hall', 'Wolfson', 'CUBC', 'CUWBC', 'Anglia Ruskin', 'City of Cambridge RC', 'Cantabrigian RC'];
const CREW_NAMES = ['Crab Catchers', 'Stroke Side', 'Bow Side', 'Power Tens', 'Rate 36', 'Backstops', 'Frontstops', 'Square Blades', 'Wash Hangers', 'Spin Merchants', 'Easy There', 'Blade Runners', 'Cox Boxes', 'Erg Rats', 'Seat Racers', 'Firm Pressure', 'Rigger Jiggers', 'Bump Hunters', 'Grassy Corner', 'Ditton Corner', 'Plough Reach', 'Baits Bite', 'Head Wind', 'Last Orders'];
const CREW_COLORS = ['#5BE35B', '#2EC2FF', '#B35CF0', '#FFB020', '#FF4957', '#FF7AD9', '#00E0B8', '#FFE81A', '#8C9BFF', '#FF8A3D', '#B6F03A', '#40E0FF'];
const SEATS = ['Stroke', '3', '2', 'Bow', '5th'];
const OPEN = ['pending', 'live', 'claimed', 'disputed', 'strike'];
const MODE_HINTS = {
  mix: 'Spreads each club across different crews, so nobody rows with their own college.',
  club: 'Keeps clubs together in fours. Leftovers form composite crews.',
  random: 'No rules. Anyone with anyone.'
};
const gameName = id => id === 'airstrike' ? 'Rocket strike' : GAMES.find(g => g.id === id)?.name || 'Duel';

/* ============================================================
   State
   ============================================================ */
const S = {
  pid: lsGet('bcbr.pid', null), admin: lsGet('bcbr.admin', false), view: 'map',
  players: [], playersLoaded: false, teams: null, zone: null, settings: {}, pubs: [], duels: [], log: [],
  candidates: [], me: null, gps: 'off', lastPush: null,
  pick: null, draft: null, drawMode: lsGet('bcbr.drawMode', 'mix'),
  openPub: null, challenge: null, outFor: null, later: new Set(), forceJoin: false, fitted: false, winnerSeen: false,
  marshalId: lsGet('bcbr.marshal', null), marshals: [], marshalsLoaded: false, openDrop: null,
  plan: null, pubFilter: 'zone', pubSearch: '', ref: { a: '', b: '', game: GAMES[0].id },
  items: [], reveal: null, itemUse: null, challengeBoogie: false
};
let api;

/* ============================================================
   Backends: Firebase (live) or localStorage (demo)
   ============================================================ */
async function firebaseBackend(cfg) {
  const V = '10.12.2';
  const { initializeApp } = await import(`https://www.gstatic.com/firebasejs/${V}/firebase-app.js`);
  const fs = await import(`https://www.gstatic.com/firebasejs/${V}/firebase-firestore.js`);
  const db = fs.getFirestore(initializeApp(cfg));
  const col = n => fs.collection(db, 'games', GAME_ID, n);
  const ref = (n, id) => fs.doc(db, 'games', GAME_ID, n, id);
  const onErr = e => { console.error(e); toast('Lost connection to the game. Check your signal.'); };
  return {
    mode: 'live',
    subCol: (n, cb) => fs.onSnapshot(col(n), s => cb(s.docs.map(d => ({ id: d.id, ...d.data() }))), onErr),
    subDoc: (n, id, cb) => fs.onSnapshot(ref(n, id), s => cb(s.exists() ? s.data() : null), onErr),
    set: (n, id, d) => fs.setDoc(ref(n, id), d),
    update: (n, id, d) => fs.setDoc(ref(n, id), d, { merge: true }),
    del: (n, id) => fs.deleteDoc(ref(n, id)),
    newId: () => fs.doc(col('players')).id
  };
}
function localBackend() {
  const K = n => `bcbr.demo.${GAME_ID}.${n}`;
  const read = n => lsGet(K(n), {});
  const subs = {};
  const emit = n => { const all = read(n); (subs[n] || []).forEach(f => f(all)); };
  window.addEventListener('storage', e => { const m = e.key && e.key.match(/^bcbr\.demo\.[^.]+\.(.+)$/); if (m) emit(m[1]); });
  const write = (n, all) => { lsSet(K(n), all); emit(n); };
  const merge = (a, b) => { const o = { ...(a || {}) }; for (const [k, v] of Object.entries(b)) o[k] = v && typeof v === 'object' && !Array.isArray(v) && o[k] && typeof o[k] === 'object' && !Array.isArray(o[k]) ? merge(o[k], v) : v; return o; };
  const reg = (n, f) => { (subs[n] ??= []).push(f); f(read(n)); };
  return {
    mode: 'demo',
    subCol: (n, cb) => reg(n, all => cb(Object.entries(all).map(([id, d]) => ({ id, ...d })))),
    subDoc: (n, id, cb) => reg(n, all => cb(all[id] || null)),
    set: async (n, id, d) => { const all = read(n); all[id] = d; write(n, all); },
    update: async (n, id, d) => { const all = read(n); all[id] = merge(all[id], d); write(n, all); },
    del: async (n, id) => { const all = read(n); delete all[id]; write(n, all); },
    newId: () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
  };
}
const save = async (p, okMsg) => { try { await p; if (okMsg) toast(okMsg); return true; } catch (e) { console.error(e); toast("That didn't save. Check your signal and try again."); return false; } };
const logEvent = text => api.set('log', api.newId(), { t: Date.now(), text });

/* ============================================================
   Derived game state
   ============================================================ */
const crews = () => S.teams?.crews || [];
const isAlive = p => !!p && p.alive !== false;
function pMap() {
  const m = Object.fromEntries(S.players.map(p => [p.id, p]));
  if (S.pid && m[S.pid] && S.me) m[S.pid] = { ...m[S.pid], lat: S.me.lat, lon: S.me.lon, locAt: S.me.at };
  return m;
}
const fresh = p => !!p && typeof p.lat === 'number' && (p.bot || (p.locAt && Date.now() - p.locAt < DEFAULTS.staleMs));
const crewOf = pid => crews().find(c => c.members.includes(pid));
const crewById = id => crews().find(c => c.id === id);
const myCrew = () => (S.pid ? crewOf(S.pid) : null);
const aliveIn = (c, P = pMap()) => c.members.filter(id => isAlive(P[id]));
const aliveCrews = (P = pMap()) => crews().filter(c => aliveIn(c, P).length);
const openDuelFor = crewId => S.duels.find(d => OPEN.includes(d.status) && (d.from === crewId || d.to === crewId));
const pubById = id => S.pubs.find(p => p.id === id) || S.candidates.find(p => p.id === id);
function crewsAtPub(pub, P = pMap()) {
  const out = [];
  for (const c of crews()) {
    const here = c.members.map(id => P[id]).filter(p => isAlive(p) && fresh(p) && dist(p, pub) <= DEFAULTS.pubRadiusM);
    if (here.length) out.push({ crew: c, here });
  }
  return out;
}

const myMarshal = () => S.marshals.find(m => m.id === S.marshalId);
const isMarshal = () => !!S.marshalId;
const canJudge = () => S.admin || isMarshal();
const inPlay = id => S.pubs.some(p => p.id === id);
function allPubs() { const m = new Map(S.candidates.map(p => [p.id, p])); for (const p of S.pubs) if (!m.has(p.id)) m.set(p.id, p); return [...m.values()]; }
const planZone = () => S.plan || zoneNow().cur;
const nearestPub = pt => { let best = null, bd = Infinity; for (const p of S.pubs) { const d = dist(p, pt); if (d < bd) { bd = d; best = p; } } return best ? { pub: best, d: bd } : null; };
const RARITY = { common: '#B4B4B4', uncommon: '#5BE35B', rare: '#3FA9F5', epic: '#B35CF0', legendary: '#F7B733' };
const ICONS = {
  shield: '<rect x="24" y="4" width="16" height="7" rx="2" fill="#fff" stroke="#0B1440" stroke-width="3"/><path d="M26 11h12v9l10 13a15 15 0 0 1-12 23h-8a15 15 0 0 1-12-23l10-13z" fill="#3FA9F5" stroke="#0B1440" stroke-width="3" stroke-linejoin="round"/><path d="M18 38h28a12 12 0 0 1-10 15h-8a12 12 0 0 1-10-15z" fill="#9FE3FF"/><circle cx="26" cy="44" r="2.5" fill="#fff"/>',
  medkit: '<path d="M23 11h18v7H23z" fill="#fff" stroke="#0B1440" stroke-width="3"/><rect x="7" y="17" width="50" height="36" rx="6" fill="#fff" stroke="#0B1440" stroke-width="3"/><path d="M28 24h8v8h8v8h-8v8h-8v-8h-8v-8h8z" fill="#FF4957" stroke="#0B1440" stroke-width="2"/>',
  recon: '<circle cx="32" cy="32" r="25" fill="#0B1440" stroke="#5BE35B" stroke-width="3"/><circle cx="32" cy="32" r="16" fill="none" stroke="#5BE35B" stroke-width="2"/><circle cx="32" cy="32" r="7" fill="none" stroke="#5BE35B" stroke-width="2"/><path d="M32 32 53 19A25 25 0 0 0 32 7z" fill="#5BE35B" opacity=".55"/><circle cx="43" cy="21" r="3.5" fill="#FF4957"/><circle cx="21" cy="42" r="3.5" fill="#FFE81A"/>',
  boogie: '<path d="M32 16V4" stroke="#0B1440" stroke-width="3"/><circle cx="32" cy="37" r="21" fill="#D5DCFF" stroke="#0B1440" stroke-width="3"/><path d="M13 31h38M12 41h40M17 51h30M24 18v38M32 16v42M40 18v38" stroke="#7382E0" stroke-width="2" fill="none"/><rect x="34" y="24" width="7" height="7" fill="#fff"/><rect x="18" y="33" width="6" height="6" fill="#FF7AD9"/><rect x="41" y="42" width="6" height="6" fill="#2EC2FF"/>',
  rocket: '<g transform="rotate(-28 32 32)"><rect x="3" y="26" width="44" height="13" rx="3" fill="#6B7A40" stroke="#0B1440" stroke-width="3"/><path d="M47 23l13 9.5L47 42z" fill="#FF4957" stroke="#0B1440" stroke-width="3" stroke-linejoin="round"/><rect x="17" y="39" width="7" height="11" rx="1" fill="#3E4A24" stroke="#0B1440" stroke-width="2.5"/><rect x="28" y="19" width="11" height="7" rx="1" fill="#3E4A24" stroke="#0B1440" stroke-width="2.5"/><path d="M3 29h-3M3 36h-3" stroke="#FFB020" stroke-width="3"/></g>',
  scar: '<path d="M3 27h30l4-5h15v6h9v6H47l-4 5H31l-3 13h-9l3-13h-6l-4 7H5l4-9H3z" fill="#F7B733" stroke="#0B1440" stroke-width="3" stroke-linejoin="round"/><rect x="20" y="17" width="13" height="6" rx="1" fill="#C98A12" stroke="#0B1440" stroke-width="2.5"/><path d="M8 31h24" stroke="#FFE7A6" stroke-width="2"/>'
};
function lootTile(L, size = 52) {
  const col = RARITY[L.rarity] || RARITY.common;
  const tile = h('div', { class: 'loot-tile', style: { width: size + 'px', height: size + 'px', background: `radial-gradient(circle at 50% 30%, ${col} 0%, ${col}AA 45%, #0B1440 115%)` } });
  const drawn = () => { tile.innerHTML = `<svg viewBox="0 0 64 64" aria-hidden="true">${ICONS[L.id] || ''}</svg>`; };
  if (L.img) { const img = h('img', { src: L.img, alt: '' }); img.onerror = drawn; tile.append(img); } else drawn();
  return tile;
}
const lootDef = id => LOOT.find(l => l.id === id) || { id, name: id, rarity: 'common', desc: '' };
const crewItems = cid => S.items.filter(i => i.crewId === cid && !i.usedAt).sort((a, b) => a.at - b.at);
const hasItem = (cid, type) => crewItems(cid).find(i => i.type === type);
const chestMax = pub => pub.chestMax ?? DEFAULTS.chestOpens ?? 5;
const chestRound = pub => pub.chestRound || 0;
const chestOpens = pub => S.items.filter(i => i.pubId === pub.id && (i.round || 0) === chestRound(pub)).sort((a, b) => a.at - b.at);
const chestLeft = pub => Math.max(0, chestMax(pub) - chestOpens(pub).length);
const crewOpened = (pub, cid) => chestOpens(pub).some(i => i.crewId === cid);
const reconUntil = cid => { const r = S.items.filter(i => i.crewId === cid && i.type === 'recon' && i.usedAt).map(i => i.usedAt + (DEFAULTS.reconMin || 5) * 60000); const t = Math.max(0, ...r); return t > Date.now() ? t : 0; };
function exposedUntil(c, P = pMap()) {
  if (!c) return 0; let t = 0;
  for (const id of c.members) { const p = P[id]; if (p?.rebootAt) t = Math.max(t, p.rebootAt + (DEFAULTS.rebootExposedMin || 10) * 60000); }
  return t > Date.now() ? t : 0;
}
function rollLoot() { const tot = LOOT.reduce((a, l) => a + l.weight, 0); let r = Math.random() * tot; for (const l of LOOT) if ((r -= l.weight) < 0) return l.id; return LOOT[0].id; }
const useItem = (it, extra = {}) => api.update('items', it.id, { usedAt: Date.now(), usedBy: S.pid || null, ...extra });
const MARSHAL_STATUS = { stocked: 'Stocked', low: 'Running low', empty: 'Out of drinks', break: 'On a break' };
const lerp = (a, b, t) => a + (b - a) * t;
function zoneNow(now = Date.now()) {
  const z = S.zone;
  const base = { center: z?.center || DEFAULTS.center, r: z?.r || DEFAULTS.radiusM };
  if (!z?.next) return { cur: base, next: null, stage: z?.phase ? 'locked' : 'none', z };
  if (now < z.shrinkStart) return { cur: base, next: z.next, stage: 'hold', z };
  if (now >= z.shrinkEnd) return { cur: z.next, next: null, stage: 'locked', z };
  const t = (now - z.shrinkStart) / (z.shrinkEnd - z.shrinkStart);
  return { cur: { center: [lerp(base.center[0], z.next.center[0], t), lerp(base.center[1], z.next.center[1], t)], r: lerp(base.r, z.next.r, t) }, next: z.next, stage: 'closing', z };
}
const inZone = (p, zc) => dist(p, zc.center) <= zc.r;

/* ============================================================
   Crew draw
   ============================================================ */
const cleanClub = c => String(c).trim().replace(/\s+/g, ' ');
const clubKey = c => cleanClub(c).toLowerCase();
const teamCount = n => (n < 4 ? (n ? 1 : 0) : Math.floor(n / 4) + (n % 4 === 3 ? 1 : 0));
function clubsOf(players) {
  const m = new Map();
  for (const p of players) { const k = clubKey(p.club); if (!m.has(k)) m.set(k, { name: cleanClub(p.club), players: [] }); m.get(k).players.push(p); }
  return [...m.values()].sort((a, b) => b.players.length - a.players.length || a.name.localeCompare(b.name));
}
function drawCrews(mode) {
  const ps = S.players;
  let groups = [];
  if (mode === 'club') {
    const pool = [];
    for (const c of clubsOf(ps)) { const l = shuffle(c.players); while (l.length >= 4) groups.push({ m: l.splice(0, 4), comp: false }); pool.push(...l); }
    const k = teamCount(pool.length), extra = Array.from({ length: k }, () => ({ m: [], comp: true }));
    shuffle(pool).forEach((p, i) => extra[i % k].m.push(p));
    groups = shuffle(groups).concat(extra);
  } else {
    let order;
    if (mode === 'mix') {
      const lists = shuffle(clubsOf(ps)).sort((a, b) => b.players.length - a.players.length).map(c => shuffle(c.players));
      order = []; while (lists.some(l => l.length)) for (const l of lists) if (l.length) order.push(l.shift());
    } else order = shuffle(ps);
    const k = teamCount(order.length);
    groups = Array.from({ length: k }, () => ({ m: [], comp: false }));
    order.forEach((p, i) => groups[i % k].m.push(p));
  }
  const names = shuffle(CREW_NAMES), colors = shuffle(CREW_COLORS);
  return groups.filter(g => g.m.length).map((g, i) => ({ id: 'c' + i + '-' + Date.now().toString(36), name: names[i] || 'Crew ' + (i + 1), color: colors[i % colors.length], members: g.m.map(p => p.id), composite: g.comp }));
}

/* ============================================================
   GPS
   ============================================================ */
let watchId = null;
function startGps() {
  if (!('geolocation' in navigator)) { S.gps = 'error'; toast("This browser can't share location."); renderAll(); return; }
  if (watchId != null) return;
  S.gps = 'asking'; renderAll();
  watchId = navigator.geolocation.watchPosition(pos => {
    const first = S.gps !== 'on';
    S.gps = 'on'; lsSet('bcbr.gpsOk', true);
    S.me = { lat: pos.coords.latitude, lon: pos.coords.longitude, acc: pos.coords.accuracy, at: Date.now() };
    pushLoc(); renderAll();
    if (first && S.view === 'map') map.setView([S.me.lat, S.me.lon], Math.max(map.getZoom(), 15));
  }, err => {
    S.gps = err.code === 1 ? 'denied' : 'error';
    if (err.code === 1) { navigator.geolocation.clearWatch(watchId); watchId = null; lsSet('bcbr.gpsOk', null); }
    toast(err.code === 1 ? 'Location is blocked. Allow it for this site in your browser settings, then reload.' : "Can't get a GPS fix yet. Step outside or wait a moment.");
    renderAll();
  }, { enableHighAccuracy: true, maximumAge: 5000, timeout: 30000 });
}
function pushLoc(force) {
  if ((!S.pid && !S.marshalId) || !S.me) return;
  const now = Date.now(), last = S.lastPush;
  if (!force && last && (now - last.t < 6000 || (now - last.t < 25000 && dist(last, S.me) < 12))) return;
  S.lastPush = { t: now, lat: S.me.lat, lon: S.me.lon };
  const loc = { lat: +S.me.lat.toFixed(6), lon: +S.me.lon.toFixed(6), acc: Math.round(S.me.acc || 0), locAt: now };
  if (S.pid) api.update('players', S.pid, loc).catch(() => {});
  const mm = myMarshal();
  if (S.marshalId && mm && mm.mode !== 'pinned') api.update('marshals', S.marshalId, loc).catch(() => {});
}

/* ============================================================
   Map
   ============================================================ */
let map, storm, zoneC, nextC, draftC, pubLayer, peopleLayer, dropLayer, planC, planHandle, planDragging = false;
// The storm only needs to cover the playable box, plus a margin so its edge never shows.
const BOUNDS = DEFAULTS.bounds || [[52.150, 0.035], [52.262, 0.215]];
const OUTER = (([[s, w], [n, e]]) => [[n + .03, w - .05], [n + .03, e + .05], [s - .03, e + .05], [s - .03, w - .05]])(BOUNDS);
function initMap() {
  map = L.map('map', {
    zoomControl: false, attributionControl: true, tap: true,
    maxBounds: BOUNDS, maxBoundsViscosity: 1, minZoom: DEFAULTS.minZoom || 12
  }).setView(DEFAULTS.center, 14);
  const t = DEFAULTS.tiles || {};
  L.tileLayer(t.url || 'https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: t.maxZoom || 19, minZoom: DEFAULTS.minZoom || 12, bounds: BOUNDS, keepBuffer: 1,
    attribution: t.attribution || '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
  }).addTo(map);
  storm = L.polygon([OUTER], { stroke: false, fillColor: '#A23CFF', fillOpacity: .36, interactive: false }).addTo(map);
  zoneC = L.circle(DEFAULTS.center, { radius: DEFAULTS.radiusM, color: '#FFFFFF', weight: 3, fill: false, interactive: false }).addTo(map);
  nextC = L.circle(DEFAULTS.center, { radius: 1, color: '#FFFFFF', weight: 4, dashArray: '12 8', fill: false, interactive: false, className: 'next-zone' });
  draftC = L.circle(DEFAULTS.center, { radius: 1, color: '#FFE81A', weight: 3, dashArray: '6 6', fill: false, interactive: false });
  planC = L.circle(DEFAULTS.center, { radius: 1, color: '#FFE81A', weight: 4, fillColor: '#FFE81A', fillOpacity: .08, interactive: false });
  planHandle = L.marker(DEFAULTS.center, { draggable: true, zIndexOffset: 3000, keyboard: false, icon: L.divIcon({ className: 'pin', html: '<div class="pin-plan"></div>', iconSize: [30, 30], iconAnchor: [15, 15] }) });
  planHandle.on('dragstart', () => { planDragging = true; });
  planHandle.on('drag', e => { const ll = e.target.getLatLng(); S.plan.center = [+ll.lat.toFixed(6), +ll.lng.toFixed(6)]; renderPlanner(); });
  planHandle.on('dragend', () => { planDragging = false; renderAll(); });
  pubLayer = L.layerGroup().addTo(map);
  dropLayer = L.layerGroup().addTo(map);
  peopleLayer = L.layerGroup().addTo(map);
  map.on('click', onMapClick);
  $('#planBtn').onclick = openPlanner;
  $('#locateBtn').onclick = () => { if (S.me) map.setView([S.me.lat, S.me.lon], Math.max(map.getZoom(), 16)); else startGps(); };
  $('#zoneBtn').onclick = () => fitZone();
  $('#gpsCta').onclick = startGps;
}
function maybeFit() {
  if (S.fitted || $('#app').hidden || $('#view-map').hidden) return;
  map.invalidateSize(); const sz = map.getSize();
  if (sz.x < 50 || sz.y < 50) return;
  S.fitted = true; fitZone();
}
const fitTo = (z, pad = 16) => map.fitBounds([offset(z.center, -z.r, -z.r), offset(z.center, z.r, z.r)], { padding: [pad, pad] });
const fitZone = () => fitTo(zoneNow().cur);

function markerSet(layer) {
  const ms = new Map();
  return items => {
    const seen = new Set();
    for (const it of items) {
      seen.add(it.key);
      let m = ms.get(it.key);
      const icon = () => L.divIcon({ className: 'pin', html: it.html, iconSize: it.size, iconAnchor: it.anchor });
      if (!m) { m = L.marker(it.at, { icon: icon(), keyboard: false, zIndexOffset: it.z || 0 }).addTo(layer); m._html = it.html; ms.set(it.key, m); }
      else { m.setLatLng(it.at); if (m._html !== it.html) { m.setIcon(icon()); m._html = it.html; } m.setZIndexOffset(it.z || 0); }
      m.off('click'); m.on('click', () => (S.pick ? onMapClick({ latlng: m.getLatLng() }) : it.click?.()));
    }
    for (const [k, m] of ms) if (!seen.has(k)) { layer.removeLayer(m); ms.delete(k); }
  };
}
let syncPubs, syncPeople, syncDrops;
const CRATE = '<svg viewBox="0 0 40 40"><path d="M5 15a15 11 0 0 1 30 0z" fill="#FFE81A" stroke="#0B1440" stroke-width="2"/><path d="M8 15l7 9M32 15l-7 9M20 15v9" stroke="#0B1440" stroke-width="1.6"/><rect x="10" y="23" width="20" height="15" rx="2" fill="#2EC2FF" stroke="#0B1440" stroke-width="2.5"/><path d="M10 30h20M20 23v15" stroke="#0B1440" stroke-width="2"/></svg>';
const MUG = '<svg viewBox="0 0 24 24"><path d="M4 4h12v3h2.5A2.5 2.5 0 0 1 21 9.5v5a2.5 2.5 0 0 1-2.5 2.5H16v4H4zM16 9v6h2a1 1 0 0 0 1-1v-4a1 1 0 0 0-1-1z"/></svg>';

let lastZoneKey = '';
function renderZoneLayers() {
  const { cur, next } = zoneNow();
  const key = cur.center.map(v => v.toFixed(6)).join() + cur.r.toFixed(1) + (next ? next.center.join() + next.r : '') + (S.draft ? S.draft.center.join() + S.draft.r : '');
  if (key === lastZoneKey) return; lastZoneKey = key;
  storm.setLatLngs([OUTER, circlePts(cur.center, cur.r)]);
  zoneC.setLatLng(cur.center).setRadius(cur.r);
  if (next) { nextC.setLatLng(next.center).setRadius(next.r); if (!map.hasLayer(nextC)) nextC.addTo(map); } else nextC.remove();
  if (S.draft) { draftC.setLatLng(S.draft.center).setRadius(S.draft.r); if (!map.hasLayer(draftC)) draftC.addTo(map); } else draftC.remove();
}
function renderMarkers() {
  const P = pMap(), mine = myCrew();
  // pubs
  const pubItems = S.pubs.map(pub => {
    const n = crewsAtPub(pub, P).length, max = chestMax(pub), left = max ? chestLeft(pub) : 0;
    const chest = max ? `<span class="pin-chest${left === 0 ? ' empty' : left <= Math.ceil(max / 3) ? ' low' : ''}" title="Chest: ${left} of ${max} left">${left}</span>` : '';
    return { key: pub.id, at: [pub.lat, pub.lon], size: [34, 34], anchor: [17, 41], z: 100,
      html: `<div class="pin-pub${n >= 2 ? ' hot' : ''}">${MUG}</div>${n ? `<span class="pin-count">${n}</span>` : ''}${chest}`,
      click: () => (S.plan ? togglePub(pub) : openPub(pub.id)) };
  });
  if (S.admin && S.plan) for (const c of S.candidates) if (!inPlay(c.id))
    pubItems.push({ key: c.id, at: [c.lat, c.lon], size: [34, 34], anchor: [17, 41], z: 0, html: `<div class="pin-pub off">${MUG}</div>`, click: () => (S.plan ? togglePub(c) : openPub(c.id)) });
  syncPubs(pubItems);
  // marshals = supply drops, visible to everyone
  syncDrops(S.marshals.filter(m => typeof m.lat === 'number').map(m => ({
    key: m.id, at: [m.lat, m.lon], size: [38, 38], anchor: [19, 36], z: 500,
    html: `<div class="pin-drop ${m.status === 'empty' || m.status === 'break' ? 'empty' : 'stocked'}">${CRATE}</div><span class="pin-label" style="top:38px">${esc(m.name.split(' ').slice(0, 2).join(' '))}</span>`,
    click: () => openDrop(m.id)
  })));
  // people
  const reveal = S.admin || isMarshal() || S.settings.revealAll || (mine && reconUntil(mine.id));
  const people = [];
  for (const c of crews()) {
    const ours = mine && c.id === mine.id, exposed = exposedUntil(c, P);
    if (!ours && !reveal && !exposed) continue;
    for (const id of c.members) {
      const p = P[id]; if (!fresh(p) || id === S.pid) continue;
      if (!isAlive(p) && !canJudge()) continue;
      people.push({ key: id, at: [p.lat, p.lon], size: [28, 28], anchor: [14, 14], z: 200,
        html: `<div class="pin-person${ours ? '' : ' enemy'}${isAlive(p) ? '' : ' dead'}${exposed ? ' exposed' : ''}" style="background:${c.color}">${esc(p.name.trim()[0] || '?').toUpperCase()}</div><span class="pin-label">${esc(p.name.split(' ')[0])}</span>` });
    }
  }
  if (S.me) people.push({ key: '_me', at: [S.me.lat, S.me.lon], size: [22, 22], anchor: [11, 11], z: 1000, html: '<div class="pin-person me"></div>' });
  syncPeople(people);
}

function onMapClick(e) {
  const ll = [e.latlng.lat, e.latlng.lng];
  if (S.plan) { S.plan.center = ll.map(v => +v.toFixed(6)); renderAll(); return; }
  if (S.pick === 'spot') { S.pick = null; save(api.update('marshals', S.marshalId, { lat: +ll[0].toFixed(6), lon: +ll[1].toFixed(6), locAt: Date.now(), mode: 'pinned', pubId: null }), 'Your spot is pinned.').then(() => showView('marshal')); return; }
  if (S.pick === 'teleport') { S.me = { lat: ll[0], lon: ll[1], acc: 5, at: Date.now() }; S.gps = 'on'; S.pick = null; pushLoc(true); renderAll(); toast('Moved you here.'); return; }
  if (S.openPub || S.openDrop) closePub();
}

/* ============================================================
   HUD & storm warning
   ============================================================ */
function renderHud() {
  const now = Date.now(), { cur, next, stage, z } = zoneNow(now), P = pMap();
  let label, timer;
  if (stage === 'hold') { label = 'Storm moves in'; timer = fmtClock(z.shrinkStart - now); }
  else if (stage === 'closing') { label = 'Storm closing'; timer = fmtClock(z.shrinkEnd - now); }
  else { label = stage === 'none' ? 'Warm-up · zone' : `Phase ${z.phase} · locked`; timer = fmtDist(cur.r * 2); }
  $('#hudPhase').textContent = label; $('#hudTimer').textContent = timer;
  const inCrews = crews().length ? crews().flatMap(c => c.members) : S.players.map(p => p.id);
  $('#hudAlive').textContent = inCrews.filter(id => isAlive(P[id])).length;
  $('#hudCrews').textContent = aliveCrews(P).length;
  $('#planBtn').hidden = !S.admin;

  const w = $('#stormWarning');
  const me = S.me && S.pid && isAlive(P[S.pid]) ? S.me : null;
  if (me && !inZone(me, cur)) {
    const d = dist(me, cur.center) - cur.r;
    w.hidden = false; w.className = 'storm-warning';
    w.replaceChildren("You're in the storm", h('small', { text: `Safe zone is ${fmtDist(d)} ${bearing([me.lat, me.lon], cur.center)}. Get inside or lose your life.` }));
  } else if (me && next && !inZone(me, next)) {
    const d = dist(me, next.center) - next.r;
    w.hidden = false; w.className = 'storm-warning soon';
    w.replaceChildren('Move to the next zone', h('small', { text: `${fmtDist(d)} ${bearing([me.lat, me.lon], next.center)} · ${stage === 'hold' ? 'storm moves in ' + fmtClock(z.shrinkStart - now) : 'closing now'}` }));
  } else {
    const mc = myCrew(), ex = mc && exposedUntil(mc, P), rc = mc && reconUntil(mc.id);
    if (ex) { w.hidden = false; w.className = 'storm-warning'; w.replaceChildren('Exposed', h('small', { text: `Everyone can see your crew and you can't forfeit for ${fmtClock(ex - now)}.` })); }
    else if (rc) { w.hidden = false; w.className = 'storm-warning soon'; w.replaceChildren('Recon active', h('small', { text: `Every crew is on your map for ${fmtClock(rc - now)}.` })); }
    else w.hidden = true;
  }

  const cta = $('#gpsCta');
  cta.hidden = !((S.pid || (isMarshal() && myMarshal()?.mode !== 'pinned')) && S.view === 'map' && S.gps !== 'on' && !S.pick);
  cta.textContent = S.gps === 'asking' ? 'Finding you…' : S.gps === 'denied' ? 'Location blocked' : 'Share my location';
  const tip = $('#adminTip');
  tip.hidden = !S.pick;
  if (S.pick) tip.replaceChildren(S.pick === 'spot' ? 'Tap the map where you are standing' : 'Tap the map to move yourself there', ' ', h('button', { class: 'link', type: 'button', text: 'Cancel', onclick: () => { S.pick = null; renderAll(); } }));
}

/* ============================================================
   Pub sheet & challenges
   ============================================================ */
function openPub(id) { S.openPub = id; S.openDrop = null; S.challenge = null; renderPub(); const p = pubById(id); if (p) map.panTo([p.lat, p.lon]); }
function openDrop(id) { S.openDrop = id; S.openPub = null; renderPub(); const m = S.marshals.find(x => x.id === id); if (m) map.panTo([m.lat, m.lon]); }
function closePub() { S.openPub = null; S.openDrop = null; S.challenge = null; $('#pubSheet').hidden = true; }
function renderDrop() {
  const sheet = $('#pubSheet'), m = S.marshals.find(x => x.id === S.openDrop);
  if (!m || typeof m.lat !== 'number' || S.view !== 'map') { sheet.hidden = true; return; }
  sheet.hidden = false;
  const st = m.status || 'stocked', kids = [h('div', { class: 'kicker', text: 'Supply drop · Marshal' }), h('h2', { text: m.name })];
  const dirs = h('a', { class: 'link', href: `https://www.google.com/maps/dir/?api=1&destination=${m.lat},${m.lon}&travelmode=walking`, target: '_blank', rel: 'noopener', text: 'Directions' });
  kids.push(h('div', { class: 'row' }, h('span', { class: 'pill ' + (st === 'stocked' ? 'green' : st === 'low' ? 'yellow' : 'red'), text: MARSHAL_STATUS[st] }),
    h('span', { class: 'pill', text: m.mode === 'pinned' ? 'Fixed spot' : 'Live · seen ' + ago(m.locAt || Date.now()) }),
    S.me ? h('span', { class: 'pill', text: `${fmtDist(dist(S.me, m))} · ${Math.max(1, Math.round(dist(S.me, m) / 80))} min walk` }) : null, dirs));
  if (m.note) kids.push(h('p', { text: m.note }));
  kids.push(h('div', { class: 'row', style: { flexWrap: 'nowrap' } }, h('img', { class: 'reboot-card', src: 'img/loot/reboot.png', alt: '' }), h('p', { class: 'fine', text: `Marshals carry the drinks, referee duels and patrol the storm. Knocked out? Get here to be rebooted, but your crew is exposed for ${DEFAULTS.rebootExposedMin || 10} minutes.` })));
  patch($('#pubBody'), kids);
}
$('#pubClose').onclick = closePub;

function renderPub() {
  if (S.openDrop) return renderDrop();
  const sheet = $('#pubSheet'), pub = S.openPub && pubById(S.openPub);
  if (!pub || S.view !== 'map') { sheet.hidden = true; return; }
  sheet.hidden = false;
  const P = pMap(), active = S.pubs.some(p => p.id === pub.id), here = active ? crewsAtPub(pub, P) : [];
  const mine = myCrew(), meP = P[S.pid];
  const meHere = meP && S.me && dist(S.me, pub) <= DEFAULTS.pubRadiusM;
  const kids = [h('div', { class: 'kicker', text: active ? 'Drop pub' : 'Not in play' }), h('h2', { text: pub.name })];
  const dirs = h('a', { class: 'link', href: `https://www.google.com/maps/dir/?api=1&destination=${pub.lat},${pub.lon}&travelmode=walking`, target: '_blank', rel: 'noopener', text: 'Directions' });
  if (S.me) { const d = dist(S.me, pub); kids.push(h('div', { class: 'row' }, h('span', { class: 'pill' + (meHere ? ' green' : ''), text: meHere ? "You're here" : `${fmtDist(d)} · ${Math.max(1, Math.round(d / 80))} min walk` }), dirs)); }
  else kids.push(h('div', { class: 'row' }, dirs));
  if (active) {
    const { cur } = zoneNow();
    if (!inZone(pub, cur)) kids.push(h('div', { class: 'pill storm', text: 'In the storm' }));
    const stationed = S.marshals.filter(m => m.pubId === pub.id);
    if (stationed.length) kids.push(h('div', { class: 'row' }, stationed.map(m => h('span', { class: 'pill green', text: `Marshal ${m.name.replace(/^marshal\s+/i, '')} is here · reboots` }))));
    kids.push(...chestBlock(pub, meHere, mine, meP));
    kids.push(h('div', { class: 'display', style: { fontSize: '26px' }, text: here.length === 1 ? '1 crew inside' : `${here.length} crews inside` }));
    const canSee = meHere || canJudge();
    if (!canSee) kids.push(h('p', { class: 'fine', text: here.length ? 'Get inside to see who it is and challenge them.' : 'Nobody here yet.' }));
    else {
      const myOpen = mine && openDuelFor(mine.id);
      if (S.challenge) kids.push(challengePicker(pub, S.challenge));
      else kids.push(h('div', { class: 'list' }, here.map(({ crew, here: ppl }) => {
        const ours = mine && crew.id === mine.id, theirOpen = openDuelFor(crew.id);
        let action = null;
        if (!ours && mine && meHere && isAlive(meP)) {
          if (myOpen) action = h('span', { class: 'pill', text: 'Finish your duel first' });
          else if (theirOpen) action = h('span', { class: 'pill', text: 'Busy duelling' });
          else action = h('button', { class: 'btn btn-yellow btn-sm', type: 'button', text: 'Challenge', onclick: () => { S.challenge = crew.id; renderPub(); } });
        }
        return h('div', { class: 'item' + (ours ? ' mine' : '') }, h('span', { class: 'swatch', style: { background: crew.color } }),
          h('div', { class: 'grow' }, h('div', { class: 'name', text: crew.name + (ours ? ' (you)' : '') }), h('div', { class: 'sub', text: `${ppl.length} here · ${aliveIn(crew, P).length} alive` })), action);
      })));
      if (mine && !isAlive(meP)) kids.push(h('p', { class: 'fine', text: "You're out, so you can't start duels. Cheer your crew on." }));
    }
  }
  if (S.admin) kids.push(h('button', { class: 'btn ' + (active ? 'btn-ghost' : 'btn-blue') + ' btn-sm', type: 'button', text: active ? 'Take out of play' : 'Put in play', onclick: () => togglePub(pub) }));
  patch($('#pubBody'), kids);
}
function chestBlock(pub, meHere, mine, meP) {
  const max = chestMax(pub), out = [];
  if (!max) {
    if (S.admin) out.push(h('button', { class: 'btn btn-ghost btn-sm', type: 'button', text: 'Add a loot chest here', onclick: () => save(api.update('pubs', pub.id, { chestMax: DEFAULTS.chestOpens || 5 }), 'Chest added.') }));
    return out;
  }
  const left = chestLeft(pub), opened = mine && crewOpened(pub, mine.id);
  const box = [h('div', { class: 'row spread' }, h('span', { class: 'display', style: { fontSize: '22px' }, text: 'Loot chest' }),
    h('span', { class: 'pill ' + (left === 0 ? 'red' : left <= Math.ceil(max / 3) ? 'yellow' : 'green'), text: left ? `${left} of ${max} left` : 'Empty' })),
    h('div', { class: 'meter' }, h('i', { style: { width: (left / max * 100) + '%' } }))];
  if (mine) {
    if (opened) box.push(h('p', { class: 'fine', text: 'Your crew has opened this chest. One open per crew.' }));
    else if (!left) box.push(h('p', { class: 'fine', text: 'Emptied. Try another pub.' }));
    else if (!meHere) box.push(h('p', { class: 'fine', text: 'Get inside to open it. One open per crew.' }));
    else if (!isAlive(meP)) box.push(h('p', { class: 'fine', text: "You're out. A crewmate who's still in can open it." }));
    else box.push(h('button', { class: 'btn btn-blue', type: 'button', text: 'Open chest', onclick: e => { e.target.disabled = true; openChest(pub); } }));
  }
  if (S.admin) box.push(h('div', { class: 'row' },
    h('button', { class: 'btn btn-ghost btn-sm', type: 'button', text: '− open', onclick: () => save(api.update('pubs', pub.id, { chestMax: Math.max(0, max - 1) })) }),
    h('button', { class: 'btn btn-ghost btn-sm', type: 'button', text: '+ open', onclick: () => save(api.update('pubs', pub.id, { chestMax: max + 1 })) }),
    h('button', { class: 'btn btn-ghost btn-sm', type: 'button', text: 'Refill', onclick: e => confirmTap(e.target, () => save(api.update('pubs', pub.id, { chestRound: chestRound(pub) + 1 }), 'Chest refilled. Every crew can open it again.'), 'Refill?') })));
  out.push(h('div', { class: 'chest' }, box));
  return out;
}
async function openChest(pub) {
  const mine = myCrew(); if (!mine) return;
  const round = chestRound(pub), id = `${pub.id}_${round}_${mine.id}`;
  if (S.items.some(i => i.id === id)) { toast('Your crew already opened this chest.'); return; }
  if (!chestLeft(pub)) { toast('This chest is empty.'); return; }
  const type = rollLoot();
  if (!(await save(api.set('items', id, { crewId: mine.id, type, pubId: pub.id, pubName: pub.name, round, at: Date.now(), by: S.pid })))) return;
  S.reveal = id; renderAll();
  // Two crews can open the last slot at the same moment; the later one gives it back.
  setTimeout(async () => {
    const opens = chestOpens(pub), idx = opens.findIndex(i => i.id === id);
    if (idx >= chestMax(pub)) { await api.del('items', id); if (S.reveal === id) S.reveal = null; toast('Another crew emptied the chest a moment before you.'); renderAll(); return; }
    await logEvent(`${mine.name} looted the chest at ${pub.name}.` + (idx === chestMax(pub) - 1 ? ` That chest is now empty.` : ''));
  }, 1500);
}
function challengePicker(pub, targetId) {
  const target = crewById(targetId); let pick = S.challengeGame || GAMES[0].id;
  const wrap = h('div', { class: 'stack' });
  const draw = () => wrap.replaceChildren(
    h('div', { class: 'kicker', text: 'Challenge ' + target.name + ' to' }),
    h('div', { class: 'games' }, GAMES.map(g => h('button', { class: 'game', type: 'button', 'aria-pressed': String(g.id === pick), onclick: () => { pick = S.challengeGame = g.id; draw(); } }, h('b', { text: g.name }), h('span', { text: g.desc })))),
    myCrew() && hasItem(myCrew().id, 'boogie') ? h('button', { class: 'game', type: 'button', 'aria-pressed': String(S.challengeBoogie), style: { borderColor: RARITY.epic }, onclick: () => { S.challengeBoogie = !S.challengeBoogie; draw(); } },
      h('b', { text: (S.challengeBoogie ? 'Boogie Bomb: thrown' : 'Throw a Boogie Bomb?') }), h('span', { text: "They can't forfeit this one. Uses up your Boogie Bomb." })) : null,
    exposedUntil(target) ? h('p', { class: 'fine', text: `${target.name} are exposed after a reboot: they can't forfeit.` }) : null,
    h('div', { class: 'grid2' }, h('button', { class: 'btn btn-ghost', type: 'button', text: 'Back', onclick: () => { S.challenge = null; renderPub(); } }),
      h('button', { class: 'btn btn-yellow', type: 'button', text: 'Send it', onclick: () => sendChallenge(pub, target, pick) })));
  draw(); return wrap;
}
async function sendChallenge(pub, target, game) {
  const mine = myCrew(); if (!mine) return;
  if (openDuelFor(mine.id) || openDuelFor(target.id)) { toast('One of you is already in a duel.'); return; }
  const id = api.newId();
  const boogie = S.challengeBoogie && hasItem(mine.id, 'boogie');
  const ok = await save(api.set('duels', id, { pubId: pub.id, pubName: pub.name, from: mine.id, to: target.id, game, status: 'pending', createdAt: Date.now(), by: S.pid, boogie: !!boogie }), 'Challenge sent to ' + target.name + '.');
  if (ok) {
    if (boogie) await useItem(boogie, { usedOn: id });
    logEvent(`${mine.name} challenged ${target.name} to ${gameName(game)} at ${pub.name}.` + (boogie ? ' Boogie Bomb! No forfeits.' : ''));
    S.challenge = null; S.challengeBoogie = false; closePub();
  }
}
async function togglePub(pub) {
  if (S.pubs.some(p => p.id === pub.id)) await save(api.del('pubs', pub.id), pub.name + ' taken out of play.');
  else await save(api.set('pubs', pub.id, { name: pub.name, lat: pub.lat, lon: pub.lon, kind: pub.kind || 'pub', addedAt: Date.now() }), pub.name + ' is in play.');
}

/* duel actions */
const dUpdate = (d, data) => save(api.update('duels', d.id, data));
async function finishDuel(d, winnerId, outs, how, fx = {}) {
  outs = (Array.isArray(outs) ? outs : outs ? [outs] : []).filter(Boolean);
  const loserId = winnerId === d.from ? d.to : d.from, W = crewById(winnerId), Lc = crewById(loserId), P = pMap();
  const ok = await dUpdate(d, { status: 'done', winner: winnerId, out: outs[0] || null, outs, how, doneAt: Date.now(), shield: !!fx.shieldId, rocket: !!fx.rocketId });
  if (!ok) return;
  for (const id of outs) await api.update('players', id, { alive: false, outAt: Date.now(), outBy: winnerId });
  if (fx.shieldId) await api.update('items', fx.shieldId, { usedAt: Date.now(), usedOn: d.id });
  if (fx.rocketId) await api.update('items', fx.rocketId, { usedAt: Date.now(), usedOn: d.id });
  const verb = how === 'forfeit' ? `${Lc?.name} forfeited to ${W?.name}` : how === 'airstrike' ? `${W?.name} hit ${Lc?.name} with a Rocket Launcher` : `${W?.name} beat ${Lc?.name} at ${gameName(d.game)}`;
  const judge = how === 'marshal' ? `, judged by ${myMarshal()?.name || 'a marshal'}` : how === 'hq' ? ', judged by the organisers' : '';
  const names = outs.map(id => P[id]?.name).filter(Boolean);
  await logEvent(`${verb}${how === 'airstrike' ? '' : ` (${d.pubName}${judge})`}.` + (fx.rocketId ? ' Golden SCAR!' : '') + (fx.shieldId ? ' A Shield Potion saved a rower.' : '') + (names.length ? ` ${names.join(' and ')} ${names.length > 1 ? 'are' : 'is'} out.` : ' Nobody is out.'));
  const left = Lc ? Lc.members.filter(id => !outs.includes(id) && isAlive(P[id])).length : 1;
  if (Lc && left === 0) await logEvent(`${Lc.name} have been sunk.`);
  S.outFor = null; renderAll();
}
function askOut(d, winnerId, how) { S.outFor = { duelId: d.id, winnerId, how, d, sel: [], useShield: false }; renderAll(); }

/* ============================================================
   Modal (incoming challenges, results)
   ============================================================ */
const canForfeit = (d, crew) => !d.boogie && !exposedUntil(crew);
const noForfeitNote = (d, crew) => d.boogie ? h('p', { style: { color: '#FFE81A', fontWeight: 800 }, text: "Boogie Bomb! You can't forfeit this one." })
  : exposedUntil(crew) ? h('p', { style: { color: '#FFE81A', fontWeight: 800 }, text: "You're exposed after a reboot: no forfeits." }) : null;
async function callAirstrike(it, target) {
  const c = myCrew(), id = api.newId();
  if (!(await save(api.set('duels', id, { pubId: null, pubName: 'Rocket strike', from: c.id, to: target.id, game: 'airstrike', status: 'strike', createdAt: Date.now(), by: S.pid })))) return;
  await useItem(it, { usedOn: id });
  await logEvent(`${c.name} fired a Rocket Launcher at ${target.name}!`);
  S.itemUse = null; renderAll(); toast('Rocket away. They pick who goes down.');
}
const put = (el, ...kids) => el.replaceChildren(...kids.flat().filter(k => k != null && k !== false));
function renderModal() {
  const m = $('#modal'), card = $('#modalCard'), mine = myCrew(), P = pMap();
  if (S.outFor) {
    const o = S.outFor, d = S.duels.find(x => x.id === o.duelId) || o.d;
    const loserId = d && (o.winnerId === d.from ? d.to : d.from), Lc = loserId && crewById(loserId);
    if (!d || !Lc) { S.outFor = null; m.hidden = true; return; }
    const alive = aliveIn(Lc, P), exposed = exposedUntil(Lc, P) > 0;
    const rocket = o.how === 'forfeit' || o.how === 'airstrike' ? null : hasItem(o.winnerId, 'scar');
    const shieldItem = hasItem(Lc.id, 'shield'), shield = exposed ? null : shieldItem;
    let need = (rocket ? 2 : 1) - (o.useShield && shield ? 1 : 0);
    need = Math.max(0, Math.min(need, alive.length));
    o.sel = (o.sel || []).filter(id => alive.includes(id)).slice(0, need);
    const toggle = id => { if (o.sel.includes(id)) o.sel = o.sel.filter(x => x !== id); else if (o.sel.length < need) o.sel.push(id); else o.sel = [...o.sel.slice(0, need - 1), id]; renderModal(); };
    m.hidden = false;
    put(card, 
      h('div', { class: 'kicker', style: { color: '#fff' }, text: (o.how === 'airstrike' ? 'Rocket Launcher' : gameName(d.game) + ' · ' + d.pubName) }),
      h('h2', { text: need ? "Who's out?" : 'Shield up!' }),
      rocket ? h('p', { style: { color: '#FFE81A', fontWeight: 800 }, text: `Golden SCAR! ${Lc.name} lose two rowers.` }) : null,
      shield ? h('button', { class: 'btn btn-block ' + (o.useShield ? 'btn-blue' : 'btn-ghost'), type: 'button', text: o.useShield ? 'Shield Potion drunk: one rower saved' : 'Drink a Shield Potion (saves one rower)', onclick: () => { o.useShield = !o.useShield; renderModal(); } }) : null,
      exposed && shieldItem ? h('p', { class: 'fine', style: { color: '#fff' }, text: "Exposed after a reboot, so shields don't work." }) : null,
      need ? h('p', { text: `${Lc.name}: pick ${need === 1 ? 'one rower' : need + ' rowers'}.` }) : h('p', { text: `The shield takes the hit. ${Lc.name} keep everyone.` }),
      need ? h('div', { class: 'list' }, alive.map(id => h('button', { class: 'btn btn-block ' + (o.sel.includes(id) ? 'btn-yellow' : 'btn-ghost'), type: 'button', 'aria-pressed': String(o.sel.includes(id)), text: P[id].name, onclick: () => toggle(id) }))) : null,
      h('button', { class: 'btn ' + (need ? 'btn-red' : 'btn-yellow'), type: 'button', disabled: o.sel.length !== need,
        text: !need ? 'Confirm' : o.sel.length === need ? o.sel.map(id => P[id].name.split(' ')[0]).join(' & ') + (need > 1 ? ' are out' : ' is out') : `Pick ${need - o.sel.length} more`,
        onclick: () => finishDuel(d, o.winnerId, o.sel, o.how, { shieldId: o.useShield && shield ? shield.id : null, rocketId: rocket && alive.length ? rocket.id : null }) }),
      h('button', { class: 'link', type: 'button', text: 'Cancel', onclick: () => { S.outFor = null; renderAll(); } }));
    return;
  }
  if (S.reveal) {
    const it = S.items.find(i => i.id === S.reveal);
    if (!it) { m.hidden = true; return; }
    const L = lootDef(it.type), col = RARITY[L.rarity] || RARITY.common;
    m.hidden = false;
    put(card, h('div', { class: 'stack reveal', style: { '--rc': col, borderRadius: '10px', padding: '18px 8px', alignItems: 'center' } },
      lootTile(L, 128), h('div', { class: 'rarity', style: { color: '#0B1440', background: col, padding: '3px 12px', borderRadius: '4px', alignSelf: 'center' }, text: L.rarity }), h('h2', { text: L.name }), h('p', { text: L.desc })),
      h('p', { class: 'fine', style: { color: '#fff' }, text: 'Saved to your crew’s loot on the Crew tab.' }),
      h('button', { class: 'btn btn-yellow', type: 'button', text: 'Nice', onclick: () => { S.reveal = null; renderAll(); } }));
    return;
  }
  if (S.itemUse) {
    const it = S.items.find(i => i.id === S.itemUse && !i.usedAt), c = myCrew();
    if (!it || !c) { S.itemUse = null; m.hidden = true; return; }
    const L = lootDef(it.type), close = () => { S.itemUse = null; renderAll(); };
    m.hidden = false;
    if (it.type === 'medkit') {
      const down = c.members.filter(id => P[id] && !isAlive(P[id]));
      put(card, h('div', { class: 'kicker', style: { color: '#fff' }, text: L.name }), h('h2', { text: 'Who gets patched up?' }),
        h('div', { class: 'list' }, down.map(id => h('button', { class: 'btn btn-ghost btn-block', type: 'button', text: P[id].name, onclick: async () => { await useItem(it, { usedOn: id }); await revive(P[id], 'a Med Kit', 'medkit'); close(); } }))),
        down.length ? null : h('p', { text: 'Nobody in your crew is down.' }), h('button', { class: 'link', type: 'button', text: 'Cancel', onclick: close }));
    } else if (it.type === 'rocket') {
      const targets = aliveCrews(P).filter(x => x.id !== c.id && !openDuelFor(x.id));
      put(card, h('div', { class: 'kicker', style: { color: '#fff' }, text: L.name }), h('h2', { text: 'Pick a target' }),
        h('p', { text: 'Any crew, anywhere. They lose a rower. Their Shield Potion can block it.' }),
        h('div', { class: 'list' }, targets.map(t => h('button', { class: 'btn btn-ghost btn-block', type: 'button', text: `${t.name} (${aliveIn(t, P).length} left)`, onclick: e => confirmTap(e.target, () => callAirstrike(it, t), 'Tap again: fire!') }))),
        targets.length ? null : h('p', { text: 'No crew can be hit right now.' }), h('button', { class: 'link', type: 'button', text: 'Cancel', onclick: close }));
    } else { S.itemUse = null; m.hidden = true; }
    return;
  }
  if (mine) {
    const strike = S.duels.find(d => d.status === 'strike' && d.to === mine.id && !S.later.has(d.id + d.status));
    if (strike) {
      const from = crewById(strike.from);
      m.hidden = false;
      put(card, h('div', { class: 'kicker', style: { color: '#fff' }, text: 'Incoming' }), h('h2', { text: 'Rocket inbound!' }),
        h('p', { text: `${from?.name || 'Another crew'} fired a Rocket Launcher at you. One rower goes down.` }),
        h('button', { class: 'btn btn-yellow', type: 'button', text: "Pick who's hit", onclick: () => askOut(strike, strike.from, 'airstrike') }),
        h('button', { class: 'link', type: 'button', text: 'Later', style: { color: '#fff' }, onclick: () => { S.later.add(strike.id + strike.status); renderAll(); } }));
      return;
    }
  }
  if (mine) {
    const incoming = S.duels.find(d => d.status === 'pending' && d.to === mine.id && !S.later.has(d.id + d.status));
    const claimed = S.duels.find(d => d.status === 'claimed' && (d.from === mine.id || d.to === mine.id) && d.winner !== mine.id && !S.later.has(d.id + d.status));
    const d = incoming || claimed;
    if (d) {
      const other = crewById(d.from === mine.id ? d.to : d.from);
      m.hidden = false;
      const later = h('button', { class: 'link', type: 'button', text: 'Later', style: { color: '#fff' }, onclick: () => { S.later.add(d.id + d.status); renderAll(); } });
      if (incoming) put(card, h('div', { class: 'kicker', style: { color: '#fff' }, text: 'Incoming · ' + d.pubName }), h('h2', { text: other?.name + ' challenge you' }),
        h('div', { class: 'display', style: { fontSize: '30px', color: '#FFE81A' }, text: gameName(d.game) }),
        h('p', { text: GAMES.find(g => g.id === d.game)?.desc || '' }),
        noForfeitNote(d, mine),
        h('div', { class: canForfeit(d, mine) ? 'grid2' : 'stack' }, canForfeit(d, mine) ? h('button', { class: 'btn btn-ghost', type: 'button', text: 'Forfeit', onclick: e => confirmTap(e.target, () => askOut(d, d.from, 'forfeit'), 'Lose a rower?') }) : null,
          h('button', { class: 'btn btn-yellow', type: 'button', text: 'Accept', onclick: () => dUpdate(d, { status: 'live', acceptedAt: Date.now() }) })), later);
      else put(card, h('div', { class: 'kicker', style: { color: '#fff' }, text: gameName(d.game) + ' · ' + d.pubName }), h('h2', { text: other?.name + ' say they won' }),
        h('div', { class: 'grid2' }, h('button', { class: 'btn btn-ghost', type: 'button', text: 'Dispute', onclick: () => dUpdate(d, { status: 'disputed', disputedAt: Date.now() }).then(() => toast('Sent to the organisers to sort out.')) }),
          h('button', { class: 'btn btn-yellow', type: 'button', text: 'Fair. We lost', onclick: () => askOut(d, d.winner, 'duel') })), later);
      return;
    }
  }
  m.hidden = true;
}

/* ============================================================
   Crew tab
   ============================================================ */
function renderCrew() {
  const body = $('#crewBody'), P = pMap(), me = P[S.pid], c = myCrew();
  const kids = [];
  if (!S.pid) {
    kids.push(h('div', { class: 'card' }, h('h2', { text: isMarshal() && !S.admin ? 'Marshalling' : 'Organising' }), h('p', { class: 'fine', text: isMarshal() && !S.admin ? "You're a marshal, not a player. Your tools are on the Marshal tab." : "You're in HQ mode and not playing. Join if you want a crew too." }),
      h('button', { class: 'btn btn-yellow', type: 'button', text: 'Join as a player', onclick: () => { S.forceJoin = true; route(); } })));
  } else if (!c) {
    kids.push(h('div', { class: 'crew-banner' }, h('div', { class: 'kicker', text: me ? me.name + ' · ' + cleanClub(me.club) : '' }), h('h2', { text: 'Waiting for the draw' }), h('div', { class: 'fine', style: { color: '#fff' }, text: `${S.players.length} signed up so far. Your crew appears here once the organisers draw.` })));
    kids.push(h('div', { class: 'card' }, h('h3', { text: 'On the start list' }), h('div', { class: 'list' }, clubsOf(S.players).map(cl => h('div', { class: 'row spread' }, h('b', { text: cl.name }), h('span', { class: 'fine', text: cl.players.map(p => p.name).join(', ') }))))));
  } else {
    const alive = aliveIn(c, P);
    kids.push(h('div', { class: 'crew-banner', style: { '--c1': c.color, '--c2': '#0F2573' } },
      h('div', { class: 'kicker', style: { color: '#fff' }, text: (c.composite ? 'Composite crew · ' : 'Your crew · ') + `${alive.length} of ${c.members.length} alive` }),
      h('h2', { text: c.name }),
      h('div', { class: 'dots' }, c.members.map(id => h('i', { class: isAlive(P[id]) ? '' : 'x' })))));
    kids.push(h('div', { class: 'card' }, c.members.map((id, i) => {
      const p = P[id]; if (!p) return null;
      let sub = cleanClub(p.club);
      if (id !== S.pid) sub += fresh(p) ? ` · ${S.me ? fmtDist(dist(S.me, p)) + ' away · ' : ''}seen ${ago(p.locAt || Date.now())}` : ' · location off';
      return h('div', { class: 'member' + (isAlive(p) ? '' : ' out') }, h('span', { class: 'seat', text: SEATS[i] || '' }),
        h('div', null, h('div', { class: 'who name', text: p.name + (id === S.pid ? ' (you)' : '') }), h('div', { class: 'fine', text: sub })),
        h('span', { class: 'pill ' + (isAlive(p) ? 'green' : 'red'), text: isAlive(p) ? 'Alive' : 'Out' }));
    })));
    const ex = exposedUntil(c, P), rc = reconUntil(c.id);
    if (ex) kids.push(h('div', { class: 'card', style: { borderColor: 'var(--red)' } }, h('h3', { text: `Exposed · ${fmtClock(ex - Date.now())}` }), h('p', { class: 'fine', text: "After a reboot your whole crew shows on everyone's map, you can't forfeit, and shields don't work. Lie low." })));
    const inv = crewItems(c.id);
    kids.push(h('div', { class: 'card' }, h('div', { class: 'row spread' }, h('h3', { text: 'Crew loot' }), pill(`${inv.length} item${inv.length === 1 ? '' : 's'}`)),
      inv.length ? h('div', { class: 'list' }, inv.map(it => {
        const L = lootDef(it.type), col = RARITY[L.rarity];
        let act = null;
        if (it.type === 'shield') act = pill('Offered when you lose', 'green');
        else if (it.type === 'scar') act = pill('Fires on your next win', 'yellow');
        else if (it.type === 'boogie') act = pill('Throw when challenging');
        else if (it.type === 'recon') act = rc ? pill('Scanning') : h('button', { class: 'btn btn-blue btn-sm', type: 'button', text: 'Scan', onclick: e => confirmTap(e.target, async () => { await useItem(it); logEvent(`${c.name} used a Recon Scanner.`); toast('Every crew is on your map for ' + (DEFAULTS.reconMin || 5) + ' minutes.'); showView('map'); }, 'Scan now?') });
        else if (it.type === 'medkit') act = h('button', { class: 'btn btn-blue btn-sm', type: 'button', text: 'Use', disabled: !c.members.some(id => P[id] && !isAlive(P[id])), onclick: () => { S.itemUse = it.id; renderAll(); } });
        else if (it.type === 'rocket') act = h('button', { class: 'btn btn-red btn-sm', type: 'button', text: 'Fire', onclick: () => { S.itemUse = it.id; renderAll(); } });
        return h('div', { class: 'loot-row' }, lootTile(L),
          h('div', null, h('div', { class: 'rarity', style: { color: col }, text: L.rarity }), h('div', { class: 'name', text: L.name }), h('div', { class: 'sub', text: L.desc })), act);
      })) : h('p', { class: 'fine', text: 'No loot yet. Open chests in drop pubs.' })));
    if (me && !isAlive(me) && (DEFAULTS.revivesPerPlayer ?? 1) > (me.revives || 0) && alive.length)
      kids.push(h('div', { class: 'card', style: { borderColor: 'var(--sky)' } }, h('div', { class: 'row' }, h('img', { class: 'reboot-card', src: 'img/loot/reboot.png', alt: '' }), h('h3', { text: "You're out, but not done" })), h('p', { class: 'fine', text: 'Find a marshal (the supply-drop crates on the map) to be revived while your crew is still alive.' })));
  }
  if (S.pid) {
    const gpsTxt = { on: 'Sharing your location', asking: 'Asking for location…', denied: 'Location blocked in browser settings', error: 'No GPS fix yet', off: 'Location not shared' }[S.gps];
    kids.push(h('div', { class: 'card' }, h('div', { class: 'row spread' }, h('span', { class: 'fine', text: gpsTxt }), S.gps !== 'on' ? h('button', { class: 'btn btn-blue btn-sm', type: 'button', text: 'Share location', onclick: startGps }) : null),
      h('button', { class: 'link', type: 'button', text: 'Leave the game', onclick: e => confirmTap(e.target, leaveGame, 'Tap again to leave') })));
  }
  if (!S.admin) kids.push(h('button', { class: 'link', type: 'button', text: 'Staff login', onclick: () => { S.forceJoin = true; route(); $('#pinBox').hidden = false; } }));
  patch(body, kids);
}
async function leaveGame() {
  const id = S.pid; S.pid = null; lsSet('bcbr.pid', null);
  await save(api.del('players', id), 'You left the game.'); route();
}

/* ============================================================
   Duels tab
   ============================================================ */
function duelCard(d, mine) {
  const A = crewById(d.from), B = crewById(d.to), ours = mine && (d.from === mine.id || d.to === mine.id);
  const other = ours ? crewById(d.from === mine.id ? d.to : d.from) : null;
  const status = { pending: 'Waiting for reply', live: 'In progress', claimed: 'Result claimed', disputed: 'Disputed', strike: 'Rocket inbound' }[d.status];
  const kids = [h('div', { class: 'row spread' }, h('span', { class: 'kicker', text: d.pubName }), h('span', { class: 'pill ' + (d.status === 'live' ? 'yellow' : d.status === 'disputed' ? 'red' : ''), text: status })),
    h('h3', { text: d.status === 'strike' ? `${A?.name || '?'} → ${B?.name || '?'}` : `${A?.name || '?'} vs ${B?.name || '?'}` }), h('div', { class: 'display', style: { fontSize: '22px', color: 'var(--yellow)' }, text: d.game === 'airstrike' ? 'Rocket Launcher' : gameName(d.game) + (d.boogie ? ' · Boogie Bomb' : '') })];
  if (ours) {
    if (d.status === 'pending' && d.from === mine.id) kids.push(h('button', { class: 'btn btn-ghost btn-sm', type: 'button', text: 'Cancel challenge', onclick: () => dUpdate(d, { status: 'cancelled' }) }));
    if (d.status === 'pending' && d.to === mine.id) kids.push(noForfeitNote(d, mine), h('div', { class: canForfeit(d, mine) ? 'grid2' : 'stack' }, canForfeit(d, mine) ? h('button', { class: 'btn btn-ghost', type: 'button', text: 'Forfeit', onclick: e => confirmTap(e.target, () => askOut(d, d.from, 'forfeit'), 'Lose a rower?') }) : null, h('button', { class: 'btn btn-yellow', type: 'button', text: 'Accept', onclick: () => dUpdate(d, { status: 'live', acceptedAt: Date.now() }) })));
    if (d.status === 'strike' && d.to === mine.id) kids.push(h('button', { class: 'btn btn-yellow', type: 'button', text: "Pick who's hit", onclick: () => askOut(d, d.from, 'airstrike') }));
    if (d.status === 'strike' && d.from === mine.id) kids.push(h('p', { class: 'fine', text: 'Waiting for them to pick who goes down.' }));
    if (d.status === 'live') kids.push(h('div', { class: 'grid2' }, h('button', { class: 'btn btn-ghost', type: 'button', text: 'We lost', onclick: () => askOut(d, other.id, 'duel') }), h('button', { class: 'btn btn-yellow', type: 'button', text: 'We won', onclick: () => dUpdate(d, { status: 'claimed', winner: mine.id, claimedAt: Date.now() }) })));
    if (d.status === 'claimed' && d.winner === mine.id) kids.push(h('p', { class: 'fine', text: `Waiting for ${other?.name} to confirm.` }));
    if (d.status === 'claimed' && d.winner !== mine.id) kids.push(h('div', { class: 'grid2' }, h('button', { class: 'btn btn-ghost', type: 'button', text: 'Dispute', onclick: () => dUpdate(d, { status: 'disputed' }) }), h('button', { class: 'btn btn-yellow', type: 'button', text: 'Fair. We lost', onclick: () => askOut(d, d.winner, 'duel') })));
    if (d.status === 'disputed') kids.push(h('p', { class: 'fine', text: 'An organiser will decide this one.' }));
  }
  return h('div', { class: 'card', style: ours ? { borderColor: 'var(--yellow)' } : null }, kids);
}
function renderDuels() {
  const mine = myCrew(), P = pMap(), kids = [];
  const al = aliveCrews(P);
  if (crews().length > 1 && al.length === 1) kids.push(h('div', { class: 'winner' }, h('div', { class: 'kicker', text: 'Victory Royale' }), h('h2', { text: al[0].name }), h('div', { text: 'Head of the River. Everyone else buys the next round.' })));
  const open = S.duels.filter(d => OPEN.includes(d.status)).sort((a, b) => b.createdAt - a.createdAt);
  const mineOpen = mine ? open.filter(d => d.from === mine.id || d.to === mine.id) : [];
  kids.push(h('h2', { text: 'Duels' }));
  if (mineOpen.length) kids.push(...mineOpen.map(d => duelCard(d, mine)));
  else kids.push(h('div', { class: 'empty', text: mine ? 'No duel right now. Head to a pub with crews inside and challenge one.' : 'Duels start once crews are drawn.' }));
  const others = open.filter(d => !mineOpen.includes(d));
  if (others.length) kids.push(h('h3', { text: 'Elsewhere' }), ...others.map(d => duelCard(d, mine)));
  // leaderboard
  const ranked = crews().slice().sort((a, b) => aliveIn(b, P).length - aliveIn(a, P).length || a.name.localeCompare(b.name));
  if (ranked.length) kids.push(h('div', { class: 'card' }, h('div', { class: 'row spread' }, h('h3', { text: 'Crews left' }), h('span', { class: 'pill yellow', text: `${al.length} / ${ranked.length}` })),
    h('div', { class: 'list' }, ranked.map(c => { const n = aliveIn(c, P).length; return h('div', { class: 'item' + (n ? '' : ' out') + (mine && c.id === mine.id ? ' mine' : '') }, h('span', { class: 'swatch', style: { background: c.color } }), h('div', { class: 'grow' }, h('div', { class: 'name', text: c.name }), h('div', { class: 'sub', text: n ? `${n} of ${c.members.length} alive` : 'Sunk' })), h('div', { class: 'dots' }, c.members.map(id => h('i', { class: isAlive(P[id]) ? '' : 'x' })))); }))));
  kids.push(h('div', { class: 'card' }, h('h3', { text: 'The games' }), h('div', { class: 'games' }, GAMES.map(g => h('div', { class: 'game', style: { cursor: 'default' } }, h('b', { text: g.name }), h('span', { text: g.desc })))),
    h('p', { class: 'fine', text: 'Challenges happen in drop pubs only. Accept or forfeit. The losing crew picks one rower to go out. One life each.' })));
  kids.push(h('div', { class: 'card' }, h('h3', { text: 'Loot' }), h('p', { class: 'fine', text: `Every drop pub has a chest with ${DEFAULTS.chestOpens || 5} opens, one per crew. The number on each pub pin is how many are left.` }),
    h('div', { class: 'list' }, LOOT.map(L => h('div', { class: 'loot-row' }, lootTile(L),
      h('div', null, h('div', { class: 'rarity', style: { color: RARITY[L.rarity] }, text: L.rarity }), h('div', { class: 'name', text: L.name }), h('div', { class: 'sub', text: L.desc })), null)))));
  const log = S.log.slice().sort((a, b) => b.t - a.t).slice(0, 80);
  kids.push(h('div', { class: 'card' }, h('h3', { text: 'Kill feed' }), log.length ? h('div', { class: 'log' }, log.map(e => h('div', null, h('time', { text: clock(e.t) }), h('span', { text: e.text })))) : h('p', { class: 'fine', text: 'Nothing yet.' })));
  patch($('#duelBody'), kids);
  const badge = $('#duelBadge'), n = mine ? S.duels.filter(d => (d.status === 'pending' && d.to === mine.id) || (d.status === 'claimed' && d.winner !== mine.id && (d.from === mine.id || d.to === mine.id))).length : 0;
  badge.hidden = !n; badge.textContent = n;
}

/* ============================================================
   HQ (organiser)
   ============================================================ */
let hqBuilt = false;
function buildHq() {
  if (hqBuilt) return; hqBuilt = true;
  $('#hqBody').innerHTML = `
    <div class="row spread"><h2>HQ</h2><button class="link" id="hqExit" type="button">Leave HQ</button></div>
    <div class="card"><div class="row" id="hqStats"></div></div>
    <div class="card">
      <h3>1 · Draw crews</h3>
      <div class="seg" id="hqMode">
        <button type="button" data-mode="mix">Mix clubs</button><button type="button" data-mode="club">Club crews</button><button type="button" data-mode="random">Random</button>
      </div>
      <p class="fine" id="hqModeHint"></p>
      <button class="btn btn-yellow" id="hqDraw" type="button">Randomise crews</button>
      <p class="fine" id="hqDrawMeta"></p>
    </div>
    <div class="card">
      <div class="row spread"><h3>2 · Zone &amp; drop pubs</h3><span class="pill yellow" id="hqPubCount"></span></div>
      <p class="fine">Open the zone planner to drag the zone around, resize it, and tap pubs on the map to tick them in or out. Or tick them in the list below.</p>
      <div class="pub-tools"><button class="btn btn-yellow btn-sm" id="hqPlan" type="button">Open zone planner</button><button class="btn btn-ghost btn-sm" id="hqFind" type="button">Refresh pubs from OpenStreetMap</button></div>
      <div class="seg" id="hqPubFilter"><button type="button" data-f="zone">In zone</button><button type="button" data-f="on">Ticked</button><button type="button" data-f="all">All</button></div>
      <input type="text" id="hqPubSearch" placeholder="Search pubs" aria-label="Search pubs">
      <div class="pub-tools"><button class="btn btn-ghost btn-sm" id="hqTickZone" type="button">Tick all in zone</button><button class="btn btn-ghost btn-sm" id="hqUntickOut" type="button">Untick outside zone</button><button class="btn btn-ghost btn-sm" id="hqUntickAll" type="button">Untick all</button></div>
      <div class="scroll-list" id="hqPubs"></div>
      <p class="fine">Every ticked pub has a loot chest (${DEFAULTS.chestOpens || 5} opens, one per crew). Change one pub's chest from its sheet on the map.</p>
      <button class="btn btn-ghost btn-sm" id="hqRefill" type="button">Refill every chest</button>
    </div>
    <div class="card">
      <h3>3 · Storm</h3>
      <p class="fine" id="hqZoneNow"></p>
      <p class="fine">Easiest: open the zone planner, drag the circle to where the storm should close to, pick timings and tap “Send the storm here”. Or draft a random zone below.</p>
      <div class="row"><button class="btn btn-yellow btn-sm" id="hqPick" type="button">Open zone planner</button><button class="btn btn-ghost btn-sm" id="hqRand" type="button">Random next zone</button></div>
      <div class="grid2">
        <div class="stack"><label for="holdSel">Storm moves in</label><select id="holdSel"><option value="0">Now</option><option value="2">2 min</option><option value="5" selected>5 min</option><option value="10">10 min</option><option value="15">15 min</option><option value="20">20 min</option><option value="30">30 min</option></select></div>
        <div class="stack"><label for="shrinkSel">Shrinks over</label><select id="shrinkSel"><option value="0">Instant</option><option value="5">5 min</option><option value="10" selected>10 min</option><option value="15">15 min</option><option value="20">20 min</option><option value="30">30 min</option></select></div>
      </div>
      <button class="btn btn-storm" id="hqAnnounce" type="button" disabled>Send the storm</button>
      <button class="link" id="hqZoneReset" type="button">Reset zone to the start</button>
    </div>
    <div class="card">
      <h3>Who sees who</h3>
      <div class="seg" id="hqReveal"><button type="button" data-v="0">Own crew only</button><button type="button" data-v="1">Everyone</button></div>
      <p class="fine">Pub counts are always shown. This controls whether players see enemy crews walking around.</p>
    </div>
    <div class="card"><h3>Marshals</h3><p class="fine" id="hqMarshalHint"></p><div class="list" id="hqMarshals"></div></div>
    <div class="card"><h3>Disputes</h3><div class="list" id="hqDuels"></div></div>
    <div class="card"><h3>In the storm</h3><p class="fine">Alive players whose location is outside the current zone.</p><div class="list" id="hqStorm"></div></div>
    <div class="card"><h3>Players</h3><div class="list" id="hqPlayers"></div></div>
    <div class="card" id="hqDemo" hidden>
      <h3>Demo tools</h3>
      <p class="fine">Only in demo mode. Bots stand still so you can try duels on one device.</p>
      <div class="row"><button class="btn btn-ghost btn-sm" id="hqBots" type="button">Add 11 bots</button><button class="btn btn-ghost btn-sm" id="hqBotPubs" type="button">Put bot crews in pubs</button><button class="btn btn-ghost btn-sm" id="hqTeleport" type="button">Teleport me</button></div>
    </div>
    <div class="card"><h3>New game</h3><p class="fine">Revives everyone, clears duels and the kill feed, resets the zone. Crews and pubs stay.</p><button class="btn btn-red btn-sm" id="hqReset" type="button">Reset game</button></div>`;
  $('#hqExit').onclick = () => { S.admin = false; lsSet('bcbr.admin', false); route(); };
  $('#hqMode').onclick = e => { const b = e.target.closest('button'); if (!b) return; S.drawMode = b.dataset.mode; lsSet('bcbr.drawMode', S.drawMode); renderHq(); };
  $('#hqDraw').onclick = e => {
    const go = async () => { const cs = drawCrews(S.drawMode); if (await save(api.set('meta', 'teams', { crews: cs, mode: S.drawMode, at: Date.now() }), `${cs.length} crews drawn.`)) logEvent(`Crews drawn: ${cs.length} crews.`); };
    crews().length ? confirmTap(e.target, go, 'Tap again to reshuffle') : go();
  };
  $('#hqFind').onclick = findPubs;
  $('#hqPlan').onclick = openPlanner;
  $('#hqPick').onclick = () => openPlanner(S.draft || null);
  $('#hqPubFilter').onclick = e => { const b = e.target.closest('button'); if (b) { S.pubFilter = b.dataset.f; renderHq(); } };
  $('#hqRefill').onclick = e => confirmTap(e.target, async () => { for (const p of S.pubs) await api.update('pubs', p.id, { chestRound: chestRound(p) + 1 }); logEvent('Every loot chest has been refilled!'); toast('All chests refilled.'); }, 'Tap again to refill all');
  $('#hqPubSearch').oninput = e => { S.pubSearch = e.target.value; renderHq(); };
  $('#hqTickZone').onclick = () => tickInside(planZone());
  $('#hqUntickOut').onclick = () => untickOutside(planZone());
  $('#hqUntickAll').onclick = e => confirmTap(e.target, async () => { for (const p of S.pubs.slice()) await api.del('pubs', p.id); toast('All pubs unticked.'); }, 'Tap again to untick all');
  $('#hqRand').onclick = () => {
    const { cur } = zoneNow(), r2 = Math.max(100, Math.round(cur.r * .55 / 50) * 50), room = Math.max(0, cur.r - r2);
    const a = Math.random() * 2 * Math.PI, d = Math.sqrt(Math.random()) * room;
    S.draft = { center: offset(cur.center, d * Math.sin(a), d * Math.cos(a)).map(v => +v.toFixed(6)), r: r2 };
    renderAll(); toast('Random zone drafted. Check it on the map.');
  };
  $('#hqAnnounce').onclick = () => S.draft && announceZone(S.draft, +$('#holdSel').value, +$('#shrinkSel').value);
  $('#hqZoneReset').onclick = e => confirmTap(e.target, async () => { await save(api.set('meta', 'zone', { center: DEFAULTS.center, r: DEFAULTS.radiusM, next: null, phase: 0 }), 'Zone reset.'); S.draft = null; renderAll(); });
  $('#hqReveal').onclick = e => { const b = e.target.closest('button'); if (b) save(api.update('meta', 'settings', { revealAll: b.dataset.v === '1' })); };
  $('#hqBots').onclick = addBots;
  $('#hqBotPubs').onclick = botsToPubs;
  $('#hqTeleport').onclick = () => { S.pick = 'teleport'; showView('map'); };
  $('#hqReset').onclick = e => confirmTap(e.target, resetGame, 'Tap again: reset everything');
}
function renderHq() {
  if (!S.admin) return; buildHq();
  const P = pMap(), { cur, next, stage, z } = zoneNow();
  const alive = S.players.filter(isAlive).length, live = S.players.filter(fresh).length;
  patch($('#hqStats'), [...[[S.players.length, 'players'], [alive, 'alive'], [crews().length, 'crews'], [live, 'on GPS'], [S.pubs.length, 'pubs']].map(([n, l]) => h('span', { class: 'pill' }, h('b', { text: n }), ' ' + l)),
    h('span', { class: 'pill ' + (api.mode === 'live' ? 'green' : 'red'), text: api.mode === 'live' ? 'Live' : 'Demo' })]);
  document.querySelectorAll('#hqMode button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.mode === S.drawMode)));
  $('#hqModeHint').textContent = MODE_HINTS[S.drawMode];
  const n = S.players.length, k = teamCount(n);
  $('#hqDraw').disabled = n < 2; if (!$('#hqDraw').dataset.armed) $('#hqDraw').textContent = crews().length ? 'Reshuffle crews' : 'Randomise crews';
  $('#hqDrawMeta').textContent = n < 2 ? 'Need at least 2 players.' : `${n} players → ${k} crews` + (S.teams?.at ? ` · last drawn ${clock(S.teams.at)}` : '');
  // pubs
  const pz = planZone(), q = S.pubSearch.trim().toLowerCase();
  const rows = allPubs().map(p => ({ p, d: dist(p, pz.center), on: inPlay(p.id) }))
    .filter(({ p, d, on }) => (S.pubFilter === 'all' || (S.pubFilter === 'on' ? on : d <= pz.r)) && (!q || p.name.toLowerCase().includes(q)))
    .sort((a, b) => a.d - b.d);
  const insideN = allPubs().filter(p => dist(p, pz.center) <= pz.r).length;
  $('#hqPubCount').textContent = `${S.pubs.length} in play · ${insideN} in zone`;
  document.querySelectorAll('#hqPubFilter button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.f === S.pubFilter)));
  patch($('#hqPubs'), rows.length ? rows.map(({ p, d, on }) => h('label', { class: 'check-row' + (on ? ' on' : '') + (d > pz.r ? ' outside' : '') },
    h('input', { type: 'checkbox', checked: on, onchange: () => togglePub(p) }),
    h('div', { class: 'grow' }, h('div', { class: 'name', text: p.name }), h('div', { class: 'sub', text: `${p.kind || 'pub'} · ${fmtDist(d)} from centre${d > pz.r ? ' · outside zone' : ''}` }))))
    : [h('p', { class: 'fine', text: allPubs().length ? 'No pubs match.' : 'Loading pubs…' })]);
  // zone
  $('#hqZoneNow').textContent = (S.plan ? 'Planner open. ' : '') + `Now: ${fmtDist(cur.r * 2)} across. ` + (stage === 'hold' ? `Next zone announced, storm moves in ${fmtClock(z.shrinkStart - Date.now())}.` : stage === 'closing' ? `Closing, ${fmtClock(z.shrinkEnd - Date.now())} left.` : 'No storm moving.') + (S.draft ? ` Draft: ${fmtDist(S.draft.r * 2)} across.` : '');
  $('#hqAnnounce').disabled = !S.draft;
  document.querySelectorAll('#hqReveal button').forEach(b => b.setAttribute('aria-pressed', String((b.dataset.v === '1') === !!S.settings.revealAll)));
  // marshals
  $('#hqMarshalHint').textContent = `Marshals tap Staff login, enter their own name and PIN ${STAFF_PIN}. ("${ADMIN_NAME}" with the same PIN is this organiser account.) They show on everyone's map as supply drops.`;
  patch($('#hqMarshals'), S.marshals.length ? S.marshals.map(m => h('div', { class: 'item' },
    h('div', { class: 'grow' }, h('div', { class: 'name', text: m.name }), h('div', { class: 'sub', text: `${MARSHAL_STATUS[m.status || 'stocked']} · ${typeof m.lat !== 'number' ? 'no location yet' : m.mode === 'pinned' ? 'fixed spot' : 'live GPS, seen ' + ago(m.locAt || Date.now())}` })),
    typeof m.lat === 'number' ? h('button', { class: 'btn btn-sm btn-ghost', type: 'button', text: 'Show', onclick: () => { showView('map'); map.setView([m.lat, m.lon], 17); openDrop(m.id); } }) : null,
    h('button', { class: 'btn btn-sm btn-ghost', type: 'button', 'aria-label': 'Remove ' + m.name, text: '×', onclick: e => confirmTap(e.target, () => save(api.del('marshals', m.id), m.name + ' removed.'), '×?') })))
    : [h('p', { class: 'fine', text: 'No marshals yet.' })]);
  // disputes
  const disp = S.duels.filter(d => d.status === 'disputed');
  patch($('#hqDuels'), [...(disp.length ? disp.map(d => {
    const A = crewById(d.from), B = crewById(d.to);
    return h('div', { class: 'item' }, h('div', { class: 'grow' }, h('div', { class: 'name', text: `${A?.name} vs ${B?.name}` }), h('div', { class: 'sub', text: `${gameName(d.game)} · ${d.pubName}` }),
      h('div', { class: 'row', style: { marginTop: '6px' } }, h('button', { class: 'btn btn-sm btn-yellow', type: 'button', text: A?.name + ' won', onclick: () => askOut(d, d.from, 'hq') }), h('button', { class: 'btn btn-sm btn-yellow', type: 'button', text: B?.name + ' won', onclick: () => askOut(d, d.to, 'hq') }), h('button', { class: 'btn btn-sm btn-ghost', type: 'button', text: 'Void', onclick: () => dUpdate(d, { status: 'cancelled' }) }))));
  }) : [h('p', { class: 'fine', text: 'None.' })])]);
  // storm
  const inStorm = S.players.filter(p => isAlive(p) && fresh(P[p.id]) && !inZone(P[p.id], cur));
  patch($('#hqStorm'), [...(inStorm.length ? inStorm.map(p => h('div', { class: 'item' }, h('div', { class: 'grow' }, h('div', { class: 'name', text: p.name }), h('div', { class: 'sub', text: `${crewOf(p.id)?.name || 'No crew'} · ${fmtDist(dist(P[p.id], cur.center) - cur.r)} outside` })),
    h('button', { class: 'btn btn-sm btn-storm', type: 'button', text: 'Storm out', onclick: () => eliminate(p, 'the storm') }))) : [h('p', { class: 'fine', text: 'Nobody.' })])]);
  // players
  const sorted = S.players.slice().sort((a, b) => (crewOf(a.id)?.name || '~').localeCompare(crewOf(b.id)?.name || '~') || a.name.localeCompare(b.name));
  patch($('#hqPlayers'), [...(sorted.length ? sorted.map(p => {
    const c = crewOf(p.id), q = P[p.id];
    return h('div', { class: 'item' + (isAlive(p) ? '' : ' out') }, c ? h('span', { class: 'swatch', style: { background: c.color } }) : null,
      h('div', { class: 'grow' }, h('div', { class: 'name', text: p.name + (p.bot ? ' (bot)' : '') }), h('div', { class: 'sub', text: `${cleanClub(p.club)} · ${c?.name || 'no crew'} · ${fresh(q) ? 'seen ' + ago(q.locAt || Date.now()) : 'no location'}` })),
      isAlive(p) ? h('button', { class: 'btn btn-sm btn-ghost', type: 'button', text: 'Out', onclick: e => confirmTap(e.target, () => eliminate(p, 'the organisers'), 'Sure?') })
        : h('button', { class: 'btn btn-sm btn-blue', type: 'button', text: 'Revive', onclick: () => revive(p) }),
      h('button', { class: 'btn btn-sm btn-ghost', type: 'button', 'aria-label': 'Remove ' + p.name, text: '×', onclick: e => confirmTap(e.target, () => save(api.del('players', p.id), p.name + ' removed.'), '×?') }));
  }) : [h('p', { class: 'fine', text: 'Nobody has signed up yet.' })])]);
  $('#hqDemo').hidden = api.mode !== 'demo';
}
async function eliminate(p, by) { if (await save(api.update('players', p.id, { alive: false, outAt: Date.now(), outBy: by }), p.name + ' is out.')) logEvent(`${p.name} was taken out by ${by}.`); }
async function revive(p, by = 'the organisers', kind = 'hq') {
  const now = Date.now(), upd = { alive: true, revivedAt: now };
  if (kind === 'marshal') { upd.revives = (p.revives || 0) + 1; upd.rebootAt = now; }
  if (!(await save(api.update('players', p.id, upd), p.name + ' is back in.'))) return;
  const c = crewOf(p.id);
  logEvent(`${p.name} was revived by ${by}.` + (kind === 'marshal' && c ? ` ${c.name} are exposed for ${DEFAULTS.rebootExposedMin || 10} minutes.` : ''));
}
let savedLoaded = false;
async function loadSavedPubs() {
  if (savedLoaded) return; savedLoaded = true;
  try { const list = (await (await fetch('pubs-cambridge.json')).json()).pubs; mergeCandidates(list); } catch { savedLoaded = false; }
}
function mergeCandidates(list) {
  const m = new Map(S.candidates.map(p => [p.id, p]));
  for (const p of list) if (typeof p.lat === 'number' && p.name) m.set(p.id, p);
  S.candidates = [...m.values()].sort((a, b) => a.name.localeCompare(b.name)); renderAll();
}
async function findPubs() {
  const btn = $('#hqFind'); btn.disabled = true; btn.textContent = 'Searching…';
  const cur = { center: planZone().center, r: 4000 };
  const around = `(around:${Math.round(cur.r)},${cur.center[0]},${cur.center[1]})`;
  const q = `[out:json][timeout:25];(nwr["amenity"="pub"]["name"]${around};nwr["amenity"="bar"]["name"]${around};);out center tags;`;
  let list = null, source = 'live';
  for (const url of ['https://overpass-api.de/api/interpreter', 'https://maps.mail.ru/osm/tools/overpass/api/interpreter', 'https://overpass.kumi.systems/api/interpreter']) {
    try {
      const r = await fetch(url + '?data=' + encodeURIComponent(q), { signal: AbortSignal.timeout(15000) });
      if (!r.ok) continue;
      const data = await r.json();
      list = data.elements.map(e => ({ id: e.type[0] + e.id, name: e.tags.name, lat: e.lat ?? e.center?.lat, lon: e.lon ?? e.center?.lon, kind: e.tags.amenity }));
      break;
    } catch {}
  }
  if (!list) {
    // Fallback: snapshot of Cambridge pubs bundled with the app.
    try { list = (await (await fetch('pubs-cambridge.json')).json()).pubs; source = 'saved'; } catch {}
  }
  btn.disabled = false; btn.textContent = 'Refresh pubs from OpenStreetMap';
  if (!list) { toast("Couldn't reach OpenStreetMap. Try again in a minute."); return; }
  mergeCandidates(list);
  toast(source === 'saved' ? "Couldn't reach OpenStreetMap, using the saved list." : `Updated: ${list.length} pubs and bars within 4 km.`);
}
const BOT_NAMES = ['Olu', 'Priya', 'Tom', 'Isla', 'Marcus', 'Jess', 'Ben', 'Rosa', 'Kwame', 'Sofia', 'Finn'];
async function addBots() {
  const { cur } = zoneNow();
  for (const [i, n] of BOT_NAMES.entries()) {
    const a = Math.random() * 2 * Math.PI, d = Math.random() * cur.r * .6, [lat, lon] = offset(cur.center, d * Math.sin(a), d * Math.cos(a));
    await api.set('players', api.newId(), { name: n + ' Bot', club: COLLEGES[(i * 7) % COLLEGES.length], joinedAt: Date.now() + i, alive: true, bot: true, lat, lon, locAt: Date.now() });
  }
  toast('11 bots joined. Draw crews next.');
}
async function botsToPubs() {
  if (!S.pubs.length) { toast('Put some pubs in play first.'); return; }
  if (!crews().length) { toast('Draw crews first.'); return; }
  const P = pMap(), mine = myCrew(), pubs = shuffle(S.pubs);
  let i = 0;
  for (const c of crews()) {
    if (mine && c.id === mine.id) continue;
    const pub = pubs[i++ % Math.min(3, pubs.length)];
    for (const id of c.members) if (P[id]?.bot) { const [lat, lon] = offset([pub.lat, pub.lon], (Math.random() - .5) * 30, (Math.random() - .5) * 30); await api.update('players', id, { lat, lon, locAt: Date.now() }); }
  }
  toast('Bot crews are in the pubs. Teleport yourself to one.');
}
async function resetGame() {
  for (const p of S.players) if (!isAlive(p) || p.revives || p.rebootAt) await api.update('players', p.id, { alive: true, revives: 0, rebootAt: null });
  for (const it of S.items) await api.del('items', it.id);
  for (const d of S.duels) await api.del('duels', d.id);
  for (const e of S.log) await api.del('log', e.id);
  await api.set('meta', 'zone', { center: DEFAULTS.center, r: DEFAULTS.radiusM, next: null, phase: 0 });
  S.draft = null; toast('Fresh game. Everyone is back in.');
}

/* ============================================================
   Zone planner (organisers)
   ============================================================ */
function openPlanner(start) {
  if (!S.admin) return;
  const base = start && start.center ? start : zoneNow().cur;
  S.plan = { center: [...base.center], r: Math.round(base.r) };
  loadSavedPubs(); closePub(); S.pick = null;
  showView('map');
  setTimeout(() => { const ph = $('#planner').offsetHeight || 0; map.fitBounds([offset(S.plan.center, -S.plan.r, -S.plan.r), offset(S.plan.center, S.plan.r, S.plan.r)], { paddingTopLeft: [16, 16], paddingBottomRight: [16, ph + 16] }); }, 80);
}
function closePlanner() { S.plan = null; planC.remove(); planHandle.remove(); renderAll(); }
const pill = (text, cls = '') => h('span', { class: 'pill ' + cls, text });
function renderPlanner() {
  const on = !!S.plan && S.view === 'map';
  $('#planner').hidden = !on; document.body.classList.toggle('planning', on);
  if (!on) { if (map.hasLayer(planC)) planC.remove(); if (map.hasLayer(planHandle)) planHandle.remove(); return; }
  planC.setLatLng(S.plan.center).setRadius(S.plan.r); if (!map.hasLayer(planC)) planC.addTo(map);
  if (!planDragging) planHandle.setLatLng(S.plan.center);
  if (!map.hasLayer(planHandle)) planHandle.addTo(map);
  const rIn = $('#planR'); if (document.activeElement !== rIn) rIn.value = S.plan.r;
  $('#planROut').textContent = fmtDist(S.plan.r * 2);
  const inside = allPubs().filter(p => dist(p, S.plan.center) <= S.plan.r);
  const onIn = inside.filter(p => inPlay(p.id)).length, onOut = S.pubs.filter(p => dist(p, S.plan.center) > S.plan.r).length;
  const walk = Math.round(S.plan.r * 2 / 80);
  patch($('#planInfo'), [pill(`${inside.length} pubs inside`), pill(`${onIn} ticked`, 'yellow'), onOut ? pill(`${onOut} ticked outside`, 'red') : null, pill(`~${walk} min to walk across`)]);
}
$('#planR').oninput = e => { if (!S.plan) return; S.plan.r = +e.target.value; renderPlanner(); renderHq(); };
$('#planClose').onclick = closePlanner;
async function tickInside(z) {
  const add = allPubs().filter(p => dist(p, z.center) <= z.r && !inPlay(p.id));
  for (const p of add) await api.set('pubs', p.id, { name: p.name, lat: p.lat, lon: p.lon, kind: p.kind || 'pub', addedAt: Date.now() });
  toast(add.length ? `Ticked ${add.length} pubs.` : 'Every pub inside is already ticked.');
}
async function untickOutside(z) {
  const rm = S.pubs.filter(p => dist(p, z.center) > z.r);
  for (const p of rm) await api.del('pubs', p.id);
  toast(rm.length ? `Unticked ${rm.length} pubs outside the zone.` : 'No ticked pubs are outside.');
}
$('#planTickIn').onclick = () => S.plan && tickInside(S.plan);
$('#planUntickOut').onclick = () => S.plan && untickOutside(S.plan);
// Storm: shrink from the current zone to `target` after `holdMin`, over `shrinkMin`.
async function announceZone(target, holdMin, shrinkMin) {
  const now = Date.now(), { cur, z } = zoneNow(now), hold = holdMin * 60000, shrink = shrinkMin * 60000, phase = (z?.phase || 0) + 1;
  const next = { center: target.center.map(v => +(+v).toFixed(6)), r: Math.round(target.r) };
  const doc = hold + shrink === 0 ? { ...next, next: null, phase } : { center: cur.center, r: Math.round(cur.r), next, shrinkStart: now + hold, shrinkEnd: now + hold + shrink, phase };
  if (!(await save(api.set('meta', 'zone', doc), 'Storm sent. Everyone can see the next zone.'))) return false;
  logEvent(`Phase ${phase}: the storm is coming${hold ? ', it moves in ' + holdMin + ' min' : ''} and closes over ${shrinkMin} min.`);
  S.draft = null; renderAll(); return true;
}
$('#planStart').onclick = e => confirmTap(e.target, async () => {
  const z = zoneNow().z, doc = { center: S.plan.center, r: S.plan.r, next: null, phase: z?.phase || 0 };
  if (await save(api.set('meta', 'zone', doc), 'Zone set for everyone.')) { S.draft = null; renderAll(); }
}, 'Tap again: zone changes instantly');
$('#planNext').onclick = e => {
  const { cur } = zoneNow();
  if (dist(S.plan.center, cur.center) + S.plan.r > cur.r + 5) toast('Heads up: part of this circle is outside the current zone. Usually the next zone sits inside it.');
  confirmTap(e.target, async () => { if (await announceZone(S.plan, +$('#planHold').value, +$('#planShrink').value)) closePlanner(); }, 'Tap again to send the storm');
};

/* ============================================================
   Marshal view
   ============================================================ */
function renderMarshal() {
  const m = myMarshal(), body = $('#marshalBody');
  if (!m) { patch(body, [h('p', { class: 'fine', text: S.marshalsLoaded ? 'This marshal login was removed.' : 'Loading…' })]); return; }
  const P = pMap(), { cur } = zoneNow(), here = typeof m.lat === 'number' ? m : S.me;
  const st = m.status || 'stocked', kids = [];
  kids.push(h('div', { class: 'marshal-banner' }, h('div', { class: 'kicker', style: { color: '#fff' }, text: 'Marshal · supply drop' }), h('h2', { text: m.name }),
    h('div', { class: 'seg' }, Object.entries(MARSHAL_STATUS).map(([k, v]) => h('button', { type: 'button', 'aria-pressed': String(st === k), text: v.replace('Out of drinks', 'Empty').replace('On a break', 'Break'), onclick: () => save(api.update('marshals', m.id, { status: k }), 'Status: ' + v) })))));
  // location
  const pinned = m.mode === 'pinned';
  kids.push(h('div', { class: 'card' }, h('h3', { text: 'Where you are' }),
    h('div', { class: 'seg' }, h('button', { type: 'button', 'aria-pressed': String(!pinned), text: 'Live GPS', onclick: () => { save(api.update('marshals', m.id, { mode: 'gps', pubId: null })); startGps(); pushLoc(true); } }),
      h('button', { type: 'button', 'aria-pressed': String(pinned), text: 'Fixed spot', onclick: () => save(api.update('marshals', m.id, { mode: 'pinned' })) })),
    h('p', { class: 'fine', text: typeof m.lat !== 'number' ? "Players can't see you yet. Share GPS or pin your spot." : pinned ? 'Players see you at a fixed spot. Re-pin it if you move.' : `Players see you live. Last update ${ago(m.locAt || Date.now())}.` }),
    S.pubs.length ? h('select', { 'aria-label': 'Station me at a pub', onchange: e => { const pub = S.pubs.find(x => x.id === e.target.value); if (!pub) return; const [lat, lon] = offset([pub.lat, pub.lon], 18, 0); save(api.update('marshals', m.id, { lat: +lat.toFixed(6), lon: +lon.toFixed(6), locAt: Date.now(), mode: 'pinned', pubId: pub.id }), `Stationed at ${pub.name}.`); } },
      h('option', { value: '', text: m.pubId && pubById(m.pubId) ? `Stationed at ${pubById(m.pubId).name}` : 'Station me at a drop pub…' }),
      ...S.pubs.slice().sort((a, b) => (here ? dist(a, here) - dist(b, here) : a.name.localeCompare(b.name))).map(pb => h('option', { value: pb.id, text: pb.name + (here ? ` (${fmtDist(dist(pb, here))})` : '') }))) : null,
    h('div', { class: 'pub-tools' },
      h('button', { class: 'btn btn-blue btn-sm', type: 'button', text: 'Pin my spot on the map', onclick: () => { S.pick = 'spot'; showView('map'); if (typeof m.lat === 'number') map.setView([m.lat, m.lon], 17); } }),
      S.me ? h('button', { class: 'btn btn-ghost btn-sm', type: 'button', text: 'Pin where I am now', onclick: () => save(api.update('marshals', m.id, { lat: +S.me.lat.toFixed(6), lon: +S.me.lon.toFixed(6), locAt: Date.now(), mode: 'pinned', pubId: null }), 'Pinned.') }) : null,
      S.gps !== 'on' ? h('button', { class: 'btn btn-ghost btn-sm', type: 'button', text: 'Turn on GPS', onclick: startGps }) : null)));
  // judge open duels
  const open = S.duels.filter(d => OPEN.includes(d.status)).map(d => ({ d, far: here && pubById(d.pubId) ? dist(here, pubById(d.pubId)) : Infinity })).sort((a, b) => a.far - b.far);
  kids.push(h('div', { class: 'card' }, h('h3', { text: 'Judge a duel' }),
    open.length ? h('div', { class: 'list' }, open.map(({ d, far }) => { const A = crewById(d.from), B = crewById(d.to);
      return h('div', { class: 'item' }, h('div', { class: 'grow' },
        h('div', { class: 'name', text: `${A?.name} vs ${B?.name}` }),
        h('div', { class: 'sub', text: `${gameName(d.game)} · ${d.pubName}${isFinite(far) ? ' · ' + fmtDist(far) + ' away' : ''} · ${d.status}` }),
        h('div', { class: 'row', style: { marginTop: '6px' } },
          h('button', { class: 'btn btn-sm btn-yellow', type: 'button', text: A?.name + ' won', onclick: () => askOut(d, d.from, 'marshal') }),
          h('button', { class: 'btn btn-sm btn-yellow', type: 'button', text: B?.name + ' won', onclick: () => askOut(d, d.to, 'marshal') }),
          h('button', { class: 'btn btn-sm btn-ghost', type: 'button', text: 'Void', onclick: e => confirmTap(e.target, () => dUpdate(d, { status: 'cancelled' }), 'Void it?') })))); }))
      : h('p', { class: 'fine', text: 'No duels running right now.' })));
  // referee a new duel on the spot
  const ac = aliveCrews(P).map(c => ({ c, near: here ? Math.min(...aliveIn(c, P).map(id => P[id]).filter(fresh).map(p => dist(p, here)), Infinity) : Infinity })).sort((a, b) => a.near - b.near);
  const opt = (sel, ph) => [h('option', { value: '', text: ph }), ...ac.map(({ c, near }) => h('option', { value: c.id, selected: sel === c.id, text: c.name + (isFinite(near) ? ` (${fmtDist(near)})` : '') }))];
  const R = S.ref, A = crewById(R.a), B = crewById(R.b);
  kids.push(h('div', { class: 'card' }, h('h3', { text: 'Referee on the spot' }), h('p', { class: 'fine', text: 'Two crews found you and want to settle it here. Closest crews are listed first.' }),
    h('div', { class: 'grid2' }, h('select', { 'aria-label': 'First crew', onchange: e => { R.a = e.target.value; renderMarshal(); } }, opt(R.a, 'Crew A')),
      h('select', { 'aria-label': 'Second crew', onchange: e => { R.b = e.target.value; renderMarshal(); } }, opt(R.b, 'Crew B'))),
    h('select', { 'aria-label': 'Game', onchange: e => { R.game = e.target.value; renderMarshal(); } }, GAMES.map(g => h('option', { value: g.id, selected: R.game === g.id, text: g.name }))),
    A && B && A.id !== B.id ? h('div', { class: 'grid2' },
      h('button', { class: 'btn btn-yellow btn-sm', type: 'button', text: A.name + ' won', onclick: () => refDuel(A.id, B.id, R.game, A.id) }),
      h('button', { class: 'btn btn-yellow btn-sm', type: 'button', text: B.name + ' won', onclick: () => refDuel(A.id, B.id, R.game, B.id) }))
      : h('p', { class: 'fine', text: 'Pick two different crews.' })));
  // storm patrol
  const storm = S.players.filter(p => isAlive(p) && fresh(P[p.id]) && !inZone(P[p.id], cur))
    .map(p => ({ p, me: here ? dist(P[p.id], here) : Infinity, out: dist(P[p.id], cur.center) - cur.r })).sort((a, b) => a.me - b.me);
  kids.push(h('div', { class: 'card' }, h('div', { class: 'row spread' }, h('h3', { text: 'Storm patrol' }), pill(`${storm.length} outside`, storm.length ? 'storm' : '')),
    h('p', { class: 'fine', text: 'Alive players whose phone says they are outside the zone. Check in person before knocking anyone out; GPS can drift.' }),
    storm.length ? h('div', { class: 'list' }, storm.map(({ p, me, out }) => h('div', { class: 'item' },
      h('span', { class: 'swatch', style: { background: crewOf(p.id)?.color || '#888' } }),
      h('div', { class: 'grow' }, h('div', { class: 'name', text: p.name }), h('div', { class: 'sub', text: `${crewOf(p.id)?.name || 'No crew'} · ${fmtDist(out)} outside${isFinite(me) ? ' · ' + fmtDist(me) + ' from you' : ''}` })),
      h('button', { class: 'btn btn-sm btn-storm', type: 'button', text: 'Storm out', onclick: e => confirmTap(e.target, () => eliminate(p, `the storm (${m.name})`), 'Sure?') }))))
      : h('p', { class: 'fine', text: 'Nobody in the storm.' })));
  // nearby players
  if (here) {
    const near = S.players.filter(p => isAlive(p) && fresh(P[p.id]) && dist(P[p.id], here) <= 200).sort((a, b) => dist(P[a.id], here) - dist(P[b.id], here));
    kids.push(h('div', { class: 'card' }, h('h3', { text: 'Near you' }), h('p', { class: 'fine', text: 'Alive players within 200 m. Use “Out” for rule breaks.' }),
      near.length ? h('div', { class: 'list' }, near.map(p => h('div', { class: 'item' },
        h('span', { class: 'swatch', style: { background: crewOf(p.id)?.color || '#888' } }),
        h('div', { class: 'grow' }, h('div', { class: 'name', text: p.name }), h('div', { class: 'sub', text: `${crewOf(p.id)?.name || 'No crew'} · ${fmtDist(dist(P[p.id], here))}` })),
        h('button', { class: 'btn btn-sm btn-ghost', type: 'button', text: 'Out', onclick: e => confirmTap(e.target, () => eliminate(p, m.name), 'Sure?') }))))
        : h('p', { class: 'fine', text: 'Nobody close by.' })));
  }
  // revives
  const maxRev = DEFAULTS.revivesPerPlayer ?? 1;
  if (maxRev > 0) {
    const downs = S.players.filter(p => !isAlive(p) && crewOf(p.id) && aliveIn(crewOf(p.id), P).length)
      .map(p => ({ p, d: here && fresh(P[p.id]) ? dist(P[p.id], here) : Infinity })).sort((a, b) => a.d - b.d);
    kids.push(h('div', { class: 'card' }, h('div', { class: 'row' }, h('img', { class: 'reboot-card', src: 'img/loot/reboot.png', alt: '' }), h('h3', { text: 'Reboot' })),
      h('p', { class: 'fine', text: `Knocked-out players who reach you can be revived ${maxRev === 1 ? 'once' : maxRev + ' times'}. They must be within ${DEFAULTS.reviveRadiusM} m of you, and their crew must still be alive. The catch: their crew is Exposed for ${DEFAULTS.rebootExposedMin || 10} minutes (visible to everyone, no forfeits, no shields).` }),
      downs.length ? h('div', { class: 'list' }, downs.map(({ p, d }) => {
        const used = (p.revives || 0) >= maxRev, close = d <= DEFAULTS.reviveRadiusM;
        return h('div', { class: 'item' }, h('span', { class: 'swatch', style: { background: crewOf(p.id)?.color || '#888' } }),
          h('div', { class: 'grow' }, h('div', { class: 'name', text: p.name }), h('div', { class: 'sub', text: `${crewOf(p.id)?.name} · ${isFinite(d) ? fmtDist(d) + ' away' : 'location unknown'}${used ? ' · no revives left' : ''}` })),
          h('button', { class: 'btn btn-sm btn-blue', type: 'button', disabled: used || !close, text: close ? 'Revive' : 'Too far', onclick: e => confirmTap(e.target, () => revive(p, `${m.name}'s supply drop`, 'marshal'), 'Revive?') }));
      })) : h('p', { class: 'fine', text: 'Nobody to revive.' })));
  }
  kids.push(h('button', { class: 'link', type: 'button', text: 'Stop marshalling on this phone', onclick: e => confirmTap(e.target, async () => { await api.del('marshals', m.id); S.marshalId = null; lsSet('bcbr.marshal', null); route(); }, 'Tap again to stop') }));
  patch(body, kids);
}
async function refDuel(aId, bId, game, winnerId) {
  if (openDuelFor(aId) || openDuelFor(bId)) { toast('One of these crews already has a duel open. Judge that one instead.'); return; }
  const m = myMarshal(), here = m && typeof m.lat === 'number' ? m : S.me, np = here && nearestPub(here);
  const id = api.newId();
  const d = { pubId: np && np.d <= 60 ? np.pub.id : null, pubName: np && np.d <= 60 ? np.pub.name : 'with ' + (m?.name || 'a marshal'), from: aId, to: bId, game, status: 'live', createdAt: Date.now(), by: 'marshal:' + S.marshalId };
  if (await save(api.set('duels', id, d))) { S.ref = { a: '', b: '', game }; askOut({ id, ...d }, winnerId, 'marshal'); }
}

/* ============================================================
   Join screen, routing, tabs
   ============================================================ */
function route() {
  if (S.pid && S.playersLoaded && !S.players.some(p => p.id === S.pid)) { S.pid = null; lsSet('bcbr.pid', null); }
  const joined = S.pid && (!S.playersLoaded || S.players.some(p => p.id === S.pid));
  if (S.marshalId && S.marshalsLoaded && !S.marshals.some(m => m.id === S.marshalId)) { S.marshalId = null; lsSet('bcbr.marshal', null); }
  const showJoin = S.forceJoin || (!joined && !S.admin && !S.marshalId);
  $('#join').hidden = !showJoin; $('#app').hidden = showJoin;
  $('#hqTab').hidden = !S.admin;
  $('#marshalTab').hidden = !S.marshalId;
  if (!S.pid && !S.admin && S.marshalId && S.view === 'crew') S.view = 'marshal';
  if (!showJoin) { showView(S.view); setTimeout(() => { map.invalidateSize(); maybeFit(); }, 60); }
}
function showView(v) {
  if (v === 'hq' && !S.admin) v = 'map';
  if (v === 'marshal' && !S.marshalId) v = 'map';
  if (v !== 'map' && S.plan) { S.plan = null; }
  S.view = v;
  for (const id of ['map', 'crew', 'duels', 'marshal', 'hq']) $('#view-' + id).hidden = id !== v;
  document.querySelectorAll('#tabbar button').forEach(b => b.classList.toggle('on', b.dataset.view === v));
  document.body.classList.toggle('on-map', v === 'map');
  if (v === 'map') setTimeout(() => map.invalidateSize(), 0);
  renderAll();
}
$('#tabbar').onclick = e => { const b = e.target.closest('button'); if (b) showView(b.dataset.view); };

$('#joinForm').onsubmit = async e => {
  e.preventDefault();
  const name = $('#nameInput').value.trim().replace(/\s+/g, ' '), clubIn = cleanClub($('#clubInput').value);
  if (!name || !clubIn) return;
  const known = [...COLLEGES, ...S.players.map(p => p.club)].find(c => clubKey(c) === clubKey(clubIn)) || clubIn;
  $('#joinBtn').disabled = true;
  const id = api.newId();
  const ok = await save(api.set('players', id, { name, club: cleanClub(known), joinedAt: Date.now(), alive: true }));
  $('#joinBtn').disabled = false;
  if (!ok) return;
  S.pid = id; lsSet('bcbr.pid', id); S.forceJoin = false; S.view = 'map'; route();
  toast("You're in, " + name.split(' ')[0] + '. Share your location so your crew can find you.');
};
$('#organiserLink').onclick = () => { $('#pinBox').hidden = !$('#pinBox').hidden; if (!$('#pinBox').hidden) $('#pinInput').focus(); };
$('#pinBtn').onclick = async () => {
  const pin = $('#pinInput').value.trim(), name = $('#marshalName').value.trim().replace(/\s+/g, ' ');
  if (!name) { toast(`Enter a name: "${ADMIN_NAME}" for the organiser account, or your own name if you're a marshal.`); $('#marshalName').focus(); return; }
  if (pin !== String(STAFF_PIN)) { toast("That PIN isn't right."); return; }
  if (name.toLowerCase() === String(ADMIN_NAME).toLowerCase()) {
    S.admin = true; lsSet('bcbr.admin', true); S.forceJoin = false; $('#pinInput').value = ''; S.view = 'hq'; loadSavedPubs(); route();
    toast('Logged in as Admin. Use the yellow pencil on the map to set the zone.'); return;
  }
  {
    const id = api.newId();
    if (!(await save(api.set('marshals', id, { name, status: 'stocked', mode: 'gps', createdAt: Date.now() })))) return;
    S.marshalId = id; lsSet('bcbr.marshal', id); S.forceJoin = false; $('#pinInput').value = ''; S.view = 'marshal'; route(); startGps();
    toast(`You're a marshal, ${name.split(' ')[0]}. Share GPS or pin your spot.`);
  }
};
$('#pinInput').onkeydown = e => { if (e.key === 'Enter') $('#pinBtn').click(); };

/* ============================================================
   Render loop & boot
   ============================================================ */
function renderAll() {
  if (!map) return;
  renderZoneLayers(); renderMarkers(); renderHud(); renderPub(); renderModal(); renderPlanner();
  if (S.view === 'crew') renderCrew();
  if (S.view === 'marshal') renderMarshal();
  renderDuels();
  if (S.view === 'hq') renderHq();
}
let tickN = 0;
function tick() {
  tickN++;
  if (!S.fitted) maybeFit();
  renderZoneLayers(); renderHud();
  if (tickN % 5 === 0) { renderMarkers(); renderPub(); if (S.view === 'hq') renderHq(); if (S.view === 'marshal') renderMarshal(); }
  if (S.me && tickN % 20 === 0) pushLoc();
}

async function boot() {
  $('#clubList').replaceChildren(...COLLEGES.map(c => h('option', { value: c })));
  try { api = FIREBASE_CONFIG ? await firebaseBackend(FIREBASE_CONFIG) : localBackend(); }
  catch (e) { console.error(e); api = localBackend(); toast("Couldn't reach Firebase. Running in demo mode."); }
  $('#modeFlag').hidden = api.mode !== 'demo';
  initMap();
  syncPubs = markerSet(pubLayer); syncPeople = markerSet(peopleLayer); syncDrops = markerSet(dropLayer);
  api.subCol('marshals', ms => { S.marshals = ms.filter(m => m && m.name); const was = S.marshalsLoaded; S.marshalsLoaded = true; if (!was || (S.marshalId && !ms.some(m => m.id === S.marshalId))) route(); renderAll(); });
  if (S.admin) loadSavedPubs();
  api.subCol('players', ps => { S.players = ps.filter(p => p && p.name).sort((a, b) => (a.joinedAt || 0) - (b.joinedAt || 0)); const was = S.playersLoaded; S.playersLoaded = true; if (!was || (S.pid && !ps.some(p => p.id === S.pid))) route(); renderAll(); });
  api.subDoc('meta', 'teams', d => { S.teams = d; renderAll(); });
  api.subDoc('meta', 'zone', d => { S.zone = d; renderAll(); maybeFit(); });
  api.subDoc('meta', 'settings', d => { S.settings = d || {}; renderAll(); });
  api.subCol('pubs', ps => { S.pubs = ps.filter(p => typeof p.lat === 'number'); renderAll(); });
  api.subCol('duels', ds => { S.duels = ds; renderAll(); });
  api.subCol('items', its => { S.items = its.filter(i => i && i.type); renderAll(); });
  api.subCol('log', ls => { S.log = ls; if (S.view === 'duels') renderDuels(); });
  route();
  if ((S.pid || S.marshalId) && lsGet('bcbr.gpsOk', false)) startGps();
  else if ((S.pid || S.marshalId) && navigator.permissions?.query) navigator.permissions.query({ name: 'geolocation' }).then(r => { if (r.state === 'granted') startGps(); }).catch(() => {});
  setInterval(tick, 1000);
}
boot();
