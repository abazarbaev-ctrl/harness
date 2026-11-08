// 3D board built with three.js (vendored, loaded only when 3D view is chosen).
// Pieces are turned (lathe) profiles; the knight is an extruded silhouette.
// Drag to orbit, scroll or pinch to zoom, click or tap a piece and then a square to move.

let THREE = null;
const FILES = 'abcdefgh';

export async function createBoard3D(container, { onSquare }) {
  THREE = THREE || await import('./vendor/three/three.module.min.js');
  const T = THREE;

  const renderer = new T.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = T.PCFSoftShadowMap;
  renderer.outputColorSpace = T.SRGBColorSpace;
  container.appendChild(renderer.domElement);
  renderer.domElement.className = 'board3d-canvas';

  const scene = new T.Scene();
  const camera = new T.PerspectiveCamera(36, 1, 0.1, 100);

  scene.add(new T.HemisphereLight(0xffffff, 0x404040, 1.6));
  const sun = new T.DirectionalLight(0xffffff, 2.2);
  sun.position.set(-4, 10, 5);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -6, right: 6, top: 6, bottom: -6, near: 1, far: 30 });
  sun.shadow.bias = -0.0008;
  scene.add(sun);
  const fill = new T.DirectionalLight(0xffffff, 0.6);
  fill.position.set(5, 4, -6);
  scene.add(fill);

  // ----- board -----
  const boardGroup = new T.Group();
  scene.add(boardGroup);
  const frameMat = new T.MeshStandardMaterial({ roughness: 0.6 });
  const frame = new T.Mesh(new T.BoxGeometry(9.2, 0.4, 9.2), frameMat);
  frame.position.y = -0.21;
  frame.receiveShadow = true;
  boardGroup.add(frame);

  const lightMat = new T.MeshStandardMaterial({ roughness: 0.55 });
  const darkMat = new T.MeshStandardMaterial({ roughness: 0.55 });
  const tiles = new Map();
  const tileGeo = new T.BoxGeometry(1, 0.06, 1);
  for (let f = 0; f < 8; f++) for (let r = 0; r < 8; r++) {
    const sq = FILES[f] + (r + 1);
    const m = new T.Mesh(tileGeo, (f + r) % 2 ? lightMat : darkMat);
    m.position.set(f - 3.5, -0.03, 3.5 - r);
    m.receiveShadow = true;
    m.userData.sq = sq;
    boardGroup.add(m);
    tiles.set(sq, m);
  }

  // Coordinates painted on the frame.
  const coordCanvas = document.createElement('canvas');
  coordCanvas.width = coordCanvas.height = 1024;
  const coordTex = new T.CanvasTexture(coordCanvas);
  coordTex.colorSpace = T.SRGBColorSpace;
  const coordPlane = new T.Mesh(
    new T.PlaneGeometry(9.2, 9.2),
    new T.MeshBasicMaterial({ map: coordTex, transparent: true, depthWrite: false }),
  );
  coordPlane.rotation.x = -Math.PI / 2;
  coordPlane.position.y = 0.002;
  boardGroup.add(coordPlane);

  function paintCoords(color, show) {
    const c = coordCanvas.getContext('2d');
    c.clearRect(0, 0, 1024, 1024);
    if (show) {
      c.fillStyle = color;
      c.font = '600 30px system-ui, sans-serif';
      c.textAlign = 'center'; c.textBaseline = 'middle';
      const cell = 1024 / 9.2, edge = 0.3 * cell;
      for (let i = 0; i < 8; i++) {
        const p = (0.6 + i + 0.5) * cell;
        c.fillText(FILES[i], p, 1024 - edge); c.fillText(FILES[i], p, edge);
        c.fillText(String(8 - i), edge, p); c.fillText(String(8 - i), 1024 - edge, p);
      }
    }
    coordTex.needsUpdate = true;
  }

  // Square markers (last move, selection, hint, legal targets).
  const markerGeo = new T.PlaneGeometry(0.98, 0.98);
  const dotGeo = new T.CircleGeometry(0.15, 32);
  const ringGeo = new T.RingGeometry(0.38, 0.47, 40);
  const markers = new T.Group();
  boardGroup.add(markers);
  const markerMat = color => new T.MeshBasicMaterial({ color, transparent: true, opacity: 0.5, depthWrite: false });
  const MARK = { last: markerMat(0x9bc700), sel: markerMat(0xffd60a), hint: markerMat(0x2a8cff), target: markerMat(0x111111) };
  MARK.target.opacity = 0.32;

  // ----- pieces -----
  const pieceMats = { w: new T.MeshStandardMaterial({ roughness: 0.38, metalness: 0.05, side: T.DoubleSide }), b: new T.MeshStandardMaterial({ roughness: 0.38, metalness: 0.05, side: T.DoubleSide }) };
  const geoCache = {};
  const lathe = pts => new T.LatheGeometry(pts.map(([x, y]) => new T.Vector2(x, y)), 48);
  const BASE = [[0, 0], [0.36, 0], [0.37, 0.04], [0.35, 0.09], [0.3, 0.12], [0.27, 0.16]];

  function pieceGeometry(type) {
    if (geoCache[type]) return geoCache[type];
    let g;
    if (type === 'p') {
      g = [lathe([...BASE, [0.2, 0.2], [0.13, 0.36], [0.11, 0.42], [0.17, 0.45], [0.11, 0.49], [0, 0.49]]),
        sphere(0.13, 0.6)];
    } else if (type === 'r') {
      const body = lathe([...BASE, [0.24, 0.22], [0.2, 0.55], [0.26, 0.6], [0.27, 0.74], [0.18, 0.74], [0.18, 0.68], [0, 0.68]]);
      const parts = [body];
      for (let i = 0; i < 4; i++) {
        const b = new T.BoxGeometry(0.11, 0.1, 0.12);
        b.translate(0, 0.79, 0.21);
        b.rotateY(i * Math.PI / 2 + Math.PI / 4);
        parts.push(b);
      }
      g = parts;
    } else if (type === 'b') {
      g = [lathe([...BASE, [0.2, 0.22], [0.12, 0.5], [0.17, 0.53], [0.12, 0.57], [0.16, 0.66], [0.15, 0.78], [0.08, 0.88], [0, 0.9]]),
        sphere(0.05, 0.94)];
    } else if (type === 'q') {
      const parts = [lathe([...BASE, [0.22, 0.24], [0.13, 0.62], [0.2, 0.66], [0.14, 0.7], [0.24, 0.92], [0.17, 0.94], [0.1, 0.96], [0, 0.97]]), sphere(0.06, 1.02)];
      for (let i = 0; i < 8; i++) {
        const s = new T.SphereGeometry(0.035, 12, 8);
        s.translate(Math.cos(i * Math.PI / 4) * 0.22, 0.95, Math.sin(i * Math.PI / 4) * 0.22);
        parts.push(s);
      }
      g = parts;
    } else if (type === 'k') {
      const parts = [lathe([...BASE, [0.22, 0.24], [0.14, 0.66], [0.21, 0.7], [0.14, 0.74], [0.21, 0.92], [0.12, 0.98], [0, 0.99]])];
      const v = new T.BoxGeometry(0.07, 0.24, 0.07); v.translate(0, 1.1, 0);
      const h = new T.BoxGeometry(0.2, 0.07, 0.07); h.translate(0, 1.12, 0);
      parts.push(v, h);
      g = parts;
    } else if (type === 'n') {
      const base = lathe([...BASE, [0.24, 0.2], [0, 0.2]]);
      const s = new T.Shape();
      // Side profile of a horse head (x = forward, y = up), extruded for thickness.
      const pts = [[-0.22, 0.18], [0.24, 0.18], [0.2, 0.42], [0.12, 0.52], [0.3, 0.56], [0.36, 0.66], [0.3, 0.74],
        [0.12, 0.8], [0.06, 0.92], [0.0, 0.86], [-0.08, 0.92], [-0.12, 0.82], [-0.24, 0.62], [-0.26, 0.4]];
      s.moveTo(...pts[0]);
      pts.slice(1).forEach(p => s.lineTo(...p));
      s.closePath();
      const head = new T.ExtrudeGeometry(s, { depth: 0.2, bevelEnabled: true, bevelThickness: 0.05, bevelSize: 0.04, bevelSegments: 3 });
      head.translate(0, 0, -0.1);
      g = [base, head];
    }
    return (geoCache[type] = g);
  }
  function sphere(r, y) { const s = new T.SphereGeometry(r, 24, 16); s.translate(0, y, 0); return s; }

  function makePiece(color, type) {
    const group = new T.Group();
    for (const geo of pieceGeometry(type)) {
      const m = new T.Mesh(geo, pieceMats[color]);
      m.castShadow = true; m.receiveShadow = true;
      group.add(m);
    }
    // Knights face the opponent.
    if (type === 'n') group.rotation.y = color === 'w' ? Math.PI / 2 : -Math.PI / 2;
    group.scale.setScalar(0.95);
    return group;
  }

  const pieceGroup = new T.Group();
  scene.add(pieceGroup);
  const sqPos = sq => new T.Vector3(FILES.indexOf(sq[0]) - 3.5, 0, 3.5 - (Number(sq[1]) - 1));

  // ----- camera orbit -----
  const view = { az: 0, el: 0.98, dist: 16.2, target: new T.Vector3(0, -0.3, 0.35) };
  let baseAz = 0;
  function placeCamera() {
    const { az, el, dist } = view;
    camera.position.set(Math.sin(az) * Math.cos(el) * dist, Math.sin(el) * dist, Math.cos(az) * Math.cos(el) * dist);
    camera.lookAt(view.target);
  }

  let needsFrame = true;
  let anim = null;
  function frameLoop(t) {
    if (anim) {
      const k = Math.min(1, (t - anim.start) / anim.dur);
      const e = k < 0.5 ? 2 * k * k : 1 - (-2 * k + 2) ** 2 / 2;
      anim.obj.position.lerpVectors(anim.from, anim.to, e);
      anim.obj.position.y = Math.sin(Math.PI * e) * anim.hop;
      if (k >= 1) anim = null;
      needsFrame = true;
    }
    if (needsFrame) { placeCamera(); renderer.render(scene, camera); needsFrame = !!anim; }
    raf = requestAnimationFrame(frameLoop);
  }
  let raf = requestAnimationFrame(frameLoop);

  function resize() {
    const w = container.clientWidth, h = container.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    // Keep the whole board in view on tall, narrow screens.
    view.dist = 16.2 * Math.max(1, 1 / camera.aspect);
    camera.updateProjectionMatrix();
    needsFrame = true;
  }
  const ro = new ResizeObserver(resize);
  ro.observe(container);

  // ----- input: orbit vs click -----
  const ray = new T.Raycaster();
  const ndc = new T.Vector2();
  const pointers = new Map();
  let down = null, pinch0 = null;
  const el = renderer.domElement;
  el.style.touchAction = 'none';

  el.addEventListener('pointerdown', e => {
    el.setPointerCapture(e.pointerId);
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.size === 1) down = { x: e.clientX, y: e.clientY, az: view.az, el: view.el, moved: false };
    if (pointers.size === 2) { const [a, b] = [...pointers.values()]; pinch0 = { d: Math.hypot(a.x - b.x, a.y - b.y), dist: view.dist }; down = null; }
  });
  el.addEventListener('pointermove', e => {
    if (!pointers.has(e.pointerId)) return;
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pinch0 && pointers.size === 2) {
      const [a, b] = [...pointers.values()];
      view.dist = clamp(pinch0.dist * pinch0.d / Math.max(1, Math.hypot(a.x - b.x, a.y - b.y)), 8, 30);
      needsFrame = true; return;
    }
    if (!down) return;
    const dx = e.clientX - down.x, dy = e.clientY - down.y;
    if (Math.hypot(dx, dy) > 5) down.moved = true;
    if (down.moved) {
      view.az = down.az - dx * 0.008;
      view.el = clamp(down.el + dy * 0.006, 0.25, 1.45);
      needsFrame = true;
    }
  });
  const up = e => {
    pointers.delete(e.pointerId);
    if (pointers.size < 2) pinch0 = null;
    if (!down) return;
    const d = down; down = null;
    if (d.moved) return;
    const r = el.getBoundingClientRect();
    ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ndc, camera);
    const hit = ray.intersectObjects([...pieceGroup.children, ...tiles.values()], true)[0];
    if (!hit) return;
    let o = hit.object;
    while (o && !o.userData.sq) o = o.parent;
    if (o) onSquare(o.userData.sq);
  };
  el.addEventListener('pointerup', up);
  el.addEventListener('pointercancel', e => { pointers.delete(e.pointerId); down = null; pinch0 = null; });
  el.addEventListener('wheel', e => { e.preventDefault(); view.dist = clamp(view.dist * (1 + e.deltaY * 0.001), 8, 30); needsFrame = true; }, { passive: false });

  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }

  // ----- public API -----
  let lastKey = null, lastOrientation = null;
  function update(s) {
    // Colours
    lightMat.color.set(s.colors.light);
    darkMat.color.set(s.colors.dark);
    frameMat.color.set(s.colors.frame);
    pieceMats.w.color.set(s.colors.w);
    pieceMats.b.color.set(s.colors.b);
    paintCoords(s.colors.coords, s.coords);

    if (s.orientation !== lastOrientation) {
      baseAz = s.orientation === 'w' ? 0 : Math.PI;
      view.az = baseAz; view.el = 0.98;
      view.target.z = s.orientation === 'w' ? 0.35 : -0.35;
      lastOrientation = s.orientation;
    }

    // Markers
    markers.clear();
    const mark = (sq, mat, geo = markerGeo) => {
      const m = new T.Mesh(geo, mat);
      m.rotation.x = -Math.PI / 2;
      m.position.copy(sqPos(sq)).setY(0.004);
      markers.add(m);
    };
    if (s.lastMove) { mark(s.lastMove.from, MARK.last); mark(s.lastMove.to, MARK.last); }
    if (s.selected) mark(s.selected, MARK.sel);
    if (s.hint) mark(s.hint, MARK.hint);
    for (const t of s.targets) mark(t, MARK.target, s.occupied.has(t) ? ringGeo : dotGeo);

    // Pieces
    pieceGroup.clear();
    let moved = null;
    for (const p of s.pieces) {
      const g = makePiece(p.color, p.type);
      g.position.copy(sqPos(p.square));
      g.userData.sq = p.square;
      pieceGroup.add(g);
      if (s.lastMove && p.square === s.lastMove.to) moved = g;
    }
    const key = s.lastMove ? s.lastMove.from + s.lastMove.to + s.ply : null;
    if (moved && key && key !== lastKey && s.animate) {
      anim = {
        obj: moved, from: sqPos(s.lastMove.from), to: sqPos(s.lastMove.to),
        hop: moved.children.length && s.movedType === 'n' ? 0.6 : 0.12, start: performance.now(), dur: 320,
      };
      moved.position.copy(anim.from);
    }
    lastKey = key;
    needsFrame = true;
  }

  return {
    update,
    resetView() { view.az = baseAz; view.el = 0.98; needsFrame = true; },
    destroy() { cancelAnimationFrame(raf); ro.disconnect(); renderer.dispose(); el.remove(); },
  };
}
