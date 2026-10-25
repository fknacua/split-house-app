const TOP_SHADOW_LIGHT = '0 -6px 14px rgba(0,0,0,0.14)';
const TOP_SHADOW_DARK = '0 -8px 16px rgba(0,0,0,0.45)';

/**
 * The shadow cast upward by a bar that sits above the content (the bottom navigation and a screen's
 * sticky footer), from the design's elevation table.
 *
 * @param theme - The resolved theme.
 * @returns A `boxShadow` value for the bar's `style`.
 */
export function topShadow(theme: 'light' | 'dark'): string {
  return theme === 'dark' ? TOP_SHADOW_DARK : TOP_SHADOW_LIGHT;
}
