import { useRouter } from 'expo-router';
import { useRef } from 'react';
import { RefreshControl, ScrollView } from 'react-native';

import { Alert, Screen, SubpageHeader, type AppSheetRef } from '@/components';
import { usePullToRefresh, useTemplateLanding } from '@/hooks';
import { ForWhoSheet } from './components/for-who-sheet';
import { LandingContent } from './components/landing-content';
import { LandingSkeleton } from './components/landing-skeleton';
import type { TemplateLandingProps } from './types';

/**
 * One template's landing page, opened from Settings: the Default and the custom templates, each with a preview the
 * server rendered and Edit. Add more and `Add custom template` open the For who sheet, and a tap there opens the
 * new custom template for that person. Every string but the buttons' comes from `GET /api/templates/:kind`.
 */
export function TemplateLanding({ kind }: TemplateLandingProps) {
  const router = useRouter();
  const { data, error, isPending, refetch } = useTemplateLanding(kind);
  const { refreshing, onRefresh } = usePullToRefresh(refetch);
  const forWho = useRef<AppSheetRef>(null);

  const openEditor = (personId: string | null) =>
    router.push({
      pathname: '/settings/template/[kind]/editor',
      params: personId ? { kind, personId } : { kind },
    });

  return (
    <Screen>
      <SubpageHeader title={data?.title ?? ''} subtitle={data?.sub} loading={!data && isPending} />
      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        contentContainerClassName="gap-4 px-4 pb-4 pt-2"
      >
        {error && !data ? <Alert variant="danger" message={error.message} /> : null}
        {data ? (
          <LandingContent landing={data} onEdit={openEditor} onAdd={() => forWho.current?.open()} />
        ) : isPending ? (
          <LandingSkeleton />
        ) : null}
      </ScrollView>
      {data ? (
        <ForWhoSheet
          ref={forWho}
          forWho={data.forWho}
          onChoose={(personId) => {
            forWho.current?.close();
            openEditor(personId);
          }}
        />
      ) : null}
    </Screen>
  );
}
