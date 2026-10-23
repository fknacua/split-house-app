import { useLocalSearchParams } from 'expo-router';

import { SignIn } from '@/screens/sign-in';

export default function SignInScreen() {
  const { reason } = useLocalSearchParams<{ reason?: string }>();
  return <SignIn sessionEnded={reason === 'ended'} />;
}
