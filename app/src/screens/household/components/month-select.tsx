import { SelectLink } from '@/components';
import type { MonthSelectProps } from '../types';

/** The "Showing:" control in the header: opens the list of months that have their own setup. */
export function MonthSelect({ options, month, fallbackLabel, onChange }: MonthSelectProps) {
  const label = options.find((option) => option.month === month)?.label ?? fallbackLabel;

  return (
    <SelectLink
      prefix="Showing:"
      valueLabel={label}
      value={month}
      options={options.map((option) => ({ label: option.label, value: option.month, badge: option.badge }))}
      onChange={onChange}
      accessibilityLabel={`Showing ${label} setup. Change month`}
    />
  );
}
