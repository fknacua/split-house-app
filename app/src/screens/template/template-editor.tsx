import { useState } from 'react';
import { View } from 'react-native';

import { Alert, Screen, SubpageHeader } from '@/components';
import { useTemplateForm } from '@/hooks';
import { ApiRequestError } from '@/lib/api';
import { TemplateForm } from './components/template-form';
import { TemplateSkeleton } from './components/template-skeleton';
import type { TemplateEditorProps } from './types';

/**
 * The template editor: loads the latest saved values, which fill the form. A restore reopens the form on the restored
 * text, without the Restore link.
 */
export function TemplateEditor({ kind, personId }: TemplateEditorProps) {
  const { data, error, isPending } = useTemplateForm(kind, personId);
  // Bumped after a restore, so the form refills from the refetched response.
  const [opening, setOpening] = useState(0);

  if (!data) {
    return (
      <Screen>
        <SubpageHeader title="Message template" loading={isPending} />
        {error instanceof ApiRequestError ? (
          <View className="px-4 pt-2">
            <Alert variant="danger" message={error.message} />
          </View>
        ) : isPending ? (
          <TemplateSkeleton />
        ) : null}
      </Screen>
    );
  }

  return <TemplateForm key={opening} form={data} onRestored={() => setOpening((n) => n + 1)} />;
}
