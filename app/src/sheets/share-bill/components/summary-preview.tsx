import { Text, View } from 'react-native';

import type { BillShareLine } from '@splithouse/shared';
import type { SummaryPreviewProps } from '../types';

/** The class for each line's tone: the title bold, the rest medium, `muted` in the variant colour. */
const TONE_CLASS: Record<BillShareLine['tone'], string> = {
  title: 'font-manrope-bold text-on-surface',
  body: 'font-manrope-medium text-on-surface',
  muted: 'font-manrope-medium text-on-surface-variant',
};

/** The summary as it will be shared, one line per row in the tinted box. */
export function SummaryPreview({ summary }: SummaryPreviewProps) {
  return (
    <View className="gap-0.5 rounded-option border border-outline-variant bg-container px-3.5 py-3">
      {summary.lines.map((line, i) => (
        <Text key={i} className={`text-label ${TONE_CLASS[line.tone]}`}>
          {line.text}
        </Text>
      ))}
    </View>
  );
}
