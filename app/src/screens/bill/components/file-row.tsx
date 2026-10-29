import { FileText } from 'lucide-react-native';
import { Text, View } from 'react-native';

import { Alert, Button, Card, Icon } from '@/components';
import { useOpenBillPdf } from '@/hooks';
import { ServerUnreachableError } from '@/lib/api';
import { NoPdfViewerError } from '@/lib/open-pdf';
import type { FileRowProps } from '../types';

/** The Alert for a failed Open, or null when there is nothing to show (the server prompt covers an unreachable server). */
function openError(error: Error | null): { title: string; message: string } | null {
  if (!error || error instanceof ServerUnreachableError) return null;
  if (error instanceof NoPdfViewerError) {
    return { title: 'No app can open PDFs', message: 'Install a PDF viewer, then try again.' };
  }
  return { title: 'Couldn’t open the bill', message: 'The PDF didn’t download. Try again.' };
}

/**
 * The stored PDF: a file icon, its name on one line, the pages and the day it was added, and Open,
 * which downloads it and opens the phone's PDF viewer. A failure shows a danger Alert under the
 * row until the next tap.
 */
export function FileRow({ month, file }: FileRowProps) {
  const open = useOpenBillPdf(month);
  const error = openError(open.error);

  return (
    <View className="gap-2">
      <Card padded={false} className="flex-row items-center gap-3 py-3 pl-4 pr-2">
        <View className="h-[52px] w-11 items-center justify-center rounded-lg bg-selected">
          <Icon as={FileText} size={24} className="text-on-selected" />
        </View>
        <View className="min-w-0 flex-1 gap-0.5">
          <Text numberOfLines={1} className="font-manrope-bold text-label text-on-surface">
            {file.filename}
          </Text>
          <Text className="font-manrope-semibold text-caption text-on-surface-variant">{file.meta}</Text>
        </View>
        <Button label="Open" variant="ghost" size="small" loading={open.isPending} onPress={() => open.mutate()} />
      </Card>
      {error ? <Alert variant="danger" title={error.title} message={error.message} /> : null}
    </View>
  );
}
