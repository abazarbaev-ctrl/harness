// Generates original mate-in-N puzzles by random sampling + exhaustive solving.
// Usage: node tools/generate.mjs <n> <count> <seconds>  > out.json
// Every emitted position has exactly one key move that forces mate in n
// (and, for n > 1, no faster mate).
import { Worker } from 'node:worker_threads';
const n = +process.argv[2], target = +process.argv[3], timeLimit = +process.argv[4] * 1000;
const W = 4;
const runs = [...Array(W)].map((_, i) => new Promise(res => {
  const w = new Worker(new URL('./worker.mjs', import.meta.url), {
    workerData: { n, target: Math.ceil(target / W), seed: (Date.now() + i * 7919) * (n + 3), timeLimit },
  });
  w.on('message', res);
}));
const rs = await Promise.all(runs);
const all = rs.flatMap(r => r.found);
console.error('tries', rs.reduce((a, r) => a + r.tries, 0), 'found', all.length);
console.log(JSON.stringify(all));
