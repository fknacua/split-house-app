import { ChevronDown } from 'lucide-react-native';
import { Text } from 'react-native';

import { Select, SelectTrigger } from '@/components/ui/select';
import { Icon } from './icon';
import { SelectOptionsSheet, type SelectOption } from './select-field';

/**
 * A select drawn as a link for a page header, "Showing: Nov 2026" with a chevron, that opens the same
 * bottom sheet list as `SelectField`. No field border, and no form binding.
 *
 * @param prefix - The muted text before the value, such as `Showing:`.
 * @param valueLabel - The picked choice's text.
 * @param value - The picked option's value.
 * @param options - The choices, in the order they are listed.
 * @param onChange - Called with the picked option's value.
 * @param accessibilityLabel - What the control is, read out by screen readers.
 */
export function SelectLink({
  prefix,
  valueLabel,
  value,
  options,
  onChange,
  accessibilityLabel,
}: {
  prefix: string;
  valueLabel: string;
  value: string;
  options: SelectOption[];
  onChange: (value: string) => void;
  accessibilityLabel: string;
}) {
  return (
    <Select selectedValue={value} initialLabel={valueLabel} onValueChange={onChange}>
      <SelectTrigger
        accessibilityLabel={accessibilityLabel}
        className="h-11 min-h-11 w-auto gap-1.5 rounded-full border-0 bg-transparent px-2 data-[focus=true]:border-0 data-[focus=true]:px-2"
      >
        <Text className="font-manrope-semibold text-label text-on-surface-variant">{prefix}</Text>
        <Text className="font-manrope-bold text-label text-on-surface">{valueLabel}</Text>
        <Icon as={ChevronDown} size={18} className="text-on-surface" />
      </SelectTrigger>
      <SelectOptionsSheet options={options} value={value} />
    </Select>
  );
}
