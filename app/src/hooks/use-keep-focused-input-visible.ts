import { useRef } from 'react';
import {
  type LayoutChangeEvent,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  type ScrollView,
  TextInput,
} from 'react-native';

/** Space kept between the focused field's bottom edge and the top of the keyboard. */
const MARGIN = 16;

/**
 * Keeps the focused text field above the keyboard in a scroll view that sits in a `KeyboardAvoidingView`. Android
 * scrolls a field into view as it gets focus, before the keyboard's padding shrinks the scroll view, so the field can
 * end up under the keyboard; a growing textarea can also push its last line under it. When the scroll view gets
 * shorter or its content taller, this scrolls just enough to show the focused field's bottom edge.
 *
 * @returns The scroll view's `ref`, and the `onLayout`, `onScroll` and `onContentSizeChange` handlers to pass to it.
 */
export function useKeepFocusedInputVisible() {
  const ref = useRef<ScrollView>(null);
  const offset = useRef(0);
  const height = useRef(0);

  const reveal = () => {
    const input = TextInput.State.currentlyFocusedInput();
    const scroll = ref.current;
    if (!input || !scroll) return;
    scroll.getNativeScrollRef()?.measureInWindow((_, scrollY, __, scrollHeight) => {
      input.measureInWindow((___, inputY, ____, inputHeight) => {
        const hidden = inputY + inputHeight + MARGIN - (scrollY + scrollHeight);
        if (hidden > 0) scroll.scrollTo({ y: offset.current + hidden, animated: true });
      });
    });
  };

  return {
    ref,
    onLayout: (event: LayoutChangeEvent) => {
      const next = event.nativeEvent.layout.height;
      // Shorter means the keyboard came up (or got taller).
      if (next < height.current) reveal();
      height.current = next;
    },
    onScroll: (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      offset.current = event.nativeEvent.contentOffset.y;
    },
    onContentSizeChange: () => reveal(),
  };
}
