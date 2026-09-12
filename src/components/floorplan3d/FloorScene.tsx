'use client';

import React, { useMemo } from 'react';
import { ContactShadows } from '@react-three/drei';
import { FloorPlanItem } from '../floorplan/types';
import { Lights } from './Lights';
import { Ground, FloorTextureType } from './Ground';
import { ModelLoader } from './ModelLoader';
import { CameraController, CameraPresetType } from './CameraController';
import { MATERIALS } from './FloorMeshFactory';

interface FloorSceneProps {
  items: FloorPlanItem[];
  selectedId?: string | null;
  cameraPreset?: CameraPresetType;
  resetCameraKey?: number;
  showGrid?: boolean;
  floorType?: FloorTextureType;
  lightingMode?: 'day' | 'night';
  onSelectItem?: (id: string) => void;
}

const SCALE_FACTOR = 0.02; // 100px 2D = 2.0 meters in 3D

export const FloorScene: React.FC<FloorSceneProps> = ({
  items,
  selectedId,
  cameraPreset = 'isometric',
  resetCameraKey = 0,
  showGrid = false,
  floorType = 'porcelain',
  lightingMode = 'night',
  onSelectItem
}) => {
  // 1. useMemo declarations (React Hooks Safety Rule)
  const { transformedItems, groundSize } = useMemo(() => {
    if (!items || items.length === 0) {
      return {
        transformedItems: [],
        groundSize: { width: 20, length: 20 }
      };
    }

    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;

    items.forEach((it) => {
      const x = it.x || 0;
      const y = it.y || 0;
      const w = it.width || 80;
      const h = it.height || 80;
      if (x < minX) minX = x;
      if (x + w > maxX) maxX = x + w;
      if (y < minY) minY = y;
      if (y + h > maxY) maxY = y + h;
    });

    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;

    const totalWidthM = Math.max(16, (maxX - minX) * SCALE_FACTOR + 6);
    const totalLengthM = Math.max(16, (maxY - minY) * SCALE_FACTOR + 6);

    const mapped = items.map((it) => {
      const wM = Math.max(0.6, (it.width || 80) * SCALE_FACTOR);
      const lM = Math.max(0.6, (it.height || 80) * SCALE_FACTOR);
      const x3d = (it.x + (it.width || 80) / 2 - centerX) * SCALE_FACTOR;
      const z3d = (it.y + (it.height || 80) / 2 - centerY) * SCALE_FACTOR;
      const rotY = -((it.rotation || 0) * Math.PI) / 180;

      return {
        item: it,
        widthM: wM,
        lengthM: lM,
        position: [x3d, 0, z3d] as [number, number, number],
        rotationY: rotY
      };
    });

    return {
      transformedItems: mapped,
      groundSize: { width: totalWidthM, length: totalLengthM }
    };
  }, [items]);

  const isDay = lightingMode === 'day';

  // ALL HOOKS STRICTLY ABOVE ANY CONDITIONAL RETURNS
  return (
    <group>
      {/* Dynamic Day / Night Lighting Rig */}
      <Lights lightingMode={lightingMode} />

      {/* Realistic Floor Slab with Skirting & Optional Grid */}
      <Ground
        width={groundSize.width}
        length={groundSize.length}
        showGrid={showGrid}
        floorType={floorType}
      />

      {/* Perimeter Architectural Walls with Window Openings (Hidden in Topdown view) */}
      {cameraPreset !== 'topdown' && (
        <WallSystem
          width={groundSize.width}
          length={groundSize.length}
          isDay={isDay}
        />
      )}

      {/* Interactive 3D Furniture & Table Nodes */}
      {transformedItems.map(({ item, widthM, lengthM, position, rotationY }) => (
        <group
          key={item.id}
          position={position}
          rotation={[0, rotationY, 0]}
          onClick={(e) => {
            e.stopPropagation();
            if (onSelectItem) onSelectItem(item.id);
          }}
        >
          <ModelLoader
            item={item}
            widthM={widthM}
            lengthM={lengthM}
            isSelected={selectedId === item.id}
          />
        </group>
      ))}

      {/* High-Fidelity Ambient Contact Shadows under tables and chairs */}
      <ContactShadows
        position={[0, 0.003, 0]}
        opacity={isDay ? 0.65 : 0.8}
        scale={Math.max(groundSize.width, groundSize.length) * 1.15}
        blur={1.8}
        far={3.8}
        resolution={2048}
        color="#18181b"
      />

      {/* Architectural False Ceiling with Recessed Downlights & Wooden Slats (Hidden in Top View) */}
      <CeilingSystem
        width={groundSize.width}
        length={groundSize.length}
        visible={cameraPreset !== 'topdown'}
        isNight={!isDay}
      />

      {/* Orbit & Walkthrough Camera Controller */}
      <CameraController
        target={[0, 0.6, 0]}
        preset={cameraPreset}
        resetKey={resetCameraKey}
      />
    </group>
  );
};

// ==========================================
// ARCHITECTURAL PERIMETER WALLS & WINDOWS
// ==========================================
interface WallSystemProps {
  width: number;
  length: number;
  isDay?: boolean;
}

const WallSystem: React.FC<WallSystemProps> = ({ width, length, isDay = false }) => {
  const wallH = 2.85;
  const wallThick = 0.12;

  return (
    <group>
      {/* North Wall (Solid textured interior restaurant wall) */}
      <mesh position={[0, wallH / 2, -length / 2]} receiveShadow>
        <boxGeometry args={[width, wallH, wallThick]} />
        <meshStandardMaterial color="#26262b" roughness={0.88} metalness={0.04} />
      </mesh>

      {/* Walnut Wainscotting Accent on North Wall */}
      <mesh position={[0, 0.48, -length / 2 + 0.02]} receiveShadow>
        <boxGeometry args={[width * 0.98, 0.96, 0.02]} />
        <meshStandardMaterial color="#3d2516" roughness={0.45} metalness={0.02} />
      </mesh>

      {/* West Wall (Interior Feature Wall) */}
      <mesh position={[-width / 2, wallH / 2, 0]} receiveShadow>
        <boxGeometry args={[wallThick, wallH, length]} />
        <meshStandardMaterial color="#222227" roughness={0.88} metalness={0.04} />
      </mesh>

      {/* South Wall with Architectural Windows (Allowing natural sunlight to stream in) */}
      {/* Left Wall Segment */}
      <mesh position={[-width * 0.35, wallH / 2, length / 2]} receiveShadow>
        <boxGeometry args={[width * 0.3, wallH, wallThick]} />
        <meshStandardMaterial color="#26262b" roughness={0.88} metalness={0.04} />
      </mesh>
      {/* Right Wall Segment */}
      <mesh position={[width * 0.35, wallH / 2, length / 2]} receiveShadow>
        <boxGeometry args={[width * 0.3, wallH, wallThick]} />
        <meshStandardMaterial color="#26262b" roughness={0.88} metalness={0.04} />
      </mesh>
      {/* Spandrel under window */}
      <mesh position={[0, 0.42, length / 2]} receiveShadow>
        <boxGeometry args={[width * 0.4, 0.84, wallThick]} />
        <meshStandardMaterial color="#26262b" roughness={0.88} metalness={0.04} />
      </mesh>
      {/* Lintel above window */}
      <mesh position={[0, wallH - 0.2, length / 2]} receiveShadow>
        <boxGeometry args={[width * 0.4, 0.4, wallThick]} />
        <meshStandardMaterial color="#26262b" roughness={0.88} metalness={0.04} />
      </mesh>

      {/* Architectural Window Frame & Glass */}
      <group position={[0, 1.62, length / 2]}>
        {/* Frame */}
        <mesh>
          <boxGeometry args={[width * 0.38, 1.6, 0.04]} />
          <meshStandardMaterial color="#09090b" roughness={0.4} metalness={0.8} />
        </mesh>
        {/* Glass with Physical Transmission & Specular Reflection */}
        <mesh material={MATERIALS.architecturalGlass}>
          <planeGeometry args={[width * 0.36, 1.54]} />
        </mesh>
      </group>
    </group>
  );
};

// ==========================================
// ARCHITECTURAL FALSE CEILING & WOODEN SLATS
// ==========================================
interface CeilingSystemProps {
  width: number;
  length: number;
  visible?: boolean;
  isNight?: boolean;
}

const CeilingSystem: React.FC<CeilingSystemProps> = ({ width, length, visible = true, isNight = true }) => {
  // 1. useMemo declarations (Strict React Hooks Safety Rule)
  const ceilingElements = useMemo(() => {
    const soffitH = 0.2;
    const soffitW = 1.1;
    const ceilingY = 2.85;

    // Outer perimeter false ceiling soffits
    const northSoffit = [0, ceilingY, -length / 2 + soffitW / 2] as const;
    const southSoffit = [0, ceilingY, length / 2 - soffitW / 2] as const;
    const eastSoffit = [width / 2 - soffitW / 2, ceilingY, 0] as const;
    const westSoffit = [-width / 2 + soffitW / 2, ceilingY, 0] as const;

    // Recessed downlight positions
    const downlights: Array<[number, number, number]> = [];
    const stepX = Math.max(2.4, width / 6);
    for (let x = -width / 2 + soffitW * 1.2; x <= width / 2 - soffitW * 1.2; x += stepX) {
      downlights.push([x, ceilingY - 0.101, -length / 2 + soffitW / 2]);
      downlights.push([x, ceilingY - 0.101, length / 2 - soffitW / 2]);
    }
    const stepZ = Math.max(2.4, length / 6);
    for (let z = -length / 2 + soffitW * 1.2; z <= length / 2 - soffitW * 1.2; z += stepZ) {
      downlights.push([width / 2 - soffitW / 2, ceilingY - 0.101, z]);
      downlights.push([-width / 2 + soffitW / 2, ceilingY - 0.101, z]);
    }

    // Central suspended wooden acoustic slats
    const slatAreaW = Math.min(width * 0.45, 7.5);
    const slatAreaL = Math.min(length * 0.45, 7.5);
    const slatCount = Math.floor(slatAreaL / 0.22);
    const slats: number[] = [];
    for (let i = 0; i < slatCount; i++) {
      slats.push(-slatAreaL / 2 + (i + 0.5) * (slatAreaL / slatCount));
    }

    return {
      soffitW,
      soffitH,
      ceilingY,
      northSoffit,
      southSoffit,
      eastSoffit,
      westSoffit,
      downlights,
      slatAreaW,
      slatAreaL,
      slats
    };
  }, [width, length]);

  // ALL HOOKS STRICTLY ABOVE ANY CONDITIONAL RETURN
  if (!visible || !ceilingElements) return null;

  return (
    <group>
      {/* North & South Perimeter False Ceiling Soffit */}
      <mesh position={ceilingElements.northSoffit} receiveShadow>
        <boxGeometry args={[width, ceilingElements.soffitH, ceilingElements.soffitW]} />
        <meshStandardMaterial color="#1a1a20" roughness={0.7} metalness={0.05} />
      </mesh>
      <mesh position={ceilingElements.southSoffit} receiveShadow>
        <boxGeometry args={[width, ceilingElements.soffitH, ceilingElements.soffitW]} />
        <meshStandardMaterial color="#1a1a20" roughness={0.7} metalness={0.05} />
      </mesh>

      {/* East & West Perimeter False Ceiling Soffit */}
      <mesh position={ceilingElements.eastSoffit} receiveShadow>
        <boxGeometry args={[ceilingElements.soffitW, ceilingElements.soffitH, length - ceilingElements.soffitW * 2]} />
        <meshStandardMaterial color="#1a1a20" roughness={0.7} metalness={0.05} />
      </mesh>
      <mesh position={ceilingElements.westSoffit} receiveShadow>
        <boxGeometry args={[ceilingElements.soffitW, ceilingElements.soffitH, length - ceilingElements.soffitW * 2]} />
        <meshStandardMaterial color="#1a1a20" roughness={0.7} metalness={0.05} />
      </mesh>

      {/* Recessed Warm Downlight Spots */}
      {ceilingElements.downlights.map((pos, idx) => (
        <group key={idx} position={pos}>
          {/* Recessed Trim Ring */}
          <mesh rotation={[Math.PI / 2, 0, 0]}>
            <ringGeometry args={[0.045, 0.07, 16]} />
            <meshStandardMaterial color="#09090b" roughness={0.3} />
          </mesh>
          {/* Warm Glowing Emissive Disc */}
          <mesh rotation={[Math.PI / 2, 0, 0]}>
            <circleGeometry args={[0.045, 16]} />
            <meshStandardMaterial
              color="#fffbeb"
              emissive={isNight ? '#f59e0b' : '#fef3c7'}
              emissiveIntensity={isNight ? 2.0 : 0.8}
            />
          </mesh>
        </group>
      ))}

      {/* Central Suspended Wooden Acoustic Slats Canopy */}
      <group position={[0, ceilingElements.ceilingY - 0.08, 0]}>
        {ceilingElements.slats.map((zPos, idx) => (
          <mesh key={idx} position={[0, 0, zPos]} castShadow>
            <boxGeometry args={[ceilingElements.slatAreaW, 0.045, 0.05]} />
            <meshStandardMaterial color="#3d2516" roughness={0.42} metalness={0.02} />
          </mesh>
        ))}
      </group>
    </group>
  );
};
