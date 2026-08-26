/**
 * Inventory Unit Conversion & Calculation Engine for CleverOps
 * Supports Weight, Volume, Count, Packaging, Culinary, and Custom Units.
 */

export type MassUnit = 'gram' | 'g' | 'kg' | 'kilogram' | 'mg' | 'milligram';
export type VolumeUnit = 'ml' | 'millilitre' | 'l' | 'litre' | 'tbsp' | 'tablespoon' | 'tsp' | 'teaspoon';
export type CountUnit = 'piece' | 'pcs' | 'unit' | 'dozen';
export type PackagingUnit = 'packet' | 'box' | 'bottle' | 'can' | 'jar' | 'bag' | 'pouch' | 'tray' | 'crate';

export type InventoryUnit = MassUnit | VolumeUnit | CountUnit | PackagingUnit | string;

export interface UnitCategoryMapping {
  category: 'mass' | 'volume' | 'count';
  toBaseFactor: number; // Factor to multiply by to convert to base unit
  baseUnit: string;
}

export const UNIT_MAP: Record<string, UnitCategoryMapping> = {
  // Mass (Base: gram)
  gram: { category: 'mass', toBaseFactor: 1, baseUnit: 'gram' },
  g: { category: 'mass', toBaseFactor: 1, baseUnit: 'gram' },
  kg: { category: 'mass', toBaseFactor: 1000, baseUnit: 'gram' },
  kilogram: { category: 'mass', toBaseFactor: 1000, baseUnit: 'gram' },
  mg: { category: 'mass', toBaseFactor: 0.001, baseUnit: 'gram' },
  milligram: { category: 'mass', toBaseFactor: 0.001, baseUnit: 'gram' },

  // Volume (Base: ml)
  ml: { category: 'volume', toBaseFactor: 1, baseUnit: 'ml' },
  millilitre: { category: 'volume', toBaseFactor: 1, baseUnit: 'ml' },
  litre: { category: 'volume', toBaseFactor: 1000, baseUnit: 'ml' },
  l: { category: 'volume', toBaseFactor: 1000, baseUnit: 'ml' },
  tbsp: { category: 'volume', toBaseFactor: 15, baseUnit: 'ml' },
  tablespoon: { category: 'volume', toBaseFactor: 15, baseUnit: 'ml' },
  tsp: { category: 'volume', toBaseFactor: 5, baseUnit: 'ml' },
  teaspoon: { category: 'volume', toBaseFactor: 5, baseUnit: 'ml' },

  // Count (Base: piece)
  piece: { category: 'count', toBaseFactor: 1, baseUnit: 'piece' },
  pcs: { category: 'count', toBaseFactor: 1, baseUnit: 'piece' },
  unit: { category: 'count', toBaseFactor: 1, baseUnit: 'piece' },
  dozen: { category: 'count', toBaseFactor: 12, baseUnit: 'piece' },

  // Packaging (Base: piece)
  packet: { category: 'count', toBaseFactor: 1, baseUnit: 'piece' },
  box: { category: 'count', toBaseFactor: 1, baseUnit: 'piece' },
  bottle: { category: 'count', toBaseFactor: 1, baseUnit: 'piece' },
  can: { category: 'count', toBaseFactor: 1, baseUnit: 'piece' },
  jar: { category: 'count', toBaseFactor: 1, baseUnit: 'piece' },
  bag: { category: 'count', toBaseFactor: 1, baseUnit: 'piece' },
  pouch: { category: 'count', toBaseFactor: 1, baseUnit: 'piece' },
  tray: { category: 'count', toBaseFactor: 1, baseUnit: 'piece' },
  crate: { category: 'count', toBaseFactor: 1, baseUnit: 'piece' }
};

export const STANDARD_UNIT_GROUPS = [
  {
    group: 'Weight',
    options: [
      { value: 'gram', label: 'gram (g)' },
      { value: 'kg', label: 'kilogram (kg)' },
      { value: 'mg', label: 'milligram (mg)' }
    ]
  },
  {
    group: 'Volume',
    options: [
      { value: 'ml', label: 'millilitre (ml)' },
      { value: 'litre', label: 'litre (l)' },
      { value: 'tbsp', label: 'tablespoon (tbsp ~15ml)' },
      { value: 'tsp', label: 'teaspoon (tsp ~5ml)' }
    ]
  },
  {
    group: 'Count',
    options: [
      { value: 'piece', label: 'piece (pcs)' },
      { value: 'dozen', label: 'dozen (12 pcs)' },
      { value: 'unit', label: 'unit' }
    ]
  },
  {
    group: 'Packaging',
    options: [
      { value: 'packet', label: 'packet' },
      { value: 'box', label: 'box' },
      { value: 'bottle', label: 'bottle' },
      { value: 'can', label: 'can' },
      { value: 'jar', label: 'jar' },
      { value: 'bag', label: 'bag' },
      { value: 'pouch', label: 'pouch' },
      { value: 'tray', label: 'tray' },
      { value: 'crate', label: 'crate' }
    ]
  }
];

/**
 * Normalizes unit string to standard lowercase format
 */
export function normalizeUnit(unit: string): string {
  if (!unit) return 'piece';
  const norm = unit.toLowerCase().trim();
  if (norm === 'g' || norm === 'grams') return 'gram';
  if (norm === 'kilograms') return 'kg';
  if (norm === 'milligrams') return 'mg';
  if (norm === 'l' || norm === 'litres' || norm === 'liters') return 'litre';
  if (norm === 'millilitres' || norm === 'milliliters') return 'ml';
  if (norm === 'pcs' || norm === 'pieces') return 'piece';
  if (norm === 'tbsp' || norm === 'tablespoons') return 'tablespoon';
  if (norm === 'tsp' || norm === 'teaspoons') return 'teaspoon';
  if (norm === 'packets') return 'packet';
  if (norm === 'boxes') return 'box';
  if (norm === 'bottles') return 'bottle';
  if (norm === 'cans') return 'can';
  if (norm === 'jars') return 'jar';
  if (norm === 'bags') return 'bag';
  if (norm === 'pouches') return 'pouch';
  if (norm === 'trays') return 'tray';
  if (norm === 'crates') return 'crate';
  if (norm === 'dozens') return 'dozen';
  return norm;
}

/**
 * Checks whether a unit string is standard or custom
 */
export function isStandardUnit(unit: string): boolean {
  const norm = normalizeUnit(unit);
  return Boolean(UNIT_MAP[norm]);
}

/**
 * Checks whether two units are dimensionally compatible (e.g. mass-to-mass or volume-to-volume)
 */
export function areUnitsCompatible(unitA: string, unitB: string): boolean {
  const normA = normalizeUnit(unitA);
  const normB = normalizeUnit(unitB);
  
  if (normA === normB) return true;

  const mapA = UNIT_MAP[normA];
  const mapB = UNIT_MAP[normB];

  if (!mapA || !mapB) return false;
  return mapA.category === mapB.category;
}

/**
 * Converts a quantity from one unit to another compatible unit.
 */
export function convertUnit(quantity: number, fromUnit: string, toUnit: string): number {
  if (isNaN(quantity) || quantity === 0) return 0;

  const normFrom = normalizeUnit(fromUnit);
  const normTo = normalizeUnit(toUnit);

  if (normFrom === normTo) return quantity;

  const mapFrom = UNIT_MAP[normFrom];
  const mapTo = UNIT_MAP[normTo];

  if (!mapFrom || !mapTo || mapFrom.category !== mapTo.category) {
    throw new Error(`Incompatible unit conversion from "${fromUnit}" to "${toUnit}".`);
  }

  // Convert to base unit first, then to target unit
  const inBase = quantity * mapFrom.toBaseFactor;
  const inTarget = inBase / mapTo.toBaseFactor;

  return parseFloat(inTarget.toFixed(6));
}

/**
 * Formats quantity and unit cleanly for UI display
 */
export function formatQuantityWithUnit(quantity: number, unit: string): string {
  const norm = normalizeUnit(unit);
  const val = Number(quantity || 0);

  if (norm === 'gram' && val >= 1000) {
    return `${(val / 1000).toFixed(2).replace(/\.00$/, '')} kg`;
  }
  if (norm === 'ml' && val >= 1000) {
    return `${(val / 1000).toFixed(2).replace(/\.00$/, '')} litre`;
  }
  return `${val.toFixed(2).replace(/\.00$/, '')} ${unit || 'unit'}`;
}

/**
 * Formats reserved stock quantity for display according to user specifications:
 * - If < 1 kg, display in grams (e.g., 0.01 kg -> 10 g, 0.15 kg -> 150 g)
 * - If < 1 L, display in millilitres (e.g., 0.25 L -> 250 ml)
 * - If >= 1 kg or >= 1 L, display in kg or L (e.g., 1.5 kg, 2 L)
 * Display-only formatting; database values remain unchanged.
 */
export function formatReservedStockDisplay(quantity: number, unit: string): string {
  const val = Number(quantity || 0);
  if (val <= 0) return `0 ${unit || 'kg'}`;

  const norm = (unit || '').toLowerCase().trim();

  // Mass / Weight: kg, kilogram, g, gram
  if (['kg', 'kilogram', 'kilograms', 'kgs'].includes(norm)) {
    if (val < 1) {
      const grams = Math.round(val * 1000);
      return `${grams} g`;
    }
    return `${parseFloat(val.toFixed(3))} kg`;
  }
  if (['g', 'gram', 'grams', 'gm', 'gms'].includes(norm)) {
    if (val >= 1000) {
      return `${parseFloat((val / 1000).toFixed(3))} kg`;
    }
    return `${Math.round(val)} g`;
  }

  // Volume: l, litre, liter, ml
  if (['l', 'litre', 'liter', 'ltr', 'litres', 'liters'].includes(norm)) {
    if (val < 1) {
      const ml = Math.round(val * 1000);
      return `${ml} ml`;
    }
    return `${parseFloat(val.toFixed(3))} L`;
  }
  if (['ml', 'millilitre', 'milliliter', 'mls'].includes(norm)) {
    if (val >= 1000) {
      return `${parseFloat((val / 1000).toFixed(3))} L`;
    }
    return `${Math.round(val)} ml`;
  }

  return `${parseFloat(val.toFixed(3))} ${unit || ''}`;
}

/**
 * Calculates possible servings of a recipe from available stock of an ingredient.
 */
export function getPossibleServings(
  availableStock: number, 
  stockUnit: string, 
  requiredQty: number, 
  recipeUnit: string
): number {
  const stock = Number(availableStock || 0);
  const req = Number(requiredQty || 0);

  if (req <= 0) return 9999;
  if (stock <= 0) return 0;

  const normStock = normalizeUnit(stockUnit);
  const normRecipe = normalizeUnit(recipeUnit);

  if (normStock === normRecipe) {
    return Math.max(0, Math.floor(stock / req));
  }

  if (areUnitsCompatible(normStock, normRecipe)) {
    try {
      const reqInStockUnit = convertUnit(req, normRecipe, normStock);
      if (reqInStockUnit <= 0) return 9999;
      return Math.max(0, Math.floor(stock / reqInStockUnit));
    } catch {
      return Math.max(0, Math.floor(stock / req));
    }
  }

  return Math.max(0, Math.floor(stock / req));
}
