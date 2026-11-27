import { Text, View } from 'react-native';

import { Alert, CountInput } from '@/components';
import type { ShareFieldsProps } from '../types';

/**
 * Per share's share fields (not drawn, V68): `Shares`, one shares field per person labelled by the server
 * (`Sam · via Priya`), starting from the household's shares and changed for this charge only, and the warning Alert
 * while no one has a share above 0. The split preview under them follows the shares.
 */
export function ShareFields({ shares, disabled, onChange, focus }: ShareFieldsProps) {
  return (
    <View className="gap-2.5">
      <Text className="font-manrope-bold text-label text-on-surface">{shares.heading}</Text>
      {shares.rows.map((row) => (
        <View key={row.personId} className="gap-1.5">
          <Text className="font-manrope-semibold text-caption text-on-surface-variant">{row.label}</Text>
          <CountInput
            {...focus(row.personId)}
            kind="shares"
            accessibilityLabel={`Shares for ${row.label}`}
            placeholder="0"
            suffix="shares"
            value={row.shares}
            onChange={(value) => onChange(row.personId, value)}
            disabled={disabled}
          />
        </View>
      ))}
      {shares.alert ? <Alert variant="warning" message={shares.alert} /> : null}
    </View>
  );
}
