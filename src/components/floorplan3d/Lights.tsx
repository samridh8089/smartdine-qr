'use client';

import React from 'react';

export interface LightsProps {
  lightingMode?: 'day' | 'night';
}

export const Lights: React.FC<LightsProps> = ({ lightingMode = 'night' }) => {
  const isDay = lightingMode === 'day';

  return (
    <group>
      {/* 1. Ambient Fill Light: Bright and airy for Day, Intimate & warm for Night */}
      <ambientLight
        intensity={isDay ? 1.05 : 0.42}
        color={isDay ? '#ffffff' : '#fde68a'}
      />

      {/* 2. Dual-Tone Ceiling / Floor Bounce Hemisphere Light */}
      <hemisphereLight
        args={
          isDay
            ? ['#f0f9ff', '#fef3c7', 0.95]
            : ['#382414', '#1c1917', 0.45]
        }
      />

      {/* 3. Main Key Directional Sunlight (Day) / Moon & Perimeter Bounce (Night) */}
      <directionalLight
        position={isDay ? [14, 18, 12] : [8, 14, 8]}
        intensity={isDay ? 2.4 : 0.65}
        color={isDay ? '#fffbeb' : '#fed7aa'}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-near={0.5}
        shadow-camera-far={60}
        shadow-camera-left={-22}
        shadow-camera-right={22}
        shadow-camera-top={22}
        shadow-camera-bottom={-22}
        shadow-bias={-0.00015}
      />

      {/* 4. Secondary Counter-Directional Soft Fill Light */}
      <directionalLight
        position={[-12, 14, -10]}
        intensity={isDay ? 0.8 : 0.25}
        color={isDay ? '#e2e8f0' : '#fcd34d'}
      />

      {/* 5. Warm Restaurant Accent Spotlights (Focused Table Highlights) */}
      <spotLight
        position={[4, 7.5, 4]}
        angle={0.5}
        penumbra={0.9}
        intensity={isDay ? 1.8 : 4.2}
        color="#fbbf24"
        distance={18}
        decay={1.8}
      />
      <spotLight
        position={[-4, 7.5, 4]}
        angle={0.5}
        penumbra={0.9}
        intensity={isDay ? 1.8 : 4.2}
        color="#fbbf24"
        distance={18}
        decay={1.8}
      />
      <spotLight
        position={[4, 7.5, -4]}
        angle={0.5}
        penumbra={0.9}
        intensity={isDay ? 1.8 : 4.2}
        color="#fbbf24"
        distance={18}
        decay={1.8}
      />
      <spotLight
        position={[-4, 7.5, -4]}
        angle={0.5}
        penumbra={0.9}
        intensity={isDay ? 1.8 : 4.2}
        color="#fbbf24"
        distance={18}
        decay={1.8}
      />

      {/* Center Chandelier Spotlight with Amber Warmth */}
      <spotLight
        position={[0, 8.5, 0]}
        angle={0.65}
        penumbra={0.95}
        intensity={isDay ? 2.2 : 4.8}
        color="#fef3c7"
        distance={20}
        decay={1.8}
      />
    </group>
  );
};
