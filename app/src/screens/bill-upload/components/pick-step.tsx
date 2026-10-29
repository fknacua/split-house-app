import { Text, View } from 'react-native';

import { Alert, Card } from '@/components';
import type { PickStepProps } from '../types';

const NEXT_STEPS = ['Choose the PDF', 'Check what was read', 'Save the bill'];

// Placeholder copy until the design for a turned-away file exists (deviation B12).
const PROBLEM_TEXT = {
  not_pdf: 'The file is not a PDF.',
  too_large: 'The file is over 4 MB.',
} as const;

/** The `pick` board: what happens next, and why Current Charges is used. Choose PDF is in the footer. */
export function PickStep({ monthName, problem, error }: PickStepProps) {
  const message = problem ? PROBLEM_TEXT[problem] : error;
  return (
    <>
      <View className="gap-2 px-1">
        <Text accessibilityRole="header" className="font-manrope-extrabold text-title text-on-surface">
          {`Add ${monthName}’s utilities bill`}
        </Text>
        <Text className="font-manrope text-body text-on-surface-variant">
          Choose the PDF from your files.
        </Text>
        <Text className="font-manrope text-body text-on-surface-variant">
          Values will be read from the bill and you can review them before saving.
        </Text>
      </View>
      {message ? <Alert variant="danger" message={message} /> : null}
      <Card className="gap-3.5">
        <Text className="font-manrope-bold text-label text-on-surface">What happens next</Text>
        <View className="gap-3">
          {NEXT_STEPS.map((text, i) => (
            <View key={text} className="flex-row items-center gap-3">
              <View className="h-7 w-7 items-center justify-center rounded-full bg-selected">
                <Text className="font-manrope-extrabold text-[13px] text-on-selected">{i + 1}</Text>
              </View>
              <Text className="font-manrope-medium text-body text-on-surface">{text}</Text>
            </View>
          ))}
        </View>
      </Card>
    </>
  );
}
