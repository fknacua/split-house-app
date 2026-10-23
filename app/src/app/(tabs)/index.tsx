import { Screen } from '@/components';
import { Home } from '@/screens/home';
import { DevBootstrapCheck } from '@/screens/home/dev-bootstrap-check';

export default function HomeScreen() {
  return (
    <Screen>
      {__DEV__ ? <DevBootstrapCheck /> : null}
      <Home />
    </Screen>
  );
}
