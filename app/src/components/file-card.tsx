import { FileText } from 'lucide-react-native';
import type { ReactNode } from 'react';
import { Text, View } from 'react-native';

import { Card } from '@/components/card';
import { Icon } from '@/components/icon';
import { SkeletonBlock } from '@/components/skeletons';

/** Props for {@link FileCard}. */
export interface FileCardProps {
  /** The file's name, or null while it is not known yet (a stored draft loading): a placeholder then. */
  filename: string | null;
  /** e.g. `2 pages · 214 KB`. Left out while the file is still uploading. */
  meta?: string;
  size: 'large' | 'small';
  /** `surface` (default) is a `Card`; `container` is the grey box of the Share bill summary, for a sheet. */
  tone?: 'surface' | 'container';
  /** Drawn under the file row, such as the Spinner or Choose another file. */
  children?: ReactNode;
}

/** The grey box (`bg-container`), with the summary preview's border, radius and padding. */
function ContainerBox({ className, children }: { className?: string; children?: ReactNode }) {
  return (
    <View className={`rounded-option border border-outline-variant bg-container px-3.5 py-3 ${className ?? ''}`}>
      {children}
    </View>
  );
}

/**
 * A bill PDF: a file icon, its name on one line and the pages and size under it. A null name draws
 * a placeholder. Used by Bill upload and Share bill (`tone="container"`: a `Card` vanishes on the
 * white sheet in light mode).
 */
export function FileCard({ filename, meta, size, tone = 'surface', children }: FileCardProps) {
  const large = size === 'large';
  const Frame = tone === 'container' ? ContainerBox : Card;
  return (
    <Frame className={large ? 'gap-4' : 'gap-3 pb-0 pt-3'}>
      <View className="flex-row items-center gap-3">
        <View
          className={`items-center justify-center rounded-lg bg-selected ${large ? 'h-[52px] w-11' : 'h-12 w-10'}`}
        >
          <Icon as={FileText} size={large ? 24 : 22} className="text-on-selected" />
        </View>
        <View className="min-w-0 flex-1 gap-0.5">
          {filename === null ? (
            <SkeletonBlock className="h-4" width="60%" />
          ) : (
            <Text numberOfLines={1} className="font-manrope-bold text-label text-on-surface">
              {filename}
            </Text>
          )}
          {meta ? (
            <Text className="font-manrope-semibold text-caption text-on-surface-variant">{meta}</Text>
          ) : null}
        </View>
      </View>
      {children}
    </Frame>
  );
}
