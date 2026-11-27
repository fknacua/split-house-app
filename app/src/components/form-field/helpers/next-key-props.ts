import type { TextInputProps } from 'react-native';

/**
 * The keyboard props for a single-line text input's return key. With `onNext` the key shows
 * `next`, keeps the keyboard up (`submitBehavior="submit"`, so focus moves without the keyboard
 * closing and reopening) and calls `onNext`; without it the key shows `done` and closes the keyboard.
 *
 * @param onNext - Moves focus to the next field, or `undefined` for the last field.
 * @returns Props to spread onto the React Native text input.
 */
export function nextKeyProps(
  onNext: (() => void) | undefined
): Pick<TextInputProps, 'returnKeyType' | 'submitBehavior' | 'onSubmitEditing'> {
  return onNext
    ? { returnKeyType: 'next', submitBehavior: 'submit', onSubmitEditing: onNext }
    : { returnKeyType: 'done' };
}
