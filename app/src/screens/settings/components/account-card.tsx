import { Text, View } from 'react-native';

import { Button, Card, SkeletonBlock } from '@/components';
import type { AccountCardProps } from '../types';
import { useSignOut } from '../use-sign-out';

/** The Account card: who is signed in, and Sign out with no confirmation, per the mapping doc. */
export function AccountCard({ email, loading }: AccountCardProps) {
  const { signOut, signingOut } = useSignOut();

  return (
    <Card padded={false} className="min-h-16 flex-row items-center gap-3 py-2.5 pl-4 pr-2">
      <View className="min-w-0 flex-1">
        <Text className="font-manrope-semibold text-caption text-on-surface-variant">Signed in as</Text>
        {loading ? <SkeletonBlock className="mt-1 h-3.5 w-40" /> : null}
        {email ? (
          <Text numberOfLines={1} className="font-manrope-bold text-label text-on-surface">
            {email}
          </Text>
        ) : null}
      </View>
      <Button
        label={signingOut ? 'Signing out' : 'Sign out'}
        variant="ghost"
        loading={signingOut}
        onPress={signOut}
        className="shrink-0"
      />
    </Card>
  );
}
