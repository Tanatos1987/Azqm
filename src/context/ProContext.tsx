/**
 * Azqm Pro. Everything the app had before 1.3.0 stays free; Pro features (progress photos) unlock with a one-time
 * "support Azqm" purchase in Google Play — any of the three amounts unlocks Pro for good (non-consumable products,
 * so Google Play restores them on a new phone).
 *
 * Purchases go straight to Google Play Billing (expo-iap), no server: the result is cached in AsyncStorage so Pro
 * works offline, and re-checked against Google Play on every start. Pro is only taken away when Google Play
 * answers and the purchase is gone (refunded). Purchases are acknowledged on every check too — Google refunds
 * unacknowledged purchases after 3 days.
 */
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { ErrorCode, getAvailablePurchases, useIAP, type Product, type Purchase } from 'expo-iap';
import { tr } from '@/i18n';

/** In-app products in Play Console (one-time, ascending amounts). */
export const SUPPORT_SKUS: readonly string[] = ['support_small', 'support_medium', 'support_large'];

const STORE_KEY = 'azqm.pro';
/** "Azqm Preview" builds (CI, app id …preview) aren't in Google Play and can't buy, so they get Pro for testing. */
const PREVIEW = Constants.expoConfig?.android?.package?.endsWith('.preview') ?? false;

const isSupport = (p: Purchase) => SUPPORT_SKUS.includes(p.productId);

interface ProValue {
  isPro: boolean;
  loaded: boolean;
  /** Google Play is connected (products and restore work). */
  storeReady: boolean;
  /** The support products, cheapest first; empty until Google Play answers. */
  products: Product[];
  busy: boolean;
  buy: (sku: string) => Promise<void>;
  /** Asks Google Play for earlier purchases; null when Google Play couldn't be reached. */
  restore: () => Promise<boolean | null>;
}

const ProContext = createContext<ProValue | null>(null);

export function ProProvider({ children }: { children: React.ReactNode }) {
  const [owned, setOwned] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(STORE_KEY)
      .then((v) => setOwned(v === '1'))
      .catch(() => {})
      .finally(() => setLoaded(true));
  }, []);

  const remember = useCallback((value: boolean) => {
    setOwned(value);
    AsyncStorage.setItem(STORE_KEY, value ? '1' : '0').catch(() => {});
  }, []);

  const { connected, products, fetchProducts, requestPurchase, finishTransaction } = useIAP({
    onPurchaseSuccess: async (purchase) => {
      setBusy(false);
      if (!isSupport(purchase)) return;
      if (purchase.purchaseState !== 'purchased') {
        // Cash and some bank payments stay pending for a while; the next check after they clear unlocks Pro.
        Alert.alert(
          tr('Плащането се обработва', 'Payment is processing'),
          tr('Ще отключим Pro, щом Google Play потвърди плащането.', 'Pro unlocks as soon as Google Play confirms the payment.')
        );
        return;
      }
      await finishTransaction({ purchase, isConsumable: false }).catch(() => {});
      remember(true);
      Alert.alert(tr('Благодаря! 💚', 'Thank you! 💚'), tr('Подкрепата ти помага Azqm да остане без реклами. Pro е отключен.', 'Your support keeps Azqm ad-free. Pro is unlocked.'));
    },
    onPurchaseError: (error) => {
      setBusy(false);
      if (error.code === ErrorCode.UserCancelled) return;
      if (error.code === ErrorCode.AlreadyOwned) {
        remember(true);
        return;
      }
      Alert.alert(tr('Плащането не мина', 'The payment didn’t go through'), error.message);
    },
    // Failed product/purchase queries leave the cached state as it is.
    onError: () => {},
  });

  const sync = useCallback(async (): Promise<boolean | null> => {
    let purchases: Purchase[];
    try {
      purchases = await getAvailablePurchases();
    } catch {
      return null;
    }
    const mine = purchases.filter((p) => isSupport(p) && p.purchaseState === 'purchased');
    for (const p of mine) {
      if ('isAcknowledgedAndroid' in p && p.isAcknowledgedAndroid === false) await finishTransaction({ purchase: p, isConsumable: false }).catch(() => {});
    }
    remember(mine.length > 0);
    return mine.length > 0;
  }, [finishTransaction, remember]);

  useEffect(() => {
    if (!connected) return;
    fetchProducts({ skus: [...SUPPORT_SKUS], type: 'in-app' }).catch(() => {});
    // setState happens after the awaited Google Play query.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    sync();
  }, [connected, fetchProducts, sync]);

  const buy = useCallback(
    async (sku: string) => {
      setBusy(true);
      try {
        await requestPurchase({ request: { google: { skus: [sku] } }, type: 'in-app' });
      } catch {
        // The error also arrives in onPurchaseError, which explains it to the user.
      } finally {
        setBusy(false);
      }
    },
    [requestPurchase]
  );

  const restore = useCallback(async () => {
    setBusy(true);
    try {
      return await sync();
    } finally {
      setBusy(false);
    }
  }, [sync]);

  const value = useMemo<ProValue>(() => {
    const support = products.filter((p) => SUPPORT_SKUS.includes(p.id)).sort((a, b) => SUPPORT_SKUS.indexOf(a.id) - SUPPORT_SKUS.indexOf(b.id));
    return { isPro: PREVIEW || owned, loaded, storeReady: connected, products: support, busy, buy, restore };
  }, [owned, loaded, connected, products, busy, buy, restore]);

  return <ProContext.Provider value={value}>{children}</ProContext.Provider>;
}

export function usePro(): ProValue {
  const ctx = useContext(ProContext);
  if (!ctx) throw new Error('usePro must be used inside <ProProvider>');
  return ctx;
}
