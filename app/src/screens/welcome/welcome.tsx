import { useCallback } from 'react';
import { RefreshControl, ScrollView } from 'react-native';

import { Alert, Card, Screen } from '@/components';
import { useFinishSetup, usePullToRefresh, useSetup, useSkipSetupStep } from '@/hooks';
import type { SetupSkippableStep } from '@splithouse/shared';
import { WelcomeFooter } from './components/welcome-footer';
import { WelcomeHeader } from './components/welcome-header';
import { WelcomeRow } from './components/welcome-row';
import { WelcomeSkeleton } from './components/welcome-skeleton';
import { useOpenSetupTarget } from './use-open-setup-target';

/**
 * First run's step page (`Welcome.dc.html`: `empty`, `started`, `progress`, `optional`, `allDone`).
 * Everything shown comes from `GET /api/setup`; the app only renders it and opens the targets. `Not now` skips the
 * optional step and Welcome moves on; only `Finish setup` finishes First run, and the session gate then opens Home.
 * The session gate shows this screen, with no tabs, until a month is open.
 */
export function Welcome() {
  const { data, error, isPending, refetch } = useSetup();
  const { refreshing, onRefresh } = usePullToRefresh(refetch);
  const skip = useSkipSetupStep();
  const finish = useFinishSetup();
  const { mutate: skipStep } = skip;
  const { mutate: finishSetup } = finish;
  const onSkip = useCallback((step: SetupSkippableStep) => skipStep(step), [skipStep]);
  const onFinish = useCallback(() => finishSetup(), [finishSetup]);
  const open = useOpenSetupTarget({ onSkip, onFinish });
  const pending = skip.isPending ? 'skip-step' : finish.isPending ? 'finish' : null;
  const failed = skip.error ?? finish.error;

  return (
    <Screen>
      {isPending ? (
        <WelcomeSkeleton />
      ) : (
        <>
          <ScrollView
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
            contentContainerClassName="gap-5 px-4 pb-5 pt-4"
          >
            {error ? <Alert variant="danger" message={error.message} /> : null}
            {data ? (
              <>
                <WelcomeHeader heading={data.heading} intro={data.intro} progress={data.progress} />
                <Card padded={false} className="shrink-0">
                  {data.rows.map((row, i) => (
                    <WelcomeRow key={row.id} row={row} separated={i > 0} onOpen={open} />
                  ))}
                </Card>
              </>
            ) : null}
          </ScrollView>
          {data ? (
            <WelcomeFooter
              primary={data.primary}
              secondary={data.secondary}
              onOpen={open}
              pending={pending}
              error={failed?.message ?? null}
            />
          ) : null}
        </>
      )}
    </Screen>
  );
}
