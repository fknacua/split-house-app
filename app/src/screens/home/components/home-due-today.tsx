import { Clock } from 'lucide-react-native';

import { Alert } from '@/components';
import type { HomeDueTodayProps } from '../types';

/** The one-line info Alert at the bottom of the hero while a payment is due today, with its amount at the right. */
export function HomeDueToday({ dueToday }: HomeDueTodayProps) {
  return <Alert variant="info" icon={Clock} message={dueToday.text} trailing={dueToday.amount} />;
}
