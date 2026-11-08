import { ChevronLeft, ChevronRight, type LucideIcon } from 'lucide-react-native';
import { Text, View } from 'react-native';

import { Icon } from '@/components/icon';
import { Pressable } from '@/components/ui/pressable';
import {
  Actionsheet,
  ActionsheetBackdrop,
  ActionsheetContent,
  ActionsheetDragIndicator,
  ActionsheetDragIndicatorWrapper,
} from '@/components/ui/select/select-actionsheet';
import { monthPickerAdjacentYears, monthPickerCells, type MonthPickerCell, type MonthPickerMonths } from './helpers';

/** Cells per row of the month grid. */
const MONTHS_PER_ROW = 3;

/** A previous or next year arrow, disabled when there is no year to lead to. */
function YearArrow({
  icon,
  label,
  year,
  onPress,
}: {
  icon: LucideIcon;
  label: string;
  year: number | null;
  onPress: (year: number) => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: year === null }}
      disabled={year === null}
      onPress={() => year !== null && onPress(year)}
      className="size-12 items-center justify-center rounded-full data-[active=true]:bg-container"
    >
      <Icon as={icon} size={22} className={year === null ? 'text-on-disabled' : 'text-on-surface'} />
    </Pressable>
  );
}

/** One month: a 48px pill, filled when selected and in the disabled colour when it can't be picked. */
function MonthCell({ cell, onPress }: { cell: MonthPickerCell; onPress: (month: string) => void }) {
  const fill = cell.selected ? 'bg-primary' : 'data-[active=true]:bg-container';
  const text = cell.selected
    ? 'font-manrope-extrabold text-on-primary'
    : `font-manrope-semibold ${cell.allowed ? 'text-on-surface' : 'text-on-disabled'}`;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: cell.selected, disabled: !cell.allowed }}
      disabled={!cell.allowed}
      onPress={() => onPress(cell.month)}
      className={`h-12 flex-1 items-center justify-center rounded-full ${fill}`}
    >
      <Text className={`text-body leading-5 ${text}`}>{cell.name}</Text>
    </Pressable>
  );
}

/**
 * The month picker (`MonthPicker.dc.html`): a bottom sheet with the title, a year row and all 12 months.
 * Tapping an allowed month picks it, and there is no Done button; the scrim closes it with no change.
 *
 * @param open - Whether the sheet is shown.
 * @param title - The sheet's title, such as "Starts from".
 * @param year - The year shown.
 * @param onYearChange - Called by the year arrows.
 * @param months - The months that can be picked: `YYYY-MM` keys, or `{ from }` for every month from one onward.
 * @param value - The picked month, or `''`.
 * @param onPick - Called with the month tapped.
 * @param onClose - Called when the sheet is dismissed.
 */
export function MonthPickerSheet({
  open,
  title,
  year,
  onYearChange,
  months,
  value,
  onPick,
  onClose,
}: {
  open: boolean;
  title: string;
  year: number;
  onYearChange: (year: number) => void;
  months: MonthPickerMonths;
  value: string;
  onPick: (month: string) => void;
  onClose: () => void;
}) {
  const cells = monthPickerCells(year, months, value);
  const { previous, next } = monthPickerAdjacentYears(year, months);
  const rows = Array.from({ length: cells.length / MONTHS_PER_ROW }, (_, row) =>
    cells.slice(row * MONTHS_PER_ROW, (row + 1) * MONTHS_PER_ROW),
  );

  return (
    <Actionsheet isOpen={open} onClose={onClose}>
      <ActionsheetBackdrop />
      <ActionsheetContent>
        <ActionsheetDragIndicatorWrapper>
          <ActionsheetDragIndicator />
        </ActionsheetDragIndicatorWrapper>
        <View className="w-full gap-2 pb-3">
          <Text accessibilityRole="header" className="text-center font-manrope-extrabold text-field text-on-surface">
            {title}
          </Text>
          <View className="flex-row items-center justify-between py-1">
            <YearArrow icon={ChevronLeft} label="Previous year" year={previous} onPress={onYearChange} />
            <Text
              accessibilityLiveRegion="polite"
              className="font-manrope-extrabold text-[18px] leading-6 text-on-surface"
              style={{ fontVariant: ['tabular-nums'] }}
            >
              {year}
            </Text>
            <YearArrow icon={ChevronRight} label="Next year" year={next} onPress={onYearChange} />
          </View>
          {rows.map((row) => (
            <View key={row[0].month} className="flex-row gap-2">
              {row.map((cell) => (
                <MonthCell key={cell.month} cell={cell} onPress={onPick} />
              ))}
            </View>
          ))}
        </View>
      </ActionsheetContent>
    </Actionsheet>
  );
}
