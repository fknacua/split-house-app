import { useRef, useState, type ComponentProps, type ReactNode } from 'react';
import { ScrollView, View, type NativeScrollEvent, type NativeSyntheticEvent } from 'react-native';
import Animated, { SlideInLeft, SlideInRight } from 'react-native-reanimated';

import { PageTabs } from '../page-tabs';
import { TabSwipeArea } from './tab-swipe-area';

/** How long a tab takes to slide in, in milliseconds. */
const TAB_SLIDE_MS = 50;

/**
 * A scrolling page with tabs: an optional header that scrolls away, then the tab row, then the selected tab's content.
 * Once the header has scrolled away, a second tab row pins at the top, as Home pins its summary, since
 * `stickyHeaderIndices` left the pinned tabs unable to be tapped. A tap or a sideways swipe switches tabs, and the tab
 * that opens slides in. Fill the rest of the screen with it. It starts on the first tab and remembers the tab while mounted.
 *
 * @param tabs - The tabs, in order.
 * @param header - What scrolls away above the tabs.
 * @param renderTab - The content of the selected tab.
 * @param refreshControl - Pull to refresh for the page.
 */
export function SwipeTabs<T extends string>({
  tabs,
  header,
  renderTab,
  refreshControl,
}: {
  tabs: readonly { label: string; value: T }[];
  header?: ReactNode;
  renderTab: (tab: T) => ReactNode;
  refreshControl?: ComponentProps<typeof ScrollView>['refreshControl'];
}) {
  const [tab, setTab] = useState<T>(tabs[0].value);
  // Null until the first switch, so the first tab doesn't slide in when the page opens.
  const [enterFrom, setEnterFrom] = useState<'left' | 'right' | null>(null);
  const tabsY = useRef(Number.POSITIVE_INFINITY);
  const [pinned, setPinned] = useState(false);
  const tabIndex = tabs.findIndex((option) => option.value === tab);

  const onScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    setPinned(event.nativeEvent.contentOffset.y >= tabsY.current);
  };

  const switchTab = (next: T) => {
    if (next === tab) return;
    setEnterFrom(tabs.findIndex((option) => option.value === next) > tabIndex ? 'right' : 'left');
    setTab(next);
  };

  // Nothing past the first or last tab, so a swipe there does nothing.
  const onSwipe = (step: 1 | -1) => {
    const next = tabs[tabIndex + step];
    if (next) switchTab(next.value);
  };

  return (
    <View className="relative min-h-0 flex-1">
      <TabSwipeArea onSwipe={onSwipe}>
        <ScrollView
          refreshControl={refreshControl}
          onScroll={onScroll}
          scrollEventThrottle={16}
          contentContainerClassName="pb-5 pt-1"
        >
          {header ? <View className="gap-4 px-4 pb-3">{header}</View> : null}
          <View
            className="px-4"
            onLayout={(event) => {
              tabsY.current = event.nativeEvent.layout.y;
            }}
          >
            <PageTabs value={tab} onChange={switchTab} options={tabs} />
          </View>
          {/* A new key per tab, so the tab that opens slides in from the side it was asked for on. */}
          <Animated.View
            key={tab}
            entering={enterFrom === null ? undefined : (enterFrom === 'right' ? SlideInRight : SlideInLeft).duration(TAB_SLIDE_MS)}
            className="px-4 pt-1"
          >
            {renderTab(tab)}
          </Animated.View>
        </ScrollView>
      </TabSwipeArea>
      {pinned ? (
        <View className="absolute inset-x-0 top-0 z-10 bg-background px-4">
          <PageTabs value={tab} onChange={switchTab} options={tabs} />
        </View>
      ) : null}
    </View>
  );
}
