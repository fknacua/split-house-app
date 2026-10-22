// Temporary dev-only page for plan step 0.3. Delete once the Phase 2 test page (2.14) exists.
import { useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { CalendarDays, ChevronDown, Circle, MoreVertical } from 'lucide-react-native';

// eslint-disable-next-line no-restricted-imports -- TODO: replace with a wrapper from src/components
import {
  AlertDialog,
  AlertDialogBackdrop,
  AlertDialogBody,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
} from '@/components/ui/alert-dialog';
// eslint-disable-next-line no-restricted-imports -- TODO: replace with a wrapper from src/components
import { Button, ButtonText } from '@/components/ui/button';
// eslint-disable-next-line no-restricted-imports -- TODO: replace with a wrapper from src/components
import {
  DateTimePicker,
  DateTimePickerIcon,
  DateTimePickerInput,
  DateTimePickerTrigger,
} from '@/components/ui/date-time-picker';
// eslint-disable-next-line no-restricted-imports -- TODO: replace with a wrapper from src/components
import { Divider } from '@/components/ui/divider';
// eslint-disable-next-line no-restricted-imports -- TODO: replace with a wrapper from src/components
import { Menu, MenuItem, MenuItemLabel } from '@/components/ui/menu';
// eslint-disable-next-line no-restricted-imports -- TODO: replace with a wrapper from src/components
import { Popover, PopoverBackdrop, PopoverBody, PopoverContent } from '@/components/ui/popover';
// eslint-disable-next-line no-restricted-imports -- TODO: replace with a wrapper from src/components
import { Radio, RadioGroup, RadioIcon, RadioIndicator, RadioLabel } from '@/components/ui/radio';
// eslint-disable-next-line no-restricted-imports -- TODO: replace with a wrapper from src/components
import {
  Select,
  SelectBackdrop,
  SelectContent,
  SelectDragIndicator,
  SelectDragIndicatorWrapper,
  SelectIcon,
  SelectInput,
  SelectItem,
  SelectPortal,
  SelectTrigger,
} from '@/components/ui/select';
// eslint-disable-next-line no-restricted-imports -- TODO: replace with a wrapper from src/components
import { Switch } from '@/components/ui/switch';
// eslint-disable-next-line no-restricted-imports -- TODO: replace with a wrapper from src/components
import { Textarea, TextareaInput } from '@/components/ui/textarea';

export default function Verify() {
  const [month, setMonth] = useState('2026-11');
  const [date, setDate] = useState<Date | undefined>(new Date(2026, 10, 1));
  const [on, setOn] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [popOpen, setPopOpen] = useState(false);
  const [dialog, setDialog] = useState(false);
  const [radio, setRadio] = useState('pdf');
  const [note, setNote] = useState('');

  return (
    <ScrollView className="flex-1 bg-background" contentContainerClassName="gap-4 p-4 pt-14">
      <Text className="font-manrope-bold text-title text-foreground">Step 0.3 checks</Text>

      <Text className="font-manrope-bold text-label text-foreground">Select (month list)</Text>
      <Select selectedValue={month} onValueChange={setMonth}>
        <SelectTrigger className="h-12 rounded-field border border-outline bg-surface">
          <SelectInput placeholder="Month" className="font-manrope-medium text-field text-foreground" />
          <SelectIcon as={ChevronDown} className="text-on-surface-variant" />
        </SelectTrigger>
        <SelectPortal>
          <SelectBackdrop />
          <SelectContent>
            <SelectDragIndicatorWrapper>
              <SelectDragIndicator />
            </SelectDragIndicatorWrapper>
            <SelectItem label="Nov 2026" value="2026-11" />
            <SelectItem label="Dec 2026" value="2026-12" />
            <SelectItem label="Jan 2027" value="2027-01" />
          </SelectContent>
        </SelectPortal>
      </Select>

      <Text className="font-manrope-bold text-label text-foreground">DateTimePicker (native dialog)</Text>
      <DateTimePicker value={date} onChange={setDate} mode="date">
        <DateTimePickerTrigger className="h-12 rounded-field border border-outline bg-surface px-3">
          <DateTimePickerIcon as={CalendarDays} className="mr-2 text-on-surface-variant" />
          <DateTimePickerInput className="font-manrope-medium text-field text-foreground" />
        </DateTimePickerTrigger>
      </DateTimePicker>

      <Text className="font-manrope-bold text-label text-foreground">Switch</Text>
      <Switch value={on} onValueChange={setOn} />

      <Text className="font-manrope-bold text-label text-foreground">Menu</Text>
      <Menu
        isOpen={menuOpen}
        onOpen={() => setMenuOpen(true)}
        onClose={() => setMenuOpen(false)}
        placement="bottom"
        trigger={(triggerProps: object) => (
          <Button {...triggerProps} className="h-12 w-12 rounded-full bg-container">
            <MoreVertical size={20} className="text-foreground" />
          </Button>
        )}
      >
        <MenuItem key="a" textValue="Edit">
          <MenuItemLabel>Edit</MenuItemLabel>
        </MenuItem>
        <MenuItem key="b" textValue="Remove">
          <MenuItemLabel>Remove</MenuItemLabel>
        </MenuItem>
      </Menu>

      <Text className="font-manrope-bold text-label text-foreground">Textarea</Text>
      <Textarea className="rounded-field border border-outline bg-surface">
        <TextareaInput
          value={note}
          onChangeText={setNote}
          placeholder="Type a note"
          className="font-manrope-medium text-field text-foreground"
        />
      </Textarea>

      <Text className="font-manrope-bold text-label text-foreground">Radio</Text>
      <RadioGroup value={radio} onChange={setRadio}>
        <Radio value="pdf">
          <RadioIndicator className="border-outline">
            <RadioIcon as={Circle} />
          </RadioIndicator>
          <RadioLabel className="text-foreground">PDF</RadioLabel>
        </Radio>
        <Radio value="summary">
          <RadioIndicator className="border-outline">
            <RadioIcon as={Circle} />
          </RadioIndicator>
          <RadioLabel className="text-foreground">Summary</RadioLabel>
        </Radio>
      </RadioGroup>
      <Text className="text-foreground">Selected: {radio}</Text>

      <Divider />

      <Text className="font-manrope-bold text-label text-foreground">Popover</Text>
      <Popover
        isOpen={popOpen}
        onOpen={() => setPopOpen(true)}
        onClose={() => setPopOpen(false)}
        trigger={(triggerProps) => (
          <Button {...triggerProps} className="h-12 rounded-full bg-container">
            <ButtonText className="text-foreground">Open popover</ButtonText>
          </Button>
        )}
      >
        <PopoverBackdrop />
        <PopoverContent>
          <PopoverBody>
            <Text className="text-foreground">Popover body</Text>
          </PopoverBody>
        </PopoverContent>
      </Popover>

      <Text className="font-manrope-bold text-label text-foreground">AlertDialog</Text>
      <Button className="h-12 rounded-full bg-primary" onPress={() => setDialog(true)}>
        <ButtonText className="text-on-primary">Open dialog</ButtonText>
      </Button>
      <AlertDialog isOpen={dialog} onClose={() => setDialog(false)}>
        <AlertDialogBackdrop />
        <AlertDialogContent>
          <AlertDialogHeader>
            <Text className="font-manrope-bold text-sheet-title text-foreground">Discard changes?</Text>
          </AlertDialogHeader>
          <AlertDialogBody>
            <Text className="text-foreground">Android back should close this.</Text>
          </AlertDialogBody>
          <AlertDialogFooter>
            <Button className="rounded-full bg-primary" onPress={() => setDialog(false)}>
              <ButtonText className="text-on-primary">Cancel</ButtonText>
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <View className="h-16" />
    </ScrollView>
  );
}
