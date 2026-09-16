'use client';

/**
 * CleverOps Founder Control Center — Main Shell Wrapper
 * Component: src/components/founder/FounderControlCenter.tsx
 *
 * Wrapper around ControlTowerV4.
 * Strictly adheres to React Hook safety guardrails.
 */

import React from 'react';
import ControlTowerV4 from './ControlTowerV4';

export interface FounderControlCenterProps {
  restaurantId: string;
  profile?: {
    id?: string | null;
    role?: string | null;
    full_name?: string | null;
    email?: string | null;
    restaurant_id?: string | null;
  } | null;
  onExit?: () => void;
}

export default function FounderControlCenter({
  restaurantId,
  profile,
  onExit,
}: FounderControlCenterProps) {
  return (
    <div className="w-full h-full min-h-screen bg-[#070b12] text-slate-100 flex flex-col">
      <ControlTowerV4
        restaurantId={restaurantId}
        profile={profile}
        onExit={onExit}
      />
    </div>
  );
}
