import { useLocalSearchParams, useRouter } from 'expo-router';
import { Pencil } from 'lucide-react-native';
import { ScrollView, View } from 'react-native';

import { Alert, Button, Screen, SubpageFooter, SubpageHeader } from '@/components';
import { useHouseholdForm } from '@/hooks';
import { ApiRequestError } from '@/lib/api';
import { FormSection } from './components/form-section';
import { PersonSkeleton } from './components/person-skeleton';
import { ViewColorRow } from './components/view-color-row';
import { ViewRow } from './components/view-row';

/**
 * The `viewPerson` board: a person's latest saved details, read-only, with one Edit button. Every string
 * comes from `GET /api/household/form`, including the note when the amounts haven't taken effect yet.
 */
export function PersonView() {
  const { personId } = useLocalSearchParams<{ personId: string }>();
  const router = useRouter();
  const { data: form, error, isPending } = useHouseholdForm(personId);

  const openEdit = () => router.push({ pathname: '/household/person/[personId]/edit', params: { personId } });

  return (
    <Screen>
      <SubpageHeader title={form?.viewTitle ?? 'Household'} subtitle={form?.sub} loading={isPending} />
      {isPending ? <PersonSkeleton /> : null}
      {error instanceof ApiRequestError ? (
        <View className="px-4 pt-2">
          <Alert variant="danger" message={error.message} />
        </View>
      ) : null}
      {form ? (
        <>
          <ScrollView className="flex-1" contentContainerClassName="gap-4 px-4 pb-4 pt-2">
            <FormSection title="Details" separated={false}>
              {form.view.details.map((row) => (
                <ViewRow key={row.label} row={row} />
              ))}
              <ViewColorRow color={form.values.color} name={form.colorName} />
            </FormSection>
            <FormSection title="Amounts" note={form.pendingNote} separated>
              <View className="flex-row flex-wrap gap-x-3 gap-y-4">
                {form.view.amounts.map((row) => (
                  <ViewRow key={row.label} row={row} half />
                ))}
              </View>
              {form.view.routes.map((row) => (
                <ViewRow key={row.label} row={row} />
              ))}
            </FormSection>
          </ScrollView>
          <SubpageFooter>
            <Button label="Edit" icon={Pencil} onPress={openEdit} />
          </SubpageFooter>
        </>
      ) : null}
    </Screen>
  );
}
