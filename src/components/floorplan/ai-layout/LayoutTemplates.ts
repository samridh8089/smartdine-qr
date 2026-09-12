// Layout Templates for SmartDine AI Floor Planner Engine
// Provides architectural archetypes, zoning rules, and style profiles.

export type LayoutArchetype = 'open_dining' | 'family_booth' | 'fast_service' | 'premium_lounge';

export interface LayoutArchetypeConfig {
  id: LayoutArchetype;
  title: string;
  badge: string;
  theme: string;
  tagline: string;
  description: string;
  primaryShape: 'square' | 'circle' | 'booth' | 'sofa_lounge';
  boothRatio: number; // 0.0 to 1.0
  aisleWidthPx: number;
  tableSpacingPx: number;
  perimeterPaddingPx: number;
  focalPoint: 'center' | 'perimeter' | 'bar' | 'lounge';
  preferredMaterial: 'walnut' | 'marble' | 'olive_leather' | 'warm_fabric';
}

export const LAYOUT_ARCHETYPES: Record<LayoutArchetype, LayoutArchetypeConfig> = {
  open_dining: {
    id: 'open_dining',
    title: 'Open Dining',
    badge: 'Popular Choice',
    theme: 'Spacious & Social',
    tagline: 'Airy, communal dining with continuous natural light & wide walkways.',
    description: 'Features a balanced mix of 4-seater and 6-seater tables with wide central arteries for effortless guest and waitstaff movement.',
    primaryShape: 'square',
    boothRatio: 0.15,
    aisleWidthPx: 120,
    tableSpacingPx: 95,
    perimeterPaddingPx: 60,
    focalPoint: 'center',
    preferredMaterial: 'walnut'
  },
  family_booth: {
    id: 'family_booth',
    title: 'Family Booth Layout',
    badge: 'Family Friendly',
    theme: 'Cozy & Intimate',
    tagline: 'Perimeter banquettes, sound-dampened booths & high group capacity.',
    description: 'Maximizes comfortable wall-aligned booth seating with olive green leather cushions, providing semi-private dining pockets for families and parties.',
    primaryShape: 'booth',
    boothRatio: 0.65,
    aisleWidthPx: 110,
    tableSpacingPx: 85,
    perimeterPaddingPx: 50,
    focalPoint: 'perimeter',
    preferredMaterial: 'olive_leather'
  },
  fast_service: {
    id: 'fast_service',
    title: 'Fast Service Layout',
    badge: 'High Turnover',
    theme: 'Efficient & Quick Transit',
    tagline: 'Rapid kitchen-to-table transit, bar seating & high throughput.',
    description: 'Designed for quick-service cafés and lunch spots with high table density, streamlined pickup lanes, and bar high-tops near the entrance.',
    primaryShape: 'square',
    boothRatio: 0.1,
    aisleWidthPx: 130,
    tableSpacingPx: 80,
    perimeterPaddingPx: 45,
    focalPoint: 'bar',
    preferredMaterial: 'marble'
  },
  premium_lounge: {
    id: 'premium_lounge',
    title: 'Premium Lounge Layout',
    badge: 'Fine Dining & VIP',
    theme: 'Luxury & Acoustic Comfort',
    tagline: 'L-shaped lounges, marble tops, plush velvet seating & botanical dividers.',
    description: 'Ultra-comfortable layout featuring corner VIP lounges, marble tops, generous personal space, and decorative room partitions.',
    primaryShape: 'sofa_lounge',
    boothRatio: 0.5,
    aisleWidthPx: 140,
    tableSpacingPx: 110,
    perimeterPaddingPx: 70,
    focalPoint: 'lounge',
    preferredMaterial: 'marble'
  }
};
