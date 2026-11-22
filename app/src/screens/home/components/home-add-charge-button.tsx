import { Plus } from 'lucide-react-native';

import { Button } from '@/components';
import { useHomeSheets } from '../home-sheets';

/**
 * The `+ Add charge` outline button at the end of Home's header (`Main`, every loaded state): opens the Add charge
 * sheet for the newest opened month. 44px, the small button, though the board draws 40px (V63).
 */
export function HomeAddChargeButton() {
  const { openAddCharge } = useHomeSheets();
  return <Button label="Add charge" variant="outline" size="small" icon={Plus} onPress={openAddCharge} />;
}
