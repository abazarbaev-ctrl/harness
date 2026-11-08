// Original piece artwork on a 45x45 grid. Colours come from CSS custom
// properties (--pc-w, --pc-b, outlines --pc-ws/--pc-bs, details --pc-wd/--pc-bd),
// so changing piece colours restyles every piece without re-rendering.
import { settings } from './settings.js';

const SHAPES = {
  p: `<circle cx="22.5" cy="13" r="5.2"/>
      <path d="M17.5 20.5h10l2.5 12.5h-15z"/>
      <path d="M11 39c0-4 3-6.5 6-6.5h11c3 0 6 2.5 6 6.5z"/>`,
  r: `<path d="M12 9h4v3.5h3.5V9h6v3.5H29V9h4v8l-3 2.5v12.5h-15V19.5l-3-2.5z"/>
      <path d="M10 39c0-4 2.5-6.5 5-6.5h15c2.5 0 5 2.5 5 6.5z"/>`,
  n: `<path d="M14 39c-.5-6 1.5-10 6.5-14.5 1.5-1.4 1.6-3 .2-3.6-2.4 2.6-5.6 3.4-8.4 2.7-2-.5-3-2.6-1.7-4.4L17 11.5l-.8-4 3.5 2.2c7.5-.6 13.8 4.6 14.7 13.8.5 5.4-.4 10.4-1.4 15.5z"/>
      <circle cx="18.5" cy="14.5" r="1.3" class="dt"/>`,
  b: `<circle cx="22.5" cy="8" r="2.6"/>
      <path d="M22.5 10.5c-5.5 4-8.2 9-7.2 13.5.6 2.7 3 4.5 7.2 4.5s6.6-1.8 7.2-4.5c.7-3.4-.8-7-3.8-10.4l-4.4 5.6-1.5-1.2 4.3-5.6c-.6-.6-1.2-1.3-1.8-1.9z"/>
      <path d="M17 28.5h11l1.5 4h-14z"/>
      <path d="M10 39c0-4 3-6.5 6-6.5h13c3 0 6 2.5 6 6.5z"/>`,
  q: `<path d="M9 14l5 15.5h17L36 14l-6.5 7.5-2.3-10-4.7 9.2-4.7-9.2-2.3 10z"/>
      <circle cx="9" cy="12.5" r="2.4"/><circle cx="17.8" cy="9.5" r="2.4"/><circle cx="22.5" cy="8.5" r="2.4"/>
      <circle cx="27.2" cy="9.5" r="2.4"/><circle cx="36" cy="12.5" r="2.4"/>
      <path d="M14 29.5h17l1 3H13z"/>
      <path d="M10 39c0-4 3-6.5 6-6.5h13c3 0 6 2.5 6 6.5z"/>`,
  k: `<path d="M21 4h3v3.5h3.5v3H24V15h-3v-4.5h-3.5v-3H21z"/>
      <path d="M22.5 15c-7.5 0-12.5 3.5-12.5 8 0 3.6 2.5 6 4.5 9.5h16c2-3.5 4.5-5.9 4.5-9.5 0-4.5-5-8-12.5-8z"/>
      <path d="M10 39c0-4 3-6.5 6-6.5h13c3 0 6 2.5 6 6.5z"/>`,
};

const LETTER = { p: 'P', n: 'N', b: 'B', r: 'R', q: 'Q', k: 'K' };

export function pieceSVG(color, type, set = settings().pieces) {
  const fill = `var(--pc-${color})`, line = `var(--pc-${color}s)`, detail = `var(--pc-${color}d)`;
  if (set === 'letters') {
    return `<svg viewBox="0 0 45 45" aria-hidden="true">
      <circle cx="22.5" cy="22.5" r="17" style="fill:${fill};stroke:${line}" stroke-width="2"/>
      <text x="22.5" y="23.5" text-anchor="middle" dominant-baseline="central"
        style="fill:${detail};font:700 19px var(--font-ui, system-ui), sans-serif">${LETTER[type]}</text></svg>`;
  }
  const flat = set === 'flat';
  return `<svg viewBox="0 0 45 45" aria-hidden="true">
    <style>.dt{fill:${detail};stroke:none}</style>
    <g style="fill:${fill};stroke:${line}" stroke-width="${flat ? 0.7 : 1.5}" stroke-linejoin="round">${SHAPES[type]}</g></svg>`;
}

export const PIECE_NAMES = { p: 'pawn', n: 'knight', b: 'bishop', r: 'rook', q: 'queen', k: 'king' };
