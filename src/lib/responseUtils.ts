/**
 * SmartDine Response Payload Minifier & Cleaner Utility
 * Strips null, undefined, empty array properties, and redundant nested structures to optimize API JSON transfer sizes.
 */

export function stripNullAndUndefined<T>(obj: T): T {
  if (obj === null || obj === undefined) {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(item => stripNullAndUndefined(item)) as unknown as T;
  }

  if (typeof obj === 'object' && !(obj instanceof Date)) {
    const cleaned: Record<string, any> = {};
    for (const [key, value] of Object.entries(obj)) {
      if (value !== null && value !== undefined && value !== '') {
        cleaned[key] = stripNullAndUndefined(value);
      }
    }
    return cleaned as T;
  }

  return obj;
}

export function compactMenuPayload(categories: any[], menuItems: any[]) {
  const cleanCategories = categories.map(cat => ({
    id: cat.id,
    name: cat.name,
    sort_order: cat.sort_order,
    is_active: cat.is_active
  }));

  const cleanItems = menuItems.map(item => ({
    id: item.id,
    category_id: item.category_id,
    name: item.name,
    description: item.description || undefined,
    price: Number(item.price),
    image_url: item.image_url || undefined,
    is_available: item.is_available,
    is_veg: item.is_veg,
    is_spicy: item.is_spicy || undefined,
    has_variants: item.has_variants || undefined,
    variants: item.variants ? item.variants.map((v: any) => ({
      id: v.id,
      name: v.name,
      price: Number(v.price),
      is_available: v.is_available
    })) : undefined
  }));

  return stripNullAndUndefined({
    categories: cleanCategories,
    menuItems: cleanItems
  });
}
