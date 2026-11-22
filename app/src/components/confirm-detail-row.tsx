import { Text, View } from 'react-native';

/** Props for {@link ConfirmDetailRow}. */
export interface ConfirmDetailRowProps {
  label: string;
  value: string;
  /** The first row has no divider above it. */
  first?: boolean;
}

/**
 * One label and value row in a confirm dialog's details box (`Confirm` boards); every row but the first has a
 * divider above it. Used by Record payment's and Add charge's confirm dialogs.
 */
export function ConfirmDetailRow({ label, value, first = false }: ConfirmDetailRowProps) {
  return (
    <View
      className={`flex-row items-baseline justify-between gap-3 py-2.5 ${first ? '' : 'border-t border-outline-variant'}`}
    >
      <Text className="font-manrope-semibold text-label text-on-surface-variant">{label}</Text>
      <Text
        className="shrink text-right font-manrope-bold text-label text-on-surface"
        style={{ fontVariant: ['tabular-nums'] }}
      >
        {value}
      </Text>
    </View>
  );
}
