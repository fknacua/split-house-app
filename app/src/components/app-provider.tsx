import type { ReactNode } from 'react';

import { GluestackUIProvider } from '@/components/ui/gluestack-ui-provider';
import type { ThemePreference } from '@/lib/theme-preference';

/**
 * The UI library's root provider, mounted once in the root layout. A thin wrapper over the native
 * gluestack provider in `ui/gluestack-ui-provider`, which hosts the overlays (sheets, dialogs,
 * menus) and sets the app colour scheme.
 *
 * @param mode - The theme to apply: `light`, `dark`, or `system` to follow the phone.
 * @param children - The app.
 */
export function AppProvider({ mode, children }: { mode: ThemePreference; children: ReactNode }) {
  return <GluestackUIProvider mode={mode}>{children}</GluestackUIProvider>;
}
