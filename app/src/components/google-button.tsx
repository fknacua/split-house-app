import { Image } from 'expo-image';
import { Text } from 'react-native';

import { Pressable } from '@/components/ui/pressable';
import { Spinner } from '@/components/spinner';

const GOOGLE_LOGO = require('../../assets/images/google.svg');

/**
 * "Sign in with Google" button (screen mapping doc: Sign in, a custom piece in Google's own
 * styling, not a gluestack Button). A 48px pill with a neutral surface fill and outline; the
 * `surface`, `outline` and `on-surface` tokens are within a shade of Google's published light and
 * dark button colours, so no hex values are needed.
 *
 * The four-colour G logo is the `assets/images/google.svg` asset, shown before the label.
 *
 * @param onPress - Called on tap. Ignored while `loading` or `disabled`.
 * @param loading - Swaps the label for "Signing in…" with a Spinner, fades the button, ignores taps.
 * @param disabled - Ignores taps.
 */
export function GoogleButton({
  onPress,
  loading = false,
  disabled = false,
}: {
  onPress?: () => void;
  loading?: boolean;
  disabled?: boolean;
}) {
  const label = loading ? 'Signing in…' : 'Sign in with Google';
  return (
    <Pressable
      onPress={loading || disabled ? undefined : onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: disabled || loading, busy: loading }}
      className={`h-12 w-full flex-row items-center justify-center gap-3 rounded-full border border-outline bg-surface ${
        loading ? 'opacity-70' : ''
      }`}
    >
      {loading ? (
        <Spinner size="small" accessibilityLabel="Signing in" className="text-on-surface" />
      ) : (
        <Image source={GOOGLE_LOGO} style={{ width: 20, height: 20 }} accessibilityElementsHidden />
      )}
      <Text className="font-manrope-bold text-body text-on-surface">{label}</Text>
    </Pressable>
  );
}
