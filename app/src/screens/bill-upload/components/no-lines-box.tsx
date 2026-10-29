import { Text, View } from 'react-native';

/** The box that stands in for the lines when the bill had none (or all were removed): they are optional. */
export function NoLinesBox() {
  return (
    <View className="items-center gap-1 rounded-alert bg-container px-2 py-3.5">
      <Text className="font-manrope-bold text-label text-on-surface">No lines found</Text>
      <Text className="text-center font-manrope text-caption text-on-surface-variant">
        Optional. Current Charges is all the split needs.
      </Text>
    </View>
  );
}
