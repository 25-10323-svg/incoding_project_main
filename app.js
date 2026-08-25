/* =====================================================================
   스마트홈 3D 시뮬레이터 — app.js
   No Roof, Sky Blue Wind Particles for AC, Roll-up Blinds, Soft Particles
   ===================================================================== */

'use strict';

// ─────────────────────────────────────────────────────────────────────
// 1. APPLICATION STATE
// ─────────────────────────────────────────────────────────────────────
const S = {
  lights: { living: false, kitchen: false, master: false, rooma: false, roomb: false, bathroom: false },
  brightness: 70,
  door: { open: false },
  curtains: { living: false, master: false, rooma: false, roomb: false },
  climate: {
    boiler: false, boilerMode: 'indoor', boilerTarget: 22.0,
    ac: false, acWind: 'low',
    humidifier: false,
    currentTemp: 24.5, targetTemp: 22.0,
    currentHumidity: 52
  },
  gas: { open: false },
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
// 3. THREE.JS ENGINE
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

    this.camera = new THREE.PerspectiveCamera(45, this.W / this.H, 0.5, 3000);
    this.camera.position.set(220, 180, 220);

    this.orbit = new THREE.OrbitControls(this.camera, this.renderer.domElement);
    this.orbit.enableDamping = true;
    this.orbit.dampingFactor = 0.06;
    this.orbit.maxPolarAngle = Math.PI / 2.05;
    this.orbit.minDistance   = 30;
    this.orbit.maxDistance   = 700;
    this.orbit.target.set(0, 15, 0);

    this.ambient = new THREE.AmbientLight(0x1a2040, 1.2);
    this.scene.add(this.ambient);

    this.sun = new THREE.DirectionalLight(0xfff5e0, 0.7);
    this.sun.position.set(120, 200, 80);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(4096, 4096);
    this.sun.shadow.camera.near   = 5;
    this.sun.shadow.camera.far    = 600;
    this.sun.shadow.camera.left   = -250;
    this.sun.shadow.camera.right  = 250;
    this.sun.shadow.camera.top    = 250;
    this.sun.shadow.camera.bottom = -250;
    this.scene.add(this.sun);

    this._buildHouse();
  }

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

  _buildHouse() {
    this._buildFloors();
    this._buildWalls();
    this._buildExteriorDoor();
    this._buildWindows();
    this._buildFurniture();
    this._buildLamps();
    this._buildCurtains();
    this._buildEffects();
    this._buildLabels();
  }

  // ── Floors ────────────────────────────────────────────────────────
  _buildFloors() {
    const defs = [
      [-55,  35, 50, 70,  0x1c1a28], // 방 A
      [-55, -35, 50, 70,  0x1c1a28], // 방 B
      [  0,  35, 60, 70,  0x2a2010], // 거실
      [  0, -35, 60, 70,  0x1e2830], // 주방
      [ 55,  45, 50, 50,  0x1a1a2a], // 안방
      [ 55,   0, 50, 40,  0x182018], // 욕실
      [ 55, -45, 50, 50,  0x15151f], // 현관
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

  // ── Walls with precise door gaps ──────────────────────────────────
  _buildWalls() {
    const H = 32, T = 1.5;
    const wm = this._mat(0x1e2535, 0.7);
    const im = this._mat(0x252d3d, 0.75);

    const wall = (cx, cz, len, horiz, mat = wm) => {
      const w = horiz ? len : T;
      const d = horiz ? T   : len;
      this._box(w, H, d, mat, cx, H / 2, cz);
    };

    // ── Outer ──
    wall(-17.5, -70, 125, true); // North left
    wall( 67.5, -70,  25, true); // North right (Gap at X=45..55 for front door)
    wall(    0,  70, 160, true); // South
    wall(  -80,   0, 140, false);// West
    wall(   80,   0, 140, false);// East

    // ── Vertical Left (X=-30) ──
    wall(-30, -45, 50, false, im); // 방B vs 주방
    // Gap Z=-20 to -10 (방B 입구)
    wall(-30,  -5, 10, false, im); // Z=-10 to 0
    wall(-30,   5, 10, false, im); // Z=0 to 10
    // Gap Z=10 to 20 (방A 입구)
    wall(-30,  45, 50, false, im); // Z=20 to 70

    // ── Vertical Right (X=30) ──
    wall(30, -50, 40, false, im); // 현관 vs 주방
    // Gap Z=-30 to -20 (현관 진입로)
    wall(30, -10, 20, false, im); // Z=-20 to 0
    // Gap Z=0 to 10 (욕실 입구)
    wall(30,  15, 10, false, im); // Z=10 to 20
    // Gap Z=20 to 30 (안방 입구)
    wall(30,  50, 40, false, im); // Z=30 to 70

    // ── Horizontal Left (Z=0) ──
    wall(-55, 0, 50, true, im); // 방A vs 방B

    // ── Horizontal Right (X=30..80) ──
    wall(55, -20, 50, true, im); // 현관 vs 욕실
    wall(55,  20, 50, true, im); // 욕실 vs 안방
  }

  // ── Exterior Door (Front Door) ────────────────────────────────────
  _buildExteriorDoor() {
    const doorMat  = this._mat(0x3b4a5c, 0.4, 0.1);
    const frameMat = this._mat(0x475569, 0.5, 0.2);

    this.doorPivot = new THREE.Group();
    this.doorPivot.position.set(55, 0, -70); // Right hinge of the 45..55 gap
    this.scene.add(this.doorPivot);

    const doorMesh = new THREE.Mesh(new THREE.BoxGeometry(10, 24, 0.8), doorMat);
    doorMesh.castShadow = true;
    doorMesh.position.set(-5, 12, 0); // swing left
    this.doorPivot.add(doorMesh);

    // Frame
    [[-10.5, 12, 0], [0.5, 12, 0], [-5, 25, 0]].forEach(([fx, fy, fz], i) => {
      const fw = i === 2 ? 11 : 0.8;
      const fh = i === 2 ? 1  : 24;
      const fm = new THREE.Mesh(new THREE.BoxGeometry(fw, fh, 1.2), frameMat);
      fm.position.set(55 + fx, fy, -70 + fz);
      this.scene.add(fm);
    });
  }

  // ── Windows ───────────────────────────────────────────────────────
  _buildWindows() {
    const glMat = new THREE.MeshPhysicalMaterial({
      color: 0x7ab8e8, transparent: true, opacity: 0.35, roughness: 0.05, transmission: 0.7
    });
    const frMat = this._mat(0x334155, 0.5, 0.3);

    const win = (x, z, horiz, wide=16, tall=14) => {
      const gw = horiz ? wide : 0.8, gd = horiz ? 0.8 : wide;
      const glass = new THREE.Mesh(new THREE.BoxGeometry(gw, tall, gd), glMat);
      glass.position.set(x, 18, z); this.scene.add(glass);
      const frame = new THREE.Mesh(new THREE.BoxGeometry(gw+1, tall+1, gd+1), frMat);
      frame.position.set(x, 18, z); this.scene.add(frame);
    };

    win(  0,  70, true,  30);  // 거실 South
    win( 55,  70, true,  20);  // 안방 South
    win(-55,  70, true,  20);  // 방A South
    win(-80, -35, false, 16);  // 방B West
    win(-80,  35, false, 16);  // 방A West
    win(  0, -70, true,  24);  // 주방 North
    win(-55, -70, true,  16);  // 방B North
    win( 80,  45, false, 16);  // 안방 East
  }

  // ── Furniture ─────────────────────────────────────────────────────
  _buildFurniture() {
    // 거실 (cx=0, cz=35)
    this._box(32, 4.5, 9,  this._mat(0x1e3a8a, 0.7), 0, 4.5, 60);  // sofa
    this._box(32, 2.0, 8,  this._mat(0x1e3a8a, 0.7), 0, 1.5, 52);  
    this._box(12, 0.4, 6,  this._mat(0x78350f, 0.3), 0, 3.8, 35);  // table
    this._box(28, 3.5, 4,  this._mat(0x1e293b, 0.4), 0, 1.7, 10);  // TV console
    this._box(24, 13, 0.5, this._mat(0x020617, 0.05),0, 9.0, 10.5);// TV
    {
      const r = new THREE.Mesh(new THREE.PlaneGeometry(35, 25), this._mat(0x1d3461, 0.95));
      r.rotation.x = -Math.PI / 2; r.position.set(0, 0.1, 35); this.scene.add(r);
    }
    this._box(16, 2.8, 2.2, this._mat(0xe2e8f0, 0.2), -25, 26, 35); // AC

    // 주방 (cx=0, cz=-35)
    this._box(9,  9,  40, this._mat(0x1e2a3a,0.4), -25, 4.5, -35); // counter
    this._box(9.5,0.5,40, this._mat(0x334155,0.1), -25, 9.3, -35); // top
    this._box(5,  0.4, 6, this._mat(0x1a1a1a,0.1), -24, 9.6, -35); // stove
    this._box(5,  9,   3, this._mat(0xecf0f1,0.2), -20, 18, -68);  // boiler
    this._box(18, 0.8, 9, this._mat(0x92400e,0.4),   0, 7.4, -30); // dining table
    [-4, 4].forEach(x => this._box(4.5,4.5,4.5,this._mat(0x1e293b,0.6), x, 4.5, -23)); 
    this._box(7,  18, 6.5,this._mat(0xe2e8f0,0.1),  20,  9, -65);  // fridge

    // 안방 (cx=55, cz=45)
    this._box(16, 2.8, 21, this._mat(0x1e293b, 0.4), 65, 1.4, 55);  
    this._box(15.5, 2.2,19.5,this._mat(0xf8fafc,0.9),65, 3.9, 55);  
    this._box(22, 22, 5,  this._mat(0x1e293b, 0.4), 45, 11, 22);   // wardrobe

    // 욕실 (cx=55, cz=0)
    this._box(14, 5, 7,   this._mat(0xf0f4f8, 0.2), 70, 2.5, 5);   // tub
    this._box(7, 8.2, 4.5,this._mat(0xe2e8f0, 0.2), 65, 4.1, -15); // vanity

    // 방 A (cx=-55, cz=35)
    this._box(12, 3, 20,  this._mat(0x1e3a8a, 0.7), -70, 1.5, 45); 
    this._box(11.5,2,18.5,this._mat(0xf8fafc,0.9),  -70, 3.5, 45); 
    this._box(14, 0.6, 6, this._mat(0x334155, 0.4), -55, 7.2, 10); 

    // 방 B (cx=-55, cz=-35)
    this._box(12, 3, 20,  this._mat(0x1e3a8a, 0.7), -70, 1.5, -45); 
    this._box(11.5,2,18.5,this._mat(0xf8fafc,0.9),  -70, 3.5, -45); 
    this._box(14, 0.6, 6, this._mat(0x334155, 0.4), -55, 7.2, -10); 

    // 현관 (cx=55, cz=-45)
    this._box(10, 12, 3.5, this._mat(0x1e293b, 0.4), 70, 6, -45); 
  }

  // ── Lamps ─────────────────────────────────────────────────────────
  _buildLamps() {
    const rooms = {
      living:   { x:   0, z:  35, color: 0xffeebb, range: 100 },
      kitchen:  { x:   0, z: -35, color: 0xfff5cc, range:  80 },
      master:   { x:  55, z:  45, color: 0xffe8cc, range:  70 },
      rooma:    { x: -55, z:  35, color: 0xffeebb, range:  80 },
      roomb:    { x: -55, z: -35, color: 0xfff5cc, range:  80 },
      bathroom: { x:  55, z:   0, color: 0xffffff, range:  50 },
    };

    this.bulbMatOn  = new THREE.MeshBasicMaterial({ color: 0xfff8e0 });
    this.bulbMatOff = this._mat(0x1e293b, 0.6);

    Object.entries(rooms).forEach(([key, r]) => {
      const b = new THREE.Mesh(new THREE.SphereGeometry(1.5, 12, 12), this.bulbMatOff);
      b.position.set(r.x, 30.5, r.z); this.scene.add(b);
      const pl = new THREE.PointLight(r.color, 0, r.range, 1.6);
      pl.position.set(r.x, 29, r.z); this.scene.add(pl);
      this.lamps[key] = { light: pl, bulb: b };
    });
  }

  // ── Curtains (All Blinds, Roll Up/Down) ───────────────────────────
  _buildCurtains() {
    const bld = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, side: THREE.DoubleSide });
    
    // Living (Z=70, cx=0)
    const blindL = new THREE.Mesh(new THREE.PlaneGeometry(30, 14), bld);
    blindL.position.set(0, 18, 68.5); this.scene.add(blindL);
    this.curtains3d.living = { type: 'blind', mesh: blindL, baseY: 18 };

    // Master (Z=70, cx=55)
    const blindM = new THREE.Mesh(new THREE.PlaneGeometry(20, 14), bld);
    blindM.position.set(55, 18, 68.5); this.scene.add(blindM);
    this.curtains3d.master = { type: 'blind', mesh: blindM, baseY: 18 };
    
    // Room A (West, X=-80, cz=35)
    const blindA = new THREE.Mesh(new THREE.PlaneGeometry(16, 14), bld);
    blindA.position.set(-78.5, 18, 35); blindA.rotation.y = Math.PI/2; this.scene.add(blindA);
    this.curtains3d.rooma = { type: 'blind', mesh: blindA, baseY: 18 };
    
    // Room B (West, X=-80, cz=-35)
    const blindB = new THREE.Mesh(new THREE.PlaneGeometry(16, 14), bld);
    blindB.position.set(-78.5, 18, -35); blindB.rotation.y = Math.PI/2; this.scene.add(blindB);
    this.curtains3d.roomb = { type: 'blind', mesh: blindB, baseY: 18 };
  }

  // ── Effects ───────────────────────────────────────────────────────
  _createParticleTexture() {
    const canvas = document.createElement('canvas'); canvas.width = 32; canvas.height = 32;
    const ctx = canvas.getContext('2d');
    const grad = ctx.createRadialGradient(16, 16, 0, 16, 16, 16);
    grad.addColorStop(0, 'rgba(255,255,255,1)');
    grad.addColorStop(0.3, 'rgba(255,255,255,0.8)');
    grad.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = grad; ctx.fillRect(0,0,32,32);
    return new THREE.CanvasTexture(canvas);
  }

  _createWindTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');
    
    ctx.strokeStyle = '#38bdf8'; // Sky blue
    ctx.shadowColor = '#0ea5e9';
    ctx.shadowBlur = 10;

    // Top gentle wave
    ctx.lineWidth = 7;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(16, 36);
    ctx.bezierCurveTo(44, 20, 76, 52, 112, 32);
    ctx.stroke();

    // Middle main wind swirl
    ctx.lineWidth = 9;
    ctx.beginPath();
    ctx.moveTo(8, 64);
    ctx.bezierCurveTo(40, 40, 76, 88, 104, 60);
    ctx.bezierCurveTo(116, 48, 120, 36, 100, 40);
    ctx.stroke();

    // Bottom breeze wave
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(24, 92);
    ctx.bezierCurveTo(52, 76, 84, 108, 112, 88);
    ctx.stroke();

    return new THREE.CanvasTexture(canvas);
  }

  _buildEffects() {
    const pTex = this._createParticleTexture();
    const wTex = this._createWindTexture();

    // AC Wind Stream (Ultra-minimal count: 18 wind gusts)
    const count = 18;
    let geo = new THREE.BufferGeometry(), pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      pos[i * 3]     = -25 + Math.random() * 45;
      pos[i * 3 + 1] = 25.5 - Math.random() * 10;
      pos[i * 3 + 2] = 35 + (Math.random() - 0.5) * 20;
    }
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    this.acParticles = new THREE.Points(geo, new THREE.PointsMaterial({
      map: wTex,
      color: 0x38bdf8,
      size: 10.5,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    }));
    this.scene.add(this.acParticles);

    // Mist stream (Humidifier)
    geo = new THREE.BufferGeometry(); pos = new Float32Array(300 * 3);
    for (let i=0; i<300; i++) { pos[i*3] = (Math.random()-0.5)*3; pos[i*3+1] = 4+Math.random()*8; pos[i*3+2] = 35+(Math.random()-0.5)*3; }
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    this.mistParticles = new THREE.Points(geo, new THREE.PointsMaterial({ map: pTex, color: 0xe0f2fe, size: 2.2, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false }));
    this.scene.add(this.mistParticles);

    // Stove flame
    this.flameMesh = new THREE.Mesh(new THREE.ConeGeometry(0.6, 1.8, 8), new THREE.MeshBasicMaterial({ color: 0x1d88fe, transparent: true, opacity: 0 }));
    this.flameMesh.position.set(-24, 10.6, -35); this.scene.add(this.flameMesh);

    // Ondol
    const om = new THREE.MeshBasicMaterial({ color: 0xff4000, wireframe: true, transparent: true, opacity: 0 });
    [[-55,35], [-55,-35], [0,35], [0,-35], [55,45]].forEach(([x, z]) => {
      const p = new THREE.Mesh(new THREE.PlaneGeometry(35, 35, 8, 8), om.clone());
      p.rotation.x = -Math.PI / 2; p.position.set(x, 0.2, z);
      this.scene.add(p); this.ondolPlanes.push(p);
    });
  }

  // ── Labels ────────────────────────────────────────────────────────
  _buildLabels() {
    this.labelGroup = new THREE.Group();
    [
      ['방 A', -55, 35], ['방 B', -55, -35], ['거실', 0, 35],
      ['주방', 0, -35], ['안방', 55, 45], ['욕실', 55, 0], ['현관', 55, -45]
    ].forEach(([txt, x, z]) => {
      const canvas = document.createElement('canvas'); canvas.width = 256; canvas.height = 72;
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = 'rgba(15,20,40,0.88)'; ctx.beginPath(); ctx.roundRect(6, 6, 244, 60, 12); ctx.fill();
      ctx.strokeStyle = '#3b82f6'; ctx.lineWidth = 3; ctx.stroke();
      ctx.font = 'bold 30px "Noto Sans KR", sans-serif'; ctx.fillStyle = '#f1f5f9'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(txt, 128, 36);
      const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(canvas), transparent: true }));
      sp.position.set(x, 38, z); sp.scale.set(28, 8, 1); this.labelGroup.add(sp);
    });
    this.scene.add(this.labelGroup);
  }

  syncLights() {
    const f = S.brightness / 100;
    Object.keys(S.lights).forEach(key => {
      if (!this.lamps[key]) return;
      this.lamps[key].light.intensity = S.lights[key] ? 5.0 * f : 0;
      this.lamps[key].bulb.material   = S.lights[key] ? this.bulbMatOn : this.bulbMatOff;
    });
  }
  syncLabels() { if (this.labelGroup) this.labelGroup.visible = S.labels; }
  syncGas() { if (this.flameMesh) this.flameMesh.material.opacity = S.gas.open ? 0.85 : 0; }

  _camTo(px, py, pz, lx, ly, lz) {
    const sp = { px: this.camera.position.x, py: this.camera.position.y, pz: this.camera.position.z, lx: this.orbit.target.x, ly: this.orbit.target.y, lz: this.orbit.target.z };
    const tp = { px, py, pz, lx, ly, lz };
    const t0 = performance.now();
    const step = now => {
      const t = Math.min((now - t0) / 900, 1), e = 0.5 - Math.cos(t * Math.PI) / 2;
      this.camera.position.set(sp.px+(tp.px-sp.px)*e, sp.py+(tp.py-sp.py)*e, sp.pz+(tp.pz-sp.pz)*e);
      this.orbit.target.set(sp.lx+(tp.lx-sp.lx)*e, sp.ly+(tp.ly-sp.ly)*e, sp.lz+(tp.lz-sp.lz)*e);
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
      living:   [   0,  70, 130,    0, 15,  35],
      kitchen:  [   0,  70,-130,    0, 15, -35],
      master:   [ 150,  70,  45,   55, 15,  45],
      rooma:    [-150,  70,  35,  -55, 15,  35],
      roomb:    [-150,  70, -35,  -55, 15, -35],
      bathroom: [ 150,  60,   0,   55, 15,   0],
      entrance: [ 150,  55, -45,   55, 15, -45],
    };
    if (V[name]) this._camTo(...V[name]);
  }

  _enterFPS() {
    S.fpsMode = true; this.orbit.enabled = false;
    this.fpsPos.set(0, 16.5, 45); this.fpsYaw = 0; this.fpsPitch = 0;
    this.camera.position.copy(this.fpsPos);
    this.renderer.domElement.requestPointerLock();
    this._onPLChange = () => { if (document.pointerLockElement !== this.renderer.domElement) this._exitFPS(); };
    this._onFPSMouseMove = e => {
      if (!S.fpsMode) return;
      this.fpsYaw -= e.movementX * 0.002; this.fpsPitch = Math.max(-0.85, Math.min(0.85, this.fpsPitch - e.movementY * 0.002));
    };
    document.addEventListener('pointerlockchange', this._onPLChange); document.addEventListener('mousemove', this._onFPSMouseMove);
    qs('#fps-dpad').classList.remove('hidden'); qs('#btn-view-fps').classList.add('active');
    toast('🚶 1인칭 모드 — WASD/방향키 이동 | 마우스 시선');
  }

  _exitFPS() {
    if (!S.fpsMode) return;
    S.fpsMode = false; this.orbit.enabled = true; document.exitPointerLock();
    if (this._onPLChange) document.removeEventListener('pointerlockchange', this._onPLChange);
    if (this._onFPSMouseMove) document.removeEventListener('mousemove', this._onFPSMouseMove);
    qs('#fps-dpad').classList.add('hidden'); qs('#btn-view-fps').classList.remove('active');
  }

  _updateFPS(dt) {
    if (!S.fpsMode) return;
    const fwd = new THREE.Vector3(-Math.sin(this.fpsYaw), 0, -Math.cos(this.fpsYaw)), rgt = new THREE.Vector3( Math.cos(this.fpsYaw), 0, -Math.sin(this.fpsYaw)), dir = new THREE.Vector3();
    if (this.keys['w'] || this.keys['arrowup'])    dir.addScaledVector(fwd,  1);
    if (this.keys['s'] || this.keys['arrowdown'])  dir.addScaledVector(fwd, -1);
    if (this.keys['a'] || this.keys['arrowleft'])  dir.addScaledVector(rgt, -1);
    if (this.keys['d'] || this.keys['arrowright']) dir.addScaledVector(rgt,  1);
    if (dir.lengthSq() > 0) dir.normalize();
    this.fpsPos.addScaledVector(dir, 45 * dt);
    this.fpsPos.x = Math.max(-75, Math.min(75, this.fpsPos.x)); this.fpsPos.z = Math.max(-68, Math.min(68, this.fpsPos.z));
    this.camera.position.copy(this.fpsPos);
    this.camera.lookAt(new THREE.Vector3(this.fpsPos.x - Math.sin(this.fpsYaw)*Math.cos(this.fpsPitch), 16.5 + Math.sin(this.fpsPitch), this.fpsPos.z - Math.cos(this.fpsYaw)*Math.cos(this.fpsPitch)));
  }

  _bindKeys() {
    window.addEventListener('keydown', e => { this.keys[e.key.toLowerCase()] = true; if (e.key === 'Escape' && S.fpsMode) this._exitFPS(); });
    window.addEventListener('keyup', e => { this.keys[e.key.toLowerCase()] = false; });
    [['dpad-up','w'],['dpad-down','s'],['dpad-left','a'],['dpad-right','d']].forEach(([id, k]) => {
      const b = qs(`#${id}`); if (!b) return;
      const on = () => { this.keys[k] = true; b.classList.add('pressed'); }, off = () => { this.keys[k] = false; b.classList.remove('pressed'); };
      b.addEventListener('mousedown', on); b.addEventListener('touchstart', e => { e.preventDefault(); on(); }, { passive: false });
      b.addEventListener('mouseup', off); b.addEventListener('mouseleave', off); b.addEventListener('touchend', off);
    });
  }

  _bindResize() {
    window.addEventListener('resize', () => {
      const vp = qs('#viewport'); this.W = vp.clientWidth; this.H = vp.clientHeight;
      this.camera.aspect = this.W / this.H; this.camera.updateProjectionMatrix(); this.renderer.setSize(this.W, this.H);
    });
  }

  _loop() {
    requestAnimationFrame(() => this._loop());
    const dt = this.clock3.getDelta(), t = performance.now() * 0.001;
    this._updateFPS(dt);
    if (!S.fpsMode) this.orbit.update();

    if (this.doorPivot) {
      const tgt = S.door.open ? -Math.PI / 2.05 : 0;
      this.doorPivot.rotation.y += (tgt - this.doorPivot.rotation.y) * 0.1;
    }

    Object.keys(S.curtains).forEach(key => {
      const c = this.curtains3d[key], open = S.curtains[key];
      if (!c) return;
      if (c.type === 'blind') {
        const tSY = open ? 0.04 : 1.0;
        c.mesh.scale.y += (tSY - c.mesh.scale.y) * 0.1; 
        c.mesh.position.y = c.baseY + 7 * (1 - c.mesh.scale.y); // Rolls up to the top fixed point
      }
    });

    this.ondolPlanes.forEach(p => { p.material.opacity += ((S.climate.boiler ? (0.28 + 0.18 * Math.sin(t * 4)) : 0) - p.material.opacity) * 0.08; });

    if (this.acParticles) {
      this.acParticles.material.opacity += ((S.climate.ac ? 0.9 : 0) - this.acParticles.material.opacity) * 0.08;
      if (S.climate.ac || this.acParticles.material.opacity > 0.01) {
        const pos = this.acParticles.geometry.attributes.position.array;
        const spd = S.climate.acWind === 'high' ? 0.55 : (S.climate.acWind === 'med' ? 0.35 : 0.20);
        for (let i = 0; i < pos.length; i += 3) {
          pos[i] += spd;
          pos[i+1] -= 0.02 + Math.sin(t * 4 + i) * 0.015;
          pos[i+2] += Math.sin(t * 3 + i) * 0.03;
          if (pos[i] > 20 || pos[i+1] < 12) {
            pos[i]   = -25 + (Math.random() - 0.5) * 3;
            pos[i+1] = 25.5 - Math.random() * 3;
            pos[i+2] = 35 + (Math.random() - 0.5) * 16;
          }
        }
        this.acParticles.geometry.attributes.position.needsUpdate = true;
      }
    }

    if (this.mistParticles) {
      this.mistParticles.material.opacity += ((S.climate.humidifier ? 0.65 : 0) - this.mistParticles.material.opacity) * 0.08;
      if (S.climate.humidifier || this.mistParticles.material.opacity > 0.01) {
        const pos = this.mistParticles.geometry.attributes.position.array;
        for (let i = 0; i < pos.length; i += 3) {
          pos[i+1] += 0.08; pos[i] += Math.sin(t * 5 + i) * 0.01;
          if (pos[i+1] > 15) { pos[i] = (Math.random()-0.5)*3; pos[i+1] = 4; pos[i+2] = 35+(Math.random()-0.5)*3; }
        }
        this.mistParticles.geometry.attributes.position.needsUpdate = true;
      }
    }

    if (this.flameMesh && S.gas.open) { const sc = 1 + 0.2 * Math.sin(t * 18); this.flameMesh.scale.set(sc, 1 + 0.3 * Math.cos(t * 14), sc); }

    this._simClimate();
    this.renderer.render(this.scene, this.camera);
  }

  _simClimate() {
    const c = S.climate;
    if (c.boiler) c.currentTemp = Math.min(c.boilerTarget, c.currentTemp + 0.004);
    if (c.ac) c.currentTemp = Math.max(c.targetTemp, c.currentTemp - (c.acWind === 'high' ? 0.012 : (c.acWind === 'med' ? 0.007 : 0.004)));
    if (!c.boiler && !c.ac) c.currentTemp += (24.5 - c.currentTemp) * 0.0005;
    if (c.humidifier) c.currentHumidity = Math.min(75, c.currentHumidity + 0.02); else c.currentHumidity += (50 - c.currentHumidity) * 0.0002;
    qs('#hud-temp').textContent = `🌡 ${c.currentTemp.toFixed(1)}°C`; qs('#hud-humidity').textContent = `💧 ${Math.round(c.currentHumidity)}%`; qs('#temp-current').textContent = `${c.currentTemp.toFixed(1)}°C`;
  }
}

// ─────────────────────────────────────────────────────────────────────
// 4. UI CONTROLLER
// ─────────────────────────────────────────────────────────────────────
let sim = null;
function initUI() {
  qsa('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const tab = btn.dataset.tab; qsa('.tab-btn').forEach(b => b.classList.remove('active')); qsa('.tab-content').forEach(c => c.classList.remove('active'));
      btn.classList.add('active'); qs(`#tab-${tab}`).classList.add('active');
    });
  });

  qs('#btn-toggle-panel').addEventListener('click', () => {
    S.panelOpen = !S.panelOpen; qs('#control-panel').classList.toggle('hidden', !S.panelOpen); qs('#viewport').classList.toggle('panel-hidden', !S.panelOpen); qs('#btn-toggle-panel').classList.toggle('active', S.panelOpen);
    if (sim) setTimeout(() => { sim.W = qs('#viewport').clientWidth; sim.H = qs('#viewport').clientHeight; sim.camera.aspect = sim.W / sim.H; sim.camera.updateProjectionMatrix(); sim.renderer.setSize(sim.W, sim.H); }, 370);
  });

  const setActiveCam = id => { qsa('#cam-toolbar .cam-btn').forEach(b => b.classList.remove('active')); qs(`#${id}`)?.classList.add('active'); };
  ['iso','top','living','kitchen','master','rooma','roomb','bath','entrance'].forEach(k => {
    const id = k === 'iso' || k === 'top' || k === 'fps' ? `btn-view-${k}` : `btn-room-${k}`;
    qs(`#${id}`)?.addEventListener('click', () => { if(sim) sim.setView(k === 'bath' ? 'bathroom' : k); setActiveCam(id); });
  });
  qs('#btn-view-fps').addEventListener('click', () => { if (S.fpsMode) { sim._exitFPS(); setActiveCam('btn-view-iso'); sim.setView('iso'); } else { sim._enterFPS(); setActiveCam('btn-view-fps'); } });

  qs('#btn-labels-toggle').addEventListener('click', () => { S.labels = !S.labels; sim.syncLabels(); toast(S.labels ? '🏷 방 이름 ON' : '🏷 이름 OFF'); });

  qs('#brightness-slider').addEventListener('input', e => { S.brightness = parseInt(e.target.value); qs('#brightness-val').textContent = `${S.brightness}%`; sim.syncLights(); });
  qs('#btn-all-off').addEventListener('click', () => { Object.keys(S.lights).forEach(k => S.lights[k] = false); refreshLightUI(); sim.syncLights(); toast('전체 조명 소등'); });
  qsa('[data-light]').forEach(btn => { btn.addEventListener('click', () => { const room = btn.dataset.light; S.lights[room] = !S.lights[room]; refreshLightUI(); sim.syncLights(); toast(`${roomKr(room)} 조명 ${S.lights[room] ? 'ON' : 'OFF'}`); }); });
  function refreshLightUI() { qsa('[data-light]').forEach(btn => { const on = S.lights[btn.dataset.light]; btn.classList.toggle('on', on); btn.textContent = on ? '켜짐 💡' : '꺼짐'; btn.closest('.room-light-card')?.classList.toggle('lit', on); }); }

  function refreshDoorUI() {
    const box = qs('#door-status-box'), icon = qs('#door-icon'), text = qs('#door-text'), hud = qs('#hud-door-status');
    if (S.door.open) { icon.textContent = '🚪'; text.textContent = '문 열림'; box.classList.add('open'); if (hud) hud.textContent = '🚪 현관 열림'; }
    else { icon.textContent = '🚪'; text.textContent = '닫힘'; box.classList.remove('open'); if (hud) hud.textContent = '🚪 현관 닫힘'; }
  }
  qs('#btn-door-open')?.addEventListener('click', () => { S.door.open = true; refreshDoorUI(); toast('🚪 현관문 열림'); });
  qs('#btn-door-close')?.addEventListener('click', () => { S.door.open = false; refreshDoorUI(); toast('🚪 현관문 닫힘'); });

  function refreshCurtainUI() { qsa('[data-curtain]').forEach(btn => { const open = S.curtains[btn.dataset.curtain]; btn.classList.toggle('on-blue', open); btn.textContent = open ? '열림 ↕' : '닫힘'; }); }
  qs('#btn-curtain-all-open').addEventListener('click', () => { Object.keys(S.curtains).forEach(k => S.curtains[k] = true); refreshCurtainUI(); toast('🪟 전체 커튼 열기'); });
  qs('#btn-curtain-all-close').addEventListener('click', () => { Object.keys(S.curtains).forEach(k => S.curtains[k] = false); refreshCurtainUI(); toast('🪟 전체 커튼 닫기'); });
  qsa('[data-curtain]').forEach(btn => { btn.addEventListener('click', () => { const r = btn.dataset.curtain; S.curtains[r] = !S.curtains[r]; refreshCurtainUI(); toast(`${curtainKr(r)} ${S.curtains[r] ? '열림' : '닫힘'}`); }); });

  qs('#btn-temp-minus').addEventListener('click', () => { S.climate.targetTemp = Math.max(16, S.climate.targetTemp - 0.5); qs('#temp-target').textContent = `${S.climate.targetTemp.toFixed(1)}°C`; });
  qs('#btn-temp-plus').addEventListener('click', () => { S.climate.targetTemp = Math.min(32, S.climate.targetTemp + 0.5); qs('#temp-target').textContent = `${S.climate.targetTemp.toFixed(1)}°C`; });
  qs('#btn-boiler').addEventListener('click', () => { S.climate.boiler = !S.climate.boiler; const btn = qs('#btn-boiler'); btn.classList.toggle('on', S.climate.boiler); btn.textContent = S.climate.boiler ? '켜짐 🔥' : '꺼짐'; qs('#badge-boiler').textContent = S.climate.boiler ? 'ON' : 'OFF'; qs('#badge-boiler').className = `badge ${S.climate.boiler ? 'on' : 'off'}`; qs('#boiler-extra').classList.toggle('hidden', !S.climate.boiler); toast(`보일러 ${S.climate.boiler ? 'ON 🔥' : 'OFF'}`); });
  qsa('[data-boiler-mode]').forEach(btn => { btn.addEventListener('click', () => { S.climate.boilerMode = btn.dataset.boilerMode; qsa('[data-boiler-mode]').forEach(b => b.classList.remove('active')); btn.classList.add('active'); }); });
  qs('#btn-boiler-minus').addEventListener('click', () => { S.climate.boilerTarget = Math.max(18, S.climate.boilerTarget - 0.5); qs('#boiler-target').textContent = `${S.climate.boilerTarget.toFixed(1)}°C`; });
  qs('#btn-boiler-plus').addEventListener('click', () => { S.climate.boilerTarget = Math.min(32, S.climate.boilerTarget + 0.5); qs('#boiler-target').textContent = `${S.climate.boilerTarget.toFixed(1)}°C`; });
  qs('#btn-ac').addEventListener('click', () => { S.climate.ac = !S.climate.ac; const btn = qs('#btn-ac'); btn.classList.toggle('on-blue', S.climate.ac); btn.textContent = S.climate.ac ? '켜짐 ❄' : '꺼짐'; qs('#badge-ac').textContent = S.climate.ac ? 'ON' : 'OFF'; qs('#badge-ac').className = `badge ${S.climate.ac ? 'on-blue' : 'off'}`; qs('#ac-extra').classList.toggle('hidden', !S.climate.ac); toast(`에어컨 ${S.climate.ac ? 'ON' : 'OFF'}`); });
  qsa('[data-wind]').forEach(btn => { btn.addEventListener('click', () => { S.climate.acWind = btn.dataset.wind; qsa('[data-wind]').forEach(b => b.classList.remove('active')); btn.classList.add('active'); }); });
  qs('#btn-humidifier').addEventListener('click', () => { S.climate.humidifier = !S.climate.humidifier; const btn = qs('#btn-humidifier'); btn.classList.toggle('on-blue', S.climate.humidifier); btn.textContent = S.climate.humidifier ? '켜짐 💨' : '꺼짐'; toast(`가습기 ${S.climate.humidifier ? 'ON' : 'OFF'}`); });

  qs('#btn-gas-open').addEventListener('click', () => { S.gas.open = true; qs('#gas-status-text').textContent = '가스 열림 ⚠️ 사용중'; qs('#gas-status-box').classList.add('danger'); sim.syncGas(); toast('🔥 가스 열림', 'err'); });
  qs('#btn-gas-close').addEventListener('click', () => { S.gas.open = false; qs('#gas-status-text').textContent = '가스 잠김 (안전)'; qs('#gas-status-box').classList.remove('danger'); sim.syncGas(); toast('🔒 가스 안전 잠금'); });

  qs('#btn-away').addEventListener('click', () => { Object.keys(S.lights).forEach(k => S.lights[k] = false); refreshLightUI(); sim.syncLights(); S.door.open = false; refreshDoorUI(); Object.keys(S.curtains).forEach(k => S.curtains[k] = false); refreshCurtainUI(); if (S.gas.open) { S.gas.open = false; qs('#gas-status-box').classList.remove('danger'); qs('#gas-status-text').textContent = '가스 잠김'; sim.syncGas(); } toast('🚶 외출 모드 완료'); });
}

function roomKr(k) { return { living:'거실', kitchen:'주방', master:'안방', rooma:'방 A', roomb:'방 B', bathroom:'욕실' }[k] || k; }
function curtainKr(k) { return { living:'거실 커튼', master:'안방 암막', rooma:'방 A 블라인드', roomb:'방 B 블라인드' }[k] || k; }

window.addEventListener('DOMContentLoaded', () => { sim = new SmartHomeSimulator(); initUI(); toast('🏠 스마트홈 준비 완료'); });
