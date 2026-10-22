import { createContext, type ReactNode, useContext, useState } from 'react';
import { View } from 'react-native';

const MIN_TARGET = 44;

const TouchTargetCheckContext = createContext(false);

/**
 * Turns the touch-target check on or off for every `TouchTargetCheck` below it.
 * Dev tool for the component test page.
 *
 * @param enabled - When true, wrapped elements under 44px get a red outline.
 */
export function TouchTargetCheckProvider({
  enabled,
  children,
}: {
  enabled: boolean;
  children: ReactNode;
}) {
  return (
    <TouchTargetCheckContext.Provider value={enabled}>{children}</TouchTargetCheckContext.Provider>
  );
}

/**
 * Wraps a tappable element and, while the check is on, outlines it in red when it is
 * shorter or narrower than 44px. Layout is unchanged when the check is off.
 *
 * @param children - The element to measure.
 * @param onMeasure - Optional, called with the measured width and height in dp.
 */
export function TouchTargetCheck({
  children,
  onMeasure,
}: {
  children: ReactNode;
  onMeasure?: (width: number, height: number) => void;
}) {
  const enabled = useContext(TouchTargetCheckContext);
  const [small, setSmall] = useState(false);

  return (
    <View
      onLayout={(e) => {
        const { width, height } = e.nativeEvent.layout;
        onMeasure?.(width, height);
        setSmall(Math.round(width) < MIN_TARGET || Math.round(height) < MIN_TARGET);
      }}
    >
      {children}
      {enabled && small ? (
        // Overlay, not a border: a border changes the measured size and makes it flicker.
        <View
          pointerEvents="none"
          className="absolute inset-0 border-2 border-danger"
        />
      ) : null}
    </View>
  );
}
