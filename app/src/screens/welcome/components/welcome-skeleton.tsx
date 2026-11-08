import { ScrollView, View } from 'react-native';

import { AppLogo, Card, SkeletonBlock, SubpageFooter } from '@/components';

/** Width pairs for each row's title and detail, so the rows do not look identical. */
const ROW_WIDTHS: [`${number}%`, `${number}%`][] = [
  ['36%', '70%'],
  ['44%', '62%'],
  ['30%', '76%'],
  ['50%', '68%'],
  ['56%', '74%'],
];

/**
 * Welcome while `GET /api/setup` loads (not drawn; approved by Francis 2026-11-08): the real logo,
 * blocks for the heading and the intro's two lines, the steps card with five rows of a round dot
 * and two lines, and a 48px pill in the footer where the main button goes.
 */
export function WelcomeSkeleton() {
  return (
    <>
      <ScrollView
        scrollEnabled={false}
        contentContainerClassName="gap-5 px-4 pb-5 pt-4"
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      >
        <View className="gap-3 px-1 pt-2">
          <AppLogo />
          <SkeletonBlock className="h-7 w-56" />
          <View className="gap-1.5">
            <SkeletonBlock className="h-4" />
            <SkeletonBlock className="h-4 w-3/4" />
          </View>
        </View>
        <Card padded={false}>
          {ROW_WIDTHS.map(([title, detail], i) => (
            <View
              key={i}
              className={`min-h-[76px] flex-row items-center gap-[14px] py-3 pl-4 pr-2.5 ${
                i === 0 ? '' : 'border-t border-outline-variant'
              }`}
            >
              <SkeletonBlock className="h-8 w-8 rounded-full" />
              <View className="flex-1 gap-1.5">
                <SkeletonBlock className="h-3.5" width={title} />
                <SkeletonBlock className="h-3" width={detail} />
              </View>
            </View>
          ))}
        </Card>
      </ScrollView>
      <SubpageFooter>
        <SkeletonBlock className="h-12 rounded-full" />
      </SubpageFooter>
    </>
  );
}
