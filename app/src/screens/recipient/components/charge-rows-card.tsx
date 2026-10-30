import { Card } from '@/components';
import type { ChargeRowsCardProps } from '../types';
import { ChargeRow } from './charge-row';

/** The overdue layout's card of unpaid charges, under the amount card. */
export function ChargeRowsCard({ rows }: ChargeRowsCardProps) {
  return (
    <Card padded={false} className="px-4 py-1">
      {rows.map((row, i) => (
        <ChargeRow key={row.chargeId} row={row} first={i === 0} />
      ))}
    </Card>
  );
}
