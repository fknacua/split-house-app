import { Text, View } from 'react-native';

import { Alert } from '@/components';
import type { FailedStepProps } from '../types';
import { FileCard } from './file-card';

/**
 * The `failed` board: the server found no Current Charges in the file, so it asks whether this is
 * the right bill. Yes and No are in the footer.
 */
export function FailedStep({ draft }: FailedStepProps) {
  return (
    <>
      <Alert
        variant="danger"
        title="Couldn’t read this bill"
        message="It may be a different document, or the bill may have a new layout."
      />
      <FileCard filename={draft.file.filename} meta={draft.file.meta} size="large" />
      <View className="gap-1.5 px-1 pt-2">
        <Text accessibilityRole="header" className="font-manrope-extrabold text-title text-on-surface">
          Is this the right bill?
        </Text>
        <Text className="font-manrope text-body text-on-surface-variant">
          If it is, you can type the amounts yourself. The file is kept with the bill.
        </Text>
      </View>
    </>
  );
}
