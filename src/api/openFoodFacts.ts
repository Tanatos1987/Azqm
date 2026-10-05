import { getLang, tr } from '@/i18n';
import type { OffLookupResult } from '@/types';

/**
 * Free, keyless barcode lookup via OpenFoodFacts.
 * https://world.openfoodfacts.org/data
 */
export async function lookupBarcode(code: string): Promise<OffLookupResult | null> {
  const res = await fetch(`https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(code)}.json`);
  if (!res.ok) {
    throw new Error(tr(`OpenFoodFacts грешка (${res.status})`, `OpenFoodFacts error (${res.status})`));
  }
  const json = await res.json();
  if (json?.status !== 1 || !json?.product) {
    return null;
  }
  const p = json.product;
  const n = p.nutriments ?? {};
  const num = (v: any) => (typeof v === 'number' ? v : Number(v) || 0);
  const servingQuantity = p.serving_quantity != null ? Number(p.serving_quantity) : undefined;
  // OFF stores sodium/salt in grams per 100 g.
  const sodiumG = n['sodium_100g'] != null ? num(n['sodium_100g']) : num(n['salt_100g']) * 0.4;
  const kcal = n['energy-kcal_100g'] != null ? num(n['energy-kcal_100g']) : num(n['energy_100g']) / 4.184;

  return {
    // Prefer the product name in the app language, then OFF's main name.
    name: (getLang() === 'en' ? p.product_name_en : p.product_name_bg) || p.product_name || p.generic_name || tr(`Продукт ${code}`, `Product ${code}`),
    per100: {
      kcal,
      protein: num(n['proteins_100g']),
      fat: num(n['fat_100g']),
      carbs: num(n['carbohydrates_100g']),
      fiber: num(n['fiber_100g']),
      sugar: num(n['sugars_100g']),
      satFat: num(n['saturated-fat_100g']),
      sodium: sodiumG * 1000,
    },
    servingGrams: servingQuantity && Number.isFinite(servingQuantity) && servingQuantity > 0 ? servingQuantity : undefined,
  };
}
