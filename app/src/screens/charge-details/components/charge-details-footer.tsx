import { router } from 'expo-router';
import { Bell, Check } from 'lucide-react-native';
import { useRef } from 'react';
import { View } from 'react-native';

import { Button, SubpageFooter, type AppSheetRef } from '@/components';
import { MarkPaidSheet } from '@/sheets/mark-paid';
import type { HomeTarget } from '@splithouse/shared';
import type { ChargeDetailsFooterProps } from '../types';

const ICONS = { check: Check, bell: Bell } as const;

/**
 * The sticky footer: Nudge or Nudge again above Mark paid, as the server sends them. Mark paid opens
 * the Mark paid sheet on this charge; Nudge opens the payer's Recipient page on this charge until
 * the Nudge sheet exists (12B). After a save or a nudge the page refetches in place.
 */
export function ChargeDetailsFooter({ actions }: ChargeDetailsFooterProps) {
  const markPaid = useRef<AppSheetRef>(null);
  const markPaidTarget = actions
    .map((a) => a.target)
    .find((t): t is Extract<HomeTarget, { kind: 'mark-paid' }> => t.kind === 'mark-paid');

  const openTarget = (target: HomeTarget) => {
    switch (target.kind) {
      case 'mark-paid':
        markPaid.current?.open();
        return;
      case 'recipient':
        router.push({
          pathname: '/recipient/[month]/[personId]',
          params: {
            month: target.month,
            personId: target.personId,
            ...(target.chargeId ? { chargeId: target.chargeId } : {}),
          },
        });
        return;
      default:
        // Charge details only sends Nudge and Mark paid.
        return;
    }
  };

  return (
    <>
      <SubpageFooter>
        <View className="gap-2">
          {actions.map((action) => (
            <Button
              key={action.label}
              label={action.label}
              variant={action.tone}
              icon={action.icon ? ICONS[action.icon] : undefined}
              onPress={() => openTarget(action.target)}
            />
          ))}
        </View>
      </SubpageFooter>
      {markPaidTarget ? <MarkPaidSheet ref={markPaid} chargeId={markPaidTarget.chargeId} /> : null}
    </>
  );
}
