'use client';

import React, { useRef, useEffect, useMemo } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import * as THREE from 'three';

export type CameraPresetType = 'isometric' | 'topdown' | 'eyelevel' | 'walkthrough';

interface CameraControllerProps {
  target?: [number, number, number];
  preset?: CameraPresetType;
  resetKey?: number;
}

export const CameraController: React.FC<CameraControllerProps> = ({
  target = [0, 0, 0],
  preset = 'isometric',
  resetKey = 0
}) => {
  // 1. useRef declarations (Strict React Hooks Safety Guardrail)
  const controlsRef = useRef<OrbitControlsImpl>(null);
  const walkthroughProgressRef = useRef<number>(0);
  const isInteractingRef = useRef<boolean>(false);

  // 2. useThree hook
  const { camera } = useThree();

  // 3. useMemo for Matterport Walkthrough Spline Path (Natural eye-level restaurant tour)
  const walkthroughCurve = useMemo(() => {
    const [tx, , tz] = target;
    const eyeY = 1.38; // Human eye height (approx 4.5 ft)

    const points = [
      new THREE.Vector3(tx + 0, eyeY, tz + 7.5),   // 1. Entrance foyer
      new THREE.Vector3(tx + 0.5, eyeY, tz + 4.0), // 2. Approaching host / dining tables
      new THREE.Vector3(tx - 3.2, eyeY, tz + 1.2), // 3. Turning into left booth banquettes
      new THREE.Vector3(tx - 2.8, eyeY, tz - 2.5), // 4. Aisle between central dining tables
      new THREE.Vector3(tx + 1.5, eyeY, tz - 4.5), // 5. Kitchen pass & service counter
      new THREE.Vector3(tx + 3.8, eyeY, tz - 1.8), // 6. Bar lounge & cashier
      new THREE.Vector3(tx + 2.5, eyeY, tz + 3.5), // 7. Return loop along sunny window tables
      new THREE.Vector3(tx + 0, eyeY, tz + 7.5)    // 8. Back to entrance
    ];

    return new THREE.CatmullRomCurve3(points, true, 'centripetal');
  }, [target]);

  // 4. useEffect for preset switches and manual camera resets
  useEffect(() => {
    if (!controlsRef.current) return;

    const [tx, ty, tz] = target;

    if (preset === 'topdown') {
      controlsRef.current.target.set(tx, ty, tz);
      camera.position.set(tx, 14, tz + 0.001);
    } else if (preset === 'eyelevel') {
      controlsRef.current.target.set(tx, ty + 0.8, tz);
      camera.position.set(tx + 3.2, 1.35, tz + 3.2);
    } else if (preset === 'walkthrough') {
      // Initialize walkthrough at entrance point
      const startPt = walkthroughCurve.getPointAt(0);
      const lookPt = walkthroughCurve.getPointAt(0.04);
      camera.position.copy(startPt);
      controlsRef.current.target.copy(lookPt);
      walkthroughProgressRef.current = 0;
    } else {
      // Default Grounded Isometric View
      controlsRef.current.target.set(tx, ty + 0.4, tz);
      camera.position.set(tx + 7.5, 6.2, tz + 7.5);
    }

    camera.lookAt(tx, ty, tz);
    controlsRef.current.update();
  }, [preset, resetKey, target, camera, walkthroughCurve]);

  // 5. useFrame hook for smooth cinematic walkthrough animation
  useFrame((_, delta) => {
    if (preset !== 'walkthrough' || !controlsRef.current || isInteractingRef.current) return;

    // Smooth speed (~45 seconds per full interior loop)
    const speed = 0.024;
    walkthroughProgressRef.current = (walkthroughProgressRef.current + delta * speed) % 1.0;

    const currentPt = walkthroughCurve.getPointAt(walkthroughProgressRef.current);
    // Look ahead 5% along the spline path for natural turning sightlines
    const lookAheadPt = walkthroughCurve.getPointAt((walkthroughProgressRef.current + 0.06) % 1.0);

    camera.position.lerp(currentPt, 0.08);
    controlsRef.current.target.lerp(lookAheadPt, 0.08);
    controlsRef.current.update();
  });

  return (
    <OrbitControls
      ref={controlsRef}
      enableDamping={true}
      dampingFactor={0.06}
      rotateSpeed={0.75}
      zoomSpeed={0.7}
      panSpeed={0.75}
      minDistance={preset === 'walkthrough' ? 0.5 : 2.0}
      maxDistance={preset === 'walkthrough' ? 14 : 25}
      maxPolarAngle={Math.PI / 2.02} // Prevent dipping beneath floor slab
      minPolarAngle={0.04}
      target={target}
      onStart={() => {
        isInteractingRef.current = true;
      }}
      onEnd={() => {
        // Resume automatic motion after 2.5s of inactivity
        setTimeout(() => {
          isInteractingRef.current = false;
        }, 2500);
      }}
    />
  );
};
