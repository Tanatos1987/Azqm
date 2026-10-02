import type { OffLookupResult } from '@/types';

/**
 * Free, keyless barcode lookup via OpenFoodFacts.
 * https://world.openfoodfacts.org/data
 */
export async function lookupBarcode(code: string): Promise<OffLookupResult | null> {
  const res = await fetch(`https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(code)}.json`);
  if (!res.ok) {
    throw new Error(`OpenFoodFacts грешка (${res.status})`);
  }
  const json = await res.json();
  if (json?.status !== 1 || !json?.product) {
    return null;
  }
  const p = json.product;
  const n = p.nutriments ?? {};
  const num = (v: any) => (typeof v === 'number' ? v : Number(v) || 0);
  const servingQuantity = p.serving_quantity != null ? Number(p.serving_quantity) : undefined;

  return {
    name: p.product_name || p.generic_name || `Продукт ${code}`,
    per100g: {
      calories: num(n['energy-kcal_100g']),
      protein: num(n['proteins_100g']),
      fat: num(n['fat_100g']),
      carbs: num(n['carbohydrates_100g']),
      fiber: num(n['fiber_100g']),
    },
    servingGrams: servingQuantity && Number.isFinite(servingQuantity) ? servingQuantity : undefined,
  };
}
