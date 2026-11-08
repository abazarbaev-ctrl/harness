# Checkmate Workbook

A playable chess puzzle workbook that runs in the browser. It's laid out like the classic big checkmate
collections: a long run of **mate in one** puzzles, then **mate in two**. You can also type in positions
from any book you own.

## Run it

It's a static site with no build step. Any static server works:

```bash
cd chess-puzzles
python3 -m http.server 8000   # then open http://localhost:8000
```

It can be deployed as-is to GitHub Pages, Netlify, Render or a similar host. It loads ES modules, so open it
through a server, not `file://`.

## Features

- Move pieces by clicking or dragging. Legal moves are shown, and a dialog lets you pick the promotion piece.
- **Any correct move is accepted.** A built-in forced-mate solver checks your move, so an alternative mate
  is fine. The computer answers with its most stubborn defence.
- Hint (highlights the piece to move), Solution (plays out the main line), Retry, Flip board.
- Progress is saved in the browser. Green means solved on the first try; amber means solved with help.
- Deep links to individual puzzles, e.g. `#m2-17`.
- Keyboard shortcuts: ← / → previous and next, `H` hint, `S` solution, `R` retry, `F` flip.
- **My puzzles:** paste one position per line, in either of these forms:
  - `FEN | mate in N` (N = 1–3, checked by the solver), or
  - `FEN | Qxf7#` / `FEN | e2e4 e7e5 …` (a fixed solution line in SAN or UCI).

## About the puzzles

The built-in puzzles are **original**: a computer generated them, and they are not copied from any
published book. `tools/generate.mjs` samples random positions. It keeps only those with exactly one key
move that forces mate in N and, for N > 1, no faster mate. `tools/build.mjs` checks every puzzle again,
puts about a third of them in Black-to-move form, and writes `puzzles.js`.

```bash
node tools/generate.mjs 1 300 60  > m1.json   # mate in 1: 300 puzzles, max 60 s
node tools/generate.mjs 2 150 900 > m2.json   # mate in 2
node tools/build.mjs m1.json m2.json
```

To practise with positions from a copyrighted book such as László Polgar's *Chess: 5334 Problems,
Combinations and Games*, enter them under **My puzzles**. They stay in your own browser.

## Files

| File | Purpose |
|---|---|
| `index.html`, `style.css` | Page and styles (light/dark) |
| `app.js` | Board, input, puzzle flow, progress, import |
| `solver.js` | Forced-mate search (shared with the generator) |
| `pieces.js` | Original SVG piece set |
| `puzzles.js` | Generated puzzle data |
| `vendor/chess.js` | [chess.js](https://github.com/jhlywa/chess.js) 1.0.0 (BSD-2-Clause, licence alongside) |
