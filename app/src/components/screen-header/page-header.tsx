import { PageHeaderProps } from "./types";

import { Text, View } from 'react-native';

/**
 * Header of a tab screen: the page title at 24/32 extra bold, in a 56px row. Render it as the
 * first child of `Screen`.
 */
export function PageHeader({ title, trailing }: PageHeaderProps) {
  return (
    <View className="h-14 flex-row items-center justify-between py-1 pl-4 pr-2">
      <Text accessibilityRole="header" className="font-manrope-extrabold text-title text-on-surface">
        {title}
      </Text>
      {trailing}
    </View>
  );
}