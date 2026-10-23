import { useState } from 'react';
import { Text, View } from 'react-native';

import { Button } from '@/components';
import { useBootstrap } from '@/hooks';

/**
 * TEMPORARY dev-only check for steps 3.5 and 3.6: calls `GET /api/bootstrap` on tap, so going
 * offline first should raise the "Can't reach the server" prompt. Remove it when the Returning
 * screen calls bootstrap for real (the wiring left after 3.5).
 */
export function DevBootstrapCheck() {
  // The query is enabled from the first tap on. A disabled query is skipped by the prompt's
  // Retry (`refetchQueries` ignores disabled queries), as real screens' queries are enabled.
  const [started, setStarted] = useState(false);
  const query = useBootstrap({ enabled: started });

  const call = () => {
    if (started) void query.refetch();
    else setStarted(true);
  };

  let status = 'Not called yet';
  if (query.isFetching) status = 'Calling the server…';
  else if (query.isSuccess) {
    const { hasHousehold, currentMonth } = query.data;
    status = `hasHousehold: ${hasHousehold}, month: ${currentMonth}`;
  } else if (query.isError) status = `Failed: ${query.error.message}`;

  return (
    <View className="gap-2 px-4 pb-2 pt-3">
      <Text className="font-manrope-medium text-caption text-on-surface-variant">
        Dev only. {status}
      </Text>
      <Button
        label="Call /api/bootstrap"
        variant="outline"
        onPress={call}
        loading={query.isFetching}
      />
    </View>
  );
}
