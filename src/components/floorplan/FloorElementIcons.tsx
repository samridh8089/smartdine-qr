'use client';

import React from 'react';

interface ElementIconProps {
  type: string;
  className?: string;
  size?: number;
}

export const FloorElementIcon: React.FC<ElementIconProps> = ({ type, className = 'w-10 h-10' }) => {
  switch (type) {
    // ----------------- TABLES & SEATING -----------------
    case 'two_seater':
      return (
        <svg viewBox="0 0 70 70" fill="none" stroke="#262626" strokeWidth="1.5" className={className}>
          <rect x="20" y="4" width="30" height="9" rx="3" fill="#F5F5F4" />
          <rect x="20" y="57" width="30" height="9" rx="3" fill="#F5F5F4" />
          <rect x="15" y="15" width="40" height="40" rx="6" fill="#FFFFFF" stroke="#171717" strokeWidth="2" />
          <circle cx="35" cy="35" r="3" fill="#E7E5E4" />
        </svg>
      );
    case 'square':
      return (
        <svg viewBox="0 0 80 80" fill="none" stroke="#262626" strokeWidth="1.5" className={className}>
          <rect x="25" y="4" width="30" height="10" rx="3" fill="#F5F5F4" />
          <rect x="25" y="66" width="30" height="10" rx="3" fill="#F5F5F4" />
          <rect x="4" y="25" width="10" height="30" rx="3" fill="#F5F5F4" />
          <rect x="66" y="25" width="10" height="30" rx="3" fill="#F5F5F4" />
          <rect x="16" y="16" width="48" height="48" rx="6" fill="#FFFFFF" stroke="#171717" strokeWidth="2" />
          <circle cx="40" cy="40" r="4" fill="#E7E5E4" stroke="#A8A29E" />
        </svg>
      );
    case 'circle':
    case 'round':
      return (
        <svg viewBox="0 0 80 80" fill="none" stroke="#262626" strokeWidth="1.5" className={className}>
          <circle cx="40" cy="9" r="6" fill="#F5F5F4" />
          <circle cx="40" cy="71" r="6" fill="#F5F5F4" />
          <circle cx="9" cy="40" r="6" fill="#F5F5F4" />
          <circle cx="71" cy="40" r="6" fill="#F5F5F4" />
          <circle cx="40" cy="40" r="24" fill="#FFFFFF" stroke="#171717" strokeWidth="2" />
          <circle cx="40" cy="40" r="4" fill="#E7E5E4" stroke="#A8A29E" />
        </svg>
      );
    case 'rectangle':
      return (
        <svg viewBox="0 0 110 80" fill="none" stroke="#262626" strokeWidth="1.5" className={className}>
          <rect x="18" y="4" width="22" height="9" rx="2.5" fill="#F5F5F4" />
          <rect x="44" y="4" width="22" height="9" rx="2.5" fill="#F5F5F4" />
          <rect x="70" y="4" width="22" height="9" rx="2.5" fill="#F5F5F4" />
          <rect x="18" y="67" width="22" height="9" rx="2.5" fill="#F5F5F4" />
          <rect x="44" y="67" width="22" height="9" rx="2.5" fill="#F5F5F4" />
          <rect x="70" y="67" width="22" height="9" rx="2.5" fill="#F5F5F4" />
          <rect x="10" y="15" width="90" height="50" rx="5" fill="#FFFFFF" stroke="#171717" strokeWidth="2" />
          <circle cx="55" cy="40" r="4" fill="#E7E5E4" stroke="#A8A29E" />
        </svg>
      );
    case 'oval':
      return (
        <svg viewBox="0 0 110 80" fill="none" stroke="#262626" strokeWidth="1.5" className={className}>
          <circle cx="30" cy="9" r="6" fill="#F5F5F4" />
          <circle cx="55" cy="8" r="6" fill="#F5F5F4" />
          <circle cx="80" cy="9" r="6" fill="#F5F5F4" />
          <circle cx="30" cy="71" r="6" fill="#F5F5F4" />
          <circle cx="55" cy="72" r="6" fill="#F5F5F4" />
          <circle cx="80" cy="71" r="6" fill="#F5F5F4" />
          <ellipse cx="55" cy="40" rx="44" ry="24" fill="#FFFFFF" stroke="#171717" strokeWidth="2" />
          <circle cx="55" cy="40" r="4" fill="#E7E5E4" stroke="#A8A29E" />
        </svg>
      );
    case 'six_seater':
      return (
        <svg viewBox="0 0 110 80" fill="none" stroke="#262626" strokeWidth="1.5" className={className}>
          <rect x="16" y="4" width="22" height="9" rx="2.5" fill="#F5F5F4" />
          <rect x="44" y="4" width="22" height="9" rx="2.5" fill="#F5F5F4" />
          <rect x="72" y="4" width="22" height="9" rx="2.5" fill="#F5F5F4" />
          <rect x="16" y="67" width="22" height="9" rx="2.5" fill="#F5F5F4" />
          <rect x="44" y="67" width="22" height="9" rx="2.5" fill="#F5F5F4" />
          <rect x="72" y="67" width="22" height="9" rx="2.5" fill="#F5F5F4" />
          <rect x="8" y="15" width="94" height="50" rx="5" fill="#FFFFFF" stroke="#171717" strokeWidth="2" />
        </svg>
      );
    case 'eight_seater':
      return (
        <svg viewBox="0 0 130 80" fill="none" stroke="#262626" strokeWidth="1.5" className={className}>
          <rect x="24" y="4" width="22" height="9" rx="2.5" fill="#F5F5F4" />
          <rect x="54" y="4" width="22" height="9" rx="2.5" fill="#F5F5F4" />
          <rect x="84" y="4" width="22" height="9" rx="2.5" fill="#F5F5F4" />
          <rect x="24" y="67" width="22" height="9" rx="2.5" fill="#F5F5F4" />
          <rect x="54" y="67" width="22" height="9" rx="2.5" fill="#F5F5F4" />
          <rect x="84" y="67" width="22" height="9" rx="2.5" fill="#F5F5F4" />
          <rect x="4" y="29" width="9" height="22" rx="2.5" fill="#F5F5F4" />
          <rect x="117" y="29" width="9" height="22" rx="2.5" fill="#F5F5F4" />
          <rect x="15" y="15" width="100" height="50" rx="6" fill="#FFFFFF" stroke="#171717" strokeWidth="2" />
        </svg>
      );
    case 'ten_seater':
      return (
        <svg viewBox="0 0 150 80" fill="none" stroke="#262626" strokeWidth="1.5" className={className}>
          <rect x="22" y="4" width="22" height="9" rx="2.5" fill="#F5F5F4" />
          <rect x="50" y="4" width="22" height="9" rx="2.5" fill="#F5F5F4" />
          <rect x="78" y="4" width="22" height="9" rx="2.5" fill="#F5F5F4" />
          <rect x="106" y="4" width="22" height="9" rx="2.5" fill="#F5F5F4" />
          <rect x="22" y="67" width="22" height="9" rx="2.5" fill="#F5F5F4" />
          <rect x="50" y="67" width="22" height="9" rx="2.5" fill="#F5F5F4" />
          <rect x="78" y="67" width="22" height="9" rx="2.5" fill="#F5F5F4" />
          <rect x="106" y="67" width="22" height="9" rx="2.5" fill="#F5F5F4" />
          <rect x="4" y="29" width="9" height="22" rx="2.5" fill="#F5F5F4" />
          <rect x="137" y="29" width="9" height="22" rx="2.5" fill="#F5F5F4" />
          <rect x="15" y="15" width="120" height="50" rx="6" fill="#FFFFFF" stroke="#171717" strokeWidth="2" />
        </svg>
      );
    case 'booth':
      return (
        <svg viewBox="0 0 100 80" fill="none" stroke="#262626" strokeWidth="1.5" className={className}>
          <rect x="8" y="4" width="84" height="16" rx="4" fill="#E7E5E4" stroke="#78716C" strokeWidth="1.5" />
          <line x1="8" y1="10" x2="92" y2="10" stroke="#A8A29E" />
          <line x1="28" y1="4" x2="28" y2="20" stroke="#A8A29E" />
          <line x1="48" y1="4" x2="48" y2="20" stroke="#A8A29E" />
          <line x1="68" y1="4" x2="68" y2="20" stroke="#A8A29E" />
          <rect x="14" y="24" width="72" height="32" rx="4" fill="#FFFFFF" stroke="#171717" strokeWidth="2" />
          <rect x="8" y="60" width="84" height="16" rx="4" fill="#E7E5E4" stroke="#78716C" strokeWidth="1.5" />
          <line x1="8" y1="70" x2="92" y2="70" stroke="#A8A29E" />
          <line x1="28" y1="60" x2="28" y2="76" stroke="#A8A29E" />
          <line x1="48" y1="60" x2="48" y2="76" stroke="#A8A29E" />
          <line x1="68" y1="60" x2="68" y2="76" stroke="#A8A29E" />
        </svg>
      );
    case 'l_booth':
      return (
        <svg viewBox="0 0 100 100" fill="none" stroke="#262626" strokeWidth="1.5" className={className}>
          <path d="M 6 6 L 94 6 L 94 24 L 24 24 L 24 94 L 6 94 Z" fill="#E7E5E4" stroke="#78716C" strokeWidth="1.5" />
          <line x1="38" y1="6" x2="38" y2="24" stroke="#A8A29E" />
          <line x1="66" y1="6" x2="66" y2="24" stroke="#A8A29E" />
          <line x1="6" y1="38" x2="24" y2="38" stroke="#A8A29E" />
          <line x1="6" y1="66" x2="24" y2="66" stroke="#A8A29E" />
          <rect x="34" y="34" width="56" height="56" rx="6" fill="#FFFFFF" stroke="#171717" strokeWidth="2" />
        </svg>
      );
    case 'u_booth':
      return (
        <svg viewBox="0 0 110 100" fill="none" stroke="#262626" strokeWidth="1.5" className={className}>
          <path d="M 6 6 L 104 6 L 104 94 L 84 94 L 84 24 L 26 24 L 26 94 L 6 94 Z" fill="#E7E5E4" stroke="#78716C" strokeWidth="1.5" />
          <line x1="6" y1="40" x2="26" y2="40" stroke="#A8A29E" />
          <line x1="6" y1="68" x2="26" y2="68" stroke="#A8A29E" />
          <line x1="84" y1="40" x2="104" y2="40" stroke="#A8A29E" />
          <line x1="84" y1="68" x2="104" y2="68" stroke="#A8A29E" />
          <line x1="50" y1="6" x2="50" y2="24" stroke="#A8A29E" />
          <rect x="34" y="34" width="42" height="56" rx="4" fill="#FFFFFF" stroke="#171717" strokeWidth="2" />
        </svg>
      );
    case 'sofa_lounge':
    case 'sofa':
      return (
        <svg viewBox="0 0 110 80" fill="none" stroke="#262626" strokeWidth="1.5" className={className}>
          <path d="M 6 10 C 6 6, 8 4, 12 4 L 98 4 C 102 4, 104 6, 104 10 L 104 50 C 104 54, 102 56, 98 56 L 86 56 L 86 22 L 6 22 Z" fill="#E7E5E4" stroke="#78716C" strokeWidth="1.5" />
          <rect x="8" y="24" width="36" height="28" rx="4" fill="#F5F5F4" stroke="#A8A29E" />
          <rect x="46" y="24" width="36" height="28" rx="4" fill="#F5F5F4" stroke="#A8A29E" />
          <rect x="18" y="58" width="56" height="18" rx="4" fill="#FFFFFF" stroke="#171717" strokeWidth="1.5" />
        </svg>
      );
    case 'window_bench':
      return (
        <svg viewBox="0 0 110 80" fill="none" stroke="#262626" strokeWidth="1.5" className={className}>
          <rect x="4" y="4" width="102" height="18" rx="3" fill="#E7E5E4" stroke="#78716C" strokeWidth="1.5" />
          <line x1="4" y1="12" x2="106" y2="12" stroke="#A8A29E" />
          <rect x="12" y="26" width="86" height="30" rx="4" fill="#FFFFFF" stroke="#171717" strokeWidth="2" />
          <rect x="16" y="62" width="20" height="10" rx="3" fill="#F5F5F4" />
          <rect x="45" y="62" width="20" height="10" rx="3" fill="#F5F5F4" />
          <rect x="74" y="62" width="20" height="10" rx="3" fill="#F5F5F4" />
        </svg>
      );
    case 'vip_lounge':
      return (
        <svg viewBox="0 0 110 90" fill="none" stroke="#262626" strokeWidth="1.5" className={className}>
          <rect x="6" y="10" width="32" height="32" rx="6" fill="#E7E5E4" stroke="#78716C" strokeWidth="1.5" />
          <rect x="10" y="14" width="24" height="24" rx="4" fill="#F5F5F4" />
          <rect x="72" y="10" width="32" height="32" rx="6" fill="#E7E5E4" stroke="#78716C" strokeWidth="1.5" />
          <rect x="76" y="14" width="24" height="24" rx="4" fill="#F5F5F4" />
          <circle cx="55" cy="45" r="16" fill="#FFFFFF" stroke="#171717" strokeWidth="2" />
          <circle cx="55" cy="45" r="4" fill="#D97706" />
          <rect x="6" y="50" width="32" height="32" rx="6" fill="#E7E5E4" stroke="#78716C" strokeWidth="1.5" />
          <rect x="10" y="54" width="24" height="24" rx="4" fill="#F5F5F4" />
          <rect x="72" y="50" width="32" height="32" rx="6" fill="#E7E5E4" stroke="#78716C" strokeWidth="1.5" />
          <rect x="76" y="54" width="24" height="24" rx="4" fill="#F5F5F4" />
        </svg>
      );
    case 'bar_table':
      return (
        <svg viewBox="0 0 80 80" fill="none" stroke="#262626" strokeWidth="1.5" className={className}>
          <circle cx="40" cy="10" r="7" fill="#F5F5F4" /><circle cx="40" cy="10" r="4" stroke="#A8A29E" />
          <circle cx="40" cy="70" r="7" fill="#F5F5F4" /><circle cx="40" cy="70" r="4" stroke="#A8A29E" />
          <circle cx="10" cy="40" r="7" fill="#F5F5F4" /><circle cx="10" cy="40" r="4" stroke="#A8A29E" />
          <circle cx="70" cy="40" r="7" fill="#F5F5F4" /><circle cx="70" cy="40" r="4" stroke="#A8A29E" />
          <circle cx="40" cy="40" r="20" fill="#FFFFFF" stroke="#171717" strokeWidth="2" />
          <circle cx="40" cy="40" r="6" stroke="#A8A29E" />
        </svg>
      );

    // ----------------- KITCHEN -----------------
    case 'counter':
    case 'service_counter':
      return (
        <svg viewBox="0 0 120 50" fill="none" stroke="#262626" strokeWidth="1.5" className={className}>
          <rect x="4" y="4" width="112" height="42" rx="4" fill="#F5F5F4" stroke="#171717" strokeWidth="2" />
          <line x1="4" y1="18" x2="116" y2="18" stroke="#D6D3D1" strokeWidth="2" />
          <line x1="16" y1="10" x2="104" y2="10" stroke="#78716C" strokeDasharray="4,4" />
          <line x1="60" y1="18" x2="60" y2="46" stroke="#D6D3D1" />
        </svg>
      );
    case 'kitchen':
    case 'kitchen_pass':
      return (
        <svg viewBox="0 0 130 60" fill="none" stroke="#262626" strokeWidth="1.5" className={className}>
          <rect x="4" y="4" width="122" height="52" rx="4" fill="#FAFAF9" stroke="#78716C" strokeWidth="2" />
          <rect x="12" y="10" width="106" height="12" rx="2" fill="#E7E5E4" stroke="#A8A29E" />
          <circle cx="28" cy="16" r="3" fill="#D97706" />
          <circle cx="65" cy="16" r="3" fill="#D97706" />
          <circle cx="102" cy="16" r="3" fill="#D97706" />
          <line x1="4" y1="32" x2="126" y2="32" stroke="#D6D3D1" />
          <text x="65" y="46" fontSize="7" fontWeight="bold" fill="#78716C" textAnchor="middle" stroke="none">HOT PASS DISPATCH</text>
        </svg>
      );
    case 'stove':
      return (
        <svg viewBox="0 0 80 80" fill="none" stroke="#262626" strokeWidth="1.5" className={className}>
          <rect x="4" y="4" width="72" height="72" rx="4" fill="#F5F5F4" stroke="#171717" strokeWidth="2" />
          <circle cx="24" cy="24" r="12" stroke="#44403C" strokeWidth="2" fill="#E7E5E4" />
          <circle cx="24" cy="24" r="5" fill="#44403C" />
          <circle cx="56" cy="24" r="12" stroke="#44403C" strokeWidth="2" fill="#E7E5E4" />
          <circle cx="56" cy="24" r="5" fill="#44403C" />
          <circle cx="24" cy="56" r="12" stroke="#44403C" strokeWidth="2" fill="#E7E5E4" />
          <circle cx="24" cy="56" r="5" fill="#44403C" />
          <circle cx="56" cy="56" r="12" stroke="#44403C" strokeWidth="2" fill="#E7E5E4" />
          <circle cx="56" cy="56" r="5" fill="#44403C" />
          <line x1="12" y1="24" x2="36" y2="24" stroke="#44403C" />
          <line x1="24" y1="12" x2="24" y2="36" stroke="#44403C" />
          <line x1="44" y1="24" x2="68" y2="24" stroke="#44403C" />
          <line x1="56" y1="12" x2="56" y2="36" stroke="#44403C" />
          <line x1="12" y1="56" x2="36" y2="56" stroke="#44403C" />
          <line x1="24" y1="44" x2="24" y2="68" stroke="#44403C" />
          <line x1="44" y1="56" x2="68" y2="56" stroke="#44403C" />
          <line x1="56" y1="44" x2="56" y2="68" stroke="#44403C" />
        </svg>
      );
    case 'fryer':
      return (
        <svg viewBox="0 0 80 80" fill="none" stroke="#262626" strokeWidth="1.5" className={className}>
          <rect x="4" y="4" width="72" height="72" rx="4" fill="#F5F5F4" stroke="#171717" strokeWidth="2" />
          <rect x="12" y="10" width="24" height="44" rx="2" fill="#FEF3C7" stroke="#D97706" strokeWidth="1.5" />
          <rect x="44" y="10" width="24" height="44" rx="2" fill="#FEF3C7" stroke="#D97706" strokeWidth="1.5" />
          <rect x="21" y="54" width="6" height="18" rx="2" fill="#44403C" />
          <rect x="53" y="54" width="6" height="18" rx="2" fill="#44403C" />
        </svg>
      );
    case 'pizza_oven':
      return (
        <svg viewBox="0 0 90 90" fill="none" stroke="#262626" strokeWidth="1.5" className={className}>
          <circle cx="45" cy="45" r="40" fill="#E7E5E4" stroke="#171717" strokeWidth="2" />
          <circle cx="45" cy="45" r="32" fill="#F5F5F4" stroke="#78716C" />
          <path d="M 22 68 Q 45 42 68 68 Z" fill="#78350F" stroke="#171717" strokeWidth="2" />
          <circle cx="45" cy="58" r="5" fill="#F59E0B" />
        </svg>
      );
    case 'sink':
      return (
        <svg viewBox="0 0 100 60" fill="none" stroke="#262626" strokeWidth="1.5" className={className}>
          <rect x="4" y="4" width="92" height="52" rx="4" fill="#F5F5F4" stroke="#171717" strokeWidth="2" />
          <rect x="10" y="10" width="36" height="40" rx="4" fill="#E0F2FE" stroke="#0284C7" strokeWidth="1.5" />
          <circle cx="28" cy="30" r="3" fill="#0284C7" />
          <rect x="54" y="10" width="36" height="40" rx="4" fill="#E0F2FE" stroke="#0284C7" strokeWidth="1.5" />
          <circle cx="72" cy="30" r="3" fill="#0284C7" />
          <rect x="48" y="6" width="4" height="16" rx="2" fill="#44403C" />
        </svg>
      );
    case 'refrigerator':
      return (
        <svg viewBox="0 0 90 70" fill="none" stroke="#262626" strokeWidth="1.5" className={className}>
          <rect x="4" y="4" width="82" height="62" rx="4" fill="#F5F5F4" stroke="#171717" strokeWidth="2" />
          <rect x="8" y="8" width="35" height="44" rx="2" fill="#FFFFFF" stroke="#78716C" />
          <rect x="47" y="8" width="35" height="44" rx="2" fill="#FFFFFF" stroke="#78716C" />
          <rect x="37" y="16" width="3" height="20" rx="1" fill="#171717" />
          <rect x="50" y="16" width="3" height="20" rx="1" fill="#171717" />
          <line x1="8" y1="56" x2="82" y2="56" stroke="#78716C" />
          <line x1="8" y1="60" x2="82" y2="60" stroke="#78716C" />
        </svg>
      );
    case 'prep_counter':
      return (
        <svg viewBox="0 0 110 60" fill="none" stroke="#262626" strokeWidth="1.5" className={className}>
          <rect x="4" y="4" width="102" height="52" rx="4" fill="#F5F5F4" stroke="#171717" strokeWidth="2" />
          <rect x="12" y="10" width="56" height="40" rx="3" fill="#FEF3C7" stroke="#D97706" strokeWidth="1.5" />
          <rect x="74" y="10" width="24" height="16" rx="2" fill="#E7E5E4" stroke="#78716C" />
          <rect x="74" y="32" width="24" height="16" rx="2" fill="#E7E5E4" stroke="#78716C" />
        </svg>
      );
    case 'storage_rack':
      return (
        <svg viewBox="0 0 100 50" fill="none" stroke="#262626" strokeWidth="1.5" className={className}>
          <rect x="4" y="4" width="92" height="42" rx="2" fill="#F5F5F4" stroke="#171717" strokeWidth="2" />
          <line x1="16" y1="4" x2="16" y2="46" stroke="#78716C" />
          <line x1="28" y1="4" x2="28" y2="46" stroke="#78716C" />
          <line x1="40" y1="4" x2="40" y2="46" stroke="#78716C" />
          <line x1="52" y1="4" x2="52" y2="46" stroke="#78716C" />
          <line x1="64" y1="4" x2="64" y2="46" stroke="#78716C" />
          <line x1="76" y1="4" x2="76" y2="46" stroke="#78716C" />
          <line x1="88" y1="4" x2="88" y2="46" stroke="#78716C" />
          <line x1="4" y1="25" x2="96" y2="25" stroke="#78716C" />
        </svg>
      );

    // ----------------- STRUCTURE -----------------
    case 'door':
    case 'entrance_door':
      return (
        <svg viewBox="0 0 80 80" fill="none" stroke="#262626" strokeWidth="1.5" className={className}>
          <rect x="4" y="70" width="10" height="8" fill="#171717" />
          <rect x="66" y="70" width="10" height="8" fill="#171717" />
          <path d="M 14 74 A 56 56 0 0 1 70 18" stroke="#A8A29E" strokeWidth="1.5" strokeDasharray="3,3" />
          <line x1="14" y1="74" x2="14" y2="18" stroke="#171717" strokeWidth="3" />
          <circle cx="18" cy="30" r="2" fill="#171717" />
        </svg>
      );
    case 'double_door':
      return (
        <svg viewBox="0 0 120 70" fill="none" stroke="#262626" strokeWidth="1.5" className={className}>
          <rect x="4" y="58" width="10" height="8" fill="#171717" />
          <rect x="106" y="58" width="10" height="8" fill="#171717" />
          <path d="M 14 62 A 46 46 0 0 1 60 16" stroke="#A8A29E" strokeDasharray="3,3" />
          <line x1="14" y1="62" x2="14" y2="16" stroke="#171717" strokeWidth="2.5" />
          <path d="M 106 62 A 46 46 0 0 0 60 16" stroke="#A8A29E" strokeDasharray="3,3" />
          <line x1="106" y1="62" x2="106" y2="16" stroke="#171717" strokeWidth="2.5" />
        </svg>
      );
    case 'sliding_door':
      return (
        <svg viewBox="0 0 100 40" fill="none" stroke="#262626" strokeWidth="1.5" className={className}>
          <line x1="4" y1="14" x2="96" y2="14" stroke="#78716C" strokeWidth="2" />
          <rect x="8" y="10" width="40" height="8" fill="#E7E5E4" stroke="#171717" />
          <rect x="46" y="18" width="44" height="8" fill="#FFFFFF" stroke="#171717" strokeWidth="2" />
          <path d="M 64 30 L 74 30 M 70 27 L 74 30 L 70 33" stroke="#0284C7" strokeWidth="1.5" />
        </svg>
      );
    case 'window':
      return (
        <svg viewBox="0 0 100 30" fill="none" stroke="#262626" strokeWidth="1.5" className={className}>
          <rect x="4" y="6" width="92" height="18" fill="#F5F5F4" stroke="#171717" strokeWidth="2" />
          <line x1="4" y1="12" x2="96" y2="12" stroke="#0284C7" strokeWidth="1.5" />
          <line x1="4" y1="18" x2="96" y2="18" stroke="#0284C7" strokeWidth="1.5" />
          <line x1="50" y1="6" x2="50" y2="24" stroke="#78716C" strokeWidth="2" />
        </svg>
      );
    case 'divider':
    case 'divider_wall':
      return (
        <svg viewBox="0 0 110 30" fill="none" stroke="#262626" strokeWidth="1.5" className={className}>
          <rect x="4" y="6" width="102" height="18" rx="2" fill="#E7E5E4" stroke="#171717" strokeWidth="2" />
          <line x1="16" y1="6" x2="26" y2="24" stroke="#A8A29E" />
          <line x1="36" y1="6" x2="46" y2="24" stroke="#A8A29E" />
          <line x1="56" y1="6" x2="66" y2="24" stroke="#A8A29E" />
          <line x1="76" y1="6" x2="86" y2="24" stroke="#A8A29E" />
        </svg>
      );
    case 'curved_wall':
      return (
        <svg viewBox="0 0 100 80" fill="none" stroke="#262626" strokeWidth="2" className={className}>
          <path d="M 10 70 A 60 60 0 0 1 80 10" stroke="#171717" strokeWidth="8" strokeLinecap="round" />
          <path d="M 10 70 A 60 60 0 0 1 80 10" stroke="#E7E5E4" strokeWidth="4" strokeLinecap="round" />
        </svg>
      );
    case 'glass_partition':
      return (
        <svg viewBox="0 0 100 30" fill="none" stroke="#262626" strokeWidth="1.5" className={className}>
          <rect x="4" y="8" width="92" height="14" rx="2" fill="#E0F2FE" fillOpacity="0.6" stroke="#0284C7" strokeWidth="1.5" />
          <line x1="25" y1="10" x2="35" y2="20" stroke="#38BDF8" strokeWidth="2" />
          <line x1="65" y1="10" x2="75" y2="20" stroke="#38BDF8" strokeWidth="2" />
          <rect x="16" y="6" width="6" height="18" fill="#44403C" />
          <rect x="78" y="6" width="6" height="18" fill="#44403C" />
        </svg>
      );

    // ----------------- UTILITIES -----------------
    case 'bar_seats':
      return (
        <svg viewBox="0 0 120 50" fill="none" stroke="#262626" strokeWidth="1.5" className={className}>
          <rect x="4" y="4" width="112" height="26" rx="4" fill="#F5F5F4" stroke="#171717" strokeWidth="2" />
          <circle cx="20" cy="40" r="7" fill="#E7E5E4" stroke="#A8A29E" />
          <circle cx="45" cy="40" r="7" fill="#E7E5E4" stroke="#A8A29E" />
          <circle cx="70" cy="40" r="7" fill="#E7E5E4" stroke="#A8A29E" />
          <circle cx="95" cy="40" r="7" fill="#E7E5E4" stroke="#A8A29E" />
        </svg>
      );
    case 'cash_counter':
    case 'pos':
      return (
        <svg viewBox="0 0 100 70" fill="none" stroke="#262626" strokeWidth="1.5" className={className}>
          <rect x="4" y="4" width="92" height="62" rx="4" fill="#F5F5F4" stroke="#171717" strokeWidth="2" />
          <rect x="12" y="12" width="30" height="22" rx="3" fill="#171717" />
          <rect x="16" y="15" width="22" height="16" rx="2" fill="#0284C7" />
          <rect x="52" y="12" width="18" height="20" rx="2" fill="#FFFFFF" stroke="#78716C" />
          <line x1="56" y1="18" x2="66" y2="18" stroke="#171717" strokeWidth="2" />
          <line x1="12" y1="46" x2="88" y2="46" stroke="#A8A29E" />
          <circle cx="50" cy="54" r="3" fill="#171717" />
        </svg>
      );
    case 'waiting_area':
      return (
        <svg viewBox="0 0 110 80" fill="none" stroke="#262626" strokeWidth="1.5" className={className}>
          <rect x="4" y="10" width="26" height="60" rx="4" fill="#E7E5E4" stroke="#78716C" strokeWidth="1.5" />
          <rect x="10" y="16" width="18" height="48" rx="2" fill="#F5F5F4" />
          <rect x="80" y="10" width="26" height="60" rx="4" fill="#E7E5E4" stroke="#78716C" strokeWidth="1.5" />
          <rect x="82" y="16" width="18" height="48" rx="2" fill="#F5F5F4" />
          <rect x="40" y="24" width="30" height="32" rx="4" fill="#FFFFFF" stroke="#171717" strokeWidth="1.5" />
          <rect x="46" y="30" width="10" height="8" fill="#F59E0B" />
          <rect x="52" y="38" width="12" height="8" fill="#3B82F6" />
        </svg>
      );
    case 'washroom':
      return (
        <svg viewBox="0 0 80 80" fill="none" stroke="#262626" strokeWidth="1.5" className={className}>
          <rect x="4" y="4" width="72" height="72" rx="4" fill="#F5F5F4" stroke="#171717" strokeWidth="2" />
          <rect x="12" y="12" width="16" height="10" rx="2" fill="#FFFFFF" stroke="#78716C" />
          <ellipse cx="20" cy="32" rx="10" ry="12" fill="#FFFFFF" stroke="#78716C" />
          <rect x="48" y="12" width="20" height="16" rx="4" fill="#FFFFFF" stroke="#0284C7" />
          <circle cx="58" cy="20" r="2" fill="#0284C7" />
        </svg>
      );
    case 'accessible_washroom':
      return (
        <svg viewBox="0 0 90 90" fill="none" stroke="#262626" strokeWidth="1.5" className={className}>
          <rect x="4" y="4" width="82" height="82" rx="4" fill="#F5F5F4" stroke="#171717" strokeWidth="2" />
          <rect x="12" y="12" width="16" height="10" rx="2" fill="#FFFFFF" stroke="#78716C" />
          <ellipse cx="20" cy="32" rx="10" ry="12" fill="#FFFFFF" stroke="#78716C" />
          <line x1="6" y1="18" x2="36" y2="18" stroke="#171717" strokeWidth="3" />
          <line x1="36" y1="18" x2="36" y2="44" stroke="#171717" strokeWidth="3" />
          <circle cx="52" cy="52" r="20" stroke="#0284C7" strokeDasharray="3,3" fill="#E0F2FE" fillOpacity="0.3" />
          <circle cx="52" cy="46" r="3" fill="#0284C7" />
          <path d="M 52 50 L 52 58 L 58 58" stroke="#0284C7" strokeWidth="2" />
        </svg>
      );
    case 'emergency_exit':
      return (
        <svg viewBox="0 0 80 80" fill="none" stroke="#262626" strokeWidth="1.5" className={className}>
          <rect x="4" y="4" width="72" height="72" rx="4" fill="#ECFDF5" stroke="#059669" strokeWidth="2" />
          <circle cx="34" cy="24" r="5" fill="#059669" />
          <path d="M 28 32 L 36 32 L 44 42 M 36 32 L 34 46 L 26 56 M 34 46 L 46 54" stroke="#059669" strokeWidth="3" strokeLinecap="round" />
          <rect x="52" y="18" width="16" height="44" fill="#FFFFFF" stroke="#059669" strokeWidth="2" />
          <path d="M 20 62 L 40 62 M 36 58 L 40 62 L 36 66" stroke="#059669" strokeWidth="2" />
        </svg>
      );
    case 'fire_extinguisher':
      return (
        <svg viewBox="0 0 70 70" fill="none" stroke="#262626" strokeWidth="1.5" className={className}>
          <rect x="20" y="4" width="30" height="62" rx="4" fill="#FEE2E2" stroke="#DC2626" strokeWidth="1.5" />
          <rect x="25" y="20" width="20" height="40" rx="6" fill="#DC2626" />
          <rect x="31" y="12" width="8" height="8" fill="#171717" />
          <line x1="24" y1="12" x2="46" y2="12" stroke="#171717" strokeWidth="2" />
          <circle cx="35" cy="8" r="4" fill="#FBBF24" stroke="#171717" />
          <path d="M 40 14 Q 52 20 48 36" stroke="#171717" strokeWidth="2" />
        </svg>
      );

    // ----------------- DECOR -----------------
    case 'plant_small':
      return (
        <svg viewBox="0 0 70 70" fill="none" stroke="#262626" strokeWidth="1.5" className={className}>
          <circle cx="35" cy="35" r="16" fill="#D97706" stroke="#92400E" strokeWidth="1.5" />
          <circle cx="35" cy="35" r="12" fill="#78350F" />
          <ellipse cx="35" cy="16" rx="6" ry="12" fill="#10B981" stroke="#047857" />
          <ellipse cx="35" cy="54" rx="6" ry="12" fill="#10B981" stroke="#047857" />
          <ellipse cx="16" cy="35" rx="12" ry="6" fill="#10B981" stroke="#047857" />
          <ellipse cx="54" cy="35" rx="12" ry="6" fill="#10B981" stroke="#047857" />
          <circle cx="35" cy="35" r="4" fill="#047857" />
        </svg>
      );
    case 'plant_large':
      return (
        <svg viewBox="0 0 90 90" fill="none" stroke="#262626" strokeWidth="1.5" className={className}>
          <circle cx="45" cy="45" r="22" fill="#D97706" stroke="#92400E" strokeWidth="2" />
          <circle cx="45" cy="45" r="17" fill="#78350F" />
          <ellipse cx="45" cy="18" rx="8" ry="18" fill="#059669" stroke="#047857" />
          <ellipse cx="45" cy="72" rx="8" ry="18" fill="#059669" stroke="#047857" />
          <ellipse cx="18" cy="45" rx="18" ry="8" fill="#059669" stroke="#047857" />
          <ellipse cx="72" cy="45" rx="18" ry="8" fill="#059669" stroke="#047857" />
          <g transform="rotate(45 45 45)">
            <ellipse cx="45" cy="18" rx="7" ry="16" fill="#10B981" stroke="#047857" />
            <ellipse cx="45" cy="72" rx="7" ry="16" fill="#10B981" stroke="#047857" />
            <ellipse cx="18" cy="45" rx="16" ry="7" fill="#10B981" stroke="#047857" />
            <ellipse cx="72" cy="45" rx="16" ry="7" fill="#10B981" stroke="#047857" />
          </g>
          <circle cx="45" cy="45" r="5" fill="#064E3B" />
        </svg>
      );
    case 'flower_pot':
      return (
        <svg viewBox="0 0 70 70" fill="none" stroke="#262626" strokeWidth="1.5" className={className}>
          <circle cx="35" cy="35" r="15" fill="#F5F5F4" stroke="#78716C" strokeWidth="1.5" />
          <circle cx="35" cy="24" r="6" fill="#F43F5E" />
          <circle cx="44" cy="30" r="6" fill="#EC4899" />
          <circle cx="41" cy="41" r="6" fill="#F43F5E" />
          <circle cx="29" cy="41" r="6" fill="#EC4899" />
          <circle cx="26" cy="30" r="6" fill="#F43F5E" />
          <circle cx="35" cy="35" r="5" fill="#FBBF24" />
        </svg>
      );
    case 'water_feature':
      return (
        <svg viewBox="0 0 90 90" fill="none" stroke="#262626" strokeWidth="1.5" className={className}>
          <rect x="6" y="6" width="78" height="78" rx="12" fill="#E0F2FE" stroke="#0284C7" strokeWidth="2" />
          <circle cx="45" cy="45" r="28" stroke="#38BDF8" strokeDasharray="4,4" />
          <circle cx="45" cy="45" r="18" stroke="#0284C7" />
          <circle cx="45" cy="45" r="8" stroke="#0369A1" strokeWidth="2" />
          <circle cx="45" cy="45" r="3" fill="#0284C7" />
        </svg>
      );
    case 'pillar':
      return (
        <svg viewBox="0 0 70 70" fill="none" stroke="#262626" strokeWidth="1.5" className={className}>
          <circle cx="35" cy="35" r="26" fill="#E7E5E4" stroke="#171717" strokeWidth="2.5" />
          <circle cx="35" cy="35" r="22" stroke="#78716C" strokeWidth="1" />
          <line x1="20" y1="20" x2="50" y2="50" stroke="#78716C" strokeWidth="1.5" />
          <line x1="50" y1="20" x2="20" y2="50" stroke="#78716C" strokeWidth="1.5" />
        </svg>
      );
    case 'decorative_partition':
      return (
        <svg viewBox="0 0 110 30" fill="none" stroke="#262626" strokeWidth="1.5" className={className}>
          <rect x="4" y="6" width="102" height="18" rx="3" fill="#FEF3C7" stroke="#D97706" strokeWidth="2" />
          <line x1="14" y1="6" x2="14" y2="24" stroke="#B45309" strokeWidth="2" />
          <line x1="24" y1="6" x2="24" y2="24" stroke="#B45309" strokeWidth="2" />
          <line x1="34" y1="6" x2="34" y2="24" stroke="#B45309" strokeWidth="2" />
          <line x1="44" y1="6" x2="44" y2="24" stroke="#B45309" strokeWidth="2" />
          <line x1="54" y1="6" x2="54" y2="24" stroke="#B45309" strokeWidth="2" />
          <line x1="64" y1="6" x2="64" y2="24" stroke="#B45309" strokeWidth="2" />
          <line x1="74" y1="6" x2="74" y2="24" stroke="#B45309" strokeWidth="2" />
          <line x1="84" y1="6" x2="84" y2="24" stroke="#B45309" strokeWidth="2" />
          <line x1="94" y1="6" x2="94" y2="24" stroke="#B45309" strokeWidth="2" />
        </svg>
      );
    default:
      return (
        <svg viewBox="0 0 60 60" fill="none" stroke="#262626" strokeWidth="1.5" className={className}>
          <rect x="6" y="6" width="48" height="48" rx="4" fill="#F5F5F4" />
        </svg>
      );
  }
};
