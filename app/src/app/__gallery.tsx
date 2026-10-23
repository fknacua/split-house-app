import { Redirect } from 'expo-router';
import { useEffect, useState } from 'react';
import { View } from 'react-native';

import { ConnectedButtonGroup, ServerErrorDialog } from '@/components';
import { ReturningView, type ReturningState } from '@/screens/returning/returning-view';
import { SignInView, type SignInState } from '@/screens/sign-in/sign-in-view';

const SCREENS = [
  { label: 'Sign in', value: 'sign-in' },
  { label: 'Returning', value: 'returning' },
  { label: 'Server', value: 'server-error' },
] as const;

const SIGN_IN_STATES = [
  { label: 'Out', value: 'out' },
  { label: 'Signing', value: 'signing' },
  { label: 'Failed', value: 'failed' },
  { label: 'No access', value: 'notAllowed' },
  { label: 'Ended', value: 'ended' },
] as const;

const RETURNING_STATES = [
  { label: 'Loading', value: 'loading' },
  { label: 'Reminders', value: 'reminders' },
] as const;

/** Server error is blocking, so the gallery opens it from here; `closed` shows the bare page. */
type ServerErrorState = 'closed' | 'idle' | 'retrying';

const SERVER_ERROR_STATES = [
  { label: 'Closed', value: 'closed' },
  { label: 'Idle', value: 'idle' },
  { label: 'Retrying', value: 'retrying' },
] as const;

/** How long the Retrying state stays up in the gallery before it closes itself. */
const RETRYING_PREVIEW_MS = 4000;

/**
 * Dev-only gallery of screen states (plan: working rules, step 5). Absent from release builds.
 * Each screen built from here on adds its states below; the theme toggle is on the test page.
 */
export default function Gallery() {
  const [screen, setScreen] = useState<(typeof SCREENS)[number]['value']>('sign-in');
  const [signIn, setSignIn] = useState<SignInState>('out');
  const [returning, setReturning] = useState<ReturningState>('loading');
  const [serverError, setServerError] = useState<ServerErrorState>('closed');

  // The blocking prompt cannot be dismissed, so the preview of its Retrying state closes itself.
  useEffect(() => {
    if (serverError !== 'retrying') return;
    const timer = setTimeout(() => setServerError('closed'), RETRYING_PREVIEW_MS);
    return () => clearTimeout(timer);
  }, [serverError]);

  if (!__DEV__) return <Redirect href="/" />;

  return (
    <View className="flex-1 bg-background">
      <View className="absolute inset-x-0 bottom-0 z-10 gap-2 bg-surface p-3">
        <ConnectedButtonGroup
          fit
          label="Screen"
          value={screen}
          onChange={setScreen}
          options={SCREENS}
        />
        {screen === 'sign-in' ? (
          <ConnectedButtonGroup
            fit
            label="Sign in state"
            value={signIn}
            onChange={setSignIn}
            options={SIGN_IN_STATES}
          />
        ) : null}
        {screen === 'returning' ? (
          <ConnectedButtonGroup
            fit
            label="Returning state"
            value={returning}
            onChange={setReturning}
            options={RETURNING_STATES}
          />
        ) : null}
        {screen === 'server-error' ? (
          <ConnectedButtonGroup
            fit
            label="Server error state"
            value={serverError}
            onChange={setServerError}
            options={SERVER_ERROR_STATES}
          />
        ) : null}
      </View>
      {screen === 'sign-in' ? <SignInView state={signIn} onSignIn={() => {}} /> : null}
      {screen === 'returning' ? <ReturningView state={returning} /> : null}
      <ServerErrorDialog
        open={screen === 'server-error' && serverError !== 'closed'}
        retrying={serverError === 'retrying'}
        onRetry={() => setServerError('closed')}
      />
    </View>
  );
}
