import { useLocalSearchParams } from 'expo-router';

import { TemplateLanding } from '@/screens/template-landing';
import type { TemplateKind } from '@splithouse/shared';

/** One template's landing page, opened from Settings' Message templates rows: the route only renders the screen. */
export default function TemplateLandingRoute() {
  const { kind } = useLocalSearchParams<{ kind: TemplateKind }>();
  return <TemplateLanding kind={kind} />;
}
