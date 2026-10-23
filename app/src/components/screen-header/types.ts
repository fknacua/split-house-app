import { ReactNode } from "react";

/** Props for {@link PageHeader}. */
export interface PageHeaderProps {
  /** Page title (History, Settings). */
  title: string;
  /** Optional control on the right, for example a small outline Button. */
  trailing?: ReactNode;
}

/** Props for {@link SubpageHeader}. */
export interface SubpageHeaderProps extends PageHeaderProps {
  /** Optional line under the title at 12/16 (a month, "Read-only"). */
  subtitle?: string;
  /** Accessibility label of the back button. Defaults to "Back". */
  backLabel?: string;
  /** Replaces the default back action (`router.back()`), for example to ask about unsaved changes. */
  onBack?: () => void;
}