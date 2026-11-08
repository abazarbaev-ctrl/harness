// Player profiles without sign-up, plus a contest leaderboard.
//
// Profiles (name + avatar) and each profile's progress live in this browser.
// When the page runs on claude.ai with the `db` capability, every profile's
// score is also posted to a shared `contest` collection, so everyone the page
// is shared with sees the same leaderboard live. Elsewhere the leaderboard
// shows the players on this device only.
import { pieceSVG } from './pieces.js';

const KEY = 'cw-profiles-v1';
const progressKey = id => `cw-progress-v1:${id}`;
const LEGACY_PROGRESS = 'cw-progress-v1';

export const AVATAR_PIECES = ['k', 'q', 'r', 'b', 'n', 'p'];
export const AVATAR_COLORS = ['#e4572e', '#f3a712', '#2e86ab', '#3bb273', '#7768ae', '#d1495b', '#1b998b', '#3d3d3d'];

function load(key, fallback) {
  try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; } catch { return fallback; }
}
function save(key, value) { try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* not persisted */ } }
const newId = () => Math.random().toString(36).slice(2, 8) + Date.now().toString(36).slice(-4);

let store = load(KEY, { list: [], current: null });
const listeners = new Set();
export const onProfilesChange = fn => listeners.add(fn);
const emit = () => listeners.forEach(fn => fn());

export const profiles = () => store.list;
export const currentProfile = () => store.list.find(p => p.id === store.current) || null;

export function avatarHTML(p, size = 28) {
  const c = p.color || AVATAR_COLORS[0];
  return `<span class="avatar" style="--av:${c};width:${size}px;height:${size}px">` +
    `<span class="avatar-piece" style="--pc-w:#ffffff;--pc-ws:${c};--pc-wd:${c}">${pieceSVG('w', p.piece || 'k', 'classic')}</span></span>`;
}

export function loadProgress(id) { return load(progressKey(id), {}); }
export function saveProgress(id, progress) { save(progressKey(id), progress); }

export function statsOf(progress) {
  let solved = 0, helped = 0;
  for (const v of Object.values(progress)) { if (v === 'solved') solved++; else if (v === 'failed') helped++; }
  return { solved, helped, score: solved * 3 + helped };
}

export function createProfile({ name, piece, color }) {
  const p = { id: newId(), name: name.trim().slice(0, 24), piece, color, created: Date.now() };
  // The first profile inherits progress made before profiles existed.
  if (!store.list.length) {
    const legacy = load(LEGACY_PROGRESS, null);
    if (legacy && Object.keys(legacy).length) saveProgress(p.id, legacy);
  }
  store = { list: [...store.list, p], current: p.id };
  save(KEY, store);
  emit();
  return p;
}

export function updateProfile(id, patch) {
  store = { ...store, list: store.list.map(p => p.id === id ? { ...p, ...patch, name: (patch.name ?? p.name).trim().slice(0, 24) } : p) };
  save(KEY, store);
  emit();
}

export function switchProfile(id) {
  store = { ...store, current: id };
  save(KEY, store);
  emit();
}

export function deleteProfile(id) {
  store = { list: store.list.filter(p => p.id !== id), current: store.current === id ? null : store.current };
  try { localStorage.removeItem(progressKey(id)); } catch { /* ignore */ }
  save(KEY, store);
  contestDelete(id);
  emit();
}

// ---------- shared contest (claude.ai db capability) ----------
let db = null, me = null, canPost = true;
let remote = new Map();     // profile id -> body from the shared store
let contestState = 'local'; // local | loading | live | stale
const contestListeners = new Set();
export const onContest = fn => contestListeners.add(fn);
const emitContest = () => contestListeners.forEach(fn => fn());
export const contestInfo = () => ({ state: contestState, canPost, online: !!db });

export async function startContest() {
  const use = window.claude && window.claude.use;
  if (!use) return;
  try {
    [db, me] = await Promise.all([window.claude.use('db'), window.claude.use('user')]);
  } catch { db = null; }
  if (!db) { emitContest(); return; }
  if (me) {
    try { if ((await me.can('data.write')) === false) canPost = false; } catch { /* keep trying */ }
  }
  contestState = 'loading';
  emitContest();
  const timer = setTimeout(() => { if (contestState === 'loading') { contestState = 'stale'; emitContest(); } }, 10000);
  db.collection('contest').orderBy('score', 'desc').limit(200).onSnapshot(snap => {
    remote = new Map(snap.docs.filter(d => d.exists).map(d => [d.id, d.data()]));
    if (!snap.metadata.fromCache) { clearTimeout(timer); contestState = 'live'; }
    emitContest();
    syncAll();
  }, () => { clearTimeout(timer); contestState = 'stale'; emitContest(); });
}

// One pending write per profile; only when the posted data differs.
const pending = new Map();
const writing = new Set();
function bodyFor(p) {
  const s = statsOf(loadProgress(p.id));
  return { name: p.name, piece: p.piece, color: p.color, score: s.score, solved: s.solved, helped: s.helped };
}
function differs(a, b) {
  if (!b) return true;
  return ['name', 'piece', 'color', 'score', 'solved', 'helped'].some(k => a[k] !== b[k]);
}
export function syncProfile(id, delay = 1200) {
  if (!db || !canPost) return;
  clearTimeout(pending.get(id));
  pending.set(id, setTimeout(async () => {
    const p = store.list.find(x => x.id === id);
    if (!p || writing.has(id)) return;
    const body = bodyFor(p);
    if (!differs(body, remote.get(id))) return;
    writing.add(id);
    try {
      let owner = null;
      try { owner = me ? await me.id() : null; } catch { /* ignore */ }
      await db.collection('contest').doc(id).set({ ...body, owner, updatedAt: new Date().toISOString() });
    } catch (e) {
      if (e && e.code === 'invalid_argument') { canPost = false; emitContest(); }
    } finally { writing.delete(id); }
  }, delay));
}
function syncAll() { for (const p of store.list) syncProfile(p.id, 2000); }
async function contestDelete(id) {
  if (!db || !canPost || !remote.has(id)) return;
  try { await db.collection('contest').doc(id).delete(); } catch { /* ignore */ }
}

/** Leaderboard rows: every shared entry, with this device's players merged in (fresher). */
export function leaderboard() {
  const rows = new Map();
  for (const [id, b] of remote) rows.set(id, { id, ...b, local: false });
  for (const p of store.list) rows.set(p.id, { id: p.id, ...bodyFor(p), local: true, updatedAt: remote.get(p.id)?.updatedAt });
  return [...rows.values()].sort((a, b) => b.score - a.score || b.solved - a.solved || String(a.name).localeCompare(String(b.name)));
}
