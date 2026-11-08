import { Welcome } from '@/screens/welcome';

/** First run's Welcome, shown by the session gate until a month is open: the route only renders the screen. */
export default function WelcomeRoute() {
  return <Welcome />;
}
