import { useCallback } from 'react';
import { useWindowDimensions, View } from 'react-native';

import { Alert } from '@/components/alert';
import { useToast } from '@/components/ui/toast';

/** How long the toast stays, in milliseconds. */
const TOAST_DURATION_MS = 3000;

/**
 * A short confirmation above the bottom navigation bar, drawn as a success Alert. It stays up across a
 * navigation, so a screen can show it as it leaves.
 *
 * @returns A function taking the message to show.
 */
export function useSuccessToast() {
  const { show } = useToast();
  const { width } = useWindowDimensions();

  return useCallback(
    (message: string) => {
      show({
        placement: 'bottom',
        duration: TOAST_DURATION_MS,
        render: () => (
          <View className="mb-[88px] px-4" style={{ width }}>
            <Alert variant="success" message={message} />
          </View>
        ),
      });
    },
    [show, width],
  );
}
