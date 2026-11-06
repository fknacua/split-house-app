import { useLocalSearchParams } from 'expo-router';

import { TemplateEditor } from '@/screens/template';
import type { TemplateKind } from '@splithouse/shared';

/** The template editor for the Default or one person's custom template, opened from the landing page and Recipient's Edit template: the route only renders the screen. */
export default function TemplateEditorRoute() {
  const { kind, personId } = useLocalSearchParams<{ kind: TemplateKind; personId?: string }>();
  return <TemplateEditor kind={kind} personId={personId ?? null} />;
}
