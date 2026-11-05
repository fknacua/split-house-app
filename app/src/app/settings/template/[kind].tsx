import { useLocalSearchParams } from 'expo-router';

import { TemplateEditor } from '@/screens/template';
import type { TemplateKind } from '@splithouse/shared';

/** The template editor, opened from Settings' Messages rows and Recipient's Edit template: the route only renders the screen. */
export default function TemplateEditorRoute() {
  const { kind } = useLocalSearchParams<{ kind: TemplateKind }>();
  return <TemplateEditor kind={kind} />;
}
