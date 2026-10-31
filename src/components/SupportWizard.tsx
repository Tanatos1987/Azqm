/**
 * The support wizard, in a sheet: 1) why donate, 2) what Pro gives, 3) pick an amount — the Google Play purchase
 * starts right here. Opened from the Today banner and by the occasional start-up prompt (which passes the number of
 * diary days at a milestone).
 */
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { router } from 'expo-router';
import { Button, Row, Sheet, Txt } from '@/components/ui';
import { PerkRow } from '@/components/PerkRow';
import { usePro } from '@/context/ProContext';
import { donationBenefits, proPerks, supportTiers } from '@/data/pro';
import { makeStyles, useTheme } from '@/theme/ThemeContext';
import { useI18n } from '@/i18n';

const LAST_STEP = 2;
/** How long to wait for prices before saying Google Play didn't answer (as on the support screen). */
const PRICE_TIMEOUT_MS = 12000;

/** `initialStep` 1: start at what Pro gives (the theme picker's "unlock" button). */
export function SupportWizard({ milestoneDays, initialStep = 0, onClose }: { milestoneDays?: number; initialStep?: number; onClose: () => void }) {
  const t = useTheme();
  const s = useStyles();
  const { tr } = useI18n();
  const { products, busy, buy, storeReady } = usePro();
  const [step, setStep] = useState(initialStep);
  const [waitedLong, setWaitedLong] = useState(false);
  const tiers = supportTiers();

  useEffect(() => {
    const timer = setTimeout(() => setWaitedLong(true), PRICE_TIMEOUT_MS);
    return () => clearTimeout(timer);
  }, []);

  return (
    <Sheet visible onClose={onClose}>
      <Row gap={6} style={{ justifyContent: 'center', marginBottom: 14 }}>
        {[0, 1, 2].map((i) => (
          <View key={i} style={[s.dot, i === step && s.dotOn]} />
        ))}
      </Row>

      {step === 0 && (
        <>
          {milestoneDays ? (
            <Txt v="bodyStrong" tone="accent" center style={{ marginBottom: 6 }}>
              🎉 {tr('{n} {n|ден|дни} с Azqm!', '{n} {n|day|days} with Azqm!', { n: milestoneDays })}
            </Txt>
          ) : null}
          <Txt v="h2" style={{ marginBottom: 14 }}>
            {tr('Защо да подкрепиш Azqm?', 'Why support Azqm?')}
          </Txt>
          <View style={s.list}>
            {donationBenefits().map((p) => (
              <PerkRow key={p.title} {...p} />
            ))}
          </View>
        </>
      )}

      {step === 1 && (
        <>
          <Txt v="h2" style={{ marginBottom: 14 }}>
            {tr('Какво получаваш с Pro', 'What you get with Pro')}
          </Txt>
          <View style={s.list}>
            {proPerks().map((p) => (
              <PerkRow key={p.title} {...p} />
            ))}
          </View>
        </>
      )}

      {step === 2 && (
        <>
          <Txt v="h2" style={{ marginBottom: 6 }}>
            {tr('Избери сума', 'Choose an amount')}
          </Txt>
          <Txt v="small" tone="textMuted" style={{ marginBottom: 14 }}>
            {tr('Всяка от тях отключва Pro завинаги.', 'Any of them unlocks Pro for good.')}
          </Txt>
          {products.length > 0 ? (
            products.map((p) => (
              <Row key={p.id} gap={12} style={s.tier}>
                <Txt style={{ fontSize: 24 }}>{tiers[p.id]?.emoji ?? '💚'}</Txt>
                <View style={{ flex: 1 }}>
                  <Txt v="bodyStrong">{tiers[p.id]?.name ?? p.title}</Txt>
                  <Txt v="h3" tone="accent">
                    {p.displayPrice}
                  </Txt>
                </View>
                <Button label={tr('Подкрепи', 'Support')} small disabled={busy} onPress={() => buy(p.id)} />
              </Row>
            ))
          ) : (
            <View style={[s.tier, { justifyContent: 'center' }]}>
              {storeReady && !waitedLong ? (
                <ActivityIndicator color={t.c.accent} />
              ) : (
                <Txt tone="textMuted" center>
                  {tr('Google Play не отговаря в момента. Провери интернета и отвори екрана отново.', 'Google Play isn’t answering right now. Check your internet connection and open this screen again.')}
                </Txt>
              )}
            </View>
          )}
          <Button
            label={tr('Още за Pro', 'More about Pro')}
            variant="ghost"
            small
            onPress={() => {
              onClose();
              router.push('/support');
            }}
          />
        </>
      )}

      <Row gap={10} style={{ marginTop: 16 }}>
        <Button label={step === 0 ? tr('Не сега', 'Not now') : tr('Назад', 'Back')} variant="secondary" flex onPress={() => (step === 0 ? onClose() : setStep(step - 1))} />
        {step < LAST_STEP ? (
          <Button label={tr('Напред', 'Next')} flex onPress={() => setStep(step + 1)} />
        ) : (
          <Button label={tr('Не сега', 'Not now')} variant="secondary" flex onPress={onClose} />
        )}
      </Row>
    </Sheet>
  );
}

const useStyles = makeStyles((t) => ({
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: t.c.border },
  dotOn: { width: 22, backgroundColor: t.c.accent },
  list: { gap: 14 },
  tier: { backgroundColor: t.c.surfaceAlt, borderRadius: 16, padding: 14, marginBottom: 10, minHeight: 64 },
}));
