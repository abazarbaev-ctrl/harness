import { Chess } from './vendor/chess.js';
import { CHAPTERS } from './puzzles.js';
import { pieceSVG, PIECE_NAMES } from './pieces.js';
import { allLose, bestDefence, mateKeys, mainLine, canMate } from './solver.js';
import { parseBook, pageItems, BOOK_CHAPTERS } from './book.js';

const $ = id => document.getElementById(id);
const FILES = 'abcdefgh';
const MINE_KEY = 'cw-mine-v1';
const PROGRESS_KEY = 'cw-progress-v1';

// ---------- storage (best effort; the app works without it) ----------
function load(key, fallback) {
  try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; } catch { return fallback; }
}
function save(key, value) { try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* ignore */ } }

let progress = load(PROGRESS_KEY, {});
let mine = load(MINE_KEY, []);
let bookPuzzles = null; // parsed from the reader's own PDF, kept in IndexedDB

// ---------- IndexedDB (the parsed book is too big for localStorage) ----------
function idb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open('checkmate-workbook', 1);
    req.onupgradeneeded = () => req.result.createObjectStore('kv');
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}
async function idbGet(key) {
  try {
    const db = await idb();
    return await new Promise((res, rej) => {
      const r = db.transaction('kv').objectStore('kv').get(key);
      r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error);
    });
  } catch { return undefined; }
}
async function idbSet(key, value) {
  try {
    const db = await idb();
    await new Promise((res, rej) => {
      const tx = db.transaction('kv', 'readwrite');
      if (value === undefined) tx.objectStore('kv').delete(key); else tx.objectStore('kv').put(value, key);
      tx.oncomplete = res; tx.onerror = () => rej(tx.error);
    });
  } catch { /* ignore: the book stays loaded for this visit only */ }
}

const BOOK_TASK = {
  'p-games': 'find the winning move',
  'p-draw': 'White draws',
  'p-win': 'White wins',
  'p-sisters': 'find the combination',
};

function chapters() {
  const list = [];
  if (bookPuzzles) {
    for (const c of BOOK_CHAPTERS) {
      const puzzles = bookPuzzles.filter(p => p.chapter === c.id);
      if (!puzzles.length) continue;
      list.push({
        id: c.id, title: `Polgár: ${c.title}`, mate: c.mate, book: true, task: BOOK_TASK[c.id],
        desc: `Problems ${c.from}–${c.to} from your copy of the book. The numbers match the book.`,
        puzzles,
      });
    }
  }
  for (const c of CHAPTERS) {
    list.push({
      ...c, title: `Practice: ${c.title}`,
      puzzles: c.puzzles.map(([fen, line], i) => ({ id: `${c.id}-${i + 1}`, fen, line: line.split(' '), mate: c.mate })),
    });
  }
  if (mine.length) {
    list.push({
      id: 'mine', title: 'My puzzles', mate: null,
      desc: 'Positions you added yourself. Stored only in this browser.',
      puzzles: mine.map((p, i) => ({ id: `mine-${i + 1}`, ...p })),
    });
  }
  return list;
}

// ---------- state ----------
let books = chapters();
let chapterIdx = 0;
let puzzleIdx = 0;
let pz = null;          // current puzzle
let game = null;        // chess.js instance
let ply = 0;            // half-moves played from the start position
let onLine = true;      // has play followed the stored main line?
let helped = false;     // mistake, hint or solution used
let done = false;
let busy = false;       // opponent reply / solution playback in progress
let flipped = false;
let selected = null;
let lastMove = null;
let hintSq = null;
let history = [];
let timers = [];

const attacker = () => new Chess(pz.fen).turn();
const movesLeft = () => pz.mate - Math.floor(ply / 2);

// ---------- rendering ----------
const boardEl = $('board');

function orientation() {
  const a = attacker();
  return flipped ? (a === 'w' ? 'b' : 'w') : a;
}

function squareOrder() {
  const out = [];
  const white = orientation() === 'w';
  for (let r = 0; r < 8; r++) for (let f = 0; f < 8; f++) {
    const file = white ? f : 7 - f;
    const rank = white ? 8 - r : r + 1;
    out.push({ sq: FILES[file] + rank, showFile: r === 7, showRank: f === 0, light: (file + rank) % 2 === 1 });
  }
  return out;
}

function render() {
  const targets = new Set(selected ? game.moves({ square: selected, verbose: true }).map(m => m.to) : []);
  boardEl.innerHTML = '';
  for (const { sq, showFile, showRank, light } of squareOrder()) {
    const el = document.createElement('div');
    el.className = 'sq ' + (light ? 'l' : 'd');
    el.dataset.sq = sq;
    if (lastMove && (lastMove.from === sq || lastMove.to === sq)) el.classList.add('last');
    if (selected === sq) el.classList.add('sel');
    if (hintSq === sq) el.classList.add('hint');
    const p = game.get(sq);
    if (targets.has(sq)) { el.classList.add('target'); if (p) el.classList.add('occupied'); }
    el.setAttribute('role', 'gridcell');
    el.setAttribute('aria-label', sq + (p ? ` ${p.color === 'w' ? 'white' : 'black'} ${PIECE_NAMES[p.type]}` : ''));
    if (p) {
      const pc = document.createElement('span');
      pc.className = 'pc';
      pc.innerHTML = pieceSVG(p.color, p.type);
      el.appendChild(pc);
    }
    if (showFile) el.insertAdjacentHTML('beforeend', `<span class="coord file">${sq[0]}</span>`);
    if (showRank) el.insertAdjacentHTML('beforeend', `<span class="coord rank">${sq[1]}</span>`);
    boardEl.appendChild(el);
  }
  renderMoves();
}

function renderMoves() {
  const ol = $('moves');
  ol.innerHTML = '';
  const startBlack = attacker() === 'b';
  const startNo = Number(pz.fen.split(' ')[5]) || 1;
  const items = [];
  let i = 0;
  if (startBlack && history.length) { items.push(`… ${history[0]}`); i = 1; }
  for (; i < history.length; i += 2) items.push(history[i] + (history[i + 1] ? `  ${history[i + 1]}` : ''));
  ol.start = startNo;
  for (const t of items) { const li = document.createElement('li'); li.textContent = t; ol.appendChild(li); }
}

function setStatus(text, kind = '') {
  const s = $('status');
  s.textContent = text;
  s.className = 'status ' + kind;
}

function renderSide() {
  const ch = books[chapterIdx];
  $('ch-title').textContent = ch.title;
  $('ch-desc').textContent = ch.desc;
  const solved = ch.puzzles.filter(p => progress[p.id] === 'solved').length;
  const tried = ch.puzzles.filter(p => progress[p.id]).length;
  $('progress-bar').style.width = (100 * tried / ch.puzzles.length) + '%';
  $('progress-text').textContent =
    `${tried} of ${ch.puzzles.length} done · ${solved} solved first try`;
  const PAGE = 100;
  const pages = Math.ceil(ch.puzzles.length / PAGE);
  const page = Math.floor(puzzleIdx / PAGE);
  const range = $('grid-range');
  range.hidden = pages < 2;
  range.innerHTML = '';
  for (let k = 0; k < pages; k++) {
    const a = ch.puzzles[k * PAGE], b = ch.puzzles[Math.min(ch.puzzles.length, (k + 1) * PAGE) - 1];
    const o = document.createElement('option');
    o.value = k; o.textContent = `No. ${a.number || k * PAGE + 1} – ${b.number || Math.min(ch.puzzles.length, (k + 1) * PAGE)}`;
    range.appendChild(o);
  }
  range.value = page;
  range.onchange = () => openPuzzle(chapterIdx, Number(range.value) * PAGE);
  const grid = $('grid');
  grid.innerHTML = '';
  ch.puzzles.slice(page * PAGE, (page + 1) * PAGE).forEach((p, j) => {
    const i = page * PAGE + j;
    const b = document.createElement('button');
    b.textContent = p.number || i + 1;
    b.title = `Puzzle ${p.number || i + 1}`;
    if (progress[p.id]) b.classList.add(progress[p.id]);
    if (i === puzzleIdx) b.classList.add('current');
    b.onclick = () => openPuzzle(chapterIdx, i);
    grid.appendChild(b);
  });
  const cur = grid.querySelector('.current');
  if (cur) grid.scrollTop = cur.offsetTop - grid.offsetTop - grid.clientHeight / 2;
  $('prev').disabled = chapterIdx === 0 && puzzleIdx === 0;
}

function renderChapterSelect() {
  const sel = $('chapter');
  sel.innerHTML = '';
  books.forEach((c, i) => {
    const o = document.createElement('option');
    o.value = i; o.textContent = `${c.title} (${c.puzzles.length})`;
    sel.appendChild(o);
  });
  sel.value = chapterIdx;
}

// ---------- puzzle flow ----------
function clearTimers() { timers.forEach(clearTimeout); timers = []; }
function later(fn, ms) { timers.push(setTimeout(fn, ms)); }

function taskText() {
  const side = attacker() === 'w' ? 'White' : 'Black';
  if (pz.mate) return `${side} to move · mate in ${pz.mate}`;
  const t = books[chapterIdx].task;
  if (t && t.startsWith('White')) return t.replace('White', side);
  return `${side} to move · ${t || 'find the best line'}`;
}

function openPuzzle(ci, pi, { keepFlip = false } = {}) {
  clearTimers();
  chapterIdx = ci; puzzleIdx = pi;
  pz = books[ci].puzzles[pi];
  game = new Chess(pz.fen);
  ply = 0; onLine = true; helped = false; done = false; busy = false;
  selected = null; lastMove = null; hintSq = null; history = [];
  if (!keepFlip) flipped = false;
  $('pz-number').textContent = `No. ${pz.number || pi + 1}`;
  $('pz-source').textContent = pz.source || '';
  $('answer').hidden = true;
  $('pz-task').textContent = taskText();
  $('chapter').value = ci;
  setStatus('Your move.');
  try { history_replace(`#${pz.id}`); } catch { /* ignore */ }
  render(); renderSide();
}
function history_replace(h) { if (location.hash !== h) window.history.replaceState(null, '', h); }

function mark(result) {
  if (progress[pz.id] === 'solved') return; // never downgrade
  progress[pz.id] = result;
  save(PROGRESS_KEY, progress);
}

function showAnswer() {
  if (!pz.solution) return;
  $('answer-text').textContent = pz.solution;
  $('answer').hidden = false;
}

function finish() {
  done = true; busy = false; hintSq = null;
  showAnswer();
  mark(helped ? 'failed' : 'solved');
  setStatus(helped ? 'Solved — with some help. Try it again later!' : 'Solved! Well played.', 'good');
  render(); renderSide();
}

function isCorrect(m) {
  // m has just been played on `game`
  if (game.isCheckmate()) return true;
  if (onLine && pz.line && pz.line[ply] === m.lan) return true;
  if (pz.mate) {
    const left = movesLeft(); // computed with the old ply
    // Deeper searches are too slow for the browser; there the book line decides.
    return left > 1 && left <= 3 && (left <= 2 || !pz.line?.length) && allLose(game, left - 1);
  }
  return false;
}

function applyMove(m, who) {
  lastMove = { from: m.from, to: m.to };
  history.push(m.san);
  ply++;
}

function userMove(from, to, promotion) {
  if (busy || done) return;
  let m;
  try { m = game.move({ from, to, promotion }); } catch { m = null; }
  if (!m) return;
  selected = null; hintSq = null;
  if (!isCorrect(m)) {
    game.undo();
    helped = true;
    mark('failed');
    setStatus(`${m.san} doesn't work. Try again.`, 'bad');
    render();
    const el = boardEl.querySelector(`[data-sq="${to}"]`);
    if (el) el.classList.add('wrong');
    renderSide();
    return;
  }
  if (onLine && pz.line && pz.line[ply] !== m.lan) onLine = false;
  applyMove(m, 'user');
  render();
  if (game.isCheckmate() || (!pz.mate && ply >= pz.line.length)) return finish();
  setStatus('Good move! Wait for the reply…', 'good');
  busy = true;
  later(opponentReply, 450);
}

function opponentReply() {
  let r = null;
  if (onLine && pz.line && pz.line[ply]) r = uciToMove(pz.line[ply]);
  else if (pz.mate) {
    const left = pz.mate - Math.ceil(ply / 2);
    r = left <= 2 ? bestDefence(game, left) : game.moves({ verbose: true })[0];
  }
  if (!r) return finish();
  const m = game.move({ from: r.from, to: r.to, promotion: r.promotion });
  applyMove(m, 'opp');
  busy = false;
  setStatus(`${m.san}. Your move.`);
  render();
}

function uciToMove(u) { return { from: u.slice(0, 2), to: u.slice(2, 4), promotion: u[4] }; }

function expectedMove() {
  if (onLine && pz.line && pz.line[ply]) return uciToMove(pz.line[ply]);
  if (pz.mate && movesLeft() <= 2) { const k = mateKeys(game, movesLeft()); return k[0] || null; }
  return null;
}

function hint() {
  if (busy || done) return;
  const m = expectedMove();
  if (!m) return;
  helped = true;
  hintSq = m.from;
  const p = game.get(m.from);
  setStatus(`Hint: move the ${PIECE_NAMES[p.type]} on ${m.from}.`);
  render();
}

function showSolution() {
  clearTimers();
  const line = pz.line && pz.line.length ? pz.line : mainLine(new Chess(pz.fen), pz.mate);
  helped = true;
  mark('failed');
  game = new Chess(pz.fen);
  ply = 0; history = []; lastMove = null; selected = null; hintSq = null; busy = true; done = false;
  render();
  setStatus('Solution:');
  line.forEach((u, i) => later(() => {
    const m = game.move(uciToMove(u));
    applyMove(m);
    render();
    if (i === line.length - 1) { done = true; busy = false; setStatus(`Solution: ${history.join(' ')}`); showAnswer(); renderSide(); }
  }, 650 * (i + 1)));
}

function step(delta) {
  let ci = chapterIdx, pi = puzzleIdx + delta;
  if (pi >= books[ci].puzzles.length) { if (ci + 1 < books.length) { ci++; pi = 0; } else pi = books[ci].puzzles.length - 1; }
  if (pi < 0) { if (ci > 0) { ci--; pi = books[ci].puzzles.length - 1; } else pi = 0; }
  openPuzzle(ci, pi);
}

// ---------- input: click and drag ----------
let drag = null;

function squareAt(x, y) {
  const el = document.elementFromPoint(x, y);
  const sq = el && el.closest('.sq');
  return sq && boardEl.contains(sq) ? sq.dataset.sq : null;
}

function tryMove(from, to) {
  const legal = game.moves({ square: from, verbose: true }).filter(m => m.to === to);
  if (!legal.length) return false;
  if (legal.some(m => m.promotion)) askPromotion(from, to);
  else userMove(from, to);
  return true;
}

function askPromotion(from, to) {
  const box = $('promo');
  box.innerHTML = '';
  for (const t of ['q', 'r', 'b', 'n']) {
    const b = document.createElement('button');
    b.innerHTML = pieceSVG(game.turn(), t);
    b.title = PIECE_NAMES[t];
    b.onclick = () => { box.hidden = true; userMove(from, to, t); };
    box.appendChild(b);
  }
  box.hidden = false;
}

boardEl.addEventListener('pointerdown', e => {
  if (busy || done) return;
  const sq = squareAt(e.clientX, e.clientY);
  if (!sq) return;
  const p = game.get(sq);
  if (selected && selected !== sq && (!p || p.color !== game.turn())) {
    const from = selected;
    if (!tryMove(from, sq)) { selected = null; render(); }
    return;
  }
  if (p && p.color === game.turn()) {
    const wasSelected = selected === sq;
    selected = sq; render();
    const pcEl = boardEl.querySelector(`[data-sq="${sq}"] .pc`);
    if (!pcEl) return;
    const rect = pcEl.getBoundingClientRect();
    drag = { from: sq, el: null, startX: e.clientX, startY: e.clientY, w: rect.width, wasSelected, src: pcEl };
    boardEl.setPointerCapture(e.pointerId);
    e.preventDefault();
  } else if (selected) { selected = null; render(); }
});

boardEl.addEventListener('pointermove', e => {
  if (!drag) return;
  if (!drag.el) {
    if (Math.hypot(e.clientX - drag.startX, e.clientY - drag.startY) < 4) return;
    drag.el = drag.src.cloneNode(true);
    drag.el.classList.add('dragging');
    drag.el.style.width = drag.el.style.height = drag.w + 'px';
    document.body.appendChild(drag.el);
    drag.src.style.opacity = '0.25';
  }
  drag.el.style.left = (e.clientX - drag.w / 2) + 'px';
  drag.el.style.top = (e.clientY - drag.w / 2) + 'px';
});

function endDrag(e) {
  if (!drag) return;
  const d = drag; drag = null;
  if (d.el) {
    d.el.remove();
    const to = squareAt(e.clientX, e.clientY);
    if (to && to !== d.from && tryMove(d.from, to)) return;
    render();
  } else if (d.wasSelected) { selected = null; render(); }
}
boardEl.addEventListener('pointerup', endDrag);
boardEl.addEventListener('pointercancel', e => { if (drag && drag.el) drag.el.remove(); drag = null; render(); });

// ---------- controls ----------
$('prev').onclick = () => step(-1);
$('next').onclick = () => step(1);
$('reset').onclick = () => openPuzzle(chapterIdx, puzzleIdx, { keepFlip: true });
$('hint').onclick = hint;
$('solution').onclick = showSolution;
$('flip').onclick = () => { flipped = !flipped; render(); };
$('chapter').onchange = e => {
  const ci = Number(e.target.value);
  const firstOpen = books[ci].puzzles.findIndex(p => !progress[p.id]);
  openPuzzle(ci, Math.max(0, firstOpen));
};
$('reset-progress').onclick = () => {
  const ch = books[chapterIdx];
  if (!confirm(`Clear your progress in “${ch.title}”?`)) return;
  ch.puzzles.forEach(p => delete progress[p.id]);
  save(PROGRESS_KEY, progress);
  renderSide();
};
document.addEventListener('keydown', e => {
  if (e.target.closest('textarea, input, select')) return;
  const k = e.key.toLowerCase();
  if (e.key === 'ArrowRight') step(1);
  else if (e.key === 'ArrowLeft') step(-1);
  else if (k === 'r') $('reset').click();
  else if (k === 'h') hint();
  else if (k === 's') showSolution();
  else if (k === 'f') $('flip').click();
});

// ---------- import ----------
function parseImport(text) {
  const out = [], errors = [];
  text.split('\n').map(s => s.trim()).filter(Boolean).forEach((lineText, i) => {
    const [fenPart, spec = 'mate in 1'] = lineText.split('|').map(s => s.trim());
    let g;
    try { g = new Chess(fenPart); } catch (err) { errors.push(`Line ${i + 1}: invalid FEN.`); return; }
    if (g.isGameOver()) { errors.push(`Line ${i + 1}: the game is already over in that position.`); return; }
    const mateMatch = spec.match(/^mate\s*in\s*(\d+)$/i) || spec.match(/^#(\d+)$/);
    if (mateMatch) {
      const n = Number(mateMatch[1]);
      if (n < 1 || n > 3) { errors.push(`Line ${i + 1}: use mate in 1, 2 or 3.`); return; }
      if (!canMate(g, n)) { errors.push(`Line ${i + 1}: no forced mate in ${n} found.`); return; }
      out.push({ fen: g.fen(), mate: n, line: mainLine(g, n) });
      return;
    }
    const line = [];
    for (const tok of spec.split(/\s+/).filter(t => !/^\d+\.+$/.test(t))) {
      const clean = tok.replace(/^\d+\.+/, '');
      let m = null;
      try {
        m = /^[a-h][1-8][a-h][1-8][qrbn]?$/i.test(clean) ? g.move(uciToMove(clean.toLowerCase())) : g.move(clean);
      } catch { m = null; }
      if (!m) { errors.push(`Line ${i + 1}: move “${tok}” is illegal.`); return; }
      line.push(m.lan);
    }
    if (!line.length) { errors.push(`Line ${i + 1}: no solution given.`); return; }
    out.push({ fen: fenPart, mate: null, line });
  });
  return { out, errors };
}

$('import-btn').onclick = () => {
  const msg = $('import-msg');
  msg.textContent = 'Checking…'; msg.className = 'small';
  setTimeout(() => {
    const { out, errors } = parseImport($('import-text').value);
    if (out.length) {
      mine = mine.concat(out);
      save(MINE_KEY, mine);
      books = chapters();
      renderChapterSelect();
      $('import-text').value = '';
    }
    msg.textContent = [out.length ? `Added ${out.length} puzzle${out.length > 1 ? 's' : ''}.` : '', ...errors].filter(Boolean).join(' ');
    msg.className = 'small ' + (errors.length ? 'bad' : 'good');
    if (out.length) openPuzzle(books.length - 1, mine.length - out.length);
  }, 20);
};
$('clear-mine').onclick = () => {
  if (!mine.length || !confirm('Delete all puzzles you added?')) return;
  mine.forEach((_, i) => delete progress[`mine-${i + 1}`]);
  mine = []; save(MINE_KEY, mine); save(PROGRESS_KEY, progress);
  books = chapters(); renderChapterSelect(); openPuzzle(0, 0);
};

// ---------- the reader's own copy of the book ----------
function setBookStatus(text, kind = '') {
  const el = $('book-status');
  el.textContent = text;
  el.className = 'small ' + kind;
}

function showBookState() {
  $('book-loaded').hidden = !bookPuzzles;
  $('book-load').hidden = !!bookPuzzles;
  if (bookPuzzles) $('book-count').textContent = bookPuzzles.length.toLocaleString();
}

function refreshBooks(openFirstBook = false) {
  const currentId = pz && pz.id;
  books = chapters();
  renderChapterSelect();
  showBookState();
  if (openFirstBook) {
    const pi = books[0].puzzles.findIndex(p => !progress[p.id]);
    return openPuzzle(0, Math.max(0, pi));
  }
  const pos = currentId && findPuzzle(currentId);
  if (pos) openPuzzle(...pos, { keepFlip: true }); else openPuzzle(0, 0);
}

async function loadBookFile(file) {
  setBookStatus('Opening the PDF…');
  $('book-progress').hidden = false;
  try {
    const pdfjs = await import('./vendor/pdfjs/pdf.min.mjs');
    pdfjs.GlobalWorkerOptions.workerSrc = new URL('./vendor/pdfjs/pdf.worker.min.mjs', import.meta.url).href;
    const doc = await pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) }).promise;
    const pages = [];
    for (let n = 1; n <= doc.numPages; n++) {
      pages.push(await pageItems(await doc.getPage(n)));
      if (n % 25 === 0 || n === doc.numPages) {
        $('book-progress').value = n / doc.numPages;
        setBookStatus(`Reading page ${n} of ${doc.numPages}…`);
        await new Promise(r => setTimeout(r));
      }
    }
    setBookStatus('Setting up the puzzles…');
    await new Promise(r => setTimeout(r, 30));
    const { puzzles, problems } = parseBook(pages);
    if (puzzles.length < 100) throw new Error('This does not look like the 5334-problem book.');
    bookPuzzles = puzzles;
    await idbSet('book', puzzles);
    setBookStatus(`Loaded ${puzzles.length.toLocaleString()} puzzles.` +
      (problems.length ? ` ${problems.length} could not be read and were skipped (${problems.map(p => p.id).slice(0, 12).join(', ')}${problems.length > 12 ? ', …' : ''}).` : ''), 'good');
    refreshBooks(true);
  } catch (err) {
    setBookStatus(`Could not read that file: ${err.message || err}`, 'bad');
  } finally {
    $('book-progress').hidden = true;
  }
}

$('book-file').onchange = e => { const f = e.target.files[0]; if (f) loadBookFile(f); e.target.value = ''; };
$('book-remove').onclick = async () => {
  if (!confirm('Remove the book from this browser? Your progress is kept.')) return;
  bookPuzzles = null;
  await idbSet('book', undefined);
  setBookStatus('');
  refreshBooks();
};

// ---------- start ----------
function findPuzzle(id) {
  for (let ci = 0; ci < books.length; ci++) {
    const pi = books[ci].puzzles.findIndex(p => p.id === id);
    if (pi >= 0) return [ci, pi];
  }
  return null;
}
const fromHash = () => findPuzzle(decodeURIComponent(location.hash.slice(1)));

const stored = await idbGet('book');
if (Array.isArray(stored) && stored.length) bookPuzzles = stored;
books = chapters();
renderChapterSelect();
showBookState();
const start = fromHash();
if (start) openPuzzle(...start);
else {
  const pi = books[0].puzzles.findIndex(p => !progress[p.id]);
  openPuzzle(0, Math.max(0, pi));
}
window.addEventListener('hashchange', () => {
  const pos = fromHash();
  if (pos && books[pos[0]].puzzles[pos[1]] !== pz) openPuzzle(...pos);
});
