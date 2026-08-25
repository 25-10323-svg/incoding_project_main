/* =====================================================================
   스마트홈 3D 시뮬레이터 — app.js
   Three.js r128 | Fully Functional | Clean Minimal Architecture
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

function qs(sel) { return document.querySelector(sel); }
function qsa(sel) { return document.querySelectorAll(sel); }

function clock() {
  const now = new Date();
  const hh = String(now.getHours()).padStart(2, '0');
  const mm = String(now.getMinutes()).padStart(2, '0');
  const t = `${hh}:${mm}`;
  const el = qs('#panel-time');
  if (el) el.textContent = t;
  const el2 = qs('#hud-time');
  if (el2) el2.textContent = t;
}
setInterval(clock, 10000);
clock();

// ─────────────────────────────────────────────────────────────────────
// 3. THREE.JS 3D SIMULATOR ENGINE
// ─────────────────────────────────────────────────────────────────────
class SmartHomeSimulator {
  constructor() {
    this.canvas = qs('#sim-canvas');
    this.W = this.canvas.clientWidth;
    this.H = this.canvas.clientHeight;

    this.keys = {};
    this.fpsYaw = 0;
    this.fpsPitch = 0;
    this.fpsPos = new THREE.Vector3(0, 1.65, 4);
    this.clock3 = new THREE.Clock();

    // References to 3D objects
    this.lamps = {};       // { room: { light, bulbMesh } }
    this.curtains3d = {};  // { room: mesh or { L, R } }
    this.doorPivot = null;
    this.roofMesh = null;
    this.labelSprites = [];
    this.flameMesh = null;
    this.acParticles = null;
    this.mistParticles = null;
    this.ondolPlanes = [];

    this._build();
    this._bindResize();
    this._bindKeys();
    this._loop();
  }

  // ── Scene Setup ───────────────────────────────────────────────────
  _build() {
    // Renderer
    this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: true });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    this.renderer.setSize(this.W, this.H);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.1;

    // Scene
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0a0e1a);
    this.scene.fog = new THREE.Fog(0x0a0e1a, 30, 80);

    // Camera (isometric start)
    this.camera = new THREE.PerspectiveCamera(50, this.W / this.H, 0.05, 200);
    this.camera.position.set(18, 14, 18);

    // Orbit controls
    this.orbit = new THREE.OrbitControls(this.camera, this.renderer.domElement);
    this.orbit.enableDamping = true;
    this.orbit.dampingFactor = 0.06;
    this.orbit.maxPolarAngle = Math.PI / 2.05;
    this.orbit.minDistance = 3;
    this.orbit.maxDistance = 60;
    this.orbit.target.set(0, 1.5, 0);

    // Global lighting
    this.ambient = new THREE.AmbientLight(0x1a2040, 1.2);
    this.scene.add(this.ambient);

    this.sun = new THREE.DirectionalLight(0xfff5e0, 0.6);
    this.sun.position.set(12, 20, 8);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(2048, 2048);
    this.sun.shadow.camera.near = 0.5;
    this.sun.shadow.camera.far = 80;
    this.sun.shadow.camera.left = -25;
    this.sun.shadow.camera.right = 25;
    this.sun.shadow.camera.top = 25;
    this.sun.shadow.camera.bottom = -25;
    this.sun.shadow.bias = -0.001;
    this.scene.add(this.sun);

    this._buildHouse();
  }

  // ── House Architecture ────────────────────────────────────────────
  /*
    House Layout (units = meters, Y-up)
    Total plan: 16m wide × 14m deep

    ┌─────────────┬─────────────┐
    │ 안방 (master)│ 욕실 (bath) │  Z: 3 ~ 7
    ├─────────────┼─────────────┤
    │ 거실 (living)│ 방A (rooma) │  Z: -1 ~ 3
    ├──────┬──────┼─────────────┤
    │주방  │방B   │ 현관(entry) │  Z: -7 ~ -1
    │(kit) │(roomb)│            │
    └──────┴──────┴─────────────┘
    X: -8 ~ 0 (left block) | 0 ~ 8 (right block)
  */
  _buildHouse() {
    this._buildFloors();
    this._buildWalls();
    this._buildDoor();
    this._buildWindows();
    this._buildFurniture();
    this._buildCeiling();
    this._buildRoof();
    this._buildLamps();
    this._buildCurtains();
    this._buildEffects();
    this._buildLabels();
  }

  // Materials helper
  _mat(color, rough = 0.6, metal = 0) {
    return new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: metal });
  }

  _box(w, h, d, mat, x, y, z, rx = 0, ry = 0) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    m.position.set(x, y, z);
    m.rotation.set(rx, ry, 0);
    m.castShadow = true;
    m.receiveShadow = true;
    this.scene.add(m);
    return m;
  }

  _buildFloors() {
    const floors = [
      // [x_center, z_center, width, depth, color]
      [  -3,   1,  10,  8,  0x2a2010], // 거실 (warm wood)
      [  -3,  -4,  10,  6,  0x1e2830], // 주방 (cool tile)
      [  -3,   5,  10,  4,  0x1a1a2a], // 안방 (dark)
      [   4,   5,   8,  4,  0x182018], // 욕실 (green tile)
      [   4,   1,   8,  8,  0x1c1a28], // 방 A (soft)
      [  -1,  -4,   6,  6,  0x1c1a28], // 방 B
      [   5,  -4,   6,  6,  0x15151f], // 현관 (dark stone)
    ];

    floors.forEach(([cx, cz, w, d, color]) => {
      const geo = new THREE.PlaneGeometry(w, d);
      const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.85 });
      const m = new THREE.Mesh(geo, mat);
      m.rotation.x = -Math.PI / 2;
      m.position.set(cx, 0, cz);
      m.receiveShadow = true;
      this.scene.add(m);
    });
  }

  _buildWalls() {
    const wh = 3.2; // wall height
    const wt = 0.15; // wall thickness
    const wallMat = this._mat(0x1e2535, 0.7);
    const innerMat = this._mat(0x252d3d, 0.75);

    // Helper: axis-aligned wall segment
    const wall = (x, z, len, horiz, mat = wallMat) => {
      const w = horiz ? len : wt;
      const d = horiz ? wt : len;
      return this._box(w, wh, d, mat, x, wh / 2, z);
    };

    // ── Outer perimeter ──
    wall(-3, -7, 16, true);   // North outer
    wall(-3,  7, 16, true);   // South outer
    wall(-8,  0, 14, false);  // West outer
    wall( 8,  0, 14, false);  // East outer

    // ── Inner partitions ──
    // Vertical divider: Left block vs Right block (X = 0)
    // — but with openings at Z=1 (living↔roomA passage), Z=-4 (kitchen↔roomB passage)
    wall(0,  5.0, 4, false, innerMat);   // X=0, Z=3~7 (안방 | 욕실 divider N)
    wall(0,  2.5, 1, false, innerMat);   // short segment above passage
    wall(0, -2.5, 3, false, innerMat);   // passage gap at Z≈-1
    wall(0, -5.5, 3, false, innerMat);   // kitchen vs entrance lower

    // Horizontal dividers (Z-plane walls)
    wall(-3, 3, 10, true, innerMat);     // Living / Bedroom row separator
    wall(-3,-1, 10, true, innerMat);     // Living / Kitchen-RoomB separator
    wall( 4,-1,  8, true, innerMat);     // RoomA / Entrance separator
    wall(-1,-1,  6, true, innerMat);     // kitchen sub
    wall( 2,-1,  6, true, innerMat);     // roomB sub

    // Bath divider (Y partition inside right block)
    wall(4,  3, 8, false, innerMat);     // RoomA | Bath/Master divide
    // small cross
    wall(0,  5, 8, true,  innerMat);     // master | bath horizontal
  }

  _buildDoor() {
    // Front door at Z=-7 (north face), X≈5
    const doorGeo = new THREE.BoxGeometry(1.0, 2.4, 0.08);
    const doorMat = this._mat(0x3b4a5c, 0.4, 0.1);
    const doorMesh = new THREE.Mesh(doorGeo, doorMat);
    doorMesh.castShadow = true;
    // Pivot at left edge of door
    this.doorPivot = new THREE.Group();
    this.doorPivot.position.set(4.5, 0, -7);
    doorMesh.position.set(0.5, 1.2, 0);
    this.doorPivot.add(doorMesh);
    this.scene.add(this.doorPivot);

    // Door frame
    const frameMat = this._mat(0x475569, 0.5, 0.2);
    [[-0.05, 1.2, 0], [1.05, 1.2, 0], [0.5, 2.5, 0]].forEach(([fx, fy, fz], i) => {
      const fw = i === 2 ? 1.1 : 0.08;
      const fh = i === 2 ? 0.1 : 2.4;
      const fd = 0.12;
      const fm = new THREE.Mesh(new THREE.BoxGeometry(fw, fh, fd), frameMat);
      fm.position.set(4.5 + fx, fy, -7);
      this.scene.add(fm);
    });

    // Lock pad
    const lockMat = this._mat(0x94a3b8, 0.2, 0.9);
    const lockPad = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.18, 0.04), lockMat);
    lockPad.position.set(5.4, 1.2, -6.94);
    this.scene.add(lockPad);
  }

  _buildWindows() {
    const glassMat = new THREE.MeshPhysicalMaterial({
      color: 0x7ab8e8,
      transparent: true,
      opacity: 0.35,
      roughness: 0.05,
      metalness: 0.1,
      transmission: 0.7
    });
    const frameMat = this._mat(0x334155, 0.5, 0.3);

    const addWindow = (x, z, horiz, wide = 1.6) => {
      // Glass pane
      const gw = horiz ? wide : 0.08;
      const gd = horiz ? 0.08 : wide;
      const glass = new THREE.Mesh(new THREE.BoxGeometry(gw, 1.4, gd), glassMat);
      glass.position.set(x, 1.8, z);
      this.scene.add(glass);

      // Frame
      const fw = horiz ? wide + 0.1 : 0.12;
      const fd = horiz ? 0.12 : wide + 0.1;
      const frame = new THREE.Mesh(new THREE.BoxGeometry(fw, 1.5, fd), frameMat);
      frame.position.set(x, 1.8, z);
      this.scene.add(frame);
    };

    // South wall windows
    addWindow(-3.5, 7, true, 2.4);  // 거실 south window
    addWindow( 4,   7, true, 1.8);  // 방 A south window

    // West wall windows
    addWindow(-8, 1, false, 1.6);   // 거실 west window
    addWindow(-8, 5, false, 1.4);   // 안방 west window

    // North windows
    addWindow(-5, -7, true, 1.2);   // 주방 north window
    addWindow(-1, -7, true, 1.0);   // 방 B north window

    // East windows
    addWindow(8, 1, false, 2.0);    // 방 A east window
  }

  _buildFurniture() {
    // ── 거실 (Living Room) ──
    // Sofa (L-shape)
    this._box(3.2, 0.45, 0.9, this._mat(0x1e3a8a, 0.7), -4, 0.45, 5.4);  // back
    this._box(3.2, 0.2,  0.8, this._mat(0x1e3a8a, 0.7), -4, 0.65, 5.4);  // seat back
    this._box(3.2, 0.15, 1.0, this._mat(0x1e3a8a, 0.7), -4, 0.15, 5.1);  // seat base
    // TV console + screen
    this._box(2.8, 0.35, 0.4, this._mat(0x1e293b, 0.4), -4, 0.17, -0.7);
    this._box(2.4, 1.3,  0.05,this._mat(0x020617, 0.05),-4, 0.9,  -0.65);
    // Coffee table
    this._box(1.2, 0.04, 0.6, this._mat(0x78350f, 0.35), -4, 0.38, 3.5);
    // Rug
    const rugGeo = new THREE.PlaneGeometry(3.5, 2.5);
    const rugMat = new THREE.MeshStandardMaterial({ color: 0x1d3461, roughness: 0.95 });
    const rug = new THREE.Mesh(rugGeo, rugMat);
    rug.rotation.x = -Math.PI / 2;
    rug.position.set(-4, 0.01, 3.0);
    this.scene.add(rug);
    // AC unit (wall-mounted)
    this._box(1.6, 0.28, 0.22, this._mat(0xe2e8f0, 0.2), -0.5, 2.6, 1.5);

    // ── 주방 (Kitchen) ──
    // Counter/cabinets
    this._box(4.0, 0.9, 0.7, this._mat(0x1e2a3a, 0.4, 0.1), -4.5, 0.45, -6.3);
    this._box(0.05, 0.9, 4.5, this._mat(0x1e2a3a, 0.4, 0.1), -7.3, 0.45, -3.8);
    // Countertop
    this._box(4.0, 0.05, 0.75,this._mat(0x334155, 0.15, 0.5), -4.5, 0.93, -6.3);
    this._box(0.05, 0.05, 4.5, this._mat(0x334155, 0.15, 0.5), -7.3, 0.93, -3.8);
    // Stove (cooktop)
    this._box(0.6, 0.04, 0.5, this._mat(0x1a1a1a, 0.1, 0.6), -3.5, 0.96, -6.28);
    // Boiler unit
    this._box(0.5, 0.9, 0.3, this._mat(0xecf0f1, 0.2), -7.65, 1.8, -4.2);
    // Dining table
    this._box(1.8, 0.08, 0.9, this._mat(0x92400e, 0.4), -4.2, 0.74, -2.5);
    // Chairs
    [-3.5, -4.9].forEach(x => {
      this._box(0.45, 0.45, 0.45, this._mat(0x1e293b, 0.6), x, 0.45, -2.5);
    });
    // Fridge
    this._box(0.65, 1.8, 0.65, this._mat(0xe2e8f0, 0.15, 0.3), -7.65, 0.9, -2.8);

    // ── 안방 (Master Bedroom) ──
    // Bed frame
    this._box(1.6, 0.28, 2.1, this._mat(0x1e293b, 0.4), -4.5, 0.14, 5.0);
    // Mattress
    this._box(1.55, 0.22, 1.95,this._mat(0xf8fafc, 0.9), -4.5, 0.39, 5.0);
    // Headboard
    this._box(1.6, 0.7, 0.1,  this._mat(0x334155, 0.4), -4.5, 0.55, 3.96);
    // Wardrobe
    this._box(0.5, 2.2, 1.2,  this._mat(0x1e293b, 0.4), -7.65, 1.1, 5.5);
    // Nightstand
    this._box(0.4, 0.45, 0.35, this._mat(0x334155, 0.5), -3.55, 0.22, 5.0);

    // ── 욕실 (Bathroom) ──
    // Bathtub
    this._box(1.4, 0.5, 0.7, this._mat(0xf0f4f8, 0.2), 5.5, 0.25, 5.5);
    // Vanity sink
    this._box(0.7, 0.82, 0.45, this._mat(0xe2e8f0, 0.2), 3.2, 0.41, 5.8);
    // Toilet
    this._box(0.42, 0.78, 0.6, this._mat(0xf0f4f8, 0.3), 3.0, 0.39, 4.3);

    // ── 방 A (Room A — Study/Bedroom) ──
    // Bed
    this._box(1.2, 0.3, 2.0, this._mat(0x1e3a8a, 0.7), 6.5, 0.15, 5.2);
    this._box(1.15, 0.2, 1.9, this._mat(0xf8fafc, 0.9), 6.5, 0.35, 5.2);
    // Desk
    this._box(1.4, 0.06, 0.6, this._mat(0x334155, 0.4), 5.0, 0.72, 0.2);
    // Chair
    this._box(0.45, 0.4, 0.45, this._mat(0x1e293b, 0.6), 5.0, 0.2, 0.85);
    // Bookshelf
    this._box(0.18, 2.1, 0.9, this._mat(0x1e293b, 0.5), 7.8, 1.05, 0.5);

    // ── 방 B (Room B) ──
    // Bed
    this._box(1.2, 0.3, 2.0, this._mat(0x1e3a8a, 0.7), -1.5, 0.15, -4.5);
    this._box(1.15, 0.2, 1.9, this._mat(0xf8fafc, 0.9), -1.5, 0.35, -4.5);
    // Desk
    this._box(1.0, 0.06, 0.55, this._mat(0x334155, 0.4), -1.5, 0.72, -2.8);

    // ── 현관 (Entrance) ──
    // Shoe cabinet
    this._box(1.0, 1.2, 0.35, this._mat(0x1e293b, 0.4), 5.5, 0.6, -4.0);
    // Umbrella stand
    this._box(0.18, 0.7, 0.18, this._mat(0x475569, 0.3, 0.5), 4.5, 0.35, -5.8);
    // Mat
    const matGeo = new THREE.PlaneGeometry(1.2, 0.6);
    const matMat = new THREE.MeshStandardMaterial({ color: 0x1a2030, roughness: 0.95 });
    const mat = new THREE.Mesh(matGeo, matMat);
    mat.rotation.x = -Math.PI / 2;
    mat.position.set(5.0, 0.01, -6.5);
    this.scene.add(mat);
  }

  _buildCeiling() {
    // Semi-transparent ceiling so user can see inside
    const ceilMat = new THREE.MeshStandardMaterial({
      color: 0x1a2035,
      transparent: true,
      opacity: 0.15,
      roughness: 0.6,
      side: THREE.BackSide
    });
    const ceil = new THREE.Mesh(new THREE.PlaneGeometry(16, 14), ceilMat);
    ceil.rotation.x = Math.PI / 2;
    ceil.position.set(0, 3.2, 0);
    this.scene.add(ceil);
  }

  _buildRoof() {
    const roofMat = this._mat(0x0f172a, 0.7);
    const roofMesh = new THREE.Mesh(new THREE.BoxGeometry(16.4, 0.2, 14.4), roofMat);
    roofMesh.position.set(0, 3.3, 0);
    roofMesh.visible = false;
    this.scene.add(roofMesh);
    this.roofMesh = roofMesh;
  }

  // ── 3D Lamps (ceiling lights, point lights) ─────────────────────
  _buildLamps() {
    const rooms = {
      living:   { pos: [-4, 3.1, 2.5],  color: 0xffeebb, range: 10, inten: 0 },
      kitchen:  { pos: [-4, 3.1, -4.0], color: 0xfff5cc, range: 8,  inten: 0 },
      master:   { pos: [-4, 3.1, 5.0],  color: 0xffe8cc, range: 7,  inten: 0 },
      rooma:    { pos: [ 4, 3.1, 2.5],  color: 0xffeebb, range: 8,  inten: 0 },
      roomb:    { pos: [-1, 3.1, -4.0], color: 0xfff5cc, range: 6,  inten: 0 },
      bathroom: { pos: [ 4, 3.1, 5.5],  color: 0xffffff, range: 5,  inten: 0 },
    };

    const stemMat = this._mat(0x94a3b8, 0.3, 0.7);
    const bulbOffMat = this._mat(0x1e293b, 0.6);
    this.bulbMatOn = new THREE.MeshBasicMaterial({ color: 0xfff8e0 });
    this.bulbMatOff = bulbOffMat;

    Object.entries(rooms).forEach(([key, r]) => {
      const [x, y, z] = r.pos;
      // Stem
      const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.35, 8), stemMat);
      stem.position.set(x, y + 0.17, z);
      this.scene.add(stem);

      // Shade ring (chandelier)
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.28, 0.04, 8, 24), stemMat);
      ring.position.set(x, y, z);
      ring.rotation.x = Math.PI / 2;
      this.scene.add(ring);

      // Bulb
      const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.11, 12, 12), bulbOffMat);
      bulb.position.set(x, y - 0.06, z);
      this.scene.add(bulb);

      // Point Light
      const pl = new THREE.PointLight(r.color, 0, r.range, 1.8);
      pl.position.set(x, y - 0.2, z);
      this.scene.add(pl);

      this.lamps[key] = { light: pl, bulb };
    });
  }

  // ── Animated Curtains ─────────────────────────────────────────────
  _buildCurtains() {
    const curFabric  = new THREE.MeshStandardMaterial({ color: 0x2d3d55, roughness: 0.9, side: THREE.DoubleSide });
    const curMaster  = new THREE.MeshStandardMaterial({ color: 0x1a1a2a, roughness: 0.95, side: THREE.DoubleSide });
    const curBlind   = new THREE.MeshStandardMaterial({ color: 0xd4d8e0, roughness: 0.5, side: THREE.DoubleSide });

    // Helper: create a sliding curtain pair (horizontal movement)
    const slidingPair = (x, y, z, axis, mat, span) => {
      const geo = new THREE.PlaneGeometry(span / 2 - 0.05, 1.5);
      const L = new THREE.Mesh(geo, mat);
      const R = new THREE.Mesh(geo, mat);
      L.position.set(x, y, z);
      R.position.set(x, y, z);
      this.scene.add(L);
      this.scene.add(R);
      return { L, R, axis, span, base: { x, y, z } };
    };

    // Living room: south window Z=7, horizontal X-axis curtain
    this.curtains3d.living = slidingPair(-3.5, 1.8, 6.96, 'x', curFabric, 2.4);
    this.curtains3d.living.L.rotation.y = 0;
    this.curtains3d.living.R.rotation.y = 0;

    // Master: west window X=-8, Z-axis curtain
    this.curtains3d.master = slidingPair(-7.94, 1.8, 5.0, 'z', curMaster, 1.4);
    this.curtains3d.master.L.rotation.y = Math.PI / 2;
    this.curtains3d.master.R.rotation.y = Math.PI / 2;

    // Room A: east window X=8, rolling blind (scale Y)
    const blindA = new THREE.Mesh(new THREE.PlaneGeometry(1.8, 1.4), curBlind);
    blindA.position.set(7.94, 1.8, 1.0);
    blindA.rotation.y = Math.PI / 2;
    this.scene.add(blindA);
    this.curtains3d.rooma = { type: 'blind', mesh: blindA };

    // Room B: north window Z=-7, rolling blind
    const blindB = new THREE.Mesh(new THREE.PlaneGeometry(1.0, 1.4), curBlind);
    blindB.position.set(-1.0, 1.8, -6.96);
    this.scene.add(blindB);
    this.curtains3d.roomb = { type: 'blind', mesh: blindB };
  }

  // ── Particle Effects ──────────────────────────────────────────────
  _buildEffects() {
    // AC cold air stream (거실 에어컨)
    {
      const cnt = 400;
      const geo = new THREE.BufferGeometry();
      const pos = new Float32Array(cnt * 3);
      for (let i = 0; i < cnt; i++) {
        pos[i*3]   = -0.5 + (Math.random() - 0.5) * 0.4;
        pos[i*3+1] = 2.45 - Math.random() * 0.5;
        pos[i*3+2] = 1.5  + (Math.random() - 0.5) * 0.5;
      }
      geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      const mat = new THREE.PointsMaterial({ color: 0x7dd3fc, size: 0.04, transparent: true, opacity: 0, blending: THREE.AdditiveBlending });
      this.acParticles = new THREE.Points(geo, mat);
      this.scene.add(this.acParticles);
    }

    // Humidifier mist
    {
      const cnt = 200;
      const geo = new THREE.BufferGeometry();
      const pos = new Float32Array(cnt * 3);
      for (let i = 0; i < cnt; i++) {
        pos[i*3]   = -4 + (Math.random() - 0.5) * 0.3;
        pos[i*3+1] = 0.1 + Math.random() * 0.8;
        pos[i*3+2] = 2.0 + (Math.random() - 0.5) * 0.3;
      }
      geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      const mat = new THREE.PointsMaterial({ color: 0xe0f2fe, size: 0.05, transparent: true, opacity: 0, blending: THREE.AdditiveBlending });
      this.mistParticles = new THREE.Points(geo, mat);
      this.scene.add(this.mistParticles);
    }

    // Stove flame (주방 쿡탑)
    {
      const flameMat = new THREE.MeshBasicMaterial({ color: 0x1d88fe, transparent: true, opacity: 0 });
      const flame = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.18, 8), flameMat);
      flame.position.set(-3.5, 1.06, -6.25);
      this.scene.add(flame);
      this.flameMesh = flame;
    }

    // Ondol heat grid (바닥 온돌)
    {
      const ondolMat = new THREE.MeshBasicMaterial({ color: 0xff4000, wireframe: true, transparent: true, opacity: 0 });
      [[-3, 2], [-4, -4], [-4, 5], [4, 2], [-1, -4]].forEach(([x, z]) => {
        const p = new THREE.Mesh(new THREE.PlaneGeometry(5, 5, 8, 8), ondolMat.clone());
        p.rotation.x = -Math.PI / 2;
        p.position.set(x, 0.02, z);
        this.scene.add(p);
        this.ondolPlanes.push(p);
      });
    }
  }

  // ── Canvas Labels (Sprites) ───────────────────────────────────────
  _buildLabels() {
    const defs = [
      ['거실',     -4,  2.0],
      ['주방',     -4, -4.0],
      ['안방',     -4,  5.0],
      ['욕실',      4,  5.5],
      ['방 A',      4,  2.0],
      ['방 B',     -1, -4.0],
      ['현관',      5, -4.5],
    ];

    this.labelGroup = new THREE.Group();
    defs.forEach(([txt, x, z]) => {
      const canvas = document.createElement('canvas');
      canvas.width = 200;
      canvas.height = 60;
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = 'rgba(15,20,40,0.82)';
      ctx.beginPath();
      ctx.roundRect(6, 6, 188, 48, 10);
      ctx.fill();
      ctx.strokeStyle = '#3b82f6';
      ctx.lineWidth = 3;
      ctx.stroke();
      ctx.font = 'bold 24px "Noto Sans KR", sans-serif';
      ctx.fillStyle = '#f1f5f9';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(txt, 100, 30);

      const tex = new THREE.CanvasTexture(canvas);
      const sp  = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true }));
      sp.position.set(x, 3.6, z);
      sp.scale.set(2.4, 0.72, 1);
      this.labelGroup.add(sp);
    });
    this.scene.add(this.labelGroup);
  }

  // ── Sync Functions (State → 3D) ───────────────────────────────────
  syncLights() {
    const factor = S.brightness / 100;
    Object.keys(S.lights).forEach(key => {
      const on = S.lights[key];
      const lamp = this.lamps[key];
      if (!lamp) return;
      lamp.light.intensity = on ? (4.0 * factor) : 0;
      lamp.bulb.material   = on ? this.bulbMatOn : this.bulbMatOff;
    });
  }

  syncDoor() {
    if (!this.doorPivot) return;
    // Target Y rotation: 0 = closed, -PI/2 = open
  }

  syncRoof() {
    if (this.roofMesh) this.roofMesh.visible = S.roof;
  }

  syncLabels() {
    if (this.labelGroup) this.labelGroup.visible = S.labels;
  }

  syncGas() {
    if (this.flameMesh) {
      this.flameMesh.material.opacity = S.gas.open ? 0.85 : 0;
    }
  }

  // ── Camera Presets ────────────────────────────────────────────────
  _camTo(tx, ty, tz, lx, ly, lz, dur = 900) {
    const start  = { px: this.camera.position.x, py: this.camera.position.y, pz: this.camera.position.z,
                     lx: this.orbit.target.x,    ly: this.orbit.target.y,    lz: this.orbit.target.z };
    const target = { px: tx, py: ty, pz: tz, lx, ly, lz };
    const t0 = performance.now();

    const lerp = (a, b, t) => a + (b - a) * t;
    const ease = t => 0.5 - Math.cos(t * Math.PI) / 2;

    const step = (now) => {
      const t = Math.min((now - t0) / dur, 1);
      const e = ease(t);
      this.camera.position.set(lerp(start.px, target.px, e), lerp(start.py, target.py, e), lerp(start.pz, target.pz, e));
      this.orbit.target.set(lerp(start.lx, target.lx, e), lerp(start.ly, target.ly, e), lerp(start.lz, target.lz, e));
      this.orbit.update();
      if (t < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }

  setView(name) {
    this._exitFPS();
    const views = {
      iso:      [18, 14, 18,   0, 1.5, 0],
      top:      [ 0, 28,  0.1, 0, 0,   0],
      living:   [-4, 5,  10,  -4, 1.5, 2.5],
      kitchen:  [-4, 5, -10,  -4, 1.5,-4.0],
      master:   [-8, 5,  8,   -4.5, 1.5, 5.0],
      rooma:    [ 9, 5,  8,    4, 1.5, 2.5],
      roomb:    [ 0, 5, -10,  -1, 1.5,-4.0],
      bathroom: [ 8, 5,  9,    4, 1.5, 5.5],
      entrance: [ 9, 4, -5,    5, 1.5,-4.0],
    };
    const v = views[name];
    if (v) this._camTo(...v);
  }

  // ── 1st Person (FPS) Mode ─────────────────────────────────────────
  _enterFPS() {
    S.fpsMode = true;
    this.orbit.enabled = false;
    this.fpsPos.set(0, 1.65, 4);
    this.fpsYaw = 0;
    this.fpsPitch = 0;
    this.camera.position.copy(this.fpsPos);

    // Pointer lock
    this.renderer.domElement.requestPointerLock();
    document.addEventListener('pointerlockchange', this._onPLChange.bind(this), { once: true });
    document.addEventListener('mousemove', this._onFPSMouse.bind(this));

    qs('#fps-dpad').classList.remove('hidden');
    qs('#btn-view-fps').classList.add('active');
    toast('🚶 1인칭 모드 — WASD 이동 | 마우스 시선');
  }

  _exitFPS() {
    if (!S.fpsMode) return;
    S.fpsMode = false;
    this.orbit.enabled = true;
    document.exitPointerLock();
    document.removeEventListener('mousemove', this._onFPSMouse.bind(this));
    qs('#fps-dpad').classList.add('hidden');
    qs('#btn-view-fps').classList.remove('active');
  }

  _onPLChange() {
    if (document.pointerLockElement !== this.renderer.domElement) {
      this._exitFPS();
    }
  }

  _onFPSMouse(e) {
    if (!S.fpsMode) return;
    this.fpsYaw   -= e.movementX * 0.002;
    this.fpsPitch -= e.movementY * 0.002;
    this.fpsPitch  = Math.max(-0.9, Math.min(0.9, this.fpsPitch));
  }

  _updateFPS(dt) {
    if (!S.fpsMode) return;
    const speed = 4.5 * dt;
    const dir = new THREE.Vector3();

    const fwd = new THREE.Vector3(-Math.sin(this.fpsYaw), 0, -Math.cos(this.fpsYaw));
    const rgt = new THREE.Vector3( Math.cos(this.fpsYaw), 0, -Math.sin(this.fpsYaw));

    if (this.keys['w'] || this.keys['arrowup'])    dir.addScaledVector(fwd,  1);
    if (this.keys['s'] || this.keys['arrowdown'])  dir.addScaledVector(fwd, -1);
    if (this.keys['a'] || this.keys['arrowleft'])  dir.addScaledVector(rgt, -1);
    if (this.keys['d'] || this.keys['arrowright']) dir.addScaledVector(rgt,  1);

    if (dir.lengthSq() > 0) dir.normalize();

    this.fpsPos.addScaledVector(dir, speed);
    // Clamp inside house
    this.fpsPos.x = Math.max(-7.5, Math.min(7.5, this.fpsPos.x));
    this.fpsPos.z = Math.max(-6.8, Math.min(6.8, this.fpsPos.z));
    this.fpsPos.y = 1.65;

    this.camera.position.copy(this.fpsPos);
    const lookAt = new THREE.Vector3(
      this.fpsPos.x - Math.sin(this.fpsYaw) * Math.cos(this.fpsPitch),
      this.fpsPos.y + Math.sin(this.fpsPitch),
      this.fpsPos.z - Math.cos(this.fpsYaw) * Math.cos(this.fpsPitch)
    );
    this.camera.lookAt(lookAt);
  }

  _bindKeys() {
    window.addEventListener('keydown', e => {
      this.keys[e.key.toLowerCase()] = true;
      if (e.key === 'Escape' && S.fpsMode) this._exitFPS();
    });
    window.addEventListener('keyup', e => { this.keys[e.key.toLowerCase()] = false; });

    // D-pad touch buttons
    const pairs = [
      ['dpad-up', 'w'], ['dpad-down', 's'], ['dpad-left', 'a'], ['dpad-right', 'd']
    ];
    pairs.forEach(([id, key]) => {
      const btn = qs(`#${id}`);
      if (!btn) return;
      const on  = () => { this.keys[key] = true;  btn.classList.add('pressed'); };
      const off = () => { this.keys[key] = false; btn.classList.remove('pressed'); };
      btn.addEventListener('mousedown',  on);
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

  // ── Animation Loop ────────────────────────────────────────────────
  _loop() {
    requestAnimationFrame(() => this._loop());
    const dt = this.clock3.getDelta();
    const t  = performance.now() * 0.001;

    // FPS movement
    this._updateFPS(dt);

    // Orbit update (when not FPS)
    if (!S.fpsMode) this.orbit.update();

    // ── Door swing animation ──
    if (this.doorPivot) {
      const targetY = S.door.open ? -Math.PI / 2.05 : 0;
      this.doorPivot.rotation.y += (targetY - this.doorPivot.rotation.y) * 0.1;
    }

    // ── Curtain animations ──
    Object.keys(S.curtains).forEach(key => {
      const c = this.curtains3d[key];
      if (!c) return;
      const isOpen = S.curtains[key];

      if (c.type === 'blind') {
        // Rolling blind: scale Y down when open
        const targetSY = isOpen ? 0.05 : 1.0;
        c.mesh.scale.y += (targetSY - c.mesh.scale.y) * 0.1;
        // Adjust Y position so it rolls up from top
        const fullH = 1.4;
        c.mesh.position.y = 1.8 - fullH * 0.5 * (1 - c.mesh.scale.y);
      } else {
        // Sliding curtains: move apart (open) or center (closed)
        const half = c.span / 4;
        const targetL = isOpen ? c.base[c.axis] - half * 1.6 : c.base[c.axis];
        const targetR = isOpen ? c.base[c.axis] + half * 1.6 : c.base[c.axis];
        const bAxis = c.axis;

        c.L.position[bAxis] += (targetL - c.L.position[bAxis]) * 0.1;
        c.R.position[bAxis] += (targetR - c.R.position[bAxis]) * 0.1;
      }
    });

    // ── Ondol heat glow ──
    this.ondolPlanes.forEach(p => {
      const target = (S.climate.boiler) ? (0.3 + 0.2 * Math.sin(t * 4)) : 0;
      p.material.opacity += (target - p.material.opacity) * 0.08;
    });

    // ── AC particle stream ──
    if (this.acParticles) {
      const targetOp = S.climate.ac ? 0.8 : 0;
      this.acParticles.material.opacity += (targetOp - this.acParticles.material.opacity) * 0.08;
      if (S.climate.ac || this.acParticles.material.opacity > 0.01) {
        const pos = this.acParticles.geometry.attributes.position.array;
        const spd = S.climate.acWind === 'high' ? 0.035 : S.climate.acWind === 'med' ? 0.022 : 0.012;
        for (let i = 0; i < pos.length; i += 3) {
          pos[i+2] -= spd;
          pos[i]   += Math.sin(t * 3 + i) * 0.002;
          if (pos[i+2] < -0.5) {
            pos[i]   = -0.5 + (Math.random() - 0.5) * 0.4;
            pos[i+1] = 2.45 - Math.random() * 0.5;
            pos[i+2] = 1.5  + (Math.random() - 0.5) * 0.5;
          }
        }
        this.acParticles.geometry.attributes.position.needsUpdate = true;
      }
    }

    // ── Humidifier mist ──
    if (this.mistParticles) {
      const targetOp = S.climate.humidifier ? 0.65 : 0;
      this.mistParticles.material.opacity += (targetOp - this.mistParticles.material.opacity) * 0.08;
      if (S.climate.humidifier || this.mistParticles.material.opacity > 0.01) {
        const pos = this.mistParticles.geometry.attributes.position.array;
        for (let i = 0; i < pos.length; i += 3) {
          pos[i+1] += 0.008;
          pos[i]   += Math.sin(t * 5 + i) * 0.001;
          if (pos[i+1] > 1.2) {
            pos[i]   = -4 + (Math.random() - 0.5) * 0.3;
            pos[i+1] = 0.1;
            pos[i+2] = 2.0 + (Math.random() - 0.5) * 0.3;
          }
        }
        this.mistParticles.geometry.attributes.position.needsUpdate = true;
      }
    }

    // ── Stove flame flicker ──
    if (this.flameMesh && S.gas.open) {
      const sc = 1 + 0.2 * Math.sin(t * 18);
      this.flameMesh.scale.set(sc, 1 + 0.3 * Math.cos(t * 14), sc);
    }

    // ── Temperature simulation ──
    this._simClimate(dt);

    this.renderer.render(this.scene, this.camera);
  }

  _simClimate(dt) {
    const c = S.climate;
    // Boiler → heat up
    if (c.boiler) {
      if (c.currentTemp < c.boilerTarget) c.currentTemp = Math.min(c.boilerTarget, c.currentTemp + 0.004);
    }
    // AC → cool down
    if (c.ac) {
      if (c.currentTemp > c.targetTemp) {
        const rate = c.acWind === 'high' ? 0.012 : c.acWind === 'med' ? 0.007 : 0.004;
        c.currentTemp = Math.max(c.targetTemp, c.currentTemp - rate);
      }
    }
    // Ambient drift
    if (!c.boiler && !c.ac) {
      c.currentTemp += (24.5 - c.currentTemp) * 0.0005;
    }
    // Humidity
    if (c.humidifier) c.currentHumidity = Math.min(75, c.currentHumidity + 0.02);
    else c.currentHumidity += (50 - c.currentHumidity) * 0.0002;

    // Update HUD
    qs('#hud-temp').textContent   = `🌡 ${c.currentTemp.toFixed(1)}°C`;
    qs('#hud-humidity').textContent = `💧 ${Math.round(c.currentHumidity)}%`;
    qs('#temp-current').textContent = `${c.currentTemp.toFixed(1)}°C`;
  }
}

// ─────────────────────────────────────────────────────────────────────
// 4. UI CONTROLLER
// ─────────────────────────────────────────────────────────────────────
let sim = null;

function initUI() {
  // ── Tab switching ──
  qsa('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const tab = btn.dataset.tab;
      qsa('.tab-btn').forEach(b => b.classList.remove('active'));
      qsa('.tab-content').forEach(c => c.classList.remove('active'));
      btn.classList.add('active');
      qs(`#tab-${tab}`).classList.add('active');
    });
  });

  // ── Panel toggle ──
  qs('#btn-toggle-panel').addEventListener('click', () => {
    S.panelOpen = !S.panelOpen;
    const panel = qs('#control-panel');
    const vp    = qs('#viewport');
    panel.classList.toggle('hidden', !S.panelOpen);
    vp.classList.toggle('panel-hidden', !S.panelOpen);
    qs('#btn-toggle-panel').classList.toggle('active', S.panelOpen);
    if (sim) setTimeout(() => {
      const el = qs('#viewport');
      sim.W = el.clientWidth;
      sim.H = el.clientHeight;
      sim.camera.aspect = sim.W / sim.H;
      sim.camera.updateProjectionMatrix();
      sim.renderer.setSize(sim.W, sim.H);
    }, 370);
  });

  // ── Camera toolbar ──
  qs('#btn-view-iso').addEventListener('click',     () => { sim.setView('iso');     setActiveCam('btn-view-iso'); });
  qs('#btn-view-top').addEventListener('click',     () => { sim.setView('top');     setActiveCam('btn-view-top'); });
  qs('#btn-view-fps').addEventListener('click',     () => { if (S.fpsMode) { sim._exitFPS(); setActiveCam('btn-view-iso'); } else { sim._enterFPS(); setActiveCam('btn-view-fps'); } });
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
    const btn = qs('#btn-roof-toggle');
    btn.dataset.active = S.roof;
    btn.classList.toggle('active', S.roof);
    toast(S.roof ? '🏠 지붕 ON (밀폐)' : '🏠 지붕 OFF (오픈)');
  });

  qs('#btn-labels-toggle').addEventListener('click', () => {
    S.labels = !S.labels;
    sim.syncLabels();
    const btn = qs('#btn-labels-toggle');
    btn.dataset.active = S.labels;
    toast(S.labels ? '🏷 방 이름 표시 ON' : '🏷 방 이름 표시 OFF');
  });

  function setActiveCam(id) {
    qsa('#cam-toolbar .cam-btn').forEach(b => b.classList.remove('active'));
    qs(`#${id}`)?.classList.add('active');
  }

  // ── Lighting ──
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
      const room = btn.dataset.light;
      const on = S.lights[room];
      btn.classList.toggle('on', on);
      btn.textContent = on ? '켜짐 💡' : '꺼짐';
      btn.closest('.room-light-card')?.classList.toggle('lit', on);
    });
  }

  // ── Door ──
  function refreshDoorUI() {
    const box  = qs('#door-status-box');
    const icon = qs('#door-icon');
    const text = qs('#door-text');
    const hud  = qs('#hud-door-status');
    if (S.door.open) {
      icon.textContent = '🚪';
      text.textContent = '문 열림';
      box.classList.add('open');
      if (hud) hud.textContent = '🚪 현관 열림';
    } else {
      icon.textContent = S.door.locked ? '🔒' : '🔓';
      text.textContent = S.door.locked ? '잠겨 있음' : '닫힘 (잠금 해제)';
      box.classList.remove('open');
      if (hud) hud.textContent = S.door.locked ? '🔒 현관 잠김' : '🔓 현관 닫힘';
    }
    sim.syncDoor();
  }

  qs('#btn-door-open').addEventListener('click', () => {
    if (S.door.locked) S.door.locked = false;
    S.door.open = true;
    refreshDoorUI();
    toast('🚪 현관문 열림 (모터 스윙)');
  });

  qs('#btn-door-close').addEventListener('click', () => {
    S.door.open   = false;
    S.door.locked = true;
    refreshDoorUI();
    toast('🔒 현관문 닫힘 & 잠금');
  });

  qs('#btn-lock').addEventListener('click', () => {
    S.door.locked = true;
    if (S.door.open) S.door.open = false;
    refreshDoorUI();
    toast('🔐 도어락 잠금');
  });

  qs('#btn-unlock').addEventListener('click', () => {
    S.door.locked = false;
    refreshDoorUI();
    toast('🔑 도어락 해제');
  });

  // ── Curtains ──
  function refreshCurtainUI() {
    qsa('[data-curtain]').forEach(btn => {
      const room = btn.dataset.curtain;
      const open = S.curtains[room];
      btn.classList.toggle('on-blue', open);
      btn.textContent = open ? '열림 ↕' : '닫힘';
    });
  }

  qs('#btn-curtain-all-open').addEventListener('click', () => {
    Object.keys(S.curtains).forEach(k => S.curtains[k] = true);
    refreshCurtainUI();
    toast('🪟 전체 커튼 열기');
  });

  qs('#btn-curtain-all-close').addEventListener('click', () => {
    Object.keys(S.curtains).forEach(k => S.curtains[k] = false);
    refreshCurtainUI();
    toast('🪟 전체 커튼 닫기');
  });

  qsa('[data-curtain]').forEach(btn => {
    btn.addEventListener('click', () => {
      const room = btn.dataset.curtain;
      S.curtains[room] = !S.curtains[room];
      refreshCurtainUI();
      toast(`${curtainKr(room)} ${S.curtains[room] ? '열림' : '닫힘'}`);
    });
  });

  // ── Climate ──
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
    qs('#badge-boiler').className = `badge ${S.climate.boiler ? 'on' : 'off'}`;
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
    qs('#badge-ac').className = `badge ${S.climate.ac ? 'on-blue' : 'off'}`;
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

  // ── Gas ──
  qs('#btn-gas-open').addEventListener('click', () => {
    S.gas.open = true;
    qs('#gas-status-text').textContent = '가스 열림 ⚠️ 사용중';
    qs('#gas-status-box').classList.add('danger');
    sim.syncGas();
    toast('🔥 가스 밸브 열림', 'err');
  });

  qs('#btn-gas-close').addEventListener('click', () => {
    S.gas.open = false;
    qs('#gas-status-text').textContent = '가스 잠김 (안전)';
    qs('#gas-status-box').classList.remove('danger');
    sim.syncGas();
    toast('🔒 가스 안전하게 잠김');
  });

  // ── Away Mode ──
  qs('#btn-away').addEventListener('click', () => {
    Object.keys(S.lights).forEach(k => S.lights[k] = false);
    refreshLightUI();
    sim.syncLights();
    S.door.open   = false;
    S.door.locked = true;
    refreshDoorUI();
    Object.keys(S.curtains).forEach(k => S.curtains[k] = false);
    refreshCurtainUI();
    if (S.gas.open) {
      S.gas.open = false;
      qs('#gas-status-text').textContent = '가스 잠김 (안전)';
      qs('#gas-status-box').classList.remove('danger');
      sim.syncGas();
    }
    if (S.climate.ac) {
      S.climate.ac = false;
      qs('#btn-ac').classList.remove('on-blue');
      qs('#btn-ac').textContent = '꺼짐';
      qs('#badge-ac').textContent = 'OFF';
      qs('#badge-ac').className = 'badge off';
      qs('#ac-extra').classList.add('hidden');
    }
    toast('🚶 외출 모드 — 전체 소등, 잠금, 가스차단 완료');
  });
}

// ─────────────────────────────────────────────────────────────────────
// 5. HELPERS
// ─────────────────────────────────────────────────────────────────────
function roomKr(key) {
  return { living: '거실', kitchen: '주방', master: '안방', rooma: '방 A', roomb: '방 B', bathroom: '욕실' }[key] || key;
}

function curtainKr(key) {
  return { living: '거실 커튼', master: '안방 암막', rooma: '방 A 블라인드', roomb: '방 B 블라인드' }[key] || key;
}

// ─────────────────────────────────────────────────────────────────────
// 6. BOOT
// ─────────────────────────────────────────────────────────────────────
window.addEventListener('DOMContentLoaded', () => {
  sim = new SmartHomeSimulator();
  initUI();
  toast('🏠 스마트홈 3D 시뮬레이터 준비 완료');
});
