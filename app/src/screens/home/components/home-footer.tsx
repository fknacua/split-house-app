import { Check, FilePen, Send, Upload, Wallet, type LucideIcon } from 'lucide-react-native';
import { View } from 'react-native';

import { Button } from '@/components';
import { useOpenTarget } from '../use-open-target';
import type { HomeFooterProps } from '../types';
import { HomeFooterBar } from './home-footer-bar';

const ICONS: Record<HomeFooterProps['buttons'][number]['icon'], LucideIcon> = {
  upload: Upload,
  'file-pen': FilePen,
  send: Send,
  wallet: Wallet,
  check: Check,
};

/**
 * The sticky buttons under the content, above the bottom navigation, in a two-column grid: buttons
 * pair up in rows, and an odd last one takes the full width. A lone button keeps the full-size label;
 * paired ones use the tighter `split` size so the label and its count fit. Solid or outline and the
 * count come from the server.
 */
export function HomeFooter({ buttons }: HomeFooterProps) {
  const { openTarget, isDisabled } = useOpenTarget();
  const rows: HomeFooterProps['buttons'][] = [];
  for (let i = 0; i < buttons.length; i += 2) rows.push(buttons.slice(i, i + 2));

  return (
    <HomeFooterBar>
      <View className="gap-2">
        {rows.map((row) => (
          <View key={row.map((b) => b.label).join('|')} className="flex-row gap-2">
            {row.map((button) => (
              <Button
                key={button.label}
                label={button.label}
                icon={ICONS[button.icon]}
                variant={button.variant === 'outline' ? 'outline' : 'primary'}
                size={row.length > 1 ? 'split' : 'default'}
                count={button.count ?? undefined}
                disabled={isDisabled(button.target)}
                onPress={() => openTarget(button.target)}
                className="min-w-0 flex-1"
              />
            ))}
          </View>
        ))}
      </View>
    </HomeFooterBar>
  );
}
