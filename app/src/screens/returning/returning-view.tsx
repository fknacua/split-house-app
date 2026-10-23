import { Image } from 'expo-image';
import { Check } from 'lucide-react-native';
import { Text, View } from 'react-native';

import { Card, Icon, Screen, Spinner } from '@/components';

// Same animated app icon as Sign in, in place of the design's house glyph tile.
const APP_ICON = require('../../../assets/images/app-icon/splithouse-squircle-loop.webp');

/**
 * The two states of the returning-user loading screen. `Returning.dc.html` draws only
 * `loading`; `reminders` is the next step of the same checklist.
 */
export type ReturningState = 'loading' | 'reminders';

type StepStatus = 'done' | 'busy' | 'wait';

const STEPS: Record<ReturningState, { label: string; status: StepStatus }[]> = {
  loading: [
    { label: 'Signed in with Google', status: 'done' },
    { label: 'Loading your household and bills', status: 'busy' },
    { label: 'Setting up your reminders', status: 'wait' },
  ],
  reminders: [
    { label: 'Signed in with Google', status: 'done' },
    { label: 'Loading your household and bills', status: 'done' },
    { label: 'Setting up your reminders', status: 'busy' },
  ],
};

/**
 * The round marker in front of a step: a check when done, a bare spinner while busy, an empty ring
 * while waiting. Every state fills the same 28px box, so the labels line up in all of them.
 *
 * Each state is its own element with fixed classes and its own `key`, so a step that changes
 * state is mounted fresh. Restyling one View from "no border" to "border and fill" lost the
 * rounded corners on device (NativeWind), leaving a square.
 */
function StepMarker({ status }: { status: StepStatus }) {
  if (status === 'done') {
    return (
      <View
        key="done"
        className="h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 border-success-container bg-success-container"
      >
        <Icon as={Check} size={14} strokeWidth={3} className="text-on-success-container" />
      </View>
    );
  }
  if (status === 'busy') {
    return (
      <View key="busy" className="h-7 w-7 shrink-0 items-center justify-center">
        <Spinner accessibilityLabel="In progress" />
      </View>
    );
  }
  return <View key="wait" className="h-7 w-7 shrink-0 rounded-full border-2 border-outline-variant" />;
}

/**
 * Loading screen shown after sign-in on a phone that already has household data: a short
 * checklist while the app fetches the household and bills and sets up reminders again. Pure
 * view; the container that drives the steps comes with the bootstrap endpoint (step 3.5).
 *
 * @param state - Which step is in progress. Defaults to `loading`.
 */
export function ReturningView({ state = 'loading' }: { state?: ReturningState }) {
  return (
    <Screen>
      <View className="flex-1 justify-center gap-8 px-6 pb-7">
        <View className="items-start gap-4">
          <Image
            source={APP_ICON}
            style={{ width: 64, height: 64 }}
            accessibilityElementsHidden
          />
          <Text className="font-manrope-extrabold text-title text-on-surface">
            Getting things ready
          </Text>
          <Text className="font-manrope-medium text-body text-on-surface-variant">
            You’re signed in. Your household and bills are loading, and your reminders are being set
            up again on this phone.
          </Text>
        </View>

        <Card padded={false} className="px-4 py-2">
          {STEPS[state].map((step, i) => (
            <View
              key={`${step.label}-${step.status}`}
              className={`min-h-14 flex-row items-center gap-[14px] ${
                i === 0 ? '' : 'border-t border-outline-variant'
              }`}
            >
              <StepMarker status={step.status} />
              <Text
                className={`text-label ${
                  step.status === 'wait'
                    ? 'font-manrope-medium text-on-surface-variant'
                    : 'font-manrope-bold text-on-surface'
                }`}
              >
                {step.label}
              </Text>
            </View>
          ))}
        </Card>
      </View>
    </Screen>
  );
}
