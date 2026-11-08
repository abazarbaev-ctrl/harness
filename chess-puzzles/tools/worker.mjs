import { Chess } from '../vendor/chess.js';
import { canMate, mateKeys as keys, mainLine } from '../solver.js';
const mv = g => g.moves({ verbose: true });
import { parentPort, workerData } from 'node:worker_threads';
const { n, target, seed, timeLimit } = workerData;
let s = seed>>>0; const rnd=()=>{ s^=s<<13; s>>>=0; s^=s>>17; s^=s<<5; s>>>=0; return s/4294967296; };
const pick=a=>a[Math.floor(rnd()*a.length)];
const sq=(f,r)=>'abcdefgh'[f]+(r+1);
function randPos(){
  const board={}; const used=new Set();
  const put=(p,f,r)=>{ const k=sq(f,r); if(used.has(k)) return false; used.add(k); board[k]=p; return true; };
  // black king near top
  const bk=[Math.floor(rnd()*8), 5+Math.floor(rnd()*3)]; put('k',...bk);
  const wk=[Math.floor(rnd()*8), Math.floor(rnd()*4)]; if(Math.abs(wk[0]-bk[0])<2&&Math.abs(wk[1]-bk[1])<2) return null; put('K',...wk);
  const wSets = n===1? [['Q'],['R'],['R','R'],['Q','N'],['R','B'],['N','N','B'],['Q','B'],['R','N'],['B','B'],['Q','R'],['R','N','B']]
                     : [['Q','N'],['R','B'],['Q','B'],['R','R'],['R','N'],['Q'],['N','B','B'],['Q','R'],['R','N','B'],['R','B','N','P']];
  const bSets = [[],['P'],['P','P'],['P','P','P'],['R'],['N','P'],['B','P','P'],['R','P','P'],['Q','P'],['N','B']];
  for(const p of pick(wSets)) { for(let t=0;t<20;t++){ const r = p==='P'? 1+Math.floor(rnd()*6): Math.floor(rnd()*8); if(put(p,Math.floor(rnd()*8),r)) break; } }
  // black shield pawns near king sometimes
  for(const p of pick(bSets)){ for(let t=0;t<20;t++){
    let f,r; if(p==='P'){ f=Math.max(0,Math.min(7,bk[0]+Math.floor(rnd()*3)-1)); r=Math.max(1,Math.min(6,bk[1]-1-Math.floor(rnd()*2))); } else { f=Math.floor(rnd()*8); r=2+Math.floor(rnd()*6); }
    if(put(p.toLowerCase(),f,r)) break; } }
  const wp = Math.floor(rnd()*3);
  for(let i=0;i<wp;i++){ for(let t=0;t<20;t++){ if(put('P',Math.floor(rnd()*8),1+Math.floor(rnd()*4))) break; } }
  // build fen
  let rows=[]; for(let r=7;r>=0;r--){ let row='',e=0; for(let f=0;f<8;f++){ const p=board[sq(f,r)]; if(p){ if(e){row+=e;e=0;} row+=p; } else e++; } if(e) row+=e; rows.push(row); }
  return rows.join('/')+' w - - 0 1';
}
const found=[]; const t0=Date.now(); let tries=0;
while(found.length<target && Date.now()-t0<timeLimit){
  tries++; const fen=randPos(); if(!fen) continue;
  let g; try{ g=new Chess(fen); }catch{ continue; }
  if(g.isGameOver()) continue;
  // black must not be in check: test by switching side
  try{ const f2=fen.replace(' w ',' b '); const h=new Chess(f2); if(h.inCheck()) continue; }catch{ continue; }
  if(g.inCheck()) continue;
  if(n>1 && canMate(g,n-1)) continue;
  const ks = keys(g,n); if(ks.length!==1) continue;
  const key=ks[0];
  if(n>1){ // prefer non-capture keys; require black has >=2 replies after key (not trivial)
    g.move(key.san); const rep=mv(g).length; g.undo(); if(rep<2) continue;
    if(key.captured && rnd()<0.7) continue;
  }
  const line=mainLine(new Chess(fen),n);
  found.push({fen, line, check: key.san.includes('+'), capture: !!key.captured, pieces: fen.split(' ')[0].replace(/[^a-zA-Z]/g,'').length});
}
parentPort.postMessage({found, tries});
