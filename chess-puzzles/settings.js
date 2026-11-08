// Appearance settings: board colours, piece set, piece colours, 2D/3D view.
// Colours are applied as CSS custom properties so the 2D board restyles
// without re-rendering; the 3D board reads the same values.

export const BOARD_THEMES = {
  walnut: { name: 'Walnut', light: '#ecd9b8', dark: '#a87b5a' },
  tournament: { name: 'Tournament', light: '#eeeed2', dark: '#769656' },
  ocean: { name: 'Ocean', light: '#dfe6ea', dark: '#7f9cad' },
  slate: { name: 'Slate', light: '#cdd3da', dark: '#5d6b7c' },
  rosewood: { name: 'Rosewood', light: '#f1ddd3', dark: '#a9645a' },
  marble: { name: 'Marble', light: '#f1f1ec', dark: '#a3a39a' },
  midnight: { name: 'Midnight', light: '#9aa6bd', dark: '#3d4864' },
  coral: { name: 'Coral', light: '#f6e7cf', dark: '#d68a5c' },
};

export const PIECE_COLORS = {
  classic: { name: 'Classic', w: '#fbfaf6', b: '#2a2724' },
  ivory: { name: 'Ivory & ebony', w: '#f2e6c9', b: '#3b2a1f' },
  navy: { name: 'Snow & navy', w: '#f5f7fb', b: '#22355e' },
  crimson: { name: 'Bone & crimson', w: '#f6eee0', b: '#7b1f2c' },
  gold: { name: 'Gold & pewter', w: '#e7c768', b: '#4b4d57' },
  jade: { name: 'Pearl & jade', w: '#f3f1ea', b: '#1f5c4c' },
};

export const PIECE_SETS = {
  classic: { name: 'Classic' },
  flat: { name: 'Flat' },
  letters: { name: 'Letters' },
};

const KEY = 'cw-appearance-v1';
const DEFAULTS = {
  board: 'walnut', boardLight: null, boardDark: null,
  pieces: 'classic', pieceColors: 'classic', pieceW: null, pieceB: null,
  view: '2d', coords: true,
};

let state = { ...DEFAULTS };
try { state = { ...DEFAULTS, ...JSON.parse(localStorage.getItem(KEY) || '{}') }; } catch { /* defaults */ }
const listeners = new Set();

export const settings = () => state;
export function onSettings(fn) { listeners.add(fn); }

export function setSettings(patch) {
  state = { ...state, ...patch };
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* not persisted */ }
  applyColors();
  listeners.forEach(fn => fn(state, patch));
}

// ---------- colour helpers ----------
function hexToRgb(h) {
  const n = parseInt(h.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
function rgbToHex(r, g, b) {
  return '#' + [r, g, b].map(v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('');
}
export function mix(a, b, t) {
  const x = hexToRgb(a), y = hexToRgb(b);
  return rgbToHex(...x.map((v, i) => v + (y[i] - v) * t));
}
export function luminance(h) {
  const [r, g, b] = hexToRgb(h).map(v => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function boardColors(s = state) {
  if (s.board === 'custom') return { light: s.boardLight || '#e8dcc8', dark: s.boardDark || '#8a6f57' };
  return BOARD_THEMES[s.board] || BOARD_THEMES.walnut;
}

export function pieceColors(s = state) {
  const base = s.pieceColors === 'custom'
    ? { w: s.pieceW || '#fbfaf6', b: s.pieceB || '#2a2724' }
    : PIECE_COLORS[s.pieceColors] || PIECE_COLORS.classic;
  // Outlines: dark ink around light pieces, a deeper shade around dark ones.
  const outline = c => luminance(c) > 0.35 ? mix(c, '#000000', 0.82) : mix(c, '#000000', 0.6);
  const detail = c => luminance(c) > 0.35 ? mix(c, '#000000', 0.75) : mix(c, '#ffffff', 0.85);
  return { w: base.w, b: base.b, ws: outline(base.w), bs: outline(base.b), wd: detail(base.w), bd: detail(base.b) };
}

export function applyColors() {
  const r = document.documentElement.style;
  const b = boardColors(), p = pieceColors();
  r.setProperty('--light-sq', b.light);
  r.setProperty('--dark-sq', b.dark);
  r.setProperty('--coord-on-light', b.dark);
  r.setProperty('--coord-on-dark', b.light);
  for (const k of ['w', 'b', 'ws', 'bs', 'wd', 'bd']) r.setProperty(`--pc-${k}`, p[k]);
  document.documentElement.dataset.pieces = state.pieces;
  document.documentElement.dataset.coords = state.coords ? 'on' : 'off';
}
