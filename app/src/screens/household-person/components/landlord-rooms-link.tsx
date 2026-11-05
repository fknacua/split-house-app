import { useRouter } from 'expo-router';
import { ChevronRight } from 'lucide-react-native';
import { Pressable, Text } from 'react-native';

import { Icon } from '@/components';
import type { LandlordRoomsLinkProps } from '../types';

/**
 * The link that opens Landlord & rooms from a Room group, where rooms are added and their rent and units change.
 */
export function LandlordRoomsLink({ label }: LandlordRoomsLinkProps) {
  const router = useRouter();

  return (
    <Pressable
      accessibilityRole="link"
      onPress={() => router.push('/household/landlord-rooms')}
      className="-my-2 min-h-12 flex-row items-center gap-1.5 self-start px-1"
    >
      <Text className="font-manrope-bold text-label text-primary">{label}</Text>
      <Icon as={ChevronRight} size={16} className="text-primary" />
    </Pressable>
  );
}
