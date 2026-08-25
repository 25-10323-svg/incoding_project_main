/* =====================================================================
   스마트홈 3D 시뮬레이터 — app.js
   Perfectly Aligned Floor Plan & Walls
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
  _buildFloors() {
    // Total size: X -80 to 80 (160), Z -70 to +70 (140)
    const defs = [
      [-40,  30, 80, 80,  0x2a2010], // 1. 거실
      [-40, -40, 80, 60,  0x1e2830], // 2. 주방
      [ 40,  50, 80, 40,  0x1a1a2a], // 3. 안방
      [ 20,  15, 40, 30,  0x182018], // 4. 욕실
      [ 60,   5, 40, 50,  0x1c1a28], // 5. 방 A
      [ 20, -35, 40, 70,  0x1c1a28], // 6. 방 B
      [ 60, -45, 40, 50,  0x15151f], // 7. 현관
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

    const wall = (cx, cz, len, horiz, mat = wm) => {
      const w = horiz ? len : T;
      const d = horiz ? T   : len;
      this._box(w, H, d, mat, cx, H / 2, cz);
    };

    // ── Outer perimeter ──
    wall(  0, -70, 160, true);   // North
    wall(  0,  70, 160, true);   // South
    wall(-80,   0, 140, false);  // West
    wall( 80,   0, 140, false);  // East

    // ── Interior dividers (with passage gaps) ──
    // 1. X=0 divider (Left / Right block)
    wall(0,  50, 40, false, im); // 안방 vs 거실
    wall(0,  20, 20, false, im); // 욕실 vs 거실
    // Gap Z=-10 to 10 (passage from 거실)
    wall(0, -40, 60, false, im); // 방B vs 주방

    // 2. Z=-10 divider (거실 vs 주방)
    wall(-60, -10, 40, true, im);
    // Gap X=-40 to -20
    wall(-10, -10, 20, true, im);

    // 3. Z=30 divider (안방 vs 욕실/방A)
    wall(15, 30, 30, true, im);
    // Gap X=30 to 50 (안방 문)
    wall(65, 30, 30, true, im);

    // 4. Z=0 divider (욕실 vs 방B)
    wall(7.5, 0, 15, true, im);
    // Gap X=15 to 25 (욕실 문)
    wall(32.5, 0, 15, true, im);

    // 5. X=40 divider (욕실/방B vs 방A/현관)
    wall(40, -50, 40, false, im); // 방B vs 현관
    // Gap Z=-30 to -10 (현관문에서 집 진입)
    wall(40,   0, 20, false, im); // 방B vs 방A
    wall(40,  20, 20, false, im); // 욕실 vs 방A

    // 6. Z=-20 divider (방A vs 현관)
    wall(60, -20, 40, true, im); // solid
  }

  // ── Front Door ────────────────────────────────────────────────────
  _buildDoor() {
    const doorMat  = this._mat(0x3b4a5c, 0.4, 0.1);
    const frameMat = this._mat(0x475569, 0.5, 0.2);

    // Door is on North wall (Z=-70) at X=65
    this.doorPivot = new THREE.Group();
    this.doorPivot.position.set(65, 0, -70);
    this.scene.add(this.doorPivot);

    const doorMesh = new THREE.Mesh(new THREE.BoxGeometry(10, 24, 0.8), doorMat);
    doorMesh.castShadow = true;
    doorMesh.position.set(-5, 12, 0); // swings around right edge
    this.doorPivot.add(doorMesh);

    // Frame
    [[-10.5, 12, 0], [0.5, 12, 0], [-5, 25, 0]].forEach(([fx, fy, fz], i) => {
      const fw = i === 2 ? 11 : 0.8;
      const fh = i === 2 ? 1  : 24;
      const fd = 1.2;
      const fm = new THREE.Mesh(new THREE.BoxGeometry(fw, fh, fd), frameMat);
      fm.position.set(65 + fx, fy, -70 + fz);
      this.scene.add(fm);
    });

    // Lock pad
    const lockMat = this._mat(0x94a3b8, 0.2, 0.9);
    const lp = new THREE.Mesh(new THREE.BoxGeometry(0.8, 1.8, 0.4), lockMat);
    lp.position.set(56, 12, -69.4);
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

    addWin(-40,  70, true,  30, 14);  // 거실 South
    addWin( 40,  70, true,  20, 14);  // 안방 South
    addWin(-80,  30, false, 20, 14);  // 거실 West
    addWin(-80, -40, false, 16, 12);  // 주방 West
    addWin( 80,   5, false, 16, 14);  // 방 A East
    addWin( 20, -70, true,  16, 12);  // 방 B North
  }

  // ── Furniture ─────────────────────────────────────────────────────
  _buildFurniture() {
    // 거실 (cx=-40, cz=30)
    this._box(32, 4.5, 9,  this._mat(0x1e3a8a, 0.7), -40, 4.5, 60);  // sofa back
    this._box(32, 2.0, 8,  this._mat(0x1e3a8a, 0.7), -40, 1.5, 52);  // sofa seat
    this._box(12, 0.4, 6,  this._mat(0x78350f, 0.35),-40, 3.8, 35);  // coffee table
    this._box(28, 3.5, 4,  this._mat(0x1e293b, 0.4), -40, 1.7,  5);  // TV console
    this._box(24,13,   0.5,this._mat(0x020617, 0.05),-40, 9.0,  5.5);// TV screen
    {
      const r = new THREE.Mesh(new THREE.PlaneGeometry(35, 25), this._mat(0x1d3461, 0.95));
      r.rotation.x = -Math.PI / 2; r.position.set(-40, 0.1, 30);
      this.scene.add(r);
    }
    this._box(16, 2.8, 2.2, this._mat(0xe2e8f0, 0.2), -75, 26, 30); // AC (West wall)

    // 주방 (cx=-40, cz=-40)
    this._box(9,  9,  40, this._mat(0x1e2a3a, 0.4, 0.1), -75, 4.5, -40); // counter W
    this._box(9.5,0.5,40, this._mat(0x334155,0.15,0.5),  -75, 9.3, -40); // countertop W
    this._box(5,  0.4, 6, this._mat(0x1a1a1a, 0.1, 0.6), -74, 9.6, -40); // stove
    this._box(5,  9,   3, this._mat(0xecf0f1, 0.2),      -70, 18, -68);  // boiler
    this._box(18, 0.8, 9, this._mat(0x92400e, 0.4),      -40, 7.4, -35); // dining table
    [-35, -45].forEach(x => this._box(4.5,4.5,4.5,this._mat(0x1e293b,0.6), x, 4.5, -35)); // chairs
    this._box(7,  18, 6.5,this._mat(0xe2e8f0,0.15,0.3),  -25,  9, -65);  // fridge

    // 안방 (cx=40, cz=50)
    this._box(16, 2.8, 21, this._mat(0x1e293b, 0.4), 60, 1.4, 50);  // bed frame
    this._box(15.5, 2.2,19.5,this._mat(0xf8fafc,0.9),60, 3.9, 50);  // mattress
    this._box(16, 7, 1,   this._mat(0x334155, 0.4), 60, 5.5, 39.6); // headboard
    this._box(22, 22, 5,  this._mat(0x1e293b, 0.4), 20, 11, 67);    // wardrobe

    // 욕실 (cx=20, cz=15)
    this._box(14, 5, 7,   this._mat(0xf0f4f8, 0.2), 10, 2.5, 20);   // bathtub
    this._box(7, 8.2, 4.5,this._mat(0xe2e8f0, 0.2), 32, 4.1, 25);   // vanity
    this._box(4.2,7.8,6,  this._mat(0xf0f4f8, 0.3), 30, 3.9,  5);   // toilet

    // 방 A (cx=60, cz=5)
    this._box(12, 3, 20,  this._mat(0x1e3a8a, 0.7), 70, 1.5, 15);   // bed
    this._box(11.5,2,18.5,this._mat(0xf8fafc,0.9),  70, 3.5, 15);   // mattress
    this._box(14, 0.6, 6, this._mat(0x334155, 0.4), 50, 7.2, -5);   // desk
    this._box(1.8,21,9,   this._mat(0x1e293b, 0.5), 78, 10.5, -5);  // bookshelf

    // 방 B (cx=20, cz=-35)
    this._box(12, 3, 20,  this._mat(0x1e3a8a, 0.7), 10, 1.5, -45);  // bed
    this._box(11.5,2,18.5,this._mat(0xf8fafc,0.9),  10, 3.5, -45);  // mattress
    this._box(10, 0.6, 5.5,this._mat(0x334155,0.4), 30, 7.2, -25);  // desk

    // 현관 (cx=60, cz=-45)
    this._box(10, 12, 3.5, this._mat(0x1e293b, 0.4), 70, 6,  -40);  // shoe cabinet
    {
      const mat = new THREE.Mesh(new THREE.PlaneGeometry(16, 12), this._mat(0x1a2030, 0.95));
      mat.rotation.x = -Math.PI / 2; mat.position.set(60, 0.1, -60);
      this.scene.add(mat);
    }
  }

  // ── Pyramid Hip Roof ──────────────────────────────────────────────
  _buildRoof() {
    this.roofGroup = new THREE.Group();

    // Eave slab
    const eaveMat = this._mat(0x0f172a, 0.6, 0.1);
    const eave = new THREE.Mesh(new THREE.BoxGeometry(166, 2, 146), eaveMat);
    eave.position.set(0, 32, 0);
    this.roofGroup.add(eave);

    const hw = 84, hd = 74, base = 33, peak = 72;
    const roofMat = this._mat(0x1e293b, 0.55, 0.15);
    const apex = [0, peak, 0];
    const corners = [
      [-hw, base, -hd], [ hw, base, -hd],
      [ hw, base,  hd], [-hw, base,  hd],
    ];

    const makeFace = (a, b, c) => {
      const geo = new THREE.BufferGeometry();
      const verts = new Float32Array([...a, ...b, ...c]);
      geo.setAttribute('position', new THREE.BufferAttribute(verts, 3));
      geo.computeVertexNormals();
      const mesh = new THREE.Mesh(geo, roofMat);
      mesh.castShadow = true; mesh.receiveShadow = true;
      return mesh;
    };

    this.roofGroup.add(makeFace(corners[0], corners[1], apex));
    this.roofGroup.add(makeFace(corners[1], corners[2], apex));
    this.roofGroup.add(makeFace(corners[2], corners[3], apex));
    this.roofGroup.add(makeFace(corners[3], corners[0], apex));

    const cap = new THREE.Mesh(new THREE.SphereGeometry(2, 8, 8), this._mat(0x0f172a, 0.4, 0.3));
    cap.position.set(0, peak, 0);
    this.roofGroup.add(cap);

    this.roofGroup.visible = false;
    this.scene.add(this.roofGroup);
  }

  // ── Ceiling Lamps ─────────────────────────────────────────────────
  _buildLamps() {
    const rooms = {
      living:   { x: -40, z:  30, color: 0xffeebb, range: 100, y: 31 },
      kitchen:  { x: -40, z: -40, color: 0xfff5cc, range:  80, y: 31 },
      master:   { x:  40, z:  50, color: 0xffe8cc, range:  70, y: 31 },
      rooma:    { x:  60, z:   5, color: 0xffeebb, range:  80, y: 31 },
      roomb:    { x:  20, z: -35, color: 0xfff5cc, range:  60, y: 31 },
      bathroom: { x:  20, z:  15, color: 0xffffff, range:  50, y: 31 },
    };

    const stemMat  = this._mat(0x94a3b8, 0.3, 0.7);
    this.bulbMatOn  = new THREE.MeshBasicMaterial({ color: 0xfff8e0 });
    this.bulbMatOff = this._mat(0x1e293b, 0.6);

    Object.entries(rooms).forEach(([key, r]) => {
      const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.25, 3.5, 8), stemMat);
      stem.position.set(r.x, r.y + 1.7, r.z);
      this.scene.add(stem);

      const ring = new THREE.Mesh(new THREE.TorusGeometry(2.8, 0.4, 8, 24), stemMat);
      ring.rotation.x = Math.PI / 2;
      ring.position.set(r.x, r.y, r.z);
      this.scene.add(ring);

      const bulb = new THREE.Mesh(new THREE.SphereGeometry(1.1, 12, 12), this.bulbMatOff);
      bulb.position.set(r.x, r.y - 0.6, r.z);
      this.scene.add(bulb);

      const pl = new THREE.PointLight(r.color, 0, r.range, 1.6);
      pl.position.set(r.x, r.y - 2, r.z);
      this.scene.add(pl);

      this.lamps[key] = { light: pl, bulb };
    });
  }

  // ── Animated Curtains ────────────────────────────────────────────
  _buildCurtains() {
    const curFab = new THREE.MeshStandardMaterial({ color: 0x2d3d55, roughness: 0.9, side: THREE.DoubleSide });
    const curBlk = new THREE.MeshStandardMaterial({ color: 0x1a1a2a, roughness: 0.95, side: THREE.DoubleSide });
    const curBld = new THREE.MeshStandardMaterial({ color: 0xd4d8e0, roughness: 0.5, side: THREE.DoubleSide });

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

    // 거실 South (Z=70), X-axis sliding
    this.curtains3d.living = slidePair(-40, 69.4, 'x', curFab, 30);
    this.curtains3d.living.L.rotation.y = 0;
    this.curtains3d.living.R.rotation.y = 0;

    // 안방 South (Z=70), X-axis sliding
    this.curtains3d.master = slidePair(40, 69.4, 'x', curBlk, 20);
    this.curtains3d.master.L.rotation.y = 0;
    this.curtains3d.master.R.rotation.y = 0;

    // 방 A East (X=80), blind (scale Y)
    const blindA = new THREE.Mesh(new THREE.PlaneGeometry(16, 14), curBld);
    blindA.position.set(79.4, 18, 5);
    blindA.rotation.y = Math.PI / 2;
    this.scene.add(blindA);
    this.curtains3d.rooma = { type: 'blind', mesh: blindA, baseY: 18 };

    // 방 B North (Z=-70), blind
    const blindB = new THREE.Mesh(new THREE.PlaneGeometry(16, 12), curBld);
    blindB.position.set(20, 18, -69.4);
    this.scene.add(blindB);
    this.curtains3d.roomb = { type: 'blind', mesh: blindB, baseY: 18 };
  }

  // ── Effects ───────────────────────────────────────────────────────
  _buildEffects() {
    // AC stream (거실 에어컨: x=-75, z=30)
    {
      const cnt = 500;
      const geo = new THREE.BufferGeometry();
      const pos = new Float32Array(cnt * 3);
      for (let i = 0; i < cnt; i++) {
        pos[i*3]   = -75 + (Math.random() - 0.5) * 4;
        pos[i*3+1] = 24.5 - Math.random() * 5;
        pos[i*3+2] = 30  + (Math.random() - 0.5) * 5;
      }
      geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      const mat = new THREE.PointsMaterial({ color: 0x7dd3fc, size: 0.4, transparent: true, opacity: 0, blending: THREE.AdditiveBlending });
      this.acParticles = new THREE.Points(geo, mat);
      this.scene.add(this.acParticles);
    }

    // Humidifier mist (거실 테이블 위 x=-40, z=35)
    {
      const cnt = 300;
      const geo = new THREE.BufferGeometry();
      const pos = new Float32Array(cnt * 3);
      for (let i = 0; i < cnt; i++) {
        pos[i*3]   = -40 + (Math.random() - 0.5) * 3;
        pos[i*3+1] = 4 + Math.random() * 8;
        pos[i*3+2] = 35 + (Math.random() - 0.5) * 3;
      }
      geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      const mat = new THREE.PointsMaterial({ color: 0xe0f2fe, size: 0.5, transparent: true, opacity: 0, blending: THREE.AdditiveBlending });
      this.mistParticles = new THREE.Points(geo, mat);
      this.scene.add(this.mistParticles);
    }

    // Stove flame (주방 x=-74, z=-40)
    {
      const fm = new THREE.MeshBasicMaterial({ color: 0x1d88fe, transparent: true, opacity: 0 });
      const fc = new THREE.Mesh(new THREE.ConeGeometry(0.6, 1.8, 8), fm);
      fc.position.set(-74, 10.6, -40);
      this.scene.add(fc);
      this.flameMesh = fc;
    }

    // Ondol heat planes
    {
      const om = new THREE.MeshBasicMaterial({ color: 0xff4000, wireframe: true, transparent: true, opacity: 0 });
      [[-40, 30], [-40, -40], [40, 50], [60, 5], [20, -35]].forEach(([x, z]) => {
        const p = new THREE.Mesh(new THREE.PlaneGeometry(35, 35, 8, 8), om.clone());
        p.rotation.x = -Math.PI / 2;
        p.position.set(x, 0.2, z);
        this.scene.add(p);
        this.ondolPlanes.push(p);
      });
    }
  }

  // ── Labels ────────────────────────────────────────────────────────
  _buildLabels() {
    this.labelGroup = new THREE.Group();
    const defs = [
      ['거실',       -40,  30],
      ['주방',       -40, -40],
      ['안방',        40,  50],
      ['욕실',        20,  15],
      ['방 A',        60,   5],
      ['방 B',        20, -35],
      ['현관',        60, -45],
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
      living:   [ -40,  70, 130,  -40, 15,  30],
      kitchen:  [ -40,  70,-140,  -40, 15, -40],
      master:   [  40,  70, 150,   40, 15,  50],
      rooma:    [ 160,  70,   5,   60, 15,   5],
      roomb:    [  20,  70,-130,   20, 15, -35],
      bathroom: [  20,  60, 110,   20, 15,  15],
      entrance: [ 160,  55, -45,   60, 15, -45],
    };
    const v = V[name];
    if (v) this._camTo(...v);
  }

  // ── FPS Mode ──────────────────────────────────────────────────────
  _enterFPS() {
    S.fpsMode = true;
    this.orbit.enabled = false;
    this.fpsPos.set(-40, 16.5, 50); // Start in living room
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

    if (this.doorPivot) {
      const tgt = S.door.open ? -Math.PI / 2.05 : 0;
      this.doorPivot.rotation.y += (tgt - this.doorPivot.rotation.y) * 0.1;
    }

    Object.keys(S.curtains).forEach(key => {
      const c   = this.curtains3d[key];
      const open = S.curtains[key];
      if (!c) return;

      if (c.type === 'blind') {
        const tSY = open ? 0.04 : 1.0;
        c.mesh.scale.y += (tSY - c.mesh.scale.y) * 0.1;
        c.mesh.position.y = c.baseY - (14 * 0.5 * (1 - c.mesh.scale.y));
      } else {
        const half = c.span / 4;
        const axis = c.axis;
        const base = axis === 'x' ? c.bx : c.bz;
        const tL = open ? base - half * 1.5 : base;
        const tR = open ? base + half * 1.5 : base;
        c.L.position[axis] += (tL - c.L.position[axis]) * 0.1;
        c.R.position[axis] += (tR - c.R.position[axis]) * 0.1;
      }
    });

    this.ondolPlanes.forEach(p => {
      const tgt = S.climate.boiler ? (0.28 + 0.18 * Math.sin(t * 4)) : 0;
      p.material.opacity += (tgt - p.material.opacity) * 0.08;
    });

    if (this.acParticles) {
      const tgt = S.climate.ac ? 0.8 : 0;
      this.acParticles.material.opacity += (tgt - this.acParticles.material.opacity) * 0.08;
      if (S.climate.ac || this.acParticles.material.opacity > 0.01) {
        const pos = this.acParticles.geometry.attributes.position.array;
        const spd = S.climate.acWind === 'high' ? 0.35 : S.climate.acWind === 'med' ? 0.22 : 0.12;
        for (let i = 0; i < pos.length; i += 3) {
          pos[i]   += spd;
          pos[i+2] -= Math.sin(t * 3 + i) * 0.02;
          if (pos[i] > -35) {
            pos[i]   = -75 + (Math.random() - 0.5) * 4;
            pos[i+1] = 24.5 - Math.random() * 5;
            pos[i+2] = 30 + (Math.random() - 0.5) * 5;
          }
        }
        this.acParticles.geometry.attributes.position.needsUpdate = true;
      }
    }

    if (this.mistParticles) {
      const tgt = S.climate.humidifier ? 0.65 : 0;
      this.mistParticles.material.opacity += (tgt - this.mistParticles.material.opacity) * 0.08;
      if (S.climate.humidifier || this.mistParticles.material.opacity > 0.01) {
        const pos = this.mistParticles.geometry.attributes.position.array;
        for (let i = 0; i < pos.length; i += 3) {
          pos[i+1] += 0.08;
          pos[i]   += Math.sin(t * 5 + i) * 0.01;
          if (pos[i+1] > 15) {
            pos[i]   = -40 + (Math.random() - 0.5) * 3;
            pos[i+1] = 4;
            pos[i+2] = 35 + (Math.random() - 0.5) * 3;
          }
        }
        this.mistParticles.geometry.attributes.position.needsUpdate = true;
      }
    }

    if (this.flameMesh && S.gas.open) {
      const sc = 1 + 0.2 * Math.sin(t * 18);
      this.flameMesh.scale.set(sc, 1 + 0.3 * Math.cos(t * 14), sc);
    }

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
  qsa('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const tab = btn.dataset.tab;
      qsa('.tab-btn').forEach(b => b.classList.remove('active'));
      qsa('.tab-content').forEach(c => c.classList.remove('active'));
      btn.classList.add('active');
      qs(`#tab-${tab}`).classList.add('active');
    });
  });

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

  qs('#brightness-slider').addEventListener('input', e => {
    S.brightness = parseInt(e.target.value);
    qs('#brightness-val').textContent = `${S.brightness}%`;
    sim.syncLights();
  });

  qs('#btn-all-off').addEventListener('click', () => {
    Object.keys(S.lights).forEach(k => S.lights[k] = false);
    refreshLightUI(); sim.syncLights(); toast('전체 조명 소등');
  });

  qsa('[data-light]').forEach(btn => {
    btn.addEventListener('click', () => {
      const room = btn.dataset.light;
      S.lights[room] = !S.lights[room];
      refreshLightUI(); sim.syncLights();
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
    S.door.open = true; refreshDoorUI(); toast('🚪 현관문 열림');
  });
  qs('#btn-door-close').addEventListener('click', () => {
    S.door.open = false; S.door.locked = true; refreshDoorUI(); toast('🔒 현관문 닫힘 & 잠금');
  });
  qs('#btn-lock').addEventListener('click', () => {
    S.door.locked = true; if (S.door.open) S.door.open = false; refreshDoorUI(); toast('🔐 도어락 잠금');
  });
  qs('#btn-unlock').addEventListener('click', () => {
    S.door.locked = false; refreshDoorUI(); toast('🔑 도어락 해제');
  });

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

  qs('#btn-temp-minus').addEventListener('click', () => {
    S.climate.targetTemp = Math.max(16, S.climate.targetTemp - 0.5);
    qs('#temp-target').textContent = `${S.climate.targetTemp.toFixed(1)}°C`;
  });
  qs('#btn-temp-plus').addEventListener('click', () => {
    S.climate.targetTemp = Math.min(32, S.climate.targetTemp + 0.5);
    qs('#temp-target').textContent = `${S.climate.targetTemp.toFixed(1)}°C`;
  });

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

  qs('#btn-humidifier').addEventListener('click', () => {
    S.climate.humidifier = !S.climate.humidifier;
    const btn = qs('#btn-humidifier');
    btn.classList.toggle('on-blue', S.climate.humidifier);
    btn.textContent = S.climate.humidifier ? '켜짐 💨' : '꺼짐';
    toast(`가습기 ${S.climate.humidifier ? 'ON 💨' : 'OFF'}`);
  });

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

  qs('#btn-away').addEventListener('click', () => {
    Object.keys(S.lights).forEach(k => S.lights[k] = false);
    refreshLightUI(); sim.syncLights();
    S.door.open = false; S.door.locked = true; refreshDoorUI();
    Object.keys(S.curtains).forEach(k => S.curtains[k] = false); refreshCurtainUI();
    if (S.gas.open) { S.gas.open = false; qs('#gas-status-box').classList.remove('danger'); qs('#gas-status-text').textContent = '가스 잠김 (안전)'; sim.syncGas(); }
    toast('🚶 외출 모드 — 전체 소등, 잠금, 가스차단 완료');
  });
}

function roomKr(k) {
  return { living:'거실', kitchen:'주방', master:'안방', rooma:'방 A', roomb:'방 B', bathroom:'욕실' }[k] || k;
}
function curtainKr(k) {
  return { living:'거실 커튼', master:'안방 암막', rooma:'방 A 블라인드', roomb:'방 B 블라인드' }[k] || k;
}

window.addEventListener('DOMContentLoaded', () => {
  sim = new SmartHomeSimulator();
  initUI();
  toast('🏠 스마트홈 3D 시뮬레이터 준비 완료');
});
