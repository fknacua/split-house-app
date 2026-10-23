import { useLocalSearchParams } from 'expo-router';

import { useSessionEnded } from '@/lib/session';
import { SignIn } from '@/screens/sign-in';

export default function SignInScreen() {
  const { reason } = useLocalSearchParams<{ reason?: string }>();
  const ended = useSessionEnded();
  return <SignIn sessionEnded={ended || reason === 'ended'} />;
}
