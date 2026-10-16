import { House, History, Users, Settings } from 'lucide-react-native';
import { Text, View } from 'react-native';

import { Icon } from '@/components/ui/icon';
import { Pressable } from '@/components/ui/pressable';

const items = [
  { key: 'home', label: 'Home', icon: House },
  { key: 'history', label: 'History', icon: History },
  { key: 'household', label: 'Household', icon: Users },
  { key: 'settings', label: 'Settings', icon: Settings },
] as const;

export interface BottomNavProps {
  active?: (typeof items)[number]['key'];
  onItemPress?: (key: (typeof items)[number]['key']) => void;
}
// gluestack v5 has no bottom nav bar — custom, per the screen mapping doc.
// Static/presentational for the spike: only Home exists as a real route so far.
export function BottomNav({ active = 'home', onItemPress }: BottomNavProps) {
  return (
    <View className="flex-row border-t border-outline-variant bg-container px-2 pb-6 pt-2">
      {items.map((item) => {
        const isActive = item.key === active;
        return (
          <Pressable
            key={item.key}
            className="min-h-11 flex-1 items-center justify-center gap-1 py-1"
            onPress={() => onItemPress?.(item.key)}
          >
            <Icon
              as={item.icon}
              size="md"
              className={isActive ? 'text-primary' : 'text-on-surface-variant'}
            />
            <Text
              className={
                (isActive ? 'text-primary' : 'text-on-surface-variant') +
                ' font-manrope-semibold text-caption'
              }
            >
              {item.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
