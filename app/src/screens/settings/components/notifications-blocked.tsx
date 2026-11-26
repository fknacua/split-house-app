import { ExternalLink } from 'lucide-react-native';
import { Linking, View } from 'react-native';

import { Alert, Button } from '@/components';

/**
 * The top of the Notifications card while the phone blocks notifications: the warning and "Open system settings",
 * the only way to allow them from Settings.
 */
export function NotificationsBlocked() {
  return (
    <View className="gap-3 p-3">
      <Alert
        variant="warning"
        title="Notifications are blocked"
        message="Reminders can't reach you until you allow notifications for this app."
      />
      <Button
        label="Open system settings"
        variant="outline"
        icon={ExternalLink}
        onPress={() => void Linking.openSettings()}
      />
    </View>
  );
}
