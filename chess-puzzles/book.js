// Turns the text layer of László Polgár's "Chess: 5334 Problems, Combinations
// and Games" (the 2013 TeX-typeset PDF) into playable puzzles.
//
// The parsing happens on the reader's own machine, from their own copy of the
// book: this file contains no book content, only the rules for reading it.
//
// Input: pages = [[{ str, x, y, w }, ...], ...]   (pdf.js text items, PDF units)
// Output: { puzzles: [{ id, chapter, fen, mate, line, solution, title? }], problems: [...] }

import { Chess } from './vendor/chess.js';
import { mateKeys, mainLine } from './solver.js';

export const BOOK_CHAPTERS = [
  { id: 'p-m1', from: 1, to: 306, title: 'Mate in 1', mate: 1 },
  { id: 'p-m2a', from: 307, to: 450, title: 'Mate in 2 — White to move', mate: 2 },
  { id: 'p-m2b', from: 451, to: 3718, title: 'Mate in 2 — combinations', mate: 2 },
  { id: 'p-m3', from: 3719, to: 4462, title: 'Mate in 3 — combinations', mate: 3 },
  { id: 'p-games', from: 4463, to: 5062, title: 'Miniature games — find the winning move', mate: null },
  { id: 'p-draw', from: 5063, to: 5104, title: 'Endgames — White draws', mate: null },
  { id: 'p-win', from: 5105, to: 5206, title: 'Endgames — White wins', mate: null },
  { id: 'p-sisters', from: 5207, to: 5334, title: 'Sisters’ tournament combinations', mate: null },
];
export const chapterOf = id => BOOK_CHAPTERS.find(c => id >= c.from && id <= c.to);

// The TeX chess font draws a piece differently on light and dark squares.
const FONT = {
  '0': null, Z: null,
  p: 'p', n: 'n', b: 'b', r: 'r', q: 'q', k: 'k', P: 'P', N: 'N', B: 'B', R: 'R', Q: 'Q', K: 'K',
  o: 'p', m: 'n', a: 'b', s: 'r', l: 'q', j: 'k', O: 'P', M: 'N', A: 'B', S: 'R', L: 'Q', J: 'K',
};
const ROW = /^[0ZpnbrqkPNBRQKomasljOMASLJ]{8}$/;

// ---------- diagrams ----------
function parseDiagrams(pages) {
  const out = new Map();
  pages.forEach(items => {
    const rows = items.filter(i => ROW.test(i.str));
    if (rows.length < 8) return;
    const nums = items.filter(i => /^\d{1,4}$/.test(i.str));
    const cols = new Map();
    for (const r of rows) {
      const k = Math.round(r.x / 20);
      if (!cols.has(k)) cols.set(k, []);
      cols.get(k).push(r);
    }
    for (const col of cols.values()) {
      col.sort((a, b) => b.y - a.y);
      for (let i = 0; i + 8 <= col.length; i += 8) {
        const board = col.slice(i, i + 8);
        const top = board[0];
        const label = nums
          .filter(n => n.y > top.y + 15 && n.y < top.y + 60 && n.x > top.x + 5 && n.x < top.x + 260)
          .sort((a, b) => a.y - b.y)[0];
        if (label && !out.has(+label.str)) out.set(+label.str, board.map(r => r.str));
      }
    }
  });
  return out;
}

function placement(rows) {
  return rows.map(row => {
    let s = '', empty = 0;
    for (const ch of row) {
      const p = FONT[ch];
      if (!p) { empty++; continue; }
      if (empty) { s += empty; empty = 0; }
      s += p;
    }
    return s + (empty || '');
  }).join('/');
}

function castling(board) {
  const at = (sq) => { const f = sq.charCodeAt(0) - 97, r = 8 - Number(sq[1]); return board[r][f]; };
  let c = '';
  if (at('e1') === 'K') { if (at('h1') === 'R') c += 'K'; if (at('a1') === 'R') c += 'Q'; }
  if (at('e8') === 'k') { if (at('h8') === 'r') c += 'k'; if (at('a8') === 'r') c += 'q'; }
  return c || '-';
}

function expand(placementStr) {
  return placementStr.split('/').map(r => r.replace(/\d/g, d => '.'.repeat(+d)));
}

// ---------- solutions ----------
function lineText(items) {
  items.sort((a, b) => a.x - b.x);
  let s = '', end = null;
  for (const it of items) {
    if (end !== null && it.x - end > 2.5) s += ' ';
    s += it.str;
    end = it.x + it.w;
  }
  return s;
}

function parseSolutions(pages) {
  const start = pages.findIndex(items => items.some(i => /Solutions/.test(i.str) && i.y > 930));
  if (start < 0) return new Map();
  const lines = [];
  for (let p = start; p < pages.length; p++) {
    const items = pages[p].filter(i => i.y < 930);
    const mid = 300;
    for (const left of [true, false]) {
      const col = items.filter(i => (i.x < mid) === left).sort((a, b) => b.y - a.y || a.x - b.x);
      let cur = null;
      for (const it of col) {
        if (!cur || Math.abs(cur.y - it.y) > 3) { cur = { y: it.y, items: [] }; lines.push(cur); }
        cur.items.push(it);
      }
    }
  }
  const out = new Map();
  let cur = null;
  for (const l of lines) {
    const t = lineText(l.items);
    const m = t.match(/^(\d{1,4}) (.*)$/);
    const id = m ? +m[1] : 0;
    if (m && id > (cur ? cur.id : 0) && id <= (cur ? cur.id : 0) + 5) {
      cur = { id, text: m[2] };
      out.set(id, cur);
    } else if (cur) cur.text += ' ' + t;
  }
  return out;
}

/** Clean figurine notation: returns the main line as SAN tokens plus metadata. */
export function cleanSolution(raw) {
  let t = raw, source = '';
  const credit = t.indexOf('Ô');
  if (credit >= 0) { source = t.slice(credit + 1).trim().replace(/(\w)- (\w)/g, '$1$2'); t = t.slice(0, credit); }
  t = t
    .replace(/\(\s*Di-?\s*agram\s*\)/g, ' @@ ')
    .replace(/X/g, 'x')
    .replace(/m/g, '#')
    .replace(/[!?]+/g, '');
  let pre = '';
  const d = t.indexOf('@@');
  if (d >= 0) { pre = t.slice(0, d); t = t.slice(d + 2); }
  const strip = s => {
    s = s.replace(/\[[^\]]*\]/g, ' ');
    let prev;
    do { prev = s; s = s.replace(/\([^()]*\)/g, ' '); } while (s !== prev);
    return s;
  };
  const tokens = s => strip(s)
    .replace(/(\d+)\.(\.\.)?/g, ' $1.$2 ')
    .split(/\s+/)
    .filter(Boolean);
  const isMove = tok => /^(?:[KQRBN]?[a-h]?[1-8]?x?[a-h][1-8](?:=?[QRBN])?|O-O(?:-O)?)[+#]?$/.test(tok);
  const main = [];
  let blackFirst = null;
  for (const tok of tokens(t)) {
    if (/^\d+\.\.\.$/.test(tok)) { if (blackFirst === null) blackFirst = true; continue; }
    if (/^\d+\.$/.test(tok)) { if (blackFirst === null) blackFirst = false; continue; }
    if (isMove(tok)) main.push(tok.replace(/([a-h][18])=?([QRBN])/, '$1=$2'));
    else if (main.length) break; // stop at results / comments
  }
  const preMoves = pre ? tokens(pre).filter(isMove) : [];
  return { main, blackFirst: !!blackFirst, preMoves, source, text: raw };
}

// ---------- assembling ----------
function tryLine(fen, sans) {
  let g;
  try { g = new Chess(fen); } catch { return null; }
  const uci = [];
  for (const san of sans) {
    let m = null;
    try { m = g.move(san, { strict: false }); } catch { m = null; }
    if (!m) break;
    uci.push(m.lan);
  }
  return uci;
}

const MAX_USER_MOVES = 4;

export function parseBook(pages) {
  const diagrams = parseDiagrams(pages);
  const solutions = parseSolutions(pages);
  const puzzles = [], problems = [];

  for (let id = 1; id <= 5334; id++) {
    const ch = chapterOf(id);
    const rows = diagrams.get(id);
    const sol = solutions.get(id);
    if (!rows || !sol) { problems.push({ id, why: 'not found in PDF' }); continue; }
    const c = cleanSolution(sol.text);
    const place = placement(rows);
    const side = c.blackFirst ? 'b' : 'w';
    let fen = `${place} ${side} ${castling(expand(place))} - 0 1`;

    // Games: replaying the moves before the diagram gives exact castling / en passant rights.
    if (c.preMoves.length) {
      const g = new Chess();
      let ok = true;
      for (const san of c.preMoves) { try { g.move(san, { strict: false }); } catch { ok = false; break; } }
      if (ok && g.fen().split(' ')[0] === place) fen = g.fen();
    }

    let line = c.main.length ? tryLine(fen, c.main) : [];
    if (line && c.main.length && !line.length) {
      // Unknown en-passant square in a diagram: try the plausible ones.
      const rank = side === 'w' ? '6' : '3';
      for (const f of 'abcdefgh') {
        const alt = fen.replace(/ - 0 1$/, ` ${f}${rank} 0 1`);
        const l = tryLine(alt, c.main);
        if (l && l.length) { fen = alt; line = l; break; }
      }
    }
    if ((!line || !line.length) && !ch.mate) {
      // Game whose diagram marker was not recognised: replay the whole game and
      // find the moment it reaches the diagram position.
      const all = [...c.preMoves, ...c.main];
      const g = new Chess();
      for (let k = 0; k < all.length; k++) {
        if (g.fen().split(' ')[0] === place) {
          fen = g.fen();
          line = tryLine(fen, all.slice(k));
          break;
        }
        try { g.move(all[k], { strict: false }); } catch { break; }
      }
    }
    let computed = false;
    if ((!line || !line.length) && ch.mate && ch.mate <= 2) {
      // Misprint in the answer key: let the solver find the mate instead.
      for (const s of [side, side === 'w' ? 'b' : 'w']) {
        let g;
        try { g = new Chess(`${place} ${s} ${castling(expand(place))} - 0 1`); } catch { continue; }
        if (mateKeys(g, ch.mate).length) { fen = g.fen(); line = mainLine(g, ch.mate); computed = true; break; }
      }
    }
    if (!line || !line.length) { problems.push({ id, why: 'solution does not fit the diagram', fen, solution: c.main.join(' ') }); continue; }

    if (!ch.mate) line = line.slice(0, MAX_USER_MOVES * 2 - 1);
    // For mates, keep the line only up to the mating move.
    if (ch.mate) line = line.slice(0, ch.mate * 2 - 1);

    puzzles.push({
      id: `${ch.id}-${id}`, number: id, chapter: ch.id, fen, mate: ch.mate,
      line, solution: computed ? '' : c.main.join(' '), source: c.source,
    });
  }
  return { puzzles, problems };
}

/** pdf.js page -> items in the shape parseBook expects. */
export async function pageItems(page) {
  const tc = await page.getTextContent();
  return tc.items
    .filter(it => it.str && it.str.trim())
    .map(it => ({ str: it.str, x: it.transform[4], y: it.transform[5], w: it.width }));
}
