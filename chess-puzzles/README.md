# Checkmate Workbook

A playable chess puzzle workbook that runs in the browser.

- **Play László Polgár's *Chess: 5334 Problems, Combinations and Games*.** Open your PDF of the book
  (“Open the book PDF…”) and every problem becomes playable, numbered as in the book: mate in 1, 2 and 3,
  the 600 miniature games, the endgames and the Polgár sisters' combinations, each with the book's answer.
  5,313 of the 5,334 problems load. The 21 skipped are game scores that could not be matched to their
  diagram.
- **Practice sets**: original computer-generated mate-in-1 and mate-in-2 puzzles. These need no book.
- **My puzzles**: type in any position yourself.

### How the book import works (and why the book isn't in this repo)

The book is copyrighted, so this repository contains **no** book content. `book.js` holds only the
rules for reading the 2013 TeX edition of the PDF. Its diagrams are text in a chess font, and its answer
key sits at the back. When you open the PDF, pdf.js reads it **in your browser**. The positions and
answers are turned into puzzles and stored in your browser's IndexedDB. Nothing is uploaded, and
nothing is saved to the server.

## Run it

It's a static site with no build step. Any static server works:

```bash
cd chess-puzzles
python3 -m http.server 8000   # then open http://localhost:8000
```

It can be deployed as-is to GitHub Pages, Netlify, Render or a similar host. It loads ES modules, so open it
through a server, not `file://`.

## Features

- **Players and contest:** no sign-up. "Who's playing?" lets each player pick a name and an avatar (a chess
  piece in a colour) and keeps their own progress on the device. The **Leaderboard** ranks everyone: 3
  points for a first-try solve and 1 for a solve with help. On claude.ai the leaderboard is shared
  live through the page's database, so everyone who opens the page sees everyone's scores; players
  need Contributor access to post. Elsewhere it shows the players on that device.

- **Appearance panel:** eight board colour themes plus custom light/dark squares, three piece styles
  (Classic, Flat, Letters), six piece colour pairs plus custom colours, and a coordinates toggle.
  Your choices are remembered in this browser.
- **3D view:** a Three.js table board with turned pieces. Drag to orbit, scroll or pinch to zoom, and tap a
  piece and then a square to move. It uses the same board and piece colours as the 2D view.

- Move pieces by clicking or dragging. Legal moves are shown, and a dialog lets you pick the promotion piece.
- **Any correct move is accepted** in mate-in-1 and mate-in-2 positions. A built-in forced-mate solver
  checks your move, so an alternative mate is fine, and the computer answers with its most stubborn
  defence. Mate-in-3 and the other book sections follow the book's main line. Any move that gives mate
  is always accepted.
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

For the Polgár book itself, use “Open the book PDF…” (see above).

## Files

| File | Purpose |
|---|---|
| `index.html`, `style.css` | Page and styles (light/dark) |
| `app.js` | Board, input, puzzle flow, progress, import |
| `solver.js` | Forced-mate search (shared with the generator) |
| `book.js` | Reads the Polgár PDF's text layer (diagrams + answer key) into puzzles |
| `vendor/pdfjs/` | [pdf.js](https://github.com/mozilla/pdf.js) 4.10.38 (Apache-2.0) |
| `pieces.js` | Original SVG piece sets (Classic, Flat, Letters) |
| `profiles.js` | Players (no sign-up), per-player progress, shared leaderboard |
| `settings.js` | Appearance settings: board themes, piece colours, view |
| `board3d.js` | 3D board (lazy-loaded) |
| `vendor/three/` | [three.js](https://threejs.org) r160 (MIT) |
| `puzzles.js` | Generated puzzle data |
| `vendor/chess.js` | [chess.js](https://github.com/jhlywa/chess.js) 1.0.0 (BSD-2-Clause, licence alongside) |
