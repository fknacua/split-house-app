import { BottomSheetTextInput as GorhomBottomSheetTextInput } from '@gorhom/bottom-sheet';
import { createContext, forwardRef, useContext } from 'react';
import { TextInput, type TextInputProps } from 'react-native';
import { styled } from 'nativewind';

/** True inside a bottom sheet's body. `AppSheet` provides it, so the text fields in it tell the sheet about the keyboard. */
export const InSheetContext = createContext(false);

const StyledGorhomTextInput = styled(GorhomBottomSheetTextInput, { className: 'style' });

/**
 * The text input the shared Input and Textarea render: the bottom sheet's own `BottomSheetTextInput` inside a sheet,
 * otherwise React Native's. The sheet only moves above the keyboard for a focused `BottomSheetTextInput`, so with a
 * plain one the keyboard covers the sheet's lower fields.
 */
export const SheetAwareTextInput = forwardRef<TextInput, TextInputProps & { className?: string }>(
  function SheetAwareTextInput(props, ref) {
    const inSheet = useContext(InSheetContext);
    // @ts-expect-error The gorhom input forwards its ref to a React Native TextInput.
    return inSheet ? <StyledGorhomTextInput ref={ref} {...props} /> : <TextInput ref={ref} {...props} />;
  },
);
