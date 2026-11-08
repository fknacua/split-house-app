import { Image } from 'expo-image';

// The animated app icon (squircle), in place of the designs' house glyph tile (Francis's call).
const APP_ICON = require('../../assets/images/app-icon/splithouse-squircle-loop.webp');

/** The logo's one size on every screen that shows it (Francis, 2026-11-08: Sign in and Welcome match). */
const LOGO_SIZE = 64;

/**
 * The looping animated app logo at the top of Sign in, Returning and Welcome. One size everywhere,
 * so the screens match. Decorative: screen readers skip it.
 */
export function AppLogo() {
  return (
    <Image
      source={APP_ICON}
      style={{ width: LOGO_SIZE, height: LOGO_SIZE }}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    />
  );
}
