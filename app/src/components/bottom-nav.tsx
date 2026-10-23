import type { ComponentProps } from 'react';
import { Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { BottomTabBarProps } from 'expo-router/js-tabs';

import { Icon } from '@/components/ui/icon';
import { Pressable } from '@/components/ui/pressable';
import { useThemePreference } from '@/lib/theme-preference';

/** One bottom navigation item. */
export interface NavItem {
  /** Unique key. With `BottomNav` it must match the route name of the tab. */
  key: string;
  label: string;
  icon: ComponentProps<typeof Icon>['as'];
}

// Elevation table: footers and bottom nav above content.
const SHADOW_LIGHT = '0 -6px 14px rgba(0,0,0,0.14)';
const SHADOW_DARK = '0 -8px 16px rgba(0,0,0,0.45)';
const TAB_VIEW_CLASSES = ['h-8', 'w-16', 'items-center', 'justify-center', 'rounded-2xl', 'transition-colors', 'duration-150'];
const TAB_TEXT_CLASSES = ['text-caption', 'transition-colors', 'duration-150'];

type TabViewEl = {
  view: string[];
  icon: string[];
  text: string[];
}
/** Props for the presentational bar. */
export interface BottomNavBarProps {
  /** Items to show, in order. */
  items: NavItem[];
  /** Key of the selected item. */
  active: string;
  /** Called with the key of the pressed item. */
  onItemPress: (key: string) => void;
}
const TAB_CSS_CLASS_MAP_BY_STATE: Record<'active' | 'inactive', TabViewEl> = {
  'active': {
    view: ['bg-track'],
    icon: ['text-on-selected'],
    text: ['font-manrope-bold', 'text-on-surface'],
  },
  'inactive': {
    // Never transparent: RN Android (#52415) squares the corners of a view that goes
    // transparent -> opaque. `container` is the bar's own colour, so it looks the same.
    view: ['bg-container'],
    icon: ['text-on-surface-variant'],
    text: ['font-manrope-semibold', 'text-on-surface-variant'],
  },
};

/**
 * Custom bottom navigation bar (gluestack v5 has none). Presentational: the
 * selected pill uses `track` with `on-selected`, 44px minimum targets, and the
 * bottom safe-area inset is added under the items.
 */
export function BottomNavBar({ items, active, onItemPress }: BottomNavBarProps) {
  const insets = useSafeAreaInsets();
  const { resolved } = useThemePreference();
  return (
    <View
      accessibilityRole="tablist"
      className="bg-container px-2 pt-3"
      style={{
        paddingBottom: 16 + insets.bottom,
        boxShadow: resolved === 'dark' ? SHADOW_DARK : SHADOW_LIGHT,
      }}
    >
      <View className="flex-row">
        {items.map((item) => {
          const isActive = item.key === active;
          const cssClassNameMap = isActive ? TAB_CSS_CLASS_MAP_BY_STATE.active : TAB_CSS_CLASS_MAP_BY_STATE.inactive;

          return (
            <Pressable
              key={item.key}
              accessibilityRole="tab"
              accessibilityState={{ selected: isActive }}
              className="min-h-11 min-w-0 flex-1 items-center gap-1"
              onPress={() => onItemPress(item.key)}
            >
              <View
                className={TAB_VIEW_CLASSES.concat(cssClassNameMap.view).join(' ')}
              >
                <Icon
                  as={item.icon}
                  size="lg"
                  className={['transition-colors', 'duration-150'].concat(cssClassNameMap.icon).join(' ')}
                />
              </View>
              <Text
                numberOfLines={1}
                className={TAB_TEXT_CLASSES.concat(cssClassNameMap.text).join(' ')}
              >
                {item.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

/** Props for the `Tabs` adapter: the tab bar props from the navigator, plus the items to show. */
export interface BottomNavProps extends BottomTabBarProps {
  /** Items to show, in order. Each `key` must be a route name in the navigator. */
  items: NavItem[];
}

/**
 * Bottom navigation for the expo-router `Tabs` layout: render it from `tabBar`
 * and pass the navigator's props through, plus `items`.
 */
export function BottomNav({ state, navigation, items }: BottomNavProps) {
  const active = state.routes[state.index]?.name;
  return (
    <BottomNavBar
      items={items}
      active={active}
      onItemPress={(key) => {
        const route = state.routes.find((r) => r.name === key);
        if (!route) return;
        const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
        if (active !== key && !event.defaultPrevented) navigation.navigate(route.name);
      }}
    />
  );
}
