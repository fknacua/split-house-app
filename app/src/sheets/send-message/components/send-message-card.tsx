import * as Clipboard from 'expo-clipboard';
import { Copy, Pencil } from 'lucide-react-native';
import { Pressable, Text, View } from 'react-native';

import { Icon, MessagePreview } from '@/components';
import type { SendMessageCardProps } from '../types';

/**
 * The message: its label and template line with Edit template, then the message as WhatsApp shows
 * it and Copy as plain text, which copies it exactly as it is sent. With nothing ticked, the card says
 * to pick a charge instead. Android shows its own notice once text is copied.
 */
export function SendMessageCard({ message, onEditTemplate }: SendMessageCardProps) {
  const { preview } = message;
  return (
    <View className="gap-1.5">
      <View className="flex-row items-center justify-between gap-2">
        <View className="shrink">
          <Text accessibilityRole="header" className="font-manrope-bold text-label text-on-surface">
            {message.label}
          </Text>
          <Text className="font-manrope-semibold text-caption text-on-surface-variant">{message.meta}</Text>
        </View>
        <Pressable
          accessibilityRole="link"
          onPress={onEditTemplate}
          className="min-h-11 flex-row items-center gap-1.5 px-1 active:opacity-70"
        >
          <Icon as={Pencil} size={18} className="text-on-surface" />
          <Text className="font-manrope-bold text-label text-on-surface">{message.editTemplate.label}</Text>
        </Pressable>
      </View>
      <View className="gap-1.5 rounded-2xl bg-background px-3.5 pt-3.5 dark:bg-surface">
        {preview ? (
          <MessagePreview message={preview} />
        ) : (
          <Text className="pb-3.5 font-manrope-semibold text-label text-on-surface-variant">{message.empty}</Text>
        )}
        {preview ? (
          <View className="-mx-1.5 mt-1 flex-row justify-end border-t border-outline-variant">
            <Pressable
              accessibilityRole="button"
              onPress={() => void Clipboard.setStringAsync(preview.text)}
              className="min-h-11 flex-row items-center gap-1.5 px-2 active:opacity-70"
            >
              <Icon as={Copy} size={18} className="text-on-surface" />
              <Text className="font-manrope-bold text-label text-on-surface">Copy as plain text</Text>
            </Pressable>
          </View>
        ) : null}
      </View>
    </View>
  );
}
