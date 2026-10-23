import { CloudOff } from 'lucide-react-native';
import { Text, View } from 'react-native';

import { Button } from '@/components/button';
import { Icon } from '@/components/icon';
import {
  AlertDialog,
  AlertDialogBackdrop,
  AlertDialogContent,
} from '@/components/ui/alert-dialog';

/**
 * The blocking "Can't reach the server" prompt (`ServerError.dc.html`, screen mapping doc: Can't
 * reach the server). One action, Retry. There is no way to dismiss it: a tap on the scrim and the
 * Android back gesture do nothing, because the app works online only.
 *
 * While `retrying` the button shows the disabled look with a Spinner.
 *
 * @param open - Whether the prompt is shown.
 * @param retrying - Retry is running.
 * @param onRetry - Called when Retry is tapped.
 */
export function ServerErrorDialog({
  open,
  retrying = false,
  onRetry,
}: {
  open: boolean;
  retrying?: boolean;
  onRetry: () => void;
}) {
  return (
    <AlertDialog isOpen={open} onClose={() => {}} closeOnOverlayClick={false}>
      <AlertDialogBackdrop />
      <AlertDialogContent className="gap-4">
        <View className="size-12 items-center justify-center rounded-full bg-container">
          <Icon as={CloudOff} size={24} className="text-on-surface" />
        </View>
        <View className="gap-2">
          <Text
            accessibilityRole="header"
            className="font-manrope-extrabold text-sheet-title text-foreground"
          >
            Can’t reach the server
          </Text>
          <Text className="font-manrope-medium text-label text-on-surface-variant">
            The app couldn’t get a response from the server. It may be starting up, so give it a
            moment and try again.
          </Text>
        </View>
        <Button label="Retry" onPress={onRetry} loading={retrying} disabled={retrying} />
      </AlertDialogContent>
    </AlertDialog>
  );
}
