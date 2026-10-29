import { FileText } from 'lucide-react-native';
import { Text, View } from 'react-native';

import { Button, Card, Icon } from '@/components';
import type { FileRowProps } from '../types';

/** The stored PDF: a file icon, its name on one line, the pages and the day it was added, and Open. */
export function FileRow({ file }: FileRowProps) {
  return (
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
      {/* 6.7 opens the PDF in the phone's viewer. */}
      <Button label="Open" variant="ghost" size="small" onPress={() => {}} />
    </Card>
  );
}
