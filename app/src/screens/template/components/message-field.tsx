import { Undo } from 'lucide-react-native';

import { LinkButton, TextareaInput } from '@/components';
import type { MessageFieldProps } from '../types';

/** The Message field as drawn: the label with `Restore to original` beside it, the Textarea, and the inline error. */
export function MessageField({
  control,
  restoreLabel,
  onRestore,
  disabled,
  selection,
  onSelectionChange,
}: MessageFieldProps) {
  return (
    <TextareaInput
      lines={6}
      maxLines={12}
      autoCapitalize="sentences"
      selection={selection}
      onSelectionChange={onSelectionChange}
      fieldControlProps={{
        control,
        name: 'text',
        label: 'Message',
        labelAction:
          restoreLabel && onRestore ? (
            <LinkButton label={restoreLabel} icon={Undo} disabled={disabled} onPress={onRestore} />
          ) : undefined,
      }}
    />
  );
}
