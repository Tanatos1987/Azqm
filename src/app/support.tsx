import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, View } from 'react-native';
import { router } from 'expo-router';
import { Button, Card, IconButton, Row, Screen, SectionHeader, Txt } from '@/components/ui';
import { ChevronLeftIcon, HeartIcon } from '@/components/icons';
import { SUPPORT_SKUS, usePro } from '@/context/ProContext';
import { useToast } from '@/context/ToastContext';
import { useTheme } from '@/theme/ThemeContext';
import { useI18n } from '@/i18n';

/** How long to wait for prices before saying Google Play didn't answer. */
const PRICE_TIMEOUT_MS = 12000;

export default function SupportScreen() {
  const t = useTheme();
  const { tr } = useI18n();
  const toast = useToast();
  const { isPro, storeReady, products, busy, buy, restore } = usePro();
  const [waitedLong, setWaitedLong] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setWaitedLong(true), PRICE_TIMEOUT_MS);
    return () => clearTimeout(timer);
  }, []);

  // Our own names for the three amounts; the prices come from Google Play in the buyer's currency.
  const tiers: Record<string, { emoji: string; name: string }> = {
    [SUPPORT_SKUS[0]]: { emoji: '☕', name: tr('Кафе', 'A coffee') },
    [SUPPORT_SKUS[1]]: { emoji: '🥗', name: tr('Обяд', 'A lunch') },
    [SUPPORT_SKUS[2]]: { emoji: '💚', name: tr('Голяма благодарност', 'A big thank you') },
  };

  const onRestore = async () => {
    const found = await restore();
    if (found === true) toast.show(tr('Pro е възстановен', 'Pro restored'));
    else if (found === false) Alert.alert(tr('Няма покупка', 'No purchase found'), tr('Не намерихме подкрепа от този Google акаунт.', 'We found no support purchase on this Google account.'));
    else Alert.alert(tr('Google Play не е достъпен', 'Google Play isn’t available'), tr('Провери интернета и опитай отново.', 'Check your internet connection and try again.'));
  };

  return (
    <Screen
      title={tr('Подкрепи Azqm', 'Support Azqm')}
      scroll
      left={
        <IconButton onPress={() => router.back()} accessibilityLabel={tr('Назад', 'Back')}>
          <ChevronLeftIcon size={24} color={t.c.text} />
        </IconButton>
      }
    >
      <Card style={{ gap: 10 }}>
        <Row gap={12}>
          <HeartIcon size={30} color={t.c.accent} filled={isPro} />
          <Txt v="h3" style={{ flex: 1 }}>
            {isPro ? tr('Pro е отключен — благодаря!', 'Pro is unlocked — thank you!') : tr('Без реклами. Без регистрация. Завинаги.', 'No ads. No sign-up. For good.')}
          </Txt>
        </Row>
        <Txt tone="textMuted">
          {tr(
            'Azqm е безплатно и данните ти остават на телефона. Ако приложението ти помага, подкрепи разработката с еднократна сума по избор — всяка от тях отключва Azqm Pro завинаги.',
            'Azqm is free and your data stays on your phone. If the app helps you, support its development with a one-time amount of your choice — any of them unlocks Azqm Pro for good.'
          )}
        </Txt>
      </Card>

      <SectionHeader title={tr('Какво включва Pro', 'What Pro includes')} />
      <Card style={{ gap: 12 }}>
        <Perk emoji="📸" title={tr('Снимки за прогрес', 'Progress photos')} text={tr('Отпред, отстрани и отзад, с контур от предишната снимка и самоснимачка.', 'Front, side and back, with an outline of your previous photo and a self-timer.')} />
        <Perk emoji="↔️" title={tr('Сравнение преди и след', 'Before and after')} text={tr('Плъзгач върху две снимки, с датите и теглото.', 'A slider across two photos, with the dates and your weight.')} />
        <Perk emoji="🔒" title={tr('Само на телефона ти', 'Only on your phone')} text={tr('Снимките не отиват в галерията и не се качват никъде.', 'Photos don’t go to your gallery and are never uploaded.')} />
        <Perk emoji="✨" title={tr('Бъдещите Pro функции', 'Future Pro features')} text={tr('Без абонамент и без доплащане.', 'No subscription, nothing more to pay.')} />
      </Card>

      <SectionHeader title={isPro ? tr('Подкрепи още', 'Support again') : tr('Избери сума', 'Choose an amount')} />
      {products.length > 0 ? (
        products.map((p) => {
          const tier = tiers[p.id];
          return (
            <Card key={p.id}>
              <Row gap={12}>
                <Txt style={{ fontSize: 26 }}>{tier?.emoji ?? '💚'}</Txt>
                <View style={{ flex: 1 }}>
                  <Txt v="bodyStrong">{tier?.name ?? p.title}</Txt>
                  <Txt v="h3" tone="accent">
                    {p.displayPrice}
                  </Txt>
                </View>
                <Button label={tr('Подкрепи', 'Support')} small disabled={busy} onPress={() => buy(p.id)} />
              </Row>
            </Card>
          );
        })
      ) : (
        <Card style={{ alignItems: 'center', gap: 10, paddingVertical: 22 }}>
          {storeReady && !waitedLong ? (
            <>
              <ActivityIndicator color={t.c.accent} />
              <Txt v="small" tone="textMuted">
                {tr('Зареждам цените от Google Play…', 'Loading prices from Google Play…')}
              </Txt>
            </>
          ) : (
            <Txt tone="textMuted" center>
              {tr('Google Play не отговаря в момента. Провери интернета и отвори екрана отново.', 'Google Play isn’t answering right now. Check your internet connection and open this screen again.')}
            </Txt>
          )}
        </Card>
      )}

      <Button label={tr('Възстанови покупка', 'Restore purchase')} variant="secondary" disabled={busy} onPress={onRestore} style={{ marginTop: 6 }} />
      <Txt v="caption" tone="textFaint" center style={{ marginTop: 14 }}>
        {tr(
          'Плащането минава през Google Play; Azqm не вижда данните на картата ти. Подкрепата е еднократна и важи за всички телефони с този Google акаунт.',
          'Payment goes through Google Play; Azqm never sees your card details. Support is one-time and applies to every phone with this Google account.'
        )}
      </Txt>
    </Screen>
  );
}

function Perk({ emoji, title, text }: { emoji: string; title: string; text: string }) {
  return (
    <Row gap={12} style={{ alignItems: 'flex-start' }}>
      <Txt style={{ fontSize: 22, width: 30 }}>{emoji}</Txt>
      <View style={{ flex: 1 }}>
        <Txt v="bodyStrong">{title}</Txt>
        <Txt v="small" tone="textMuted">
          {text}
        </Txt>
      </View>
    </Row>
  );
}
