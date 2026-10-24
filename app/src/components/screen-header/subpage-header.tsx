import { useRouter } from "expo-router";
import { ArrowLeft } from "lucide-react-native";
import { View, Text } from "react-native";
import { SubpageHeaderProps } from "./types";
import { Icon } from '@/components/ui/icon';
import { Pressable } from '@/components/ui/pressable';
import { Icon as AppIcon } from '../icon';
import { SkeletonBlock } from '../skeletons';

/**
 * Header of a subpage (a screen opened from a tab, with the bottom nav hidden): a 48px round back button and the title with an optional subtitle,
 * in a 56px row. Back goes through expo-router, so it behaves like the Android back gesture; when
 * there is nothing to go back to (a screen opened from a notification) it goes to the root.
 */
export function SubpageHeader({
  title,
  loading = false,
  subtitle,
  subtitleIcon,
  trailing,
  backLabel = 'Back',
  onBack,
}: SubpageHeaderProps) {
  const router = useRouter();
  const goBack = () => {
    if (onBack) onBack();
    else if (router.canGoBack()) router.back();
    else router.replace('/');
  };

  return (
    <View className="h-14 flex-row items-center gap-1 px-2 py-1">
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={backLabel}
        onPress={goBack}
        className="h-12 w-12 items-center justify-center rounded-full"
      >
        <Icon as={ArrowLeft} size="xl" className="text-on-surface" />
      </Pressable>
      <View className="min-w-0 flex-1">
        {loading ? (
          <View className="h-7 justify-center">
            <SkeletonBlock className="h-5 w-36" />
          </View>
        ) : (
          <Text
            accessibilityRole="header"
            numberOfLines={1}
            className="font-manrope-extrabold text-sheet-title text-on-surface"
          >
            {title}
          </Text>
        )}
        {subtitle ? (
          <View className="flex-row items-center gap-1">
            {subtitleIcon ? (
              <AppIcon as={subtitleIcon} size={13} className="text-on-surface-variant" />
            ) : null}
            <Text
              numberOfLines={1}
              className="shrink font-manrope-semibold text-caption text-on-surface-variant"
            >
              {subtitle}
            </Text>
          </View>
        ) : null}
      </View>
      {trailing}
    </View>
  );
}