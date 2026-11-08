// Tiny forced-mate solver on top of chess.js. Used both by the app (to accept
// any correct move, not just the stored one) and by tools/generate.mjs.

function moves(g) { return g.moves({ verbose: true }); }
function play(g, m) { g.move({ from: m.from, to: m.to, promotion: m.promotion }); }

/** Can the side to move force mate within n of its own moves? */
export function canMate(g, n) {
  for (const m of moves(g)) {
    play(g, m);
    let ok = g.isCheckmate();
    if (!ok && n > 1 && !g.isDraw()) ok = allLose(g, n - 1);
    g.undo();
    if (ok) return true;
  }
  return false;
}

/** Side to move is the defender: does every reply allow mate within n? */
export function allLose(g, n) {
  const rs = moves(g);
  if (!rs.length) return false; // stalemate — not a mate
  for (const r of rs) {
    play(g, r);
    const ok = canMate(g, n);
    g.undo();
    if (!ok) return false;
  }
  return true;
}

/** Attacker moves that force mate within n. */
export function mateKeys(g, n) {
  const out = [];
  for (const m of moves(g)) {
    play(g, m);
    let ok = g.isCheckmate();
    if (!ok && n > 1 && !g.isDraw()) ok = allLose(g, n - 1);
    g.undo();
    if (ok) out.push(m);
  }
  return out;
}

/** Defender to move: pick the reply that postpones mate the longest (n = attacker moves left). */
export function bestDefence(g, n) {
  let best = null, bestLen = -1;
  for (const r of moves(g)) {
    play(g, r);
    let len = n + 1; // "escapes" if no mate found within n
    for (let k = 1; k <= n; k++) if (canMate(g, k)) { len = k; break; }
    g.undo();
    if (len > bestLen) { bestLen = len; best = r; }
  }
  return best;
}

/** Main line for a mate-in-n position: key, best defence, ..., mate. UCI strings. */
export function mainLine(g, n) {
  const line = [];
  let undo = 0;
  for (let left = n; left >= 1; left--) {
    const keys = mateKeys(g, left);
    if (!keys.length) break;
    const key = keys.find(m => { play(g, m); const c = g.isCheckmate(); g.undo(); return c; }) || keys[0];
    play(g, key); undo++; line.push(key.lan);
    if (g.isCheckmate() || left === 1) break;
    const d = bestDefence(g, left - 1);
    play(g, d); undo++; line.push(d.lan);
  }
  while (undo--) g.undo();
  return line;
}
