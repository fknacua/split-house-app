import { useRef, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { TriangleAlert } from 'lucide-react-native';

// eslint-disable-next-line no-restricted-imports -- TODO: replace with a wrapper from src/components
import { Alert, AlertIcon, AlertText } from '@/components/ui/alert';
// eslint-disable-next-line no-restricted-imports -- TODO: replace with a wrapper from src/components
import {
  BottomSheet,
  BottomSheetBackdrop,
  BottomSheetContent,
  BottomSheetDragIndicator,
  BottomSheetPortal,
  type BottomSheetRef,
} from '@/components/ui/bottomsheet';
// eslint-disable-next-line no-restricted-imports -- TODO: replace with a wrapper from src/components
import { Button, ButtonSpinner, ButtonText } from '@/components/ui/button';
import { ChipGroup } from '@/components/chip';

// eslint-disable-next-line no-restricted-imports -- TODO: replace with a wrapper from src/components
import {
  FormControl,
  FormControlHelper,
  FormControlHelperText,
  FormControlLabel,
  FormControlLabelText,
} from '@/components/ui/form-control';
// eslint-disable-next-line no-restricted-imports -- TODO: replace with a wrapper from src/components
import { Input, InputField } from '@/components/ui/input';
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
import { ConnectedButtonGroup } from '@/components/connected-button-group';
// eslint-disable-next-line no-restricted-imports -- TODO: replace with a wrapper from src/components
import { Switch } from '@/components/ui/switch';
// eslint-disable-next-line no-restricted-imports -- TODO: replace with a wrapper from src/components
import { ChevronDownIcon } from '@/components/ui/icon';

const WHO_OPTIONS = [
  { label: 'Priya', value: 'priya' },
  { label: 'Sam', value: 'sam' },
  { label: 'Jordan', value: 'jordan' },
] as const;

const SPLIT_METHOD_OPTIONS = [
  { label: 'Per share', value: 'per_share' },
  { label: 'Per unit', value: 'per_unit' },
  { label: 'Custom', value: 'custom' },
] as const;

export function AddChargeSheet() {
  const sheetRef = useRef<BottomSheetRef>(null);
  const [scope, setScope] = useState<'shared' | 'personal'>('shared');
  const [splitMethod, setSplitMethod] = useState<(typeof SPLIT_METHOD_OPTIONS)[number]['value']>('per_share');
  const [who, setWho] = useState<(typeof WHO_OPTIONS)[number]['value']>('priya');
  const [recurring, setRecurring] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleSave = () => {
    setSaving(true);
    setTimeout(() => setSaving(false), 800); // spike demo only, no real save yet
  };

  return (
    <BottomSheet ref={sheetRef}>
      <Button
        className="h-12 rounded-full bg-primary"
        onPress={() => sheetRef.current?.open()}
      >
        <ButtonText className="font-manrope-bold text-label text-on-primary">
          Add charge
        </ButtonText>
      </Button>

      <BottomSheetPortal
        snapPoints={['85%']}
        backdropComponent={BottomSheetBackdrop}
        handleComponent={BottomSheetDragIndicator}
      >
        <BottomSheetContent>
          <ScrollView contentContainerClassName="gap-4 px-4 pb-8 pt-2">
            <Text className="font-manrope-extrabold text-sheet-title text-foreground">
              Add charge
            </Text>

            <ConnectedButtonGroup
              value={scope}
              onChange={setScope}
              options={[
                { label: 'Shared', value: 'shared' },
                { label: 'Personal', value: 'personal' },
              ]}
            />

            <FormControl>
              <FormControlLabel>
                <FormControlLabelText className="font-manrope-bold text-label text-foreground">
                  What&apos;s this for
                </FormControlLabelText>
              </FormControlLabel>
              <Input className="h-12 rounded-field border border-outline bg-surface">
                <InputField
                  placeholder="e.g. Aircon servicing"
                  className="font-manrope-medium text-field text-foreground"
                />
              </Input>
            </FormControl>

            <FormControl>
              <FormControlLabel>
                <FormControlLabelText className="font-manrope-bold text-label text-foreground">
                  Amount
                </FormControlLabelText>
              </FormControlLabel>
              <Input className="h-12 rounded-field border border-outline bg-surface">
                <InputField
                  placeholder="$0.00"
                  keyboardType="decimal-pad"
                  className="font-manrope-medium text-field text-foreground"
                />
              </Input>
              <FormControlHelper>
                <FormControlHelperText className="font-manrope-medium text-caption text-on-surface-variant">
                  Required. Stored in cents.
                </FormControlHelperText>
              </FormControlHelper>
            </FormControl>

            {scope === 'shared' ? (
              <View className="gap-2">
                <Text className="font-manrope-bold text-label text-foreground">
                  Split method
                </Text>
                <ChipGroup value={splitMethod} onChange={setSplitMethod} options={SPLIT_METHOD_OPTIONS} />
              </View>
            ) : (
              <View className="gap-2">
                <Text className="font-manrope-bold text-label text-foreground">Who</Text>
                <ChipGroup value={who} onChange={setWho} options={WHO_OPTIONS} />
              </View>
            )}

            {splitMethod === 'custom' && scope === 'shared' ? (
              <Alert className="gap-2 rounded-alert border border-warning-line bg-warning-tint">
                <AlertIcon as={TriangleAlert} className="text-warning" />
                <AlertText className="font-manrope-medium text-body text-on-warning-container">
                  Custom shares don&apos;t add up to the amount yet.
                </AlertText>
              </Alert>
            ) : null}

            <FormControl>
              <FormControlLabel>
                <FormControlLabelText className="font-manrope-bold text-label text-foreground">
                  Month being fixed (correction)
                </FormControlLabelText>
              </FormControlLabel>
              <Select>
                <SelectTrigger className="h-12 rounded-field border border-outline bg-surface">
                  <SelectInput
                    placeholder="This month"
                    className="font-manrope-medium text-field text-foreground"
                  />
                  <SelectIcon as={ChevronDownIcon} className="mr-3 text-on-surface-variant" />
                </SelectTrigger>
                <SelectPortal>
                  <SelectBackdrop />
                  <SelectContent>
                    <SelectDragIndicatorWrapper>
                      <SelectDragIndicator />
                    </SelectDragIndicatorWrapper>
                    <SelectItem label="October 2026" value="2026-10" />
                    <SelectItem label="November 2026" value="2026-11" />
                    <SelectItem label="December 2026" value="2026-12" />
                  </SelectContent>
                </SelectPortal>
              </Select>
            </FormControl>

            <View className="flex-row items-center justify-between rounded-field bg-container px-4 py-3">
              <Text className="font-manrope-medium text-body text-foreground">
                Recurring charge
              </Text>
              <Switch value={recurring} onValueChange={setRecurring} />
            </View>

            <Button
              className="h-12 rounded-full bg-primary"
              onPress={handleSave}
              disabled={saving}
            >
              {saving ? <ButtonSpinner /> : null}
              <ButtonText className="font-manrope-bold text-label text-on-primary">
                {saving ? 'Saving...' : 'Save'}
              </ButtonText>
            </Button>
          </ScrollView>
        </BottomSheetContent>
      </BottomSheetPortal>
    </BottomSheet>
  );
}
