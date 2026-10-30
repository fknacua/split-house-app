import { Text, View } from 'react-native';

/** Props for {@link EmptyBox}. */
export interface EmptyBoxProps {
  /** The bold line, e.g. `No lines found`. */
  title: string;
  /** The line under it. */
  note: string;
}

/**
 * A tinted box that stands in for content there is none of, such as the bill's lines when it had
 * none, or Recipient's message once everything is paid: a bold title over a centred note.
 */
export function EmptyBox({ title, note }: EmptyBoxProps) {
  return (
    <View className="items-center gap-1 rounded-alert bg-container px-2 py-3.5">
      <Text className="font-manrope-bold text-label text-on-surface">{title}</Text>
      <Text className="text-center font-manrope text-caption text-on-surface-variant">{note}</Text>
    </View>
  );
}
