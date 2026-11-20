import { Send } from 'lucide-react-native';
import { Text, View } from 'react-native';

import { Button } from '@/components';
import type { SendFooterProps } from '../types';

/** The sheet's footer, no Cancel: why Send is off when there is no number, then Send on WhatsApp over Share bill. */
export function SendFooter({
  note,
  sendLabel,
  sendDisabled,
  onSend,
  shareLabel,
  shareDisabled,
  onShare,
}: SendFooterProps) {
  return (
    <View className="gap-2">
      {note ? <Text className="font-manrope-semibold text-caption text-on-surface-variant">{note}</Text> : null}
      <Button label={sendLabel} icon={Send} disabled={sendDisabled} onPress={onSend} />
      <Button label={shareLabel} variant="outline" disabled={shareDisabled} onPress={onShare} />
    </View>
  );
}
