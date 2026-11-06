import { Text } from 'react-native';

import type { MessageRun } from '@splithouse/shared';

/** Props for {@link MessageRuns}. */
export interface MessageRunsProps {
  /** The server's bold and plain pieces. */
  runs: MessageRun[];
}

/** Template text in its bold and plain pieces, nested in a `Text` that sets the size and colour. */
export function MessageRuns({ runs }: MessageRunsProps) {
  return runs.map((run, i) =>
    run.bold ? (
      <Text key={i} className="font-manrope-bold">
        {run.text}
      </Text>
    ) : (
      run.text
    ),
  );
}
