// FloorMeshFactory for SmartDine 3D Floor Planner
// High-performance procedural Three.js mesh & material factory with beveled edges and PBR finishes

import * as THREE from 'three';
import { FloorPlanItem } from '../floorplan/types';

// ==========================================
// SHARED PBR ARCHITECTURAL MATERIALS
// ==========================================

export const MATERIALS = {
  // Woods
  walnutWood: new THREE.MeshStandardMaterial({
    color: '#3d2516', // Rich deep American Walnut
    roughness: 0.42,
    metalness: 0.02
  }),
  americanWalnut: new THREE.MeshStandardMaterial({
    color: '#3d2516',
    roughness: 0.42,
    metalness: 0.02
  }),
  lightOakWood: new THREE.MeshStandardMaterial({
    color: '#b89368', // Natural European White Oak
    roughness: 0.48,
    metalness: 0.02
  }),

  // Architectural Metals
  matteBlackSteel: new THREE.MeshStandardMaterial({
    color: '#18181b', // Architectural Anodized Matte Black Steel
    roughness: 0.36,
    metalness: 0.88
  }),
  tableLegsBlack: new THREE.MeshStandardMaterial({
    color: '#18181b',
    roughness: 0.36,
    metalness: 0.88
  }),
  brushedBrass: new THREE.MeshStandardMaterial({
    color: '#d4af37', // Polished Warm Brass
    roughness: 0.22,
    metalness: 0.95
  }),
  brassAccent: new THREE.MeshStandardMaterial({
    color: '#d4af37',
    roughness: 0.22,
    metalness: 0.95
  }),
  chromePolished: new THREE.MeshStandardMaterial({
    color: '#e2e8f0',
    roughness: 0.1,
    metalness: 0.98
  }),

  // Stone & Countertops with Subtle Specular Reflections
  carraraMarble: new THREE.MeshPhysicalMaterial({
    color: '#f8fafc', // Carrara White Polished Marble
    roughness: 0.12,
    metalness: 0.05,
    clearcoat: 0.85,
    clearcoatRoughness: 0.12,
    reflectivity: 0.75
  }),
  darkConcrete: new THREE.MeshStandardMaterial({
    color: '#3f3f46', // Honed Dark Concrete
    roughness: 0.85,
    metalness: 0.05
  }),
  graniteBlack: new THREE.MeshStandardMaterial({
    color: '#27272a', // Honed Nero Marquina
    roughness: 0.28,
    metalness: 0.15
  }),

  // Stainless Commercial Kitchen Metals
  stainlessSteel: new THREE.MeshStandardMaterial({
    color: '#d1d5db',
    roughness: 0.25,
    metalness: 0.9
  }),
  darkStainless: new THREE.MeshStandardMaterial({
    color: '#4b5563',
    roughness: 0.35,
    metalness: 0.85
  }),

  // Upholstery & Luxury Leathers
  oliveGreenLeather: new THREE.MeshStandardMaterial({
    color: '#2e4521', // Deep Olive Green Vintage Leather
    roughness: 0.62,
    metalness: 0.04
  }),
  charcoalLeather: new THREE.MeshStandardMaterial({
    color: '#262626',
    roughness: 0.75,
    metalness: 0.04
  }),
  warmFabric: new THREE.MeshStandardMaterial({
    color: '#9a3412', // Warm Terracotta Textured Velvet
    roughness: 0.88,
    metalness: 0.01
  }),
  warmTerracotta: new THREE.MeshStandardMaterial({
    color: '#9a3412',
    roughness: 0.88,
    metalness: 0.01
  }),
  creamFabric: new THREE.MeshStandardMaterial({
    color: '#f5f5f4', // Oatmeal Linen
    roughness: 0.85,
    metalness: 0.02
  }),

  // Architectural Tinted Glass with Realistic Transparency & Refraction
  architecturalGlass: new THREE.MeshPhysicalMaterial({
    color: '#e2f1fd',
    transparent: true,
    opacity: 0.45,
    roughness: 0.05,
    transmission: 0.88,
    ior: 1.52,
    thickness: 0.04
  }),
  tintedGlass: new THREE.MeshPhysicalMaterial({
    color: '#cbd5e1',
    transparent: true,
    opacity: 0.42,
    roughness: 0.06,
    transmission: 0.86,
    ior: 1.52,
    thickness: 0.04
  }),

  // Foliage & Planters
  deepFoliage: new THREE.MeshStandardMaterial({
    color: '#166534',
    roughness: 0.6,
    metalness: 0.05
  }),
  leafHighlight: new THREE.MeshStandardMaterial({
    color: '#22c55e',
    roughness: 0.55,
    metalness: 0.04
  }),
  terracottaPot: new THREE.MeshStandardMaterial({
    color: '#c2410c',
    roughness: 0.75,
    metalness: 0.02
  }),

  // Glass Materials
  amberGlass: new THREE.MeshPhysicalMaterial({
    color: '#d97706',
    transparent: true,
    opacity: 0.72,
    roughness: 0.1,
    transmission: 0.8,
    ior: 1.5
  }),
  emeraldGlass: new THREE.MeshPhysicalMaterial({
    color: '#059669',
    transparent: true,
    opacity: 0.72,
    roughness: 0.1,
    transmission: 0.8,
    ior: 1.5
  }),

  // Warm Emissive Light Glow
  warmLightGlow: new THREE.MeshBasicMaterial({
    color: '#fef3c7'
  })
};

export function getMaterialByPreference(pref?: string, fallback = MATERIALS.walnutWood): THREE.Material {
  if (!pref) return fallback;
  switch (pref.toLowerCase()) {
    case 'marble':
    case 'carrara_marble':
      return MATERIALS.carraraMarble;
    case 'walnut':
    case 'american_walnut':
      return MATERIALS.americanWalnut;
    case 'black_steel':
    case 'matte_black':
      return MATERIALS.matteBlackSteel;
    case 'olive_leather':
    case 'green_leather':
      return MATERIALS.oliveGreenLeather;
    case 'concrete':
    case 'dark_concrete':
      return MATERIALS.darkConcrete;
    case 'warm_fabric':
    case 'terracotta':
      return MATERIALS.warmFabric;
    case 'brass':
    case 'brushed_brass':
      return MATERIALS.brushedBrass;
    case 'glass':
      return MATERIALS.architecturalGlass;
    default:
      return fallback;
  }
}

// ==========================================
// BEVELED & ROUNDED GEOMETRY BUILDER
// ==========================================

export function createRoundedBoxGeometry(
  width: number,
  height: number,
  depth: number,
  radius = 0.02,
  smoothness = 4
): THREE.BufferGeometry {
  const shape = new THREE.Shape();
  const radiusClamped = Math.max(0.005, Math.min(radius, width / 2 - 0.01, depth / 2 - 0.01));
  const w = width / 2;
  const d = depth / 2;

  shape.moveTo(-w + radiusClamped, -d);
  shape.lineTo(w - radiusClamped, -d);
  shape.quadraticCurveTo(w, -d, w, -d + radiusClamped);
  shape.lineTo(w, d - radiusClamped);
  shape.quadraticCurveTo(w, d, w - radiusClamped, d);
  shape.lineTo(-w + radiusClamped, d);
  shape.quadraticCurveTo(-w, d, -w, d - radiusClamped);
  shape.lineTo(-w, -d + radiusClamped);
  shape.quadraticCurveTo(-w, -d, -w + radiusClamped, -d);

  const extrudeSettings: THREE.ExtrudeGeometryOptions = {
    depth: height,
    bevelEnabled: true,
    bevelSegments: smoothness,
    steps: 1,
    bevelSize: Math.min(0.012, radiusClamped * 0.5),
    bevelThickness: Math.min(0.012, height * 0.3)
  };

  const geo = new THREE.ExtrudeGeometry(shape, extrudeSettings);
  geo.center();
  geo.rotateX(Math.PI / 2); // Orient horizontally on Three.js X-Z plane
  return geo;
}

// ==========================================
// CHAIR & STOOL SUB-ASSEMBLIES
// ==========================================

// Modern dining chair with curved ergonomic backrest and brass-tipped tapered legs
export function createDiningChair(x: number, z: number, rotationY: number): THREE.Group {
  const chair = new THREE.Group();
  chair.position.set(x, 0, z);
  chair.rotation.y = rotationY;

  // Beveled Padded Seat Cushion
  const seatGeo = createRoundedBoxGeometry(0.42, 0.06, 0.42, 0.05);
  const seatMesh = new THREE.Mesh(seatGeo, MATERIALS.charcoalLeather);
  seatMesh.position.set(0, 0.45, 0);
  seatMesh.castShadow = true;
  seatMesh.receiveShadow = true;
  chair.add(seatMesh);

  // Modern Curved Backrest: Segmented arc contour
  const backGroup = new THREE.Group();
  backGroup.position.set(0, 0.72, -0.16);

  // Curved walnut shell (3 curved segments for fluid wrap-around silhouette)
  const centerBackGeo = createRoundedBoxGeometry(0.24, 0.32, 0.03, 0.02);
  const centerBack = new THREE.Mesh(centerBackGeo, MATERIALS.americanWalnut);
  centerBack.castShadow = true;
  backGroup.add(centerBack);

  const wingGeo = createRoundedBoxGeometry(0.12, 0.31, 0.03, 0.02);
  const leftWing = new THREE.Mesh(wingGeo, MATERIALS.americanWalnut);
  leftWing.position.set(-0.16, 0, 0.04);
  leftWing.rotation.y = 0.45;
  leftWing.castShadow = true;
  backGroup.add(leftWing);

  const rightWing = new THREE.Mesh(wingGeo, MATERIALS.americanWalnut);
  rightWing.position.set(0.16, 0, 0.04);
  rightWing.rotation.y = -0.45;
  rightWing.castShadow = true;
  backGroup.add(rightWing);

  // Inner backrest upholstered pad
  const innerPadGeo = createRoundedBoxGeometry(0.26, 0.26, 0.02, 0.02);
  const innerPad = new THREE.Mesh(innerPadGeo, MATERIALS.charcoalLeather);
  innerPad.position.set(0, 0, 0.015);
  backGroup.add(innerPad);

  chair.add(backGroup);

  // 4 Tapered Matte Black Metal Legs with Brass Ferrules & gentle splay
  const legGeo = new THREE.CylinderGeometry(0.014, 0.01, 0.44, 12);
  const ferruleGeo = new THREE.CylinderGeometry(0.011, 0.01, 0.05, 12);

  const legPositions = [
    [-0.17, 0.22, -0.17, 0.08, -0.08],
    [0.17, 0.22, -0.17, 0.08, 0.08],
    [-0.17, 0.22, 0.17, -0.08, -0.08],
    [0.17, 0.22, 0.17, -0.08, 0.08]
  ];

  legPositions.forEach(([lx, ly, lz, rx, rz]) => {
    const legSub = new THREE.Group();
    legSub.position.set(lx, ly, lz);
    legSub.rotation.x = rx;
    legSub.rotation.z = rz;

    const leg = new THREE.Mesh(legGeo, MATERIALS.matteBlackSteel);
    leg.castShadow = true;
    legSub.add(leg);

    const ferrule = new THREE.Mesh(ferruleGeo, MATERIALS.brushedBrass);
    ferrule.position.set(0, -0.19, 0);
    legSub.add(ferrule);

    chair.add(legSub);
  });

  return chair;
}

// Swivel bar stool with circular brass footrest
export function createBarStool(x: number, z: number, rotationY = 0): THREE.Group {
  const stool = new THREE.Group();
  stool.position.set(x, 0, z);
  stool.rotation.y = rotationY;

  // Rounded Swivel Cushion
  const cushionGeo = new THREE.CylinderGeometry(0.19, 0.19, 0.09, 24);
  const cushion = new THREE.Mesh(cushionGeo, MATERIALS.oliveGreenLeather);
  cushion.position.set(0, 0.75, 0);
  cushion.castShadow = true;
  stool.add(cushion);

  // Center Stem
  const stemGeo = new THREE.CylinderGeometry(0.025, 0.025, 0.7, 16);
  const stem = new THREE.Mesh(stemGeo, MATERIALS.matteBlackSteel);
  stem.position.set(0, 0.38, 0);
  stem.castShadow = true;
  stool.add(stem);

  // Circular Footrest Ring
  const ringGeo = new THREE.TorusGeometry(0.16, 0.012, 12, 24);
  const ring = new THREE.Mesh(ringGeo, MATERIALS.brushedBrass);
  ring.rotation.x = Math.PI / 2;
  ring.position.set(0, 0.28, 0);
  stool.add(ring);

  // Heavy Base Disc with Polished Chamfer
  const baseGeo = new THREE.CylinderGeometry(0.22, 0.22, 0.03, 24);
  const base = new THREE.Mesh(baseGeo, MATERIALS.matteBlackSteel);
  base.position.set(0, 0.02, 0);
  base.castShadow = true;
  stool.add(base);

  return stool;
}

// Suspended hanging pendant light fixture
export function createPendantLight(x: number, y: number, z: number): THREE.Group {
  const pendant = new THREE.Group();
  pendant.position.set(x, y, z);

  // Ceiling Rose
  const roseGeo = new THREE.CylinderGeometry(0.06, 0.06, 0.02, 16);
  const rose = new THREE.Mesh(roseGeo, MATERIALS.matteBlackSteel);
  rose.position.set(0, 0.8, 0);
  pendant.add(rose);

  // Slender Cable
  const wireGeo = new THREE.CylinderGeometry(0.003, 0.003, 0.8, 8);
  const wire = new THREE.Mesh(wireGeo, MATERIALS.matteBlackSteel);
  wire.position.set(0, 0.4, 0);
  pendant.add(wire);

  // Conical / Dome Brushed Brass Shade
  const shadeGeo = new THREE.ConeGeometry(0.16, 0.16, 24, 1, true);
  const shade = new THREE.Mesh(shadeGeo, MATERIALS.brushedBrass);
  shade.rotation.x = Math.PI;
  shade.position.set(0, 0.08, 0);
  pendant.add(shade);

  // Emissive warm filament light bulb
  const bulbGeo = new THREE.SphereGeometry(0.04, 16, 16);
  const bulb = new THREE.Mesh(bulbGeo, MATERIALS.warmLightGlow);
  bulb.position.set(0, 0.04, 0);
  pendant.add(bulb);

  return pendant;
}

// ==========================================
// BOOTH & BANQUETTE SEATING
// ==========================================

// Booth seating with olive green leather fluted cushions and walnut plinth
export function createBoothMesh(widthM: number, lengthM: number, isDouble = false): THREE.Group {
  const group = new THREE.Group();
  const boothH = 1.05;

  const createSingleBanquette = (zOffset: number, rotY: number) => {
    const banq = new THREE.Group();
    banq.position.set(0, 0, zOffset);
    banq.rotation.y = rotY;

    // 1. Walnut Base Plinth with Brass Kickplate
    const plinthGeo = createRoundedBoxGeometry(widthM, 0.22, 0.52, 0.03);
    const plinth = new THREE.Mesh(plinthGeo, MATERIALS.americanWalnut);
    plinth.position.set(0, 0.11, 0);
    plinth.castShadow = true;
    banq.add(plinth);

    const kickGeo = new THREE.BoxGeometry(widthM * 0.96, 0.04, 0.53);
    const kick = new THREE.Mesh(kickGeo, MATERIALS.brushedBrass);
    kick.position.set(0, 0.02, 0);
    banq.add(kick);

    // 2. Thick Padded Seat Cushion in Olive Green Leather
    const seatGeo = createRoundedBoxGeometry(widthM * 0.96, 0.18, 0.48, 0.04);
    const seat = new THREE.Mesh(seatGeo, MATERIALS.oliveGreenLeather);
    seat.position.set(0, 0.31, 0.02);
    seat.castShadow = true;
    seat.receiveShadow = true;
    banq.add(seat);

    // 3. High Backrest with Vertical Fluted Cushions
    const backH = boothH - 0.4;
    const backGeo = createRoundedBoxGeometry(widthM * 0.98, backH, 0.16, 0.04);
    const back = new THREE.Mesh(backGeo, MATERIALS.oliveGreenLeather);
    back.position.set(0, 0.4 + backH / 2, -0.2);
    back.castShadow = true;
    banq.add(back);

    // Fluted vertical ribs across backrest
    const ribCount = Math.max(3, Math.floor(widthM / 0.18));
    const ribStep = (widthM * 0.88) / ribCount;
    for (let i = 0; i <= ribCount; i++) {
      const rx = -widthM * 0.44 + i * ribStep;
      const ribGeo = new THREE.CylinderGeometry(0.012, 0.012, backH * 0.85, 12);
      const rib = new THREE.Mesh(ribGeo, MATERIALS.oliveGreenLeather);
      rib.position.set(rx, 0.4 + backH / 2, -0.11);
      banq.add(rib);
    }

    // Walnut wood cap trim across top
    const capGeo = createRoundedBoxGeometry(widthM, 0.03, 0.18, 0.01);
    const cap = new THREE.Mesh(capGeo, MATERIALS.americanWalnut);
    cap.position.set(0, boothH + 0.015, -0.2);
    banq.add(cap);

    return banq;
  };

  // Top banquette
  group.add(createSingleBanquette(-lengthM * 0.5 - 0.28, 0));

  // If double or facing booth
  if (isDouble) {
    group.add(createSingleBanquette(lengthM * 0.5 + 0.28, Math.PI));
  }

  return group;
}

// L-shaped sofa lounge with corner wrap and plush olive green cushions
export function createLBoothMesh(widthM: number, lengthM: number): THREE.Group {
  const group = new THREE.Group();

  // Walnut Base Plinth
  const mainBase = new THREE.Mesh(
    createRoundedBoxGeometry(widthM, 0.18, 0.6, 0.03),
    MATERIALS.americanWalnut
  );
  mainBase.position.set(0, 0.09, -lengthM * 0.3);
  mainBase.castShadow = true;
  group.add(mainBase);

  const wingBase = new THREE.Mesh(
    createRoundedBoxGeometry(0.6, 0.18, lengthM * 0.7, 0.03),
    MATERIALS.americanWalnut
  );
  wingBase.position.set(widthM * 0.35, 0.09, lengthM * 0.05);
  wingBase.castShadow = true;
  group.add(wingBase);

  // Seat Cushions in Olive Green Leather
  const mainSeat = new THREE.Mesh(
    createRoundedBoxGeometry(widthM * 0.95, 0.22, 0.55, 0.04),
    MATERIALS.oliveGreenLeather
  );
  mainSeat.position.set(0, 0.29, -lengthM * 0.3);
  mainSeat.castShadow = true;
  group.add(mainSeat);

  const wingSeat = new THREE.Mesh(
    createRoundedBoxGeometry(0.55, 0.22, lengthM * 0.65, 0.04),
    MATERIALS.oliveGreenLeather
  );
  wingSeat.position.set(widthM * 0.35, 0.29, lengthM * 0.05);
  wingSeat.castShadow = true;
  group.add(wingSeat);

  // Backrests with Pillows
  const mainBack = new THREE.Mesh(
    createRoundedBoxGeometry(widthM * 0.98, 0.48, 0.18, 0.04),
    MATERIALS.oliveGreenLeather
  );
  mainBack.position.set(0, 0.6, -lengthM * 0.5);
  mainBack.castShadow = true;
  group.add(mainBack);

  const wingBack = new THREE.Mesh(
    createRoundedBoxGeometry(0.18, 0.48, lengthM * 0.8, 0.04),
    MATERIALS.oliveGreenLeather
  );
  wingBack.position.set(widthM * 0.5 - 0.09, 0.6, 0);
  wingBack.castShadow = true;
  group.add(wingBack);

  return group;
}

// ==========================================
// PROCEDURAL TABLE BUILDER
// ==========================================

export function createTableMesh(item: FloorPlanItem, widthM: number, lengthM: number): THREE.Group {
  const group = new THREE.Group();
  const shape = item.shape || 'rectangle';
  const seatCount = item.seats || 4;

  const tableHeight = shape === 'bar_table' ? 1.05 : 0.75;
  const topThickness = 0.04;
  const isRound = shape === 'circle';
  const isOval = shape === 'oval';
  const isBooth = shape === 'booth';
  const isLBooth = shape === 'l_booth' || shape === 'u_booth' || shape === 'vip_lounge';

  // Material selection based on item attribute
  const tableMaterial = item.material
    ? getMaterialByPreference(item.material, isRound ? MATERIALS.carraraMarble : MATERIALS.americanWalnut)
    : (isRound ? MATERIALS.carraraMarble : MATERIALS.americanWalnut);

  // 1. Tabletop with Beveled Edges
  let topMesh: THREE.Mesh;
  if (isRound) {
    const topGeo = new THREE.CylinderGeometry(widthM / 2, widthM / 2, topThickness, 48);
    topMesh = new THREE.Mesh(topGeo, tableMaterial);
  } else if (isOval) {
    const topGeo = new THREE.CylinderGeometry(lengthM / 2, lengthM / 2, topThickness, 48);
    topMesh = new THREE.Mesh(topGeo, tableMaterial);
    topMesh.scale.set(widthM / lengthM, 1, 1);
  } else {
    // Beveled Walnut / Marble Tabletop
    const topGeo = createRoundedBoxGeometry(widthM, topThickness, lengthM, 0.03);
    topMesh = new THREE.Mesh(topGeo, tableMaterial);
  }

  topMesh.position.set(0, tableHeight - topThickness / 2, 0);
  topMesh.castShadow = true;
  topMesh.receiveShadow = true;
  group.add(topMesh);

  // 2. Base / Legs
  if (isRound || isOval || shape === 'bar_table') {
    // Pedestal stem + Brass Weighted Base
    const stemGeo = new THREE.CylinderGeometry(0.04, 0.06, tableHeight - topThickness, 24);
    const stemMesh = new THREE.Mesh(stemGeo, MATERIALS.matteBlackSteel);
    stemMesh.position.set(0, (tableHeight - topThickness) / 2, 0);
    stemMesh.castShadow = true;
    group.add(stemMesh);

    const baseR = Math.min(widthM, lengthM) * 0.32;
    const baseGeo = new THREE.CylinderGeometry(baseR, baseR, 0.03, 32);
    const baseMesh = new THREE.Mesh(baseGeo, MATERIALS.brushedBrass);
    baseMesh.position.set(0, 0.02, 0);
    baseMesh.castShadow = true;
    group.add(baseMesh);
  } else {
    // 4 Corner Metal Legs with Brass Ferrules
    const legW = 0.04;
    const legH = tableHeight - topThickness;
    const legGeo = new THREE.BoxGeometry(legW, legH, legW);
    const legPositions = [
      [-widthM * 0.42, legH / 2, -lengthM * 0.42],
      [widthM * 0.42, legH / 2, -lengthM * 0.42],
      [-widthM * 0.42, legH / 2, lengthM * 0.42],
      [widthM * 0.42, legH / 2, lengthM * 0.42]
    ];

    legPositions.forEach(([lx, ly, lz]) => {
      const leg = new THREE.Mesh(legGeo, MATERIALS.matteBlackSteel);
      leg.position.set(lx, ly, lz);
      leg.castShadow = true;
      group.add(leg);

      const brassCapGeo = new THREE.BoxGeometry(legW * 1.05, 0.04, legW * 1.05);
      const brassCap = new THREE.Mesh(brassCapGeo, MATERIALS.brushedBrass);
      brassCap.position.set(lx, 0.02, lz);
      group.add(brassCap);
    });
  }

  // 3. Dynamic Chairs or Banquettes
  if (isBooth) {
    group.add(createBoothMesh(widthM, lengthM, true));
  } else if (isLBooth) {
    group.add(createLBoothMesh(widthM, lengthM));
  } else if (shape === 'bar_table') {
    const stoolDist = Math.max(widthM, lengthM) * 0.5 + 0.25;
    const count = Math.max(2, seatCount);
    for (let i = 0; i < count; i++) {
      const angle = (i * 2 * Math.PI) / count;
      group.add(createBarStool(Math.cos(angle) * stoolDist, Math.sin(angle) * stoolDist));
    }
  } else if (isRound || isOval) {
    const radius = Math.min(widthM, lengthM) * 0.5 + 0.32;
    const count = Math.max(2, seatCount);
    for (let i = 0; i < count; i++) {
      const angle = (i * 2 * Math.PI) / count;
      group.add(createDiningChair(Math.cos(angle) * radius, Math.sin(angle) * radius, -angle - Math.PI / 2));
    }
  } else {
    // Square or Rectangle Tables
    const isSquare = shape === 'square' || shape === 'two_seater';
    if (isSquare && seatCount <= 2) {
      group.add(createDiningChair(0, -lengthM * 0.5 - 0.3, 0));
      group.add(createDiningChair(0, lengthM * 0.5 + 0.3, Math.PI));
    } else if (isSquare) {
      group.add(createDiningChair(0, -lengthM * 0.5 - 0.3, 0));
      group.add(createDiningChair(0, lengthM * 0.5 + 0.3, Math.PI));
      group.add(createDiningChair(-widthM * 0.5 - 0.3, 0, Math.PI / 2));
      group.add(createDiningChair(widthM * 0.5 + 0.3, 0, -Math.PI / 2));
    } else {
      const hasHeads = seatCount >= 8;
      const sideSeats = hasHeads ? seatCount - 2 : seatCount;
      const perSide = Math.max(1, Math.floor(sideSeats / 2));
      const step = (widthM * 0.8) / (perSide + 1);

      for (let i = 1; i <= perSide; i++) {
        const xOffset = -widthM * 0.4 + i * step;
        group.add(createDiningChair(xOffset, -lengthM * 0.5 - 0.32, 0));
        group.add(createDiningChair(xOffset, lengthM * 0.5 + 0.32, Math.PI));
      }

      if (hasHeads) {
        group.add(createDiningChair(-widthM * 0.5 - 0.32, 0, Math.PI / 2));
        group.add(createDiningChair(widthM * 0.5 + 0.32, 0, -Math.PI / 2));
      }
    }
  }

  // 4. Overhead Pendant Light suspended above table
  group.add(createPendantLight(0, tableHeight + 0.9, 0));

  return group;
}

// ==========================================
// PROCEDURAL FIXTURE BUILDERS
// ==========================================

// Premium Bar Counter with Brass Foot Rail, Marble Top, and Stools
export function createBarCounterMesh(widthM: number, lengthM: number): THREE.Group {
  const group = new THREE.Group();

  // 1. Walnut Front Body with Fluting
  const bodyGeo = createRoundedBoxGeometry(widthM, 1.08, lengthM, 0.04);
  const body = new THREE.Mesh(bodyGeo, MATERIALS.americanWalnut);
  body.position.set(0, 0.54, 0);
  body.castShadow = true;
  group.add(body);

  // 2. White Carrara Marble Waterfall Countertop
  const topGeo = createRoundedBoxGeometry(widthM + 0.08, 0.05, lengthM + 0.08, 0.03);
  const top = new THREE.Mesh(topGeo, MATERIALS.carraraMarble);
  top.position.set(0, 1.1, 0);
  top.castShadow = true;
  top.receiveShadow = true;
  group.add(top);

  // 3. Continuous Brushed Brass Foot Rail along front
  const railR = 0.016;
  const railGeo = new THREE.CylinderGeometry(railR, railR, widthM * 0.94, 16);
  const rail = new THREE.Mesh(railGeo, MATERIALS.brushedBrass);
  rail.rotation.z = Math.PI / 2;
  rail.position.set(0, 0.22, lengthM * 0.5 + 0.08);
  rail.castShadow = true;
  group.add(rail);

  // Rail Support Brackets
  const b1 = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.22, 0.08), MATERIALS.brushedBrass);
  b1.position.set(-widthM * 0.4, 0.11, lengthM * 0.5 + 0.04);
  group.add(b1);

  const b2 = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.22, 0.08), MATERIALS.brushedBrass);
  b2.position.set(widthM * 0.4, 0.11, lengthM * 0.5 + 0.04);
  group.add(b2);

  // 4. Bar Stools aligned along the bar
  const stoolCount = Math.max(2, Math.floor(widthM / 0.7));
  const stoolStep = (widthM * 0.8) / (stoolCount + 1);
  for (let i = 1; i <= stoolCount; i++) {
    const sx = -widthM * 0.4 + i * stoolStep;
    group.add(createBarStool(sx, lengthM * 0.5 + 0.45, Math.PI));
  }

  // 5. Glass Liquor Bottles on Back Bar ledge
  const bottleGeo = new THREE.CylinderGeometry(0.035, 0.04, 0.22, 12);
  const neckGeo = new THREE.CylinderGeometry(0.012, 0.014, 0.08, 12);
  const bottleMats = [MATERIALS.amberGlass, MATERIALS.emeraldGlass, MATERIALS.tintedGlass];
  for (let i = 0; i < 4; i++) {
    const bx = -widthM * 0.3 + i * (widthM * 0.2);
    const bMesh = new THREE.Mesh(bottleGeo, bottleMats[i % bottleMats.length]);
    bMesh.position.set(bx, 1.22, -lengthM * 0.25);
    const nMesh = new THREE.Mesh(neckGeo, bottleMats[i % bottleMats.length]);
    nMesh.position.set(bx, 1.35, -lengthM * 0.25);
    group.add(bMesh, nMesh);
  }

  return group;
}

// Commercial Kitchen Pass with Stainless Ticket Gantry & Heat Lamps
export function createKitchenPassMesh(widthM: number, lengthM: number): THREE.Group {
  const group = new THREE.Group();

  // Stainless prep counter body with beveled edges
  const baseGeo = createRoundedBoxGeometry(widthM, 0.88, lengthM, 0.02);
  const base = new THREE.Mesh(baseGeo, MATERIALS.stainlessSteel);
  base.position.set(0, 0.44, 0);
  base.castShadow = true;
  group.add(base);

  // Overhead ticket shelf
  const shelfGeo = createRoundedBoxGeometry(widthM * 0.95, 0.04, lengthM * 0.4, 0.015);
  const shelf = new THREE.Mesh(shelfGeo, MATERIALS.darkStainless);
  shelf.position.set(0, 1.35, 0);
  shelf.castShadow = true;
  group.add(shelf);

  // Gantry Support Posts
  const postGeo = new THREE.CylinderGeometry(0.015, 0.015, 0.4, 12);
  const p1 = new THREE.Mesh(postGeo, MATERIALS.matteBlackSteel);
  p1.position.set(-widthM * 0.4, 1.15, 0);
  group.add(p1);

  const p2 = new THREE.Mesh(postGeo, MATERIALS.matteBlackSteel);
  p2.position.set(widthM * 0.4, 1.15, 0);
  group.add(p2);

  return group;
}

// Commercial Heavy-Duty Range / Stove with Burners & Oven Handle
export function createStoveMesh(widthM: number, lengthM: number): THREE.Group {
  const group = new THREE.Group();

  // Commercial Range body
  const bodyGeo = createRoundedBoxGeometry(widthM, 0.88, lengthM, 0.02);
  const body = new THREE.Mesh(bodyGeo, MATERIALS.stainlessSteel);
  body.position.set(0, 0.44, 0);
  body.castShadow = true;
  group.add(body);

  // Oven Door with Stainless Handle
  const doorGeo = new THREE.BoxGeometry(widthM * 0.84, 0.42, 0.02);
  const door = new THREE.Mesh(doorGeo, MATERIALS.darkStainless);
  door.position.set(0, 0.32, lengthM * 0.5 + 0.01);
  group.add(door);

  const handleGeo = new THREE.BoxGeometry(widthM * 0.6, 0.025, 0.04);
  const handle = new THREE.Mesh(handleGeo, MATERIALS.stainlessSteel);
  handle.position.set(0, 0.48, lengthM * 0.5 + 0.035);
  group.add(handle);

  // Cast iron top grate
  const topGeo = createRoundedBoxGeometry(widthM * 0.92, 0.03, lengthM * 0.92, 0.02);
  const top = new THREE.Mesh(topGeo, MATERIALS.graniteBlack);
  top.position.set(0, 0.9, 0);
  group.add(top);

  // Burner rings with brass pilot cores
  const ringGeo = new THREE.CylinderGeometry(0.09, 0.09, 0.02, 20);
  const coreGeo = new THREE.CylinderGeometry(0.035, 0.035, 0.025, 16);
  const offsets = [
    [-widthM * 0.22, -lengthM * 0.22],
    [widthM * 0.22, -lengthM * 0.22],
    [-widthM * 0.22, lengthM * 0.22],
    [widthM * 0.22, lengthM * 0.22]
  ];

  offsets.forEach(([ox, oz]) => {
    const ring = new THREE.Mesh(ringGeo, MATERIALS.graniteBlack);
    ring.position.set(ox, 0.92, oz);
    const core = new THREE.Mesh(coreGeo, MATERIALS.brushedBrass);
    core.position.set(ox, 0.925, oz);
    group.add(ring, core);
  });

  // Front Control Dials
  for (let i = 0; i < 4; i++) {
    const dial = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.02, 12), MATERIALS.matteBlackSteel);
    dial.rotation.x = Math.PI / 2;
    dial.position.set(-widthM * 0.3 + i * (widthM * 0.2), 0.76, lengthM * 0.5 + 0.015);
    group.add(dial);
  }

  return group;
}

// Commercial Deep Fryer with Twin Fry Baskets
export function createFryerMesh(widthM: number, lengthM: number): THREE.Group {
  const group = new THREE.Group();

  // Stainless fryer cabinet
  const bodyGeo = createRoundedBoxGeometry(widthM, 0.88, lengthM, 0.02);
  const body = new THREE.Mesh(bodyGeo, MATERIALS.stainlessSteel);
  body.position.set(0, 0.44, 0);
  body.castShadow = true;
  group.add(body);

  // Rear Splashback Guard
  const splashGeo = new THREE.BoxGeometry(widthM * 0.96, 0.22, 0.025);
  const splash = new THREE.Mesh(splashGeo, MATERIALS.stainlessSteel);
  splash.position.set(0, 0.98, -lengthM * 0.48);
  group.add(splash);

  // Dual Oil Vats
  const vatGeo = new THREE.BoxGeometry(widthM * 0.4, 0.15, lengthM * 0.65);
  const v1 = new THREE.Mesh(vatGeo, MATERIALS.darkStainless);
  v1.position.set(-widthM * 0.23, 0.82, 0);
  const v2 = new THREE.Mesh(vatGeo, MATERIALS.darkStainless);
  v2.position.set(widthM * 0.23, 0.82, 0);
  group.add(v1, v2);

  // Twin Stainless Wire Fry Baskets with Extended Front Handles
  const basketGeo = new THREE.BoxGeometry(widthM * 0.32, 0.16, lengthM * 0.5);
  const b1 = new THREE.Mesh(basketGeo, MATERIALS.stainlessSteel);
  b1.position.set(-widthM * 0.23, 0.88, 0);
  const b2 = new THREE.Mesh(basketGeo, MATERIALS.stainlessSteel);
  b2.position.set(widthM * 0.23, 0.88, 0);
  group.add(b1, b2);

  // Basket Handles
  const h1 = new THREE.Mesh(new THREE.BoxGeometry(0.025, 0.02, 0.22), MATERIALS.matteBlackSteel);
  h1.position.set(-widthM * 0.23, 0.98, lengthM * 0.35);
  const h2 = new THREE.Mesh(new THREE.BoxGeometry(0.025, 0.02, 0.22), MATERIALS.matteBlackSteel);
  h2.position.set(widthM * 0.23, 0.98, lengthM * 0.35);
  group.add(h1, h2);

  return group;
}

// Commercial Stainless Food Prep Station with Cutting Board & Pan Rail
export function createPrepStationMesh(widthM: number, lengthM: number): THREE.Group {
  const group = new THREE.Group();

  // 4 Tubular Stainless Legs
  const legGeo = new THREE.CylinderGeometry(0.022, 0.022, 0.86, 12);
  const lx = widthM * 0.46;
  const lz = lengthM * 0.46;
  [[-lx, -lz], [lx, -lz], [-lx, lz], [lx, lz]].forEach(([x, z]) => {
    const leg = new THREE.Mesh(legGeo, MATERIALS.stainlessSteel);
    leg.position.set(x, 0.43, z);
    group.add(leg);
  });

  // Lower Storage Undershelf
  const shelfGeo = new THREE.BoxGeometry(widthM * 0.92, 0.02, lengthM * 0.92);
  const shelf = new THREE.Mesh(shelfGeo, MATERIALS.stainlessSteel);
  shelf.position.set(0, 0.22, 0);
  group.add(shelf);

  // Heavy-duty Stainless Tabletop
  const topGeo = createRoundedBoxGeometry(widthM, 0.05, lengthM, 0.015);
  const top = new THREE.Mesh(topGeo, MATERIALS.stainlessSteel);
  top.position.set(0, 0.88, 0);
  top.castShadow = true;
  group.add(top);

  // Poly Food-Grade Cutting Board Insert
  const boardGeo = createRoundedBoxGeometry(widthM * 0.88, 0.025, lengthM * 0.55, 0.01);
  const boardMat = new THREE.MeshStandardMaterial({ color: '#f1f5f9', roughness: 0.4 });
  const board = new THREE.Mesh(boardGeo, boardMat);
  board.position.set(0, 0.92, lengthM * 0.16);
  group.add(board);

  // Gastronorm Stainless Food Pans along back rail
  const panGeo = new THREE.BoxGeometry(widthM * 0.25, 0.06, lengthM * 0.26);
  for (let i = 0; i < 3; i++) {
    const pan = new THREE.Mesh(panGeo, MATERIALS.stainlessSteel);
    pan.position.set(-widthM * 0.3 + i * (widthM * 0.3), 0.93, -lengthM * 0.28);
    group.add(pan);
  }

  return group;
}

// Commercial 2-Compartment Sink with Gooseneck Pre-Rinse Sprayer Faucet
export function createSinkMesh(widthM: number, lengthM: number): THREE.Group {
  const group = new THREE.Group();

  // Stainless Cabinet Frame
  const bodyGeo = createRoundedBoxGeometry(widthM, 0.86, lengthM, 0.02);
  const body = new THREE.Mesh(bodyGeo, MATERIALS.stainlessSteel);
  body.position.set(0, 0.43, 0);
  body.castShadow = true;
  group.add(body);

  // Rear Splashback
  const splashGeo = new THREE.BoxGeometry(widthM, 0.3, 0.025);
  const splash = new THREE.Mesh(splashGeo, MATERIALS.stainlessSteel);
  splash.position.set(0, 1.01, -lengthM * 0.48);
  group.add(splash);

  // Dual Sink Basins
  const basinGeo = new THREE.BoxGeometry(widthM * 0.38, 0.28, lengthM * 0.7);
  const b1 = new THREE.Mesh(basinGeo, MATERIALS.darkStainless);
  b1.position.set(-widthM * 0.22, 0.72, 0);
  const b2 = new THREE.Mesh(basinGeo, MATERIALS.darkStainless);
  b2.position.set(widthM * 0.22, 0.72, 0);
  group.add(b1, b2);

  // Commercial Tall Gooseneck Pre-Rinse Spring Faucet
  const faucetBase = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, 0.42, 12), MATERIALS.chromePolished);
  faucetBase.position.set(0, 1.07, -lengthM * 0.38);
  group.add(faucetBase);

  // Faucet Spring Arch
  const springGeo = new THREE.TorusGeometry(0.08, 0.014, 8, 20, Math.PI);
  const spring = new THREE.Mesh(springGeo, MATERIALS.chromePolished);
  spring.position.set(0, 1.32, -lengthM * 0.38 + 0.04);
  spring.rotation.y = Math.PI / 2;
  group.add(spring);

  return group;
}

// Commercial Canopy Exhaust Hood with Grease Baffles & Task Lights
export function createExhaustHoodMesh(widthM: number, lengthM: number): THREE.Group {
  const group = new THREE.Group();

  // Angled Canopy Hood Shell
  const hoodW = Math.max(1.2, widthM);
  const hoodL = Math.max(1.0, lengthM);
  const hoodH = 0.52;

  const hoodGeo = new THREE.BoxGeometry(hoodW, hoodH, hoodL);
  const hood = new THREE.Mesh(hoodGeo, MATERIALS.stainlessSteel);
  hood.position.set(0, 2.3, 0);
  hood.castShadow = true;
  group.add(hood);

  // Stainless Baffle Grease Filters
  const baffleGeo = new THREE.BoxGeometry(hoodW * 0.88, 0.04, hoodL * 0.82);
  const baffle = new THREE.Mesh(baffleGeo, MATERIALS.darkStainless);
  baffle.position.set(0, 2.05, 0);
  group.add(baffle);

  // Recessed Halogen Task Light Glow
  const lightGeo = new THREE.CircleGeometry(0.06, 16);
  const l1 = new THREE.Mesh(lightGeo, MATERIALS.warmLightGlow);
  l1.rotation.x = Math.PI / 2;
  l1.position.set(-hoodW * 0.28, 2.03, 0);
  const l2 = new THREE.Mesh(lightGeo, MATERIALS.warmLightGlow);
  l2.rotation.x = Math.PI / 2;
  l2.position.set(hoodW * 0.28, 2.03, 0);
  group.add(l1, l2);

  return group;
}

// Marble Cashier Counter with Touch POS & PIN Pad
export function createCashCounterMesh(widthM: number, lengthM: number): THREE.Group {
  const group = new THREE.Group();

  // Wood cabinetry body with beveled rounded corners
  const bodyGeo = createRoundedBoxGeometry(widthM, 1.04, lengthM, 0.04);
  const body = new THREE.Mesh(bodyGeo, MATERIALS.americanWalnut);
  body.position.set(0, 0.52, 0);
  body.castShadow = true;
  group.add(body);

  // Polished White Carrara Marble Countertop with Waterfall Beveled Edge
  const topGeo = createRoundedBoxGeometry(widthM + 0.06, 0.04, lengthM + 0.06, 0.03);
  const top = new THREE.Mesh(topGeo, MATERIALS.carraraMarble);
  top.position.set(0, 1.06, 0);
  top.castShadow = true;
  top.receiveShadow = true;
  group.add(top);

  // Brass Kickplate at Base
  const kickGeo = new THREE.BoxGeometry(widthM * 0.96, 0.06, lengthM * 0.96);
  const kick = new THREE.Mesh(kickGeo, MATERIALS.brushedBrass);
  kick.position.set(0, 0.03, 0);
  group.add(kick);

  // Modern Touch POS Terminal
  const screenGeo = createRoundedBoxGeometry(0.26, 0.18, 0.12, 0.02);
  const screen = new THREE.Mesh(screenGeo, MATERIALS.matteBlackSteel);
  screen.position.set(-widthM * 0.2, 1.18, 0);
  screen.castShadow = true;
  group.add(screen);

  return group;
}

// Waiting Sofa Lounge with Walnut Plinth & Plush Velvet Cushions
export function createSofaMesh(widthM: number, lengthM: number): THREE.Group {
  const group = new THREE.Group();

  // Base Plinth
  const baseGeo = createRoundedBoxGeometry(widthM, 0.12, lengthM, 0.03);
  const base = new THREE.Mesh(baseGeo, MATERIALS.americanWalnut);
  base.position.set(0, 0.06, 0);
  base.castShadow = true;
  group.add(base);

  // Plush Upholstered Seat Cushion with Beveled Rounding
  const seatGeo = createRoundedBoxGeometry(widthM * 0.94, 0.32, lengthM * 0.88, 0.06);
  const seat = new THREE.Mesh(seatGeo, MATERIALS.warmFabric);
  seat.position.set(0, 0.28, 0.04);
  seat.castShadow = true;
  group.add(seat);

  // Beveled Rounded Backrest Cushion
  const backGeo = createRoundedBoxGeometry(widthM * 0.94, 0.48, lengthM * 0.26, 0.05);
  const back = new THREE.Mesh(backGeo, MATERIALS.warmFabric);
  back.position.set(0, 0.58, -lengthM * 0.35);
  back.castShadow = true;
  group.add(back);

  return group;
}

// Washroom Fixtures: Ceramic vanity basin, goose-neck faucet & mirror
export function createWashroomMesh(widthM: number, lengthM: number): THREE.Group {
  const group = new THREE.Group();

  // Vanity Cabinet Base
  const vanityGeo = createRoundedBoxGeometry(widthM, 0.78, lengthM, 0.02);
  const vanity = new THREE.Mesh(vanityGeo, MATERIALS.americanWalnut);
  vanity.position.set(0, 0.39, 0);
  vanity.castShadow = true;
  group.add(vanity);

  // Carrara Marble Countertop with Basin Cutout
  const topGeo = createRoundedBoxGeometry(widthM + 0.04, 0.04, lengthM + 0.04, 0.02);
  const top = new THREE.Mesh(topGeo, MATERIALS.carraraMarble);
  top.position.set(0, 0.8, 0);
  top.castShadow = true;
  top.receiveShadow = true;
  group.add(top);

  // Ceramic Wash Basin
  const basinGeo = new THREE.CylinderGeometry(0.18, 0.14, 0.12, 24);
  const basin = new THREE.Mesh(basinGeo, MATERIALS.carraraMarble);
  basin.position.set(0, 0.86, 0);
  group.add(basin);

  // Chrome Goose-Neck Faucet
  const faucetGeo = new THREE.TorusGeometry(0.06, 0.012, 12, 18, Math.PI);
  const faucet = new THREE.Mesh(faucetGeo, MATERIALS.chromePolished);
  faucet.position.set(0, 0.96, -0.14);
  faucet.rotation.y = Math.PI / 2;
  group.add(faucet);

  // Backlit Vanity Mirror
  const mirrorGeo = createRoundedBoxGeometry(widthM * 0.85, 0.8, 0.03, 0.02);
  const mirror = new THREE.Mesh(mirrorGeo, MATERIALS.architecturalGlass);
  mirror.position.set(0, 1.45, -lengthM * 0.45);
  group.add(mirror);

  return group;
}

// Indoor Botanical Plants with Organic Multi-Tiered Foliage
export function createPlantMesh(isLarge = false): THREE.Group {
  const group = new THREE.Group();
  const potR = isLarge ? 0.28 : 0.18;
  const potH = isLarge ? 0.6 : 0.4;

  // Sculpted Architectural Planter Pot
  const potGeo = new THREE.CylinderGeometry(potR * 1.1, potR * 0.8, potH, 24);
  const pot = new THREE.Mesh(potGeo, MATERIALS.matteBlackSteel);
  pot.position.set(0, potH / 2, 0);
  pot.castShadow = true;
  group.add(pot);

  // Brass Planter Rim Collar
  const rimGeo = new THREE.TorusGeometry(potR * 1.1, 0.014, 12, 24);
  const rim = new THREE.Mesh(rimGeo, MATERIALS.brushedBrass);
  rim.rotation.x = Math.PI / 2;
  rim.position.set(0, potH, 0);
  group.add(rim);

  // Multi-tiered lush foliage leaves
  const leafR = isLarge ? 0.45 : 0.28;
  const foliageGeo = new THREE.SphereGeometry(leafR, 16, 16);
  const foliage = new THREE.Mesh(foliageGeo, MATERIALS.deepFoliage);
  foliage.position.set(0, potH + leafR * 0.7, 0);
  foliage.castShadow = true;
  group.add(foliage);

  // Layered canopy highlights
  const topFoliage = new THREE.Mesh(
    new THREE.SphereGeometry(leafR * 0.7, 12, 12),
    MATERIALS.leafHighlight
  );
  topFoliage.position.set(0, potH + leafR * 1.25, 0);
  topFoliage.castShadow = true;
  group.add(topFoliage);

  return group;
}

// Architectural Pillar
export function createPillarMesh(widthM: number, lengthM: number): THREE.Group {
  const group = new THREE.Group();
  const radius = Math.min(widthM, lengthM) * 0.5;

  const pillarGeo = new THREE.CylinderGeometry(radius, radius, 3.0, 32);
  const pillar = new THREE.Mesh(pillarGeo, MATERIALS.carraraMarble);
  pillar.position.set(0, 1.5, 0);
  pillar.castShadow = true;
  group.add(pillar);

  const collarGeo = new THREE.CylinderGeometry(radius * 1.1, radius * 1.1, 0.12, 32);
  const collar = new THREE.Mesh(collarGeo, MATERIALS.brushedBrass);
  collar.position.set(0, 0.06, 0);
  group.add(collar);

  return group;
}

// Slatted Wooden Room Partition or Glass Partition
export function createPartitionMesh(widthM: number, lengthM: number, isGlass = false): THREE.Group {
  const group = new THREE.Group();

  // Matte Black Steel Base Frame
  const baseGeo = createRoundedBoxGeometry(widthM, 0.14, lengthM, 0.02);
  const base = new THREE.Mesh(baseGeo, MATERIALS.matteBlackSteel);
  base.position.set(0, 0.07, 0);
  base.castShadow = true;
  group.add(base);

  if (isGlass) {
    // Tinted Glass Screen
    const panelGeo = createRoundedBoxGeometry(widthM * 0.98, 1.6, lengthM * 0.8, 0.03);
    const panel = new THREE.Mesh(panelGeo, MATERIALS.architecturalGlass);
    panel.position.set(0, 0.95, 0);
    group.add(panel);
  } else {
    // Vertical Slatted Walnut Acoustic Room Divider
    const slatCount = Math.max(4, Math.floor(widthM / 0.12));
    const slatStep = (widthM * 0.9) / slatCount;
    const slatGeo = new THREE.BoxGeometry(0.04, 1.6, 0.04);

    for (let i = 0; i <= slatCount; i++) {
      const sx = -widthM * 0.45 + i * slatStep;
      const slat = new THREE.Mesh(slatGeo, MATERIALS.americanWalnut);
      slat.position.set(sx, 0.95, 0);
      slat.castShadow = true;
      group.add(slat);
    }

    // Top Header Frame
    const topGeo = createRoundedBoxGeometry(widthM, 0.06, lengthM, 0.01);
    const top = new THREE.Mesh(topGeo, MATERIALS.matteBlackSteel);
    top.position.set(0, 1.78, 0);
    group.add(top);
  }

  return group;
}

// Door Mesh with Brass Handle
export function createDoorMesh(widthM: number, lengthM: number, isDouble = false): THREE.Group {
  const group = new THREE.Group();

  // Header Frame
  const headerGeo = createRoundedBoxGeometry(widthM, 0.08, 0.1, 0.01);
  const header = new THREE.Mesh(headerGeo, MATERIALS.matteBlackSteel);
  header.position.set(0, 2.15, 0);
  group.add(header);

  // Door Leaf
  const leafW = widthM * (isDouble ? 0.45 : 0.85);
  const leafGeo = createRoundedBoxGeometry(leafW, 2.05, 0.04, 0.01);
  const leaf = new THREE.Mesh(leafGeo, MATERIALS.americanWalnut);
  leaf.position.set(-widthM * 0.15, 1.05, 0.25);
  leaf.rotation.y = Math.PI / 4;
  leaf.castShadow = true;
  group.add(leaf);

  // Brass Lever Handle
  const handleGeo = new THREE.CylinderGeometry(0.012, 0.012, 0.12, 12);
  const handle = new THREE.Mesh(handleGeo, MATERIALS.brushedBrass);
  handle.rotation.z = Math.PI / 2;
  handle.position.set(-widthM * 0.15 + leafW * 0.4, 1.0, 0.35);
  group.add(handle);

  return group;
}

// Pendant Lighting Fixture with Brass Shade and Warm Emissive Core
function createPendantLightMesh(widthM: number, lengthM: number): THREE.Group {
  const group = new THREE.Group();

  // Suspension Cord from ceiling down to hanging height
  const cordGeo = new THREE.CylinderGeometry(0.006, 0.006, 0.85, 8);
  const cord = new THREE.Mesh(cordGeo, MATERIALS.matteBlackSteel);
  cord.position.y = 2.15;
  group.add(cord);

  // Brushed Brass Conical Shade
  const shadeGeo = new THREE.ConeGeometry(0.18, 0.22, 24, 1, true);
  const shade = new THREE.Mesh(shadeGeo, MATERIALS.brushedBrass);
  shade.position.y = 1.72;
  shade.rotation.x = Math.PI;
  group.add(shade);

  // Warm Emissive Light Bulb
  const bulbMat = new THREE.MeshStandardMaterial({
    color: '#fffbeb',
    emissive: '#f59e0b',
    emissiveIntensity: 2.2,
    roughness: 0.1
  });
  const bulbGeo = new THREE.SphereGeometry(0.05, 16, 16);
  const bulb = new THREE.Mesh(bulbGeo, bulbMat);
  bulb.position.y = 1.68;
  group.add(bulb);

  return group;
}

// Track Spotlight Fixture
function createSpotlightMesh(widthM: number, lengthM: number): THREE.Group {
  const group = new THREE.Group();

  // Ceiling Track Base
  const trackGeo = createRoundedBoxGeometry(Math.max(0.6, widthM), 0.04, 0.08, 0.01);
  const track = new THREE.Mesh(trackGeo, MATERIALS.matteBlackSteel);
  track.position.y = 2.45;
  group.add(track);

  // Cylindrical Spotlight Head
  const spotGeo = new THREE.CylinderGeometry(0.05, 0.06, 0.16, 16);
  const spotHead = new THREE.Mesh(spotGeo, MATERIALS.matteBlackSteel);
  spotHead.position.set(0, 2.36, 0);
  spotHead.rotation.x = Math.PI / 4;
  group.add(spotHead);

  // Front Glow Disc
  const glowMat = new THREE.MeshStandardMaterial({
    color: '#ffedd5',
    emissive: '#ea580c',
    emissiveIntensity: 1.8
  });
  const glowGeo = new THREE.CircleGeometry(0.045, 16);
  const glow = new THREE.Mesh(glowGeo, glowMat);
  glow.position.set(0, 2.31, 0.06);
  glow.rotation.x = Math.PI / 4;
  group.add(glow);

  return group;
}

// Framed Wall Art Panel
function createWallArtMesh(widthM: number, lengthM: number): THREE.Group {
  const group = new THREE.Group();
  const artW = Math.max(0.8, widthM * 0.9);
  const artH = 0.95;

  // Walnut Wooden Outer Frame
  const frameGeo = createRoundedBoxGeometry(artW, artH, 0.04, 0.01);
  const frame = new THREE.Mesh(frameGeo, MATERIALS.americanWalnut);
  frame.position.y = 1.6;
  frame.castShadow = true;
  group.add(frame);

  // Interior Minimalist Canvas Surface
  const canvasMat = new THREE.MeshStandardMaterial({
    color: '#f4f4f5',
    roughness: 0.85,
    metalness: 0.02
  });
  const canvasGeo = new THREE.PlaneGeometry(artW - 0.08, artH - 0.08);
  const canvas = new THREE.Mesh(canvasGeo, canvasMat);
  canvas.position.set(0, 1.6, 0.022);
  group.add(canvas);

  // Elegant Accent Geometry on Canvas
  const accentMat = new THREE.MeshStandardMaterial({
    color: '#2e4521',
    roughness: 0.6
  });
  const accentGeo = new THREE.CircleGeometry((artH - 0.15) / 2.8, 24);
  const accent = new THREE.Mesh(accentGeo, accentMat);
  accent.position.set(0, 1.6, 0.024);
  group.add(accent);

  return group;
}

// Decorative Floating Shelf with Pottery
function createDecorativeShelfMesh(widthM: number, lengthM: number): THREE.Group {
  const group = new THREE.Group();
  const shelfW = Math.max(0.8, widthM * 0.85);

  // Shelf Plank
  const plankGeo = createRoundedBoxGeometry(shelfW, 0.04, 0.28, 0.01);
  const plank = new THREE.Mesh(plankGeo, MATERIALS.americanWalnut);
  plank.position.y = 1.45;
  plank.castShadow = true;
  group.add(plank);

  // Ceramic Vases on Shelf
  const vaseGeo = new THREE.CylinderGeometry(0.04, 0.06, 0.2, 16);
  const vaseMat = new THREE.MeshStandardMaterial({ color: '#e4e4e7', roughness: 0.2, metalness: 0.1 });
  const vase1 = new THREE.Mesh(vaseGeo, vaseMat);
  vase1.position.set(-shelfW * 0.25, 1.57, 0);
  vase1.castShadow = true;
  group.add(vase1);

  const vase2 = new THREE.Mesh(new THREE.SphereGeometry(0.07, 16, 16), MATERIALS.brushedBrass);
  vase2.position.set(shelfW * 0.22, 1.54, 0);
  vase2.castShadow = true;
  group.add(vase2);

  return group;
}

// Architectural Wood Slat Wall Feature
function createSlatWallMesh(widthM: number, lengthM: number): THREE.Group {
  const group = new THREE.Group();
  const wallW = Math.max(1.0, widthM);
  const wallH = 2.4;

  // Dark acoustic felt backing
  const backGeo = new THREE.BoxGeometry(wallW, wallH, 0.02);
  const back = new THREE.Mesh(backGeo, MATERIALS.matteBlackSteel);
  back.position.y = wallH / 2;
  group.add(back);

  // Vertical American Walnut slats
  const slatCount = Math.floor(wallW / 0.08);
  const slatW = 0.04;
  const slatGeo = new THREE.BoxGeometry(slatW, wallH, 0.035);

  for (let i = 0; i < slatCount; i++) {
    const x = -wallW / 2 + (i + 0.5) * (wallW / slatCount);
    const slat = new THREE.Mesh(slatGeo, MATERIALS.americanWalnut);
    slat.position.set(x, wallH / 2, 0.02);
    slat.castShadow = true;
    group.add(slat);
  }

  return group;
}

// Modern Wall Split AC Unit
function createWallACMesh(widthM: number, lengthM: number): THREE.Group {
  const group = new THREE.Group();
  const acW = 0.85;
  const acH = 0.28;
  const acD = 0.22;

  // AC Housing
  const bodyMat = new THREE.MeshStandardMaterial({
    color: '#f8fafc',
    roughness: 0.25,
    metalness: 0.05
  });
  const bodyGeo = createRoundedBoxGeometry(acW, acH, acD, 0.02);
  const body = new THREE.Mesh(bodyGeo, bodyMat);
  body.position.y = 2.15;
  body.castShadow = true;
  group.add(body);

  // Airflow Discharge Louver
  const louverGeo = new THREE.BoxGeometry(acW * 0.88, 0.025, 0.02);
  const louverMat = new THREE.MeshStandardMaterial({ color: '#94a3b8', roughness: 0.4 });
  const louver = new THREE.Mesh(louverGeo, louverMat);
  louver.position.set(0, 2.06, acD / 2 + 0.005);
  group.add(louver);

  // Subtle Status LED
  const ledGeo = new THREE.CircleGeometry(0.008, 12);
  const ledMat = new THREE.MeshStandardMaterial({ color: '#22c55e', emissive: '#22c55e', emissiveIntensity: 1.5 });
  const led = new THREE.Mesh(ledGeo, ledMat);
  led.position.set(acW * 0.38, 2.18, acD / 2 + 0.011);
  group.add(led);

  return group;
}

// 4-Way Ceiling Cassette AC Unit
function createCeilingACMesh(widthM: number, lengthM: number): THREE.Group {
  const group = new THREE.Group();
  const size = 0.82;

  // Flush ceiling panel
  const panelMat = new THREE.MeshStandardMaterial({ color: '#f8fafc', roughness: 0.3 });
  const panelGeo = new THREE.BoxGeometry(size, 0.04, size);
  const panel = new THREE.Mesh(panelGeo, panelMat);
  panel.position.y = 2.58;
  group.add(panel);

  // Central Return Air Grille
  const grilleMat = new THREE.MeshStandardMaterial({ color: '#cbd5e1', roughness: 0.6 });
  const grilleGeo = new THREE.BoxGeometry(size * 0.55, 0.02, size * 0.55);
  const grille = new THREE.Mesh(grilleGeo, grilleMat);
  grille.position.y = 2.57;
  group.add(grille);

  // 4 Perimeter Vanes
  const vaneMat = new THREE.MeshStandardMaterial({ color: '#94a3b8', roughness: 0.4 });
  const vaneLong = new THREE.BoxGeometry(size * 0.72, 0.015, 0.04);
  const v1 = new THREE.Mesh(vaneLong, vaneMat);
  v1.position.set(0, 2.57, size * 0.38);
  const v2 = new THREE.Mesh(vaneLong, vaneMat);
  v2.position.set(0, 2.57, -size * 0.38);
  const vaneShort = new THREE.BoxGeometry(0.04, 0.015, size * 0.72);
  const v3 = new THREE.Mesh(vaneShort, vaneMat);
  v3.position.set(size * 0.38, 2.57, 0);
  const v4 = new THREE.Mesh(vaneShort, vaneMat);
  v4.position.set(-size * 0.38, 2.57, 0);
  group.add(v1, v2, v3, v4);

  return group;
}

// Master Procedural Mesh Generator
export function createProceduralMesh(
  item: FloorPlanItem,
  widthM: number,
  lengthM: number
): THREE.Group {
  if (item.kind === 'table') {
    return createTableMesh(item, widthM, lengthM);
  }

  const type = (item.furnitureType || 'counter') as string;

  switch (type) {
    case 'chair':
    case 'dining_chair':
      return createDiningChair(0, 0, 0);

    case 'bar_stool':
      return createBarStool(0, 0);

    case 'booth':
    case 'booth_sofa':
      return createBoothMesh(widthM, lengthM, true);

    case 'kitchen_counter':
    case 'kitchen_pass':
    case 'kitchen':
      return createKitchenPassMesh(widthM, lengthM);

    case 'stove':
    case 'pizza_oven':
    case 'commercial_range':
      return createStoveMesh(widthM, lengthM);

    case 'fryer':
    case 'commercial_fryer':
      return createFryerMesh(widthM, lengthM);

    case 'prep_counter':
    case 'prep_station':
    case 'refrigerator':
    case 'storage_rack':
      return createPrepStationMesh(widthM, lengthM);

    case 'sink':
    case 'commercial_sink':
      return createSinkMesh(widthM, lengthM);

    case 'exhaust_hood':
    case 'hood':
      return createExhaustHoodMesh(widthM, lengthM);

    case 'cash_counter':
    case 'cashier':
    case 'pos':
    case 'service_counter':
    case 'counter':
      return createCashCounterMesh(widthM, lengthM);

    case 'bar_seats':
    case 'bar':
      return createBarCounterMesh(widthM, lengthM);

    case 'waiting_area':
    case 'waiting_lounge':
    case 'waiting':
    case 'sofa':
    case 'sofa_lounge':
      return createSofaMesh(widthM, lengthM);

    case 'washroom':
    case 'accessible_washroom':
      return createWashroomMesh(widthM, lengthM);

    case 'plant_small':
      return createPlantMesh(false);

    case 'plant_large':
    case 'plant':
    case 'flower_pot':
    case 'water_feature':
      return createPlantMesh(true);

    case 'pillar':
    case 'column':
      return createPillarMesh(widthM, lengthM);

    case 'glass_partition':
      return createPartitionMesh(widthM, lengthM, true);

    case 'divider':
    case 'divider_wall':
    case 'curved_wall':
    case 'decorative_partition':
    case 'window':
    case 'window_large':
      return createPartitionMesh(widthM, lengthM, false);

    case 'wall_art':
      return createWallArtMesh(widthM, lengthM);

    case 'decorative_shelf':
      return createDecorativeShelfMesh(widthM, lengthM);

    case 'slat_wall':
      return createSlatWallMesh(widthM, lengthM);

    case 'pendant_light':
      return createPendantLightMesh(widthM, lengthM);

    case 'spotlight':
    case 'wall_sconce':
    case 'ceiling_light':
      return createSpotlightMesh(widthM, lengthM);

    case 'wall_ac':
      return createWallACMesh(widthM, lengthM);

    case 'ceiling_ac':
      return createCeilingACMesh(widthM, lengthM);

    case 'door':
    case 'entrance_door':
    case 'double_door':
    case 'sliding_door':
    case 'emergency_exit':
      return createDoorMesh(widthM, lengthM, type === 'double_door' || type === 'sliding_door');

    default:
      return createCashCounterMesh(widthM, lengthM);
  }
}
