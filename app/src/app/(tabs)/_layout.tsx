import { FlaskConical, History, House, Settings, Users } from 'lucide-react-native';
import { Tabs } from 'expo-router/js-tabs';

import { BottomNav, type NavItem } from '@/components';
import { NavFooterProvider } from '@/lib/nav-footer';

// Keys are the route file names in this folder.
const TAB_ITEMS: NavItem[] = [
  { key: 'index', label: 'This month', icon: House },
  { key: 'history', label: 'History', icon: History },
  { key: 'household', label: 'Household', icon: Users },
  { key: 'settings', label: 'Settings', icon: Settings },
];
const DEV_TABS = [
  { key: '__components', label: 'Test', icon: FlaskConical },
]

/** Main tab layout: Home, History, Household, Settings, plus the dev-only Test tab. */
export default function TabsLayout() {
  const tabsToDisplay = __DEV__ ? [...TAB_ITEMS, ...DEV_TABS] : TAB_ITEMS;

  return (
    <NavFooterProvider>
      <Tabs
        tabBar={(props) => <BottomNav {...props} items={tabsToDisplay} />}
        screenOptions={{ headerShown: false }}
      >
        {tabsToDisplay.map((item) => (
          <Tabs.Screen key={item.key} name={item.key} />
        ))}
      </Tabs>
    </NavFooterProvider>
  );
}
