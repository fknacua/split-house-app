import { ChevronRight } from 'lucide-react-native';
import { Pressable, Text, View } from 'react-native';

import { Badge, Icon } from '@/components';
import type { WelcomeRowProps } from '../types';
import { StepDot } from './step-dot';

/** The pill beside an optional step's title. The server sends only the flag; the word is fixed. */
const OPTIONAL_PILL = 'Optional';

/**
 * One step on Welcome. The current step has the selected fill and the only chevron; done steps
 * reopen with no chevron; later steps are muted and can't be tapped (deviation F2, Francis 2026-11-08).
 */
export function WelcomeRow({ row, separated, onOpen }: WelcomeRowProps) {
  const disabled = row.state === 'disabled';
  const current = row.state === 'current';
  const titleInk = disabled ? 'text-on-disabled' : 'text-on-surface';
  const detailInk = disabled ? 'text-on-disabled' : 'text-on-surface-variant';

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${row.title}. ${row.detail}`}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={() => onOpen(row.target)}
      className={`min-h-[76px] flex-row items-center gap-[14px] py-3 pl-4 pr-2.5 active:opacity-70 ${
        separated ? 'border-t border-outline-variant' : ''
      } ${current ? 'bg-selected' : ''}`}
    >
      <StepDot key={row.state} number={row.number} state={row.state} />
      <View className="min-w-0 flex-1 gap-0.5">
        <View className="flex-row items-center gap-2">
          <Text className={`shrink font-manrope-bold text-label ${titleInk}`}>{row.title}</Text>
          {row.optional ? <Badge label={OPTIONAL_PILL} variant={disabled ? 'disabled' : 'neutral'} className="shrink-0" /> : null}
        </View>
        <Text className={`font-manrope-semibold text-caption ${detailInk}`}>{row.detail}</Text>
      </View>
      {current ? <Icon as={ChevronRight} size={20} className="text-on-surface-variant" /> : null}
    </Pressable>
  );
}
