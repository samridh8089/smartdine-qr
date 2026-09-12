'use client';

import React, { useState, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import { FloorPlanItem } from '../floorplan/types';
import { getModelMetadata } from './ModelRegistry';
import { createProceduralMesh } from './FloorMeshFactory';

interface ModelLoaderProps {
  item: FloorPlanItem;
  widthM: number;
  lengthM: number;
  isSelected?: boolean;
}

export const ModelLoader: React.FC<ModelLoaderProps> = ({
  item,
  widthM,
  lengthM,
  isSelected = false
}) => {
  // 1. useState declarations (Strict React Hooks Safety Guardrail)
  const [lod, setLod] = useState<'dot' | 'name' | 'near'>('name');
  const [isHovered, setIsHovered] = useState<boolean>(false);

  // 2. useRef declarations
  const groupRef = useRef<THREE.Group>(null);

  // 3. useMemo declarations
  const meta = useMemo(() => getModelMetadata(item), [item]);
  const isTable = item.kind === 'table';

  const mesh = useMemo(() => {
    return createProceduralMesh(item, widthM, lengthM);
  }, [item, widthM, lengthM]);

  const fullName = isTable
    ? `Table ${item.display_number || item.tableNumber || item.name?.replace(/^Table\s*/i, '') || '1'}`
    : (item.name || 'Fixture');

  const shortName = isTable
    ? `T-${item.display_number || item.tableNumber || item.name?.replace(/^Table\s*/i, '') || '1'}`
    : (item.name || 'Fixture');

  const seats = item.seats || 4;

  // 4. useFrame hook for camera distance-based LOD calculation
  useFrame(({ camera }) => {
    if (!groupRef.current) return;
    const worldPos = new THREE.Vector3();
    groupRef.current.getWorldPosition(worldPos);
    const dist = camera.position.distanceTo(worldPos);

    if (dist > 18) {
      if (lod !== 'dot') setLod('dot');
    } else if (dist > 10) {
      if (lod !== 'name') setLod('name');
    } else {
      if (lod !== 'near') setLod('near');
    }
  });

  const showFullBadge = isSelected || isHovered;
  const shouldRenderBadge = isTable || showFullBadge;

  return (
    <group ref={groupRef}>
      <primitive object={mesh} />

      {/* Premium Floating Chip: Never overlaps, scales with zoom, fades when far, readable when close */}
      {shouldRenderBadge && (
        <Html
          position={[0, (meta.defaultHeight || 0.82) + 0.28, 0]}
          center
          distanceFactor={14}
          zIndexRange={[100, 0]}
        >
          <div
            onPointerEnter={() => setIsHovered(true)}
            onPointerLeave={() => setIsHovered(false)}
            className={`select-none pointer-events-auto transition-all duration-200 font-sans ${
              lod === 'dot' && !showFullBadge ? 'opacity-40 hover:opacity-100' : 'opacity-100'
            }`}
          >
            {showFullBadge ? (
              /* Selected or Hovered: Full Smart Badge */
              <div className="flex flex-col items-center bg-[#0B0F14]/95 text-white border border-[#16A34A] px-2.5 py-1 rounded-[8px] shadow-2xl backdrop-blur-md ring-1 ring-[#16A34A]/60">
                <div className="flex items-center gap-1.5 whitespace-nowrap">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#16A34A] shrink-0" />
                  <span className="text-[10px] font-semibold tracking-tight">{fullName}</span>
                </div>
                {isTable && (
                  <div className="text-[9px] text-zinc-400 font-normal mt-0.5 whitespace-nowrap">
                    {seats} seats
                  </div>
                )}
              </div>
            ) : lod === 'dot' ? (
              /* Far: Minimal Subtle Dot */
              <div className="w-2.5 h-2.5 rounded-full bg-[#0B0F14]/80 border border-white/20 flex items-center justify-center">
                <span className="w-1 h-1 rounded-full bg-[#16A34A]" />
              </div>
            ) : (
              /* Clean Floating Chip: "Table 4" */
              <div className="flex items-center gap-1.5 bg-[#0B0F14]/90 text-white border border-white/10 px-2 py-0.5 rounded-[8px] shadow-md backdrop-blur-xs whitespace-nowrap">
                <span className="w-1.5 h-1.5 rounded-full bg-[#16A34A] shrink-0" />
                <span className="text-[10px] font-medium tracking-tight">{fullName}</span>
              </div>
            )}
          </div>
        </Html>
      )}
    </group>
  );
};
