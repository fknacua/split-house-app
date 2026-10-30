import * as Clipboard from 'expo-clipboard';
import { Copy, Pencil } from 'lucide-react-native';
import { Pressable, Text, View } from 'react-native';

import { Card, Icon } from '@/components';
import { useOpenRecipientTarget } from '../use-open-recipient-target';
import type { MessageCardProps } from '../types';
import { MessageSection } from './message-section';

/**
 * The message: its label and template line with Edit template, then a preview of the text as
 * WhatsApp shows it (line breaks and emoji kept, section titles bold, the total line stressed as on
 * the board), and Copy as plain text,
 * which copies the message exactly as it is sent. Android shows its own notice once text is copied.
 */
export function MessageCard({ message }: MessageCardProps) {
  const { openTarget } = useOpenRecipientTarget();
  const { editTemplate } = message;

  return (
    <View className="gap-2">
      <View className="flex-row items-center justify-between gap-2 pl-1">
        <View className="shrink">
          <Text accessibilityRole="header" className="font-manrope-bold text-body text-on-surface">
            {message.label}
          </Text>
          <Text className="font-manrope-semibold text-caption text-on-surface-variant">{message.meta}</Text>
        </View>
        <Pressable
          accessibilityRole="link"
          disabled={!editTemplate.enabled}
          onPress={() => openTarget(editTemplate.target)}
          className="min-h-11 flex-row items-center gap-1.5 px-1 active:opacity-70"
        >
          <Icon as={Pencil} size={16} className="text-on-surface" />
          <Text className="font-manrope-bold text-label text-on-surface">{editTemplate.label}</Text>
        </Pressable>
      </View>
      <Card padded={false} className="gap-1.5 px-3.5 pt-3">
        {message.intro ? (
          <Text className="font-manrope text-[13px] leading-[17px] text-on-surface">{message.intro}</Text>
        ) : null}
        {message.sections.map((section, i) => (
          <MessageSection key={i} section={section} />
        ))}
        {message.outro.map((line, i) =>
          line.isTotal ? (
            <Text
              key={i}
              className="border-t border-outline pt-1.5 font-manrope-extrabold text-body leading-5 text-on-surface"
              style={{ fontVariant: ['tabular-nums'] }}
            >
              {line.text}
            </Text>
          ) : (
            // A blank template line keeps its height.
            <Text key={i} className="font-manrope text-[13px] leading-[17px] text-on-surface">
              {line.text || ' '}
            </Text>
          ),
        )}
        <View className="-mx-1.5 flex-row justify-end border-t border-outline-variant">
          <Pressable
            accessibilityRole="button"
            onPress={() => void Clipboard.setStringAsync(message.text)}
            className="min-h-11 flex-row items-center gap-1.5 px-2 active:opacity-70"
          >
            <Icon as={Copy} size={16} className="text-on-surface" />
            <Text className="font-manrope-bold text-label text-on-surface">Copy as plain text</Text>
          </Pressable>
        </View>
      </Card>
    </View>
  );
}
