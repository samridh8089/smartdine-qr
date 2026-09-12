'use client';

import React, { useMemo } from 'react';
import * as THREE from 'three';

export type FloorTextureType = 'porcelain' | 'walnut' | 'concrete' | 'marble';

interface GroundProps {
  width?: number;
  length?: number;
  showGrid?: boolean;
  floorType?: FloorTextureType;
}

// Procedural PBR Texture Generator for Architectural Floor Slabs
function createFloorTextures(type: FloorTextureType): {
  colorMap: THREE.CanvasTexture | null;
  roughnessMap: THREE.CanvasTexture | null;
  bumpMap: THREE.CanvasTexture | null;
} {
  if (typeof document === 'undefined') {
    return { colorMap: null, roughnessMap: null, bumpMap: null };
  }

  const size = 1024;

  const colorCanvas = document.createElement('canvas');
  colorCanvas.width = size;
  colorCanvas.height = size;
  const ctx = colorCanvas.getContext('2d');
  if (!ctx) return { colorMap: null, roughnessMap: null, bumpMap: null };

  const roughCanvas = document.createElement('canvas');
  roughCanvas.width = size;
  roughCanvas.height = size;
  const rctx = roughCanvas.getContext('2d');

  const bumpCanvas = document.createElement('canvas');
  bumpCanvas.width = size;
  bumpCanvas.height = size;
  const bctx = bumpCanvas.getContext('2d');

  if (type === 'walnut') {
    // 1. Walnut Hardwood Planks
    ctx.fillStyle = '#2c1810';
    ctx.fillRect(0, 0, size, size);

    const plankCount = 10;
    const plankH = size / plankCount;
    const woodTones = ['#3d2516', '#351f12', '#442b19', '#382114', '#4a2f1c'];

    for (let i = 0; i < plankCount; i++) {
      const y = i * plankH;
      ctx.fillStyle = woodTones[i % woodTones.length];
      ctx.fillRect(0, y + 2, size, plankH - 4);

      // Wood grain lines
      ctx.fillStyle = 'rgba(0, 0, 0, 0.12)';
      for (let j = 0; j < 8; j++) {
        const lineY = y + (Math.random() * (plankH - 4));
        ctx.fillRect(0, lineY, size, 1.5);
      }

      if (rctx) {
        rctx.fillStyle = '#666666'; // Satin reflection
        rctx.fillRect(0, y, size, plankH);
      }
      if (bctx) {
        bctx.fillStyle = '#000000'; // Seam between planks
        bctx.fillRect(0, y, size, 2);
        bctx.fillStyle = '#ffffff';
        bctx.fillRect(0, y + 2, size, plankH - 4);
      }
    }
  } else if (type === 'concrete') {
    // 2. Polished Industrial Concrete
    ctx.fillStyle = '#3f3f46';
    ctx.fillRect(0, 0, size, size);

    // Aggregate flecks
    ctx.fillStyle = 'rgba(255, 255, 255, 0.04)';
    for (let i = 0; i < 120; i++) {
      ctx.fillRect(Math.random() * size, Math.random() * size, Math.random() * 4 + 1, Math.random() * 4 + 1);
    }
    ctx.fillStyle = 'rgba(0, 0, 0, 0.06)';
    for (let i = 0; i < 100; i++) {
      ctx.fillRect(Math.random() * size, Math.random() * size, Math.random() * 3 + 1, Math.random() * 3 + 1);
    }

    if (rctx) {
      rctx.fillStyle = '#777777';
      rctx.fillRect(0, 0, size, size);
    }
    if (bctx) {
      bctx.fillStyle = '#888888';
      bctx.fillRect(0, 0, size, size);
    }
  } else if (type === 'marble') {
    // 3. Polished White Carrara Marble Slabs with Organic Gray & Gold Veins
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(0, 0, size, size);

    const cols = 3;
    const rows = 3;
    const tileW = size / cols;
    const tileH = size / rows;
    const grout = 4;

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const x = c * tileW + grout / 2;
        const y = r * tileH + grout / 2;
        const w = tileW - grout;
        const h = tileH - grout;

        // Base tile tone
        ctx.fillStyle = '#fcfcfd';
        ctx.fillRect(x, y, w, h);

        // Subtle soft clouding
        const grad = ctx.createRadialGradient(x + w * 0.4, y + h * 0.4, 10, x + w * 0.5, y + h * 0.5, w * 0.6);
        grad.addColorStop(0, 'rgba(241, 245, 249, 0.6)');
        grad.addColorStop(1, 'rgba(255, 255, 255, 0.9)');
        ctx.fillStyle = grad;
        ctx.fillRect(x, y, w, h);

        // Organic Marble Veins (Subtle charcoal and warm gold wisps)
        ctx.strokeStyle = 'rgba(148, 163, 184, 0.28)';
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        ctx.moveTo(x + 10, y + h * 0.85);
        ctx.bezierCurveTo(x + w * 0.35, y + h * 0.55, x + w * 0.65, y + h * 0.45, x + w - 10, y + 15);
        ctx.stroke();

        ctx.strokeStyle = 'rgba(217, 119, 6, 0.12)';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(x + 20, y + h * 0.9);
        ctx.bezierCurveTo(x + w * 0.4, y + h * 0.6, x + w * 0.6, y + h * 0.5, x + w - 5, y + 25);
        ctx.stroke();

        if (rctx) {
          rctx.fillStyle = '#222222'; // High specular clearcoat gloss
          rctx.fillRect(x, y, w, h);
        }
        if (bctx) {
          bctx.fillStyle = '#000000'; // Crisp grout seam
          bctx.fillRect(c * tileW, r * tileH, tileW, grout);
          bctx.fillRect(c * tileW, r * tileH, grout, tileH);
          bctx.fillStyle = '#ffffff';
          bctx.fillRect(x, y, w, h);
        }
      }
    }
  } else {
    // 4. Large-Format Porcelain Slabs
    ctx.fillStyle = '#52525b';
    ctx.fillRect(0, 0, size, size);

    if (rctx) {
      rctx.fillStyle = '#f4f4f5';
      rctx.fillRect(0, 0, size, size);
    }
    if (bctx) {
      bctx.fillStyle = '#000000';
      bctx.fillRect(0, 0, size, size);
    }

    const cols = 4;
    const rows = 4;
    const tileW = size / cols;
    const tileH = size / rows;
    const grout = 6;
    const tileShades = ['#e7e5e4', '#e2dfdc', '#eae8e5', '#dedbd6', '#e5e2de', '#e0ddd8'];

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const x = c * tileW + grout / 2;
        const y = r * tileH + grout / 2;
        const w = tileW - grout;
        const h = tileH - grout;

        ctx.fillStyle = tileShades[(r * cols + c) % tileShades.length];
        ctx.fillRect(x, y, w, h);

        // Micro stone flecks
        ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
        for (let i = 0; i < 25; i++) {
          ctx.fillRect(x + Math.random() * w, y + Math.random() * h, Math.random() * 5 + 1, 1.5);
        }

        if (rctx) {
          rctx.fillStyle = '#444444'; // Smooth satin sheen
          rctx.fillRect(x, y, w, h);
        }
        if (bctx) {
          bctx.fillStyle = '#ffffff';
          bctx.fillRect(x, y, w, h);
        }
      }
    }
  }

  const colorMap = new THREE.CanvasTexture(colorCanvas);
  colorMap.wrapS = THREE.RepeatWrapping;
  colorMap.wrapT = THREE.RepeatWrapping;

  let roughnessMap: THREE.CanvasTexture | null = null;
  if (rctx) {
    roughnessMap = new THREE.CanvasTexture(roughCanvas);
    roughnessMap.wrapS = THREE.RepeatWrapping;
    roughnessMap.wrapT = THREE.RepeatWrapping;
  }

  let bumpMap: THREE.CanvasTexture | null = null;
  if (bctx) {
    bumpMap = new THREE.CanvasTexture(bumpCanvas);
    bumpMap.wrapS = THREE.RepeatWrapping;
    bumpMap.wrapT = THREE.RepeatWrapping;
  }

  return { colorMap, roughnessMap, bumpMap };
}

export const Ground: React.FC<GroundProps> = ({
  width = 36,
  length = 36,
  showGrid = false,
  floorType = 'porcelain'
}) => {
  // 1. useMemo declarations (Strict React Hooks Safety Guardrail)
  const floorMaterial = useMemo(() => {
    const { colorMap, roughnessMap, bumpMap } = createFloorTextures(floorType);
    const repeats = Math.max(3, Math.round(Math.max(width, length) / 2.2));

    if (colorMap) colorMap.repeat.set(repeats, repeats);
    if (roughnessMap) roughnessMap.repeat.set(repeats, repeats);
    if (bumpMap) bumpMap.repeat.set(repeats, repeats);

    if (floorType === 'marble') {
      return new THREE.MeshPhysicalMaterial({
        color: '#ffffff',
        map: colorMap,
        roughnessMap: roughnessMap,
        bumpMap: bumpMap,
        bumpScale: 0.002,
        roughness: 0.16,
        metalness: 0.04,
        clearcoat: 0.88,
        clearcoatRoughness: 0.12,
        reflectivity: 0.8
      });
    }

    return new THREE.MeshStandardMaterial({
      color: '#ffffff',
      map: colorMap,
      roughnessMap: roughnessMap,
      bumpMap: bumpMap,
      bumpScale: floorType === 'concrete' ? 0.001 : 0.003,
      roughness: floorType === 'walnut' ? 0.38 : floorType === 'concrete' ? 0.45 : 0.3,
      metalness: 0.06
    });
  }, [width, length, floorType]);

  const skirtingMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#18181b', // Matte dark perimeter baseboard
        roughness: 0.45,
        metalness: 0.2
      }),
    []
  );

  const brassTrimMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#d4af37', // Polished brass threshold accent
        roughness: 0.25,
        metalness: 0.85
      }),
    []
  );

  return (
    <group>
      {/* Main PBR Architectural Floor Slab with subtle reflection */}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, -0.005, 0]}
        receiveShadow
        material={floorMaterial}
      >
        <planeGeometry args={[width, length]} />
      </mesh>

      {/* Optional Blueprint Grid Overlay */}
      {showGrid && (
        <gridHelper
          args={[Math.max(width, length), Math.round(Math.max(width, length)), '#16A34A', '#52525b']}
          position={[0, 0.002, 0]}
        />
      )}

      {/* Perimeter Brass Floor Accent Inset */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.001, 0]} material={brassTrimMaterial}>
        <ringGeometry args={[Math.min(width, length) * 0.46, Math.min(width, length) * 0.465, 4]} />
      </mesh>

      {/* Architectural Skirting & Perimeter Baseboards */}
      <mesh position={[0, 0.08, -length / 2]} material={skirtingMaterial} castShadow receiveShadow>
        <boxGeometry args={[width, 0.16, 0.08]} />
      </mesh>
      <mesh position={[0, 0.08, length / 2]} material={skirtingMaterial} castShadow receiveShadow>
        <boxGeometry args={[width, 0.16, 0.08]} />
      </mesh>
      <mesh position={[-width / 2, 0.08, 0]} material={skirtingMaterial} castShadow receiveShadow>
        <boxGeometry args={[0.08, 0.16, length]} />
      </mesh>
      <mesh position={[width / 2, 0.08, 0]} material={skirtingMaterial} castShadow receiveShadow>
        <boxGeometry args={[0.08, 0.16, length]} />
      </mesh>
    </group>
  );
};
