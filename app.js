/* =====================================================================
   스마트홈 3D 시뮬레이터 — app.js
   Scale: 10× linear (volume 1000×) | Pyramid Hip Roof | Three.js r128
   ===================================================================== */

'use strict';

// ─────────────────────────────────────────────────────────────────────
// 1. APPLICATION STATE
// ─────────────────────────────────────────────────────────────────────
const S = {
  lights: { living: false, kitchen: false, master: false, rooma: false, roomb: false, bathroom: false },
  brightness: 70,
  door: { open: false, locked: true },
  curtains: { living: false, master: false, rooma: false, roomb: false },
  climate: {
    boiler: false, boilerMode: 'indoor', boilerTarget: 22.0,
    ac: false, acWind: 'low',
    humidifier: false,
    currentTemp: 24.5, targetTemp: 22.0,
    currentHumidity: 52
  },
  gas: { open: false },
  roof: false,
  labels: true,
  fpsMode: false,
  panelOpen: true
};

// ─────────────────────────────────────────────────────────────────────
// 2. UTILITIES
// ─────────────────────────────────────────────────────────────────────
function toast(msg, type = 'ok') {
  const area = document.getElementById('toast-area');
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.textContent = msg;
  area.appendChild(el);
  setTimeout(() => el.remove(), 2800);
}
const qs  = sel => document.querySelector(sel);
const qsa = sel => document.querySelectorAll(sel);

function clock() {
  const now = new Date();
  const t = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;
  const e1 = qs('#panel-time'); if (e1) e1.textContent = t;
  const e2 = qs('#hud-time');   if (e2) e2.textContent = t;
}
setInterval(clock, 10000);
clock();

// ─────────────────────────────────────────────────────────────────────
// 3. THREE.JS 3D SIMULATOR ENGINE
// ─────────────────────────────────────────────────────────────────────

/*  SCALE GUIDE (all units = decimeters, ~real-world feel)
    House footprint: 160 × 140 units  (was 16×14, ×10)
    Wall height    : 32 units          (was 3.2)
    Eye level      : 16.5 units        (was 1.65)
    Walk speed     : 45 units/s        (was 4.5)
*/

class SmartHomeSimulator {
  constructor() {
    this.canvas = qs('#sim-canvas');
    this.W = this.canvas.clientWidth;
    this.H = this.canvas.clientHeight;

    this.keys     = {};
    this.fpsYaw   = 0;
    this.fpsPitch = 0;
    this.fpsPos   = new THREE.Vector3(0, 16.5, 40);
    this.clock3   = new THREE.Clock();

    this.lamps        = {};
    this.curtains3d   = {};
    this.doorPivot    = null;
    this.roofGroup    = null;
    this.flameMesh    = null;
    this.acParticles  = null;
    this.mistParticles= null;
    this.ondolPlanes  = [];
    this.labelGroup   = null;

    this._build();
    this._bindResize();
    this._bindKeys();
    this._loop();
  }

  // ── Scene Setup ───────────────────────────────────────────────────
  _build() {
    this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: true });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    this.renderer.setSize(this.W, this.H);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type    = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping       = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.1;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0a0e1a);
    this.scene.fog = new THREE.Fog(0x0a0e1a, 300, 900);

    // Camera — start at isometric overview
    this.camera = new THREE.PerspectiveCamera(45, this.W / this.H, 0.5, 3000);
    this.camera.position.set(220, 180, 220);

    this.orbit = new THREE.OrbitControls(this.camera, this.renderer.domElement);
    this.orbit.enableDamping = true;
    this.orbit.dampingFactor = 0.06;
    this.orbit.maxPolarAngle = Math.PI / 2.05;
    this.orbit.minDistance   = 30;
    this.orbit.maxDistance   = 700;
    this.orbit.target.set(0, 15, 0);

    // Global lights
    this.ambient = new THREE.AmbientLight(0x1a2040, 1.2);
    this.scene.add(this.ambient);

    this.sun = new THREE.DirectionalLight(0xfff5e0, 0.7);
    this.sun.position.set(120, 200, 80);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(4096, 4096);
    this.sun.shadow.camera.near   =  5;
    this.sun.shadow.camera.far    = 600;
    this.sun.shadow.camera.left   = -250;
    this.sun.shadow.camera.right  =  250;
    this.sun.shadow.camera.top    =  250;
    this.sun.shadow.camera.bottom = -250;
    this.sun.shadow.bias = -0.001;
    this.scene.add(this.sun);

    this._buildHouse();
  }

  // ── Material helpers ──────────────────────────────────────────────
  _mat(color, rough = 0.6, metal = 0) {
    return new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: metal });
  }

  _box(w, h, d, mat, x, y, z) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    m.position.set(x, y, z);
    m.castShadow = true;
    m.receiveShadow = true;
    this.scene.add(m);
    return m;
  }

  // ── Full House Build ──────────────────────────────────────────────
  _buildHouse() {
    this._buildFloors();
    this._buildWalls();
    this._buildDoor();
    this._buildWindows();
    this._buildFurniture();
    this._buildRoof();
    this._buildLamps();
    this._buildCurtains();
    this._buildEffects();
    this._buildLabels();
  }

  // ── Floors ────────────────────────────────────────────────────────
  /*
    Layout (×10 from original):
    X: -80..+80  (160 wide)
    Z: -70..+70  (140 deep)

    Zones (cx, cz, w, d):
    거실:   cx=-30  cz=+25  w=100 d=80
    주방:   cx=-30  cz=-40  w=100 d=60
    안방:   cx=-30  cz=+50  w=100 d=40
    욕실:   cx=+40  cz=+55  w=80  d=30
    방 A:   cx=+40  cz=+25  w=80  d=80
    방 B:   cx=-10  cz=-40  w=60  d=60
    현관:   cx=+50  cz=-40  w=60  d=60
  */
  _buildFloors() {
    const defs = [
      [-30,  25, 100, 80,  0x2a2010], // 거실
      [-30, -40, 100, 60,  0x1e2830], // 주방
      [-30,  50, 100, 40,  0x1a1a2a], // 안방
      [ 40,  55,  80, 30,  0x182018], // 욕실
      [ 40,  25,  80, 80,  0x1c1a28], // 방 A
      [-10, -40,  60, 60,  0x1c1a28], // 방 B
      [ 50, -40,  60, 60,  0x15151f], // 현관
    ];
    defs.forEach(([cx, cz, w, d, color]) => {
      const geo = new THREE.PlaneGeometry(w, d);
      const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.85 });
      const m = new THREE.Mesh(geo, mat);
      m.rotation.x = -Math.PI / 2;
      m.position.set(cx, 0, cz);
      m.receiveShadow = true;
      this.scene.add(m);
    });
  }

  // ── Walls ─────────────────────────────────────────────────────────
  _buildWalls() {
    const H  = 32;   // wall height
    const T  = 1.5;  // wall thickness
    const wm = this._mat(0x1e2535, 0.7);
    const im = this._mat(0x252d3d, 0.75);

    // horiz: true → length along X axis; false → length along Z axis
    const wall = (cx, cz, len, horiz, mat = wm) => {
      const w = horiz ? len : T;
      const d = horiz ? T   : len;
      this._box(w, H, d, mat, cx, H / 2, cz);
    };

    // ── Outer perimeter ──
    wall(  0, -70, 160, true);   // North outer
    wall(  0,  70, 160, true);   // South outer
    wall(-80,   0, 140, false);  // West outer
    wall( 80,   0, 140, false);  // East outer

    // ── Interior dividers ──
    // Vertical (Z-aligned) — left/right block boundary at X=0
    wall( 0,  50, 40, false, im);  // X=0, top section (안방 | 방A 북쪽)
    wall( 0,  20, 10, false, im);  // short piece above living↔roomA gap
    wall( 0, -25, 30, false, im);  // below living passage
    wall( 0, -55, 30, false, im);  // kitchen | entrance lower

    // Horizontal (X-aligned)
    wall( 0,  30, 160, true, im);  // Living/Bedroom separator (Z=30)
    wall( 0, -10, 160, true, im);  // Living/Kitchen separator  (Z=-10)
    wall(40,  30,  80, false, im); // RoomA | Bath/Master split (X=40, upper)
    wall( 0,  50, 160, true, im);  // Master | Bath line        (Z=50)
  }

  // ── Front Door ────────────────────────────────────────────────────
  _buildDoor() {
    const doorMat  = this._mat(0x3b4a5c, 0.4, 0.1);
    const frameMat = this._mat(0x475569, 0.5, 0.2);

    // Pivot at left hinge edge of door (X=45, Z=-70)
    this.doorPivot = new THREE.Group();
    this.doorPivot.position.set(45, 0, -70);
    this.scene.add(this.doorPivot);

    const doorMesh = new THREE.Mesh(new THREE.BoxGeometry(10, 24, 0.8), doorMat);
    doorMesh.castShadow = true;
    doorMesh.position.set(5, 12, 0); // door swings around left edge
    this.doorPivot.add(doorMesh);

    // Frame
    [[-0.5, 12, 0], [10.5, 12, 0], [5, 25, 0]].forEach(([fx, fy, fz], i) => {
      const fw = i === 2 ? 11 : 0.8;
      const fh = i === 2 ? 1  : 24;
      const fd = 1.2;
      const fm = new THREE.Mesh(new THREE.BoxGeometry(fw, fh, fd), frameMat);
      fm.position.set(45 + fx, fy, -70 + fz);
      this.scene.add(fm);
    });

    // Lock pad
    const lockMat = this._mat(0x94a3b8, 0.2, 0.9);
    const lp = new THREE.Mesh(new THREE.BoxGeometry(0.8, 1.8, 0.4), lockMat);
    lp.position.set(54, 12, -69.4);
    this.scene.add(lp);
  }

  // ── Windows ───────────────────────────────────────────────────────
  _buildWindows() {
    const glassMat = new THREE.MeshPhysicalMaterial({
      color: 0x7ab8e8, transparent: true, opacity: 0.35,
      roughness: 0.05, metalness: 0.1, transmission: 0.7
    });
    const frameMat = this._mat(0x334155, 0.5, 0.3);

    const addWin = (x, z, horiz, wide = 16, tall = 14) => {
      const gw = horiz ? wide : 0.8;
      const gd = horiz ? 0.8  : wide;
      const glass = new THREE.Mesh(new THREE.BoxGeometry(gw, tall, gd), glassMat);
      glass.position.set(x, 18, z);
      this.scene.add(glass);
      const frame = new THREE.Mesh(new THREE.BoxGeometry(gw + 1, tall + 1, gd + 1), frameMat);
      frame.position.set(x, 18, z);
      this.scene.add(frame);
    };

    addWin(-30,  70, true,  24, 14);  // 거실 south window
    addWin( 40,  70, true,  18, 14);  // 방 A south window
    addWin(-80,  10, false, 16, 14);  // 거실 west window
    addWin(-80,  50, false, 14, 14);  // 안방 west window
    addWin(-50, -70, true,  12, 12);  // 주방 north window
    addWin(-10, -70, true,  10, 12);  // 방 B north window
    addWin( 80,  10, false, 20, 14);  // 방 A east window
  }

  // ── Furniture (all ×10 scale) ─────────────────────────────────────
  _buildFurniture() {
    // ── 거실 ──
    this._box(32, 4.5, 9,  this._mat(0x1e3a8a, 0.7), -40, 4.5, 54);  // sofa back
    this._box(32, 2.0, 8,  this._mat(0x1e3a8a, 0.7), -40, 1.5, 51);  // sofa seat
    this._box(12, 0.4, 6,  this._mat(0x78350f, 0.35),-40, 3.8, 35);  // coffee table
    this._box(28, 3.5, 4,  this._mat(0x1e293b, 0.4), -40, 1.7, -7);  // TV console
    this._box(24,13,   0.5,this._mat(0x020617, 0.05),-40, 9.0, -6.5);// TV screen
    // rug
    {
      const r = new THREE.Mesh(new THREE.PlaneGeometry(35, 25), this._mat(0x1d3461, 0.95));
      r.rotation.x = -Math.PI / 2; r.position.set(-40, 0.1, 30);
      this.scene.add(r);
    }
    // AC (wall unit, high on west wall interior)
    this._box(16, 2.8, 2.2, this._mat(0xe2e8f0, 0.2), -5, 26, 15);

    // ── 주방 ──
    this._box(40, 9, 7,   this._mat(0x1e2a3a, 0.4, 0.1), -45, 4.5, -63); // counter
    this._box(0.5, 9, 45, this._mat(0x1e2a3a, 0.4, 0.1), -73, 4.5, -38); // side counter
    this._box(40, 0.5, 7.5,this._mat(0x334155,0.15,0.5), -45, 9.3, -63); // countertop
    this._box(0.5,0.5,45,  this._mat(0x334155,0.15,0.5), -73, 9.3, -38); // side top
    this._box(6, 0.4, 5,   this._mat(0x1a1a1a, 0.1, 0.6),-35, 9.6,-62.8);// stove
    this._box(5, 9,  3,    this._mat(0xecf0f1, 0.2),      -76, 18, -42); // boiler
    this._box(18, 0.8, 9,  this._mat(0x92400e, 0.4),      -42, 7.4, -25);// dining table
    [-35, -49].forEach(x => this._box(4.5,4.5,4.5,this._mat(0x1e293b,0.6), x, 4.5, -25));
    this._box(6.5,18,6.5,  this._mat(0xe2e8f0,0.15,0.3),  -76, 9, -28);  // fridge

    // ── 안방 ──
    this._box(16, 2.8, 21, this._mat(0x1e293b, 0.4), -45, 1.4, 50);  // bed frame
    this._box(15.5, 2.2,19.5,this._mat(0xf8fafc,0.9),-45, 3.9, 50);  // mattress
    this._box(16, 7, 1,   this._mat(0x334155, 0.4), -45, 5.5, 39.6); // headboard
    this._box(5, 22, 12,  this._mat(0x1e293b, 0.4), -76.5,11, 55);   // wardrobe
    this._box(4, 4.5, 3.5,this._mat(0x334155, 0.5), -35.5, 2.2, 50); // nightstand

    // ── 욕실 ──
    this._box(14, 5, 7,   this._mat(0xf0f4f8, 0.2), 55, 2.5, 55);   // bathtub
    this._box(7, 8.2, 4.5,this._mat(0xe2e8f0, 0.2), 32, 4.1, 58);   // vanity
    this._box(4.2,7.8,6,  this._mat(0xf0f4f8, 0.3), 30, 3.9, 43);   // toilet

    // ── 방 A ──
    this._box(12, 3, 20,  this._mat(0x1e3a8a, 0.7), 65, 1.5, 52);   // bed
    this._box(11.5,2,18.5,this._mat(0xf8fafc,0.9),  65, 3.5, 52);   // mattress
    this._box(14, 0.6, 6, this._mat(0x334155, 0.4), 50, 7.2,  2);   // desk
    this._box(4.5, 4, 4.5,this._mat(0x1e293b, 0.6), 50, 2.0, 8.5);  // chair
    this._box(1.8,21,9,   this._mat(0x1e293b, 0.5), 78, 10.5, 5);   // bookshelf

    // ── 방 B ──
    this._box(12, 3, 20,  this._mat(0x1e3a8a, 0.7), -15, 1.5, -45); // bed
    this._box(11.5,2,18.5,this._mat(0xf8fafc,0.9),  -15, 3.5, -45); // mattress
    this._box(10, 0.6, 5.5,this._mat(0x334155,0.4), -15, 7.2, -28); // desk

    // ── 현관 ──
    this._box(10, 12, 3.5, this._mat(0x1e293b, 0.4), 55, 6,  -40);  // shoe cabinet
    this._box(1.8, 7, 1.8, this._mat(0x475569,0.3,0.5), 45, 3.5, -58); // umbrella stand
    {
      const mat = new THREE.Mesh(new THREE.PlaneGeometry(12, 6), this._mat(0x1a2030, 0.95));
      mat.rotation.x = -Math.PI / 2; mat.position.set(50, 0.1, -65);
      this.scene.add(mat);
    }
  }

  // ── Pyramid Hip Roof (삼각뿔 지붕) ───────────────────────────────
  _buildRoof() {
    this.roofGroup = new THREE.Group();

    // Eave slab (작은 처마 오버행)
    const eaveMat = this._mat(0x0f172a, 0.6, 0.1);
    const eave = new THREE.Mesh(new THREE.BoxGeometry(166, 2, 146), eaveMat);
    eave.position.set(0, 32, 0);
    this.roofGroup.add(eave);

    // Pyramid: 4-sided hip roof
    const hw = 84;  // half-width  (+2 overhang)
    const hd = 74;  // half-depth  (+2 overhang)
    const base = 33; // Y of roof base (just above eave)
    const peak = 72; // Y of apex

    const roofMat = this._mat(0x1e293b, 0.55, 0.15);

    // Build 4 triangular faces manually
    const apex = [0, peak, 0];
    const corners = [
      [-hw, base, -hd], // 0: NW
      [ hw, base, -hd], // 1: NE
      [ hw, base,  hd], // 2: SE
      [-hw, base,  hd], // 3: SW
    ];

    const makeFace = (a, b, c) => {
      const geo = new THREE.BufferGeometry();
      const verts = new Float32Array([
        a[0], a[1], a[2],
        b[0], b[1], b[2],
        c[0], c[1], c[2],
      ]);
      geo.setAttribute('position', new THREE.BufferAttribute(verts, 3));
      geo.computeVertexNormals();
      const mesh = new THREE.Mesh(geo, roofMat);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      return mesh;
    };

    // 4 triangular roof faces
    this.roofGroup.add(makeFace(corners[0], corners[1], apex)); // North
    this.roofGroup.add(makeFace(corners[1], corners[2], apex)); // East
    this.roofGroup.add(makeFace(corners[2], corners[3], apex)); // South
    this.roofGroup.add(makeFace(corners[3], corners[0], apex)); // West

    // Ridge cap (top point marker)
    const capMat = this._mat(0x0f172a, 0.4, 0.3);
    const cap = new THREE.Mesh(new THREE.SphereGeometry(2, 8, 8), capMat);
    cap.position.set(0, peak, 0);
    this.roofGroup.add(cap);

    this.roofGroup.visible = false; // hidden by default
    this.scene.add(this.roofGroup);
  }

  // ── Ceiling Lamps (×10 scale) ─────────────────────────────────────
  _buildLamps() {
    const rooms = {
      living:   { x: -40, z:  25, color: 0xffeebb, range: 100, y: 31 },
      kitchen:  { x: -40, z: -40, color: 0xfff5cc, range:  80, y: 31 },
      master:   { x: -40, z:  50, color: 0xffe8cc, range:  70, y: 31 },
      rooma:    { x:  40, z:  25, color: 0xffeebb, range:  80, y: 31 },
      roomb:    { x: -10, z: -40, color: 0xfff5cc, range:  60, y: 31 },
      bathroom: { x:  40, z:  55, color: 0xffffff, range:  50, y: 31 },
    };

    const stemMat  = this._mat(0x94a3b8, 0.3, 0.7);
    this.bulbMatOn  = new THREE.MeshBasicMaterial({ color: 0xfff8e0 });
    this.bulbMatOff = this._mat(0x1e293b, 0.6);

    Object.entries(rooms).forEach(([key, r]) => {
      // Stem
      const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.25, 3.5, 8), stemMat);
      stem.position.set(r.x, r.y + 1.7, r.z);
      this.scene.add(stem);

      // Ring
      const ring = new THREE.Mesh(new THREE.TorusGeometry(2.8, 0.4, 8, 24), stemMat);
      ring.rotation.x = Math.PI / 2;
      ring.position.set(r.x, r.y, r.z);
      this.scene.add(ring);

      // Bulb sphere
      const bulb = new THREE.Mesh(new THREE.SphereGeometry(1.1, 12, 12), this.bulbMatOff);
      bulb.position.set(r.x, r.y - 0.6, r.z);
      this.scene.add(bulb);

      // Point Light
      const pl = new THREE.PointLight(r.color, 0, r.range, 1.6);
      pl.position.set(r.x, r.y - 2, r.z);
      this.scene.add(pl);

      this.lamps[key] = { light: pl, bulb };
    });
  }

  // ── Animated Curtains (×10 scale) ────────────────────────────────
  _buildCurtains() {
    const curFab = new THREE.MeshStandardMaterial({ color: 0x2d3d55, roughness: 0.9, side: THREE.DoubleSide });
    const curBlk = new THREE.MeshStandardMaterial({ color: 0x1a1a2a, roughness: 0.95, side: THREE.DoubleSide });
    const curBld = new THREE.MeshStandardMaterial({ color: 0xd4d8e0, roughness: 0.5, side: THREE.DoubleSide });

    // Sliding pair helper
    const slidePair = (x, z, axis, mat, span) => {
      const halfGeo = new THREE.PlaneGeometry(span / 2 - 0.5, 14);
      const L = new THREE.Mesh(halfGeo, mat);
      const R = new THREE.Mesh(halfGeo, mat);
      L.position.set(x, 18, z);
      R.position.set(x, 18, z);
      this.scene.add(L);
      this.scene.add(R);
      return { L, R, axis, span, bx: x, bz: z };
    };

    // 거실 south window (Z=70), X-axis sliding
    this.curtains3d.living = slidePair(-30, 69.4, 'x', curFab, 24);
    this.curtains3d.living.L.rotation.y = 0;
    this.curtains3d.living.R.rotation.y = 0;

    // 안방 west window (X=-80), Z-axis sliding
    this.curtains3d.master = slidePair(-79.4, 50, 'z', curBlk, 14);
    this.curtains3d.master.L.rotation.y = Math.PI / 2;
    this.curtains3d.master.R.rotation.y = Math.PI / 2;

    // 방 A east window (X=80), blind (scale Y)
    const blindA = new THREE.Mesh(new THREE.PlaneGeometry(20, 14), curBld);
    blindA.position.set(79.4, 18, 10);
    blindA.rotation.y = Math.PI / 2;
    this.scene.add(blindA);
    this.curtains3d.rooma = { type: 'blind', mesh: blindA, baseY: 18 };

    // 방 B north window (Z=-70), blind
    const blindB = new THREE.Mesh(new THREE.PlaneGeometry(10, 12), curBld);
    blindB.position.set(-10, 18, -69.4);
    this.scene.add(blindB);
    this.curtains3d.roomb = { type: 'blind', mesh: blindB, baseY: 18 };
  }

  // ── Particle Effects (×10 scale) ─────────────────────────────────
  _buildEffects() {
    // AC stream (거실 에어컨 위치: x=-5, z=15)
    {
      const cnt = 500;
      const geo = new THREE.BufferGeometry();
      const pos = new Float32Array(cnt * 3);
      for (let i = 0; i < cnt; i++) {
        pos[i*3]   = -5 + (Math.random() - 0.5) * 4;
        pos[i*3+1] = 24.5 - Math.random() * 5;
        pos[i*3+2] = 15  + (Math.random() - 0.5) * 5;
      }
      geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      const mat = new THREE.PointsMaterial({ color: 0x7dd3fc, size: 0.4, transparent: true, opacity: 0, blending: THREE.AdditiveBlending });
      this.acParticles = new THREE.Points(geo, mat);
      this.scene.add(this.acParticles);
    }

    // Humidifier mist (x=-40 거실)
    {
      const cnt = 300;
      const geo = new THREE.BufferGeometry();
      const pos = new Float32Array(cnt * 3);
      for (let i = 0; i < cnt; i++) {
        pos[i*3]   = -40 + (Math.random() - 0.5) * 3;
        pos[i*3+1] = 1 + Math.random() * 8;
        pos[i*3+2] = 20 + (Math.random() - 0.5) * 3;
      }
      geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      const mat = new THREE.PointsMaterial({ color: 0xe0f2fe, size: 0.5, transparent: true, opacity: 0, blending: THREE.AdditiveBlending });
      this.mistParticles = new THREE.Points(geo, mat);
      this.scene.add(this.mistParticles);
    }

    // Stove flame (주방 쿡탑 x=-35, z=-62.8)
    {
      const fm = new THREE.MeshBasicMaterial({ color: 0x1d88fe, transparent: true, opacity: 0 });
      const fc = new THREE.Mesh(new THREE.ConeGeometry(0.6, 1.8, 8), fm);
      fc.position.set(-35, 10.6, -62.5);
      this.scene.add(fc);
      this.flameMesh = fc;
    }

    // Ondol heat wireframe planes
    {
      const om = new THREE.MeshBasicMaterial({ color: 0xff4000, wireframe: true, transparent: true, opacity: 0 });
      [[-30, 25], [-40, -40], [-40, 50], [40, 25], [-10, -40]].forEach(([x, z]) => {
        const p = new THREE.Mesh(new THREE.PlaneGeometry(50, 50, 8, 8), om.clone());
        p.rotation.x = -Math.PI / 2;
        p.position.set(x, 0.2, z);
        this.scene.add(p);
        this.ondolPlanes.push(p);
      });
    }
  }

  // ── Room Labels ────────────────────────────────────────────────────
  _buildLabels() {
    this.labelGroup = new THREE.Group();
    const defs = [
      ['거실',       -40,  25],
      ['주방',       -40, -40],
      ['안방',       -40,  50],
      ['욕실',        40,  55],
      ['방 A',        40,  25],
      ['방 B',       -10, -40],
      ['현관',        50, -40],
    ];

    defs.forEach(([txt, x, z]) => {
      const canvas = document.createElement('canvas');
      canvas.width  = 256;
      canvas.height = 72;
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = 'rgba(15,20,40,0.88)';
      ctx.beginPath();
      ctx.roundRect(6, 6, 244, 60, 12);
      ctx.fill();
      ctx.strokeStyle = '#3b82f6';
      ctx.lineWidth = 3;
      ctx.stroke();
      ctx.font = 'bold 30px "Noto Sans KR", sans-serif';
      ctx.fillStyle = '#f1f5f9';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(txt, 128, 36);

      const tex = new THREE.CanvasTexture(canvas);
      const sp  = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true }));
      sp.position.set(x, 38, z);
      sp.scale.set(28, 8, 1);
      this.labelGroup.add(sp);
    });
    this.scene.add(this.labelGroup);
  }

  // ── Sync State → 3D ──────────────────────────────────────────────
  syncLights() {
    const f = S.brightness / 100;
    Object.keys(S.lights).forEach(key => {
      const on = S.lights[key];
      const lamp = this.lamps[key];
      if (!lamp) return;
      lamp.light.intensity  = on ? 5.0 * f : 0;
      lamp.bulb.material    = on ? this.bulbMatOn : this.bulbMatOff;
    });
  }

  syncRoof() {
    if (this.roofGroup) this.roofGroup.visible = S.roof;
  }

  syncLabels() {
    if (this.labelGroup) this.labelGroup.visible = S.labels;
  }

  syncGas() {
    if (this.flameMesh) this.flameMesh.material.opacity = S.gas.open ? 0.85 : 0;
  }

  // ── Camera Presets ────────────────────────────────────────────────
  _camTo(px, py, pz, lx, ly, lz, dur = 900) {
    const sp = { px: this.camera.position.x, py: this.camera.position.y, pz: this.camera.position.z,
                 lx: this.orbit.target.x,    ly: this.orbit.target.y,    lz: this.orbit.target.z };
    const tp = { px, py, pz, lx, ly, lz };
    const t0 = performance.now();
    const lerp = (a, b, t) => a + (b - a) * t;
    const ease = t => 0.5 - Math.cos(t * Math.PI) / 2;
    const step = now => {
      const t = Math.min((now - t0) / dur, 1);
      const e = ease(t);
      this.camera.position.set(lerp(sp.px,tp.px,e), lerp(sp.py,tp.py,e), lerp(sp.pz,tp.pz,e));
      this.orbit.target.set(lerp(sp.lx,tp.lx,e), lerp(sp.ly,tp.ly,e), lerp(sp.lz,tp.lz,e));
      this.orbit.update();
      if (t < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }

  setView(name) {
    this._exitFPS();
    const V = {
      iso:      [ 220, 180, 220,    0, 15,   0],
      top:      [   0, 300,   1,    0,  0,   0],
      living:   [ -40,  70, 120,  -40, 15,  25],
      kitchen:  [ -40,  70,-120,  -40, 15, -40],
      master:   [ -80,  70,  90,  -40, 15,  50],
      rooma:    [ 100,  70, 100,   40, 15,  25],
      roomb:    [   0,  70,-110,  -10, 15, -40],
      bathroom: [  90,  60,  90,   40, 15,  55],
      entrance: [ 100,  55, -50,   50, 15, -40],
    };
    const v = V[name];
    if (v) this._camTo(...v);
  }

  // ── FPS Mode ──────────────────────────────────────────────────────
  _enterFPS() {
    S.fpsMode = true;
    this.orbit.enabled = false;
    this.fpsPos.set(0, 16.5, 40);
    this.fpsYaw   = 0;
    this.fpsPitch = 0;
    this.camera.position.copy(this.fpsPos);

    this.renderer.domElement.requestPointerLock();
    this._onPLChange = () => {
      if (document.pointerLockElement !== this.renderer.domElement) this._exitFPS();
    };
    this._onFPSMouseMove = (e) => {
      if (!S.fpsMode) return;
      this.fpsYaw   -= e.movementX * 0.002;
      this.fpsPitch -= e.movementY * 0.002;
      this.fpsPitch  = Math.max(-0.85, Math.min(0.85, this.fpsPitch));
    };
    document.addEventListener('pointerlockchange', this._onPLChange);
    document.addEventListener('mousemove', this._onFPSMouseMove);

    qs('#fps-dpad').classList.remove('hidden');
    qs('#btn-view-fps').classList.add('active');
    toast('🚶 1인칭 모드 — WASD/방향키 이동 | 마우스 시선');
  }

  _exitFPS() {
    if (!S.fpsMode) return;
    S.fpsMode = false;
    this.orbit.enabled = true;
    document.exitPointerLock();
    if (this._onPLChange)       document.removeEventListener('pointerlockchange', this._onPLChange);
    if (this._onFPSMouseMove)   document.removeEventListener('mousemove', this._onFPSMouseMove);
    qs('#fps-dpad').classList.add('hidden');
    qs('#btn-view-fps').classList.remove('active');
  }

  _updateFPS(dt) {
    if (!S.fpsMode) return;
    const speed = 45 * dt;
    const fwd = new THREE.Vector3(-Math.sin(this.fpsYaw), 0, -Math.cos(this.fpsYaw));
    const rgt = new THREE.Vector3( Math.cos(this.fpsYaw), 0, -Math.sin(this.fpsYaw));
    const dir = new THREE.Vector3();

    if (this.keys['w'] || this.keys['arrowup'])    dir.addScaledVector(fwd,  1);
    if (this.keys['s'] || this.keys['arrowdown'])  dir.addScaledVector(fwd, -1);
    if (this.keys['a'] || this.keys['arrowleft'])  dir.addScaledVector(rgt, -1);
    if (this.keys['d'] || this.keys['arrowright']) dir.addScaledVector(rgt,  1);
    if (dir.lengthSq() > 0) dir.normalize();

    this.fpsPos.addScaledVector(dir, speed);
    // Clamp inside house
    this.fpsPos.x = Math.max(-75, Math.min(75, this.fpsPos.x));
    this.fpsPos.z = Math.max(-68, Math.min(68, this.fpsPos.z));
    this.fpsPos.y = 16.5;

    this.camera.position.copy(this.fpsPos);
    const look = new THREE.Vector3(
      this.fpsPos.x - Math.sin(this.fpsYaw) * Math.cos(this.fpsPitch),
      this.fpsPos.y + Math.sin(this.fpsPitch),
      this.fpsPos.z - Math.cos(this.fpsYaw) * Math.cos(this.fpsPitch)
    );
    this.camera.lookAt(look);
  }

  _bindKeys() {
    window.addEventListener('keydown', e => {
      this.keys[e.key.toLowerCase()] = true;
      if (e.key === 'Escape' && S.fpsMode) this._exitFPS();
    });
    window.addEventListener('keyup', e => { this.keys[e.key.toLowerCase()] = false; });

    // D-Pad
    [['dpad-up','w'],['dpad-down','s'],['dpad-left','a'],['dpad-right','d']].forEach(([id, key]) => {
      const btn = qs(`#${id}`);
      if (!btn) return;
      const on  = () => { this.keys[key] = true;  btn.classList.add('pressed'); };
      const off = () => { this.keys[key] = false; btn.classList.remove('pressed'); };
      btn.addEventListener('mousedown', on);
      btn.addEventListener('touchstart', e => { e.preventDefault(); on(); }, { passive: false });
      btn.addEventListener('mouseup',   off);
      btn.addEventListener('mouseleave',off);
      btn.addEventListener('touchend',  off);
    });
  }

  _bindResize() {
    window.addEventListener('resize', () => {
      const vp = qs('#viewport');
      this.W = vp.clientWidth;
      this.H = vp.clientHeight;
      this.camera.aspect = this.W / this.H;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(this.W, this.H);
    });
  }

  // ── Render Loop ───────────────────────────────────────────────────
  _loop() {
    requestAnimationFrame(() => this._loop());
    const dt = this.clock3.getDelta();
    const t  = performance.now() * 0.001;

    this._updateFPS(dt);
    if (!S.fpsMode) this.orbit.update();

    // Door swing
    if (this.doorPivot) {
      const tgt = S.door.open ? -Math.PI / 2.05 : 0;
      this.doorPivot.rotation.y += (tgt - this.doorPivot.rotation.y) * 0.1;
    }

    // Curtains
    Object.keys(S.curtains).forEach(key => {
      const c   = this.curtains3d[key];
      const open = S.curtains[key];
      if (!c) return;

      if (c.type === 'blind') {
        const tSY = open ? 0.04 : 1.0;
        c.mesh.scale.y += (tSY - c.mesh.scale.y) * 0.1;
        c.mesh.position.y = c.baseY - (14 * 0.5 * (1 - c.mesh.scale.y));
      } else {
        // Sliding pair
        const half = c.span / 4;
        const axis = c.axis;
        const base = axis === 'x' ? c.bx : c.bz;
        const tL = open ? base - half * 1.5 : base;
        const tR = open ? base + half * 1.5 : base;
        c.L.position[axis] += (tL - c.L.position[axis]) * 0.1;
        c.R.position[axis] += (tR - c.R.position[axis]) * 0.1;
      }
    });

    // Ondol
    this.ondolPlanes.forEach(p => {
      const tgt = S.climate.boiler ? (0.28 + 0.18 * Math.sin(t * 4)) : 0;
      p.material.opacity += (tgt - p.material.opacity) * 0.08;
    });

    // AC particles
    if (this.acParticles) {
      const tgt = S.climate.ac ? 0.8 : 0;
      this.acParticles.material.opacity += (tgt - this.acParticles.material.opacity) * 0.08;
      if (S.climate.ac || this.acParticles.material.opacity > 0.01) {
        const pos = this.acParticles.geometry.attributes.position.array;
        const spd = S.climate.acWind === 'high' ? 0.35 : S.climate.acWind === 'med' ? 0.22 : 0.12;
        for (let i = 0; i < pos.length; i += 3) {
          pos[i+2] -= spd;
          pos[i]   += Math.sin(t * 3 + i) * 0.02;
          if (pos[i+2] < -5) {
            pos[i]   = -5 + (Math.random() - 0.5) * 4;
            pos[i+1] = 24.5 - Math.random() * 5;
            pos[i+2] = 15 + (Math.random() - 0.5) * 5;
          }
        }
        this.acParticles.geometry.attributes.position.needsUpdate = true;
      }
    }

    // Mist
    if (this.mistParticles) {
      const tgt = S.climate.humidifier ? 0.65 : 0;
      this.mistParticles.material.opacity += (tgt - this.mistParticles.material.opacity) * 0.08;
      if (S.climate.humidifier || this.mistParticles.material.opacity > 0.01) {
        const pos = this.mistParticles.geometry.attributes.position.array;
        for (let i = 0; i < pos.length; i += 3) {
          pos[i+1] += 0.08;
          pos[i]   += Math.sin(t * 5 + i) * 0.01;
          if (pos[i+1] > 12) {
            pos[i]   = -40 + (Math.random() - 0.5) * 3;
            pos[i+1] = 1;
            pos[i+2] = 20 + (Math.random() - 0.5) * 3;
          }
        }
        this.mistParticles.geometry.attributes.position.needsUpdate = true;
      }
    }

    // Flame flicker
    if (this.flameMesh && S.gas.open) {
      const sc = 1 + 0.2 * Math.sin(t * 18);
      this.flameMesh.scale.set(sc, 1 + 0.3 * Math.cos(t * 14), sc);
    }

    // Climate simulation
    this._simClimate(dt);

    this.renderer.render(this.scene, this.camera);
  }

  _simClimate(dt) {
    const c = S.climate;
    if (c.boiler) c.currentTemp = Math.min(c.boilerTarget, c.currentTemp + 0.004);
    if (c.ac) {
      const rate = c.acWind === 'high' ? 0.012 : c.acWind === 'med' ? 0.007 : 0.004;
      c.currentTemp = Math.max(c.targetTemp, c.currentTemp - rate);
    }
    if (!c.boiler && !c.ac) c.currentTemp += (24.5 - c.currentTemp) * 0.0005;
    if (c.humidifier) c.currentHumidity = Math.min(75, c.currentHumidity + 0.02);
    else c.currentHumidity += (50 - c.currentHumidity) * 0.0002;

    qs('#hud-temp').textContent      = `🌡 ${c.currentTemp.toFixed(1)}°C`;
    qs('#hud-humidity').textContent  = `💧 ${Math.round(c.currentHumidity)}%`;
    qs('#temp-current').textContent  = `${c.currentTemp.toFixed(1)}°C`;
  }
}

// ─────────────────────────────────────────────────────────────────────
// 4. UI CONTROLLER
// ─────────────────────────────────────────────────────────────────────
let sim = null;

function initUI() {
  // Tabs
  qsa('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const tab = btn.dataset.tab;
      qsa('.tab-btn').forEach(b => b.classList.remove('active'));
      qsa('.tab-content').forEach(c => c.classList.remove('active'));
      btn.classList.add('active');
      qs(`#tab-${tab}`).classList.add('active');
    });
  });

  // Panel toggle
  qs('#btn-toggle-panel').addEventListener('click', () => {
    S.panelOpen = !S.panelOpen;
    qs('#control-panel').classList.toggle('hidden', !S.panelOpen);
    qs('#viewport').classList.toggle('panel-hidden', !S.panelOpen);
    qs('#btn-toggle-panel').classList.toggle('active', S.panelOpen);
    if (sim) setTimeout(() => {
      const vp = qs('#viewport');
      sim.W = vp.clientWidth; sim.H = vp.clientHeight;
      sim.camera.aspect = sim.W / sim.H;
      sim.camera.updateProjectionMatrix();
      sim.renderer.setSize(sim.W, sim.H);
    }, 370);
  });

  // Camera buttons
  const setActiveCam = id => {
    qsa('#cam-toolbar .cam-btn').forEach(b => b.classList.remove('active'));
    qs(`#${id}`)?.classList.add('active');
  };

  qs('#btn-view-iso').addEventListener('click',     () => { sim.setView('iso');     setActiveCam('btn-view-iso'); });
  qs('#btn-view-top').addEventListener('click',     () => { sim.setView('top');     setActiveCam('btn-view-top'); });
  qs('#btn-view-fps').addEventListener('click',     () => {
    if (S.fpsMode) { sim._exitFPS(); setActiveCam('btn-view-iso'); sim.setView('iso'); }
    else           { sim._enterFPS(); setActiveCam('btn-view-fps'); }
  });
  qs('#btn-room-living').addEventListener('click',   () => sim.setView('living'));
  qs('#btn-room-kitchen').addEventListener('click',  () => sim.setView('kitchen'));
  qs('#btn-room-master').addEventListener('click',   () => sim.setView('master'));
  qs('#btn-room-rooma').addEventListener('click',    () => sim.setView('rooma'));
  qs('#btn-room-roomb').addEventListener('click',    () => sim.setView('roomb'));
  qs('#btn-room-bath').addEventListener('click',     () => sim.setView('bathroom'));
  qs('#btn-room-entrance').addEventListener('click', () => sim.setView('entrance'));

  qs('#btn-roof-toggle').addEventListener('click', () => {
    S.roof = !S.roof;
    sim.syncRoof();
    qs('#btn-roof-toggle').dataset.active = S.roof;
    qs('#btn-roof-toggle').classList.toggle('active', S.roof);
    toast(S.roof ? '🏠 삼각뿔 지붕 ON' : '🏠 지붕 OFF');
  });

  qs('#btn-labels-toggle').addEventListener('click', () => {
    S.labels = !S.labels;
    sim.syncLabels();
    toast(S.labels ? '🏷 방 이름 ON' : '🏷 방 이름 OFF');
  });

  // Lighting
  qs('#brightness-slider').addEventListener('input', e => {
    S.brightness = parseInt(e.target.value);
    qs('#brightness-val').textContent = `${S.brightness}%`;
    sim.syncLights();
  });

  qs('#btn-all-off').addEventListener('click', () => {
    Object.keys(S.lights).forEach(k => S.lights[k] = false);
    refreshLightUI();
    sim.syncLights();
    toast('전체 조명 소등');
  });

  qsa('[data-light]').forEach(btn => {
    btn.addEventListener('click', () => {
      const room = btn.dataset.light;
      S.lights[room] = !S.lights[room];
      refreshLightUI();
      sim.syncLights();
      toast(`${roomKr(room)} 조명 ${S.lights[room] ? 'ON 💡' : 'OFF'}`);
    });
  });

  function refreshLightUI() {
    qsa('[data-light]').forEach(btn => {
      const on = S.lights[btn.dataset.light];
      btn.classList.toggle('on', on);
      btn.textContent = on ? '켜짐 💡' : '꺼짐';
      btn.closest('.room-light-card')?.classList.toggle('lit', on);
    });
  }

  // Door
  function refreshDoorUI() {
    const box  = qs('#door-status-box');
    const icon = qs('#door-icon');
    const text = qs('#door-text');
    const hud  = qs('#hud-door-status');
    if (S.door.open) {
      icon.textContent = '🚪'; text.textContent = '문 열림'; box.classList.add('open');
      if (hud) hud.textContent = '🚪 현관 열림';
    } else {
      icon.textContent = S.door.locked ? '🔒' : '🔓';
      text.textContent = S.door.locked ? '잠겨 있음' : '닫힘 (잠금 해제)';
      box.classList.remove('open');
      if (hud) hud.textContent = S.door.locked ? '🔒 현관 잠김' : '🔓 현관 닫힘';
    }
  }

  qs('#btn-door-open').addEventListener('click', () => {
    if (S.door.locked) S.door.locked = false;
    S.door.open = true; refreshDoorUI();
    toast('🚪 현관문 열림');
  });
  qs('#btn-door-close').addEventListener('click', () => {
    S.door.open = false; S.door.locked = true; refreshDoorUI();
    toast('🔒 현관문 닫힘 & 잠금');
  });
  qs('#btn-lock').addEventListener('click', () => {
    S.door.locked = true; if (S.door.open) S.door.open = false; refreshDoorUI();
    toast('🔐 도어락 잠금');
  });
  qs('#btn-unlock').addEventListener('click', () => {
    S.door.locked = false; refreshDoorUI();
    toast('🔑 도어락 해제');
  });

  // Curtains
  function refreshCurtainUI() {
    qsa('[data-curtain]').forEach(btn => {
      const open = S.curtains[btn.dataset.curtain];
      btn.classList.toggle('on-blue', open);
      btn.textContent = open ? '열림 ↕' : '닫힘';
    });
  }

  qs('#btn-curtain-all-open').addEventListener('click', () => {
    Object.keys(S.curtains).forEach(k => S.curtains[k] = true);
    refreshCurtainUI(); toast('🪟 전체 커튼 열기');
  });
  qs('#btn-curtain-all-close').addEventListener('click', () => {
    Object.keys(S.curtains).forEach(k => S.curtains[k] = false);
    refreshCurtainUI(); toast('🪟 전체 커튼 닫기');
  });
  qsa('[data-curtain]').forEach(btn => {
    btn.addEventListener('click', () => {
      const r = btn.dataset.curtain;
      S.curtains[r] = !S.curtains[r]; refreshCurtainUI();
      toast(`${curtainKr(r)} ${S.curtains[r] ? '열림' : '닫힘'}`);
    });
  });

  // Climate — temp
  qs('#btn-temp-minus').addEventListener('click', () => {
    S.climate.targetTemp = Math.max(16, S.climate.targetTemp - 0.5);
    qs('#temp-target').textContent = `${S.climate.targetTemp.toFixed(1)}°C`;
  });
  qs('#btn-temp-plus').addEventListener('click', () => {
    S.climate.targetTemp = Math.min(32, S.climate.targetTemp + 0.5);
    qs('#temp-target').textContent = `${S.climate.targetTemp.toFixed(1)}°C`;
  });

  // Boiler
  qs('#btn-boiler').addEventListener('click', () => {
    S.climate.boiler = !S.climate.boiler;
    const btn = qs('#btn-boiler');
    btn.classList.toggle('on', S.climate.boiler);
    btn.textContent = S.climate.boiler ? '켜짐 🔥' : '꺼짐';
    qs('#badge-boiler').textContent = S.climate.boiler ? 'ON' : 'OFF';
    qs('#badge-boiler').className   = `badge ${S.climate.boiler ? 'on' : 'off'}`;
    qs('#boiler-extra').classList.toggle('hidden', !S.climate.boiler);
    toast(`보일러 ${S.climate.boiler ? 'ON 🔥' : 'OFF'}`);
  });
  qsa('[data-boiler-mode]').forEach(btn => {
    btn.addEventListener('click', () => {
      S.climate.boilerMode = btn.dataset.boilerMode;
      qsa('[data-boiler-mode]').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
    });
  });
  qs('#btn-boiler-minus').addEventListener('click', () => {
    S.climate.boilerTarget = Math.max(18, S.climate.boilerTarget - 0.5);
    qs('#boiler-target').textContent = `${S.climate.boilerTarget.toFixed(1)}°C`;
  });
  qs('#btn-boiler-plus').addEventListener('click', () => {
    S.climate.boilerTarget = Math.min(32, S.climate.boilerTarget + 0.5);
    qs('#boiler-target').textContent = `${S.climate.boilerTarget.toFixed(1)}°C`;
  });

  // AC
  qs('#btn-ac').addEventListener('click', () => {
    S.climate.ac = !S.climate.ac;
    const btn = qs('#btn-ac');
    btn.classList.toggle('on-blue', S.climate.ac);
    btn.textContent = S.climate.ac ? '켜짐 ❄' : '꺼짐';
    qs('#badge-ac').textContent = S.climate.ac ? 'ON' : 'OFF';
    qs('#badge-ac').className   = `badge ${S.climate.ac ? 'on-blue' : 'off'}`;
    qs('#ac-extra').classList.toggle('hidden', !S.climate.ac);
    toast(`에어컨 ${S.climate.ac ? 'ON ❄' : 'OFF'}`);
  });
  qsa('[data-wind]').forEach(btn => {
    btn.addEventListener('click', () => {
      S.climate.acWind = btn.dataset.wind;
      qsa('[data-wind]').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
    });
  });

  // Humidifier
  qs('#btn-humidifier').addEventListener('click', () => {
    S.climate.humidifier = !S.climate.humidifier;
    const btn = qs('#btn-humidifier');
    btn.classList.toggle('on-blue', S.climate.humidifier);
    btn.textContent = S.climate.humidifier ? '켜짐 💨' : '꺼짐';
    toast(`가습기 ${S.climate.humidifier ? 'ON 💨' : 'OFF'}`);
  });

  // Gas
  qs('#btn-gas-open').addEventListener('click', () => {
    S.gas.open = true;
    qs('#gas-status-text').textContent = '가스 열림 ⚠️ 사용중';
    qs('#gas-status-box').classList.add('danger');
    sim.syncGas(); toast('🔥 가스 밸브 열림', 'err');
  });
  qs('#btn-gas-close').addEventListener('click', () => {
    S.gas.open = false;
    qs('#gas-status-text').textContent = '가스 잠김 (안전)';
    qs('#gas-status-box').classList.remove('danger');
    sim.syncGas(); toast('🔒 가스 안전 잠금');
  });

  // Away mode
  qs('#btn-away').addEventListener('click', () => {
    Object.keys(S.lights).forEach(k => S.lights[k] = false);
    refreshLightUI(); sim.syncLights();
    S.door.open = false; S.door.locked = true; refreshDoorUI();
    Object.keys(S.curtains).forEach(k => S.curtains[k] = false); refreshCurtainUI();
    if (S.gas.open) { S.gas.open = false; qs('#gas-status-box').classList.remove('danger'); qs('#gas-status-text').textContent = '가스 잠김 (안전)'; sim.syncGas(); }
    toast('🚶 외출 모드 — 전체 소등, 잠금, 가스차단 완료');
  });
}

// ─────────────────────────────────────────────────────────────────────
// 5. HELPERS
// ─────────────────────────────────────────────────────────────────────
function roomKr(k) {
  return { living:'거실', kitchen:'주방', master:'안방', rooma:'방 A', roomb:'방 B', bathroom:'욕실' }[k] || k;
}
function curtainKr(k) {
  return { living:'거실 커튼', master:'안방 암막', rooma:'방 A 블라인드', roomb:'방 B 블라인드' }[k] || k;
}

// ─────────────────────────────────────────────────────────────────────
// 6. BOOT
// ─────────────────────────────────────────────────────────────────────
window.addEventListener('DOMContentLoaded', () => {
  sim = new SmartHomeSimulator();
  initUI();
  toast('🏠 스마트홈 3D 시뮬레이터 준비 완료 (부피 1000배 스케일)');
});
