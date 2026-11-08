import { ArrowRight } from 'lucide-react-native';

import { Button, SubpageFooter } from '@/components';
import type { WelcomeFooterProps } from '../types';

/** Welcome's fixed footer: the main button with its arrow and, from `optional` on, the link under it. */
export function WelcomeFooter({ primary, secondary, onOpen }: WelcomeFooterProps) {
  return (
    <SubpageFooter>
      <Button label={primary.label} icon={ArrowRight} iconAfter onPress={() => onOpen(primary.target)} />
      {secondary ? (
        <Button label={secondary.label} variant="ghost" onPress={() => onOpen(secondary.target)} />
      ) : null}
    </SubpageFooter>
  );
}
