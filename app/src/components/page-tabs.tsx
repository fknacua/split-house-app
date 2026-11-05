import { useState } from 'react';
import { Text, View } from 'react-native';

import { Tabs, TabsIndicator, TabsList, TabsTrigger } from '@/components/ui/tabs';

/**
 * Tabs that switch part of a page: a thin wrapper over the native gluestack tabs in `ui/tabs`, underlined, with equal
 * widths and 44px touch targets. It draws only the row, so a screen can pin it and lay out what it switches itself.
 * The gluestack list is a horizontal `FlatList` sized to its content, hence the measured widths and no scrolling.
 *
 * @param value - The selected tab's value.
 * @param onChange - Called with the tapped tab's value.
 * @param options - The tabs, in order.
 */
export function PageTabs<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (value: T) => void;
  options: readonly { label: string; value: T }[];
}) {
  const [width, setWidth] = useState(0);
  const tabWidth = width > 0 ? width / options.length : undefined;

  return (
    <View onLayout={(event) => setWidth(event.nativeEvent.layout.width)}>
      <Tabs variant="underlined" value={value} onValueChange={(key: string) => onChange(key as T)}>
        <TabsList scrollEnabled={false} className="rounded-none border-b border-outline-variant bg-transparent p-0">
          <TabsIndicator className="border-b-2 border-primary" />
          {options.map((option) => (
            <TabsTrigger
              key={option.value}
              value={option.value}
              className="h-11 px-0"
              style={tabWidth === undefined ? undefined : { width: tabWidth }}
            >
              <Text
                className={`text-center text-label ${
                  option.value === value ? 'font-manrope-bold text-on-surface' : 'font-manrope-semibold text-on-surface-variant'
                }`}
              >
                {option.label}
              </Text>
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>
    </View>
  );
}
