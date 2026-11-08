import { useRouter } from 'expo-router';
import { UserPlus } from 'lucide-react-native';
import { ScrollView, View } from 'react-native';

import { Alert, Button, Screen, SubpageFooter, SubpageHeader } from '@/components';
import { useMarkSetupStep } from '@/hooks';
import { HouseholdCard } from '@/screens/household/components/household-card';
import { TabHeading } from '@/screens/household/components/tab-heading';
import type { HouseholdTarget } from '@splithouse/shared';
import type { PeopleFormProps } from '../types';
import { PeopleEmptyCard } from './people-empty-card';

/**
 * The `FirstRunPeople` board (`empty`, `one`, `list`): Household's person cards with View and Edit, or the empty card,
 * and `Add more` once someone is added. Each person is saved by their own form, so `Save people` only marks the step
 * and goes back to Welcome. A failed mark shows above the button; the board's `failed` state is not built.
 */
export function PeopleForm({ page }: PeopleFormProps) {
  const router = useRouter();
  const mark = useMarkSetupStep();

  const openTarget = (target: HouseholdTarget) => {
    if (target.kind === 'view-person') {
      router.push({ pathname: '/household/person/[personId]', params: { personId: target.personId } });
    } else if (target.kind === 'edit-person') {
      router.push({ pathname: '/household/person/[personId]/edit', params: { personId: target.personId } });
    } else if (target.kind === 'add-person') {
      router.push('/household/add-person');
    }
  };

  return (
    <Screen>
      <SubpageHeader title={page.title} subtitle={page.sub} />
      <ScrollView contentContainerClassName="gap-2 px-4 pb-4 pt-2">
        <TabHeading
          title={page.heading}
          actionLabel={page.addMore?.label ?? null}
          actionIcon={UserPlus}
          onAction={() => (page.addMore ? openTarget(page.addMore.target) : undefined)}
        />
        {page.empty ? <PeopleEmptyCard text={page.empty.text} add={page.empty.add} onOpen={openTarget} /> : null}
        <View className="gap-2">
          {page.people.map((person) => (
            <HouseholdCard key={person.personId} card={person} onOpen={openTarget} />
          ))}
        </View>
      </ScrollView>
      <SubpageFooter>
        {mark.error ? <Alert variant="danger" message={mark.error.message} className="mb-1.5" /> : null}
        <Button
          label={page.save.label}
          loading={mark.isPending}
          disabled={!page.save.enabled}
          onPress={() => mark.mutate('people', { onSuccess: () => router.back() })}
        />
      </SubpageFooter>
    </Screen>
  );
}
