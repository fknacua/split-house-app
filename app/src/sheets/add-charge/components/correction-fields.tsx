import { Alert, BareDateField, BareSelectField, FormField, MoneyInput } from '@/components';
import { correctionPicks, withCorrectionCharge, withCorrectionMonth, withCorrectionPerson } from '../helpers';
import type { CorrectionFieldsProps } from '../types';
import { LockedField } from './locked-field';

/**
 * Correction mode (`AddCharge` `correction*` states): Person, Month and Charge, each enabled once the one above is
 * picked (read-only rows when opened from a charge), with how many times the picked charge was corrected under the
 * Charge field (its option already shows the current amount); the New amount, the info Alert with the outcome, and the Due date, always shown and enabled only for a higher amount. Which parts are enabled
 * and every line of text come from the server's preview.
 */
export function CorrectionFields({ selects, values, preview, disabled, onChange }: CorrectionFieldsProps) {
  const { correction } = values;
  const picks = correctionPicks(selects, correction);
  const pickers = [
    {
      label: 'Person',
      placeholder: selects.person.placeholder,
      options: picks.people,
      value: correction.personId ?? '',
      locked: picks.labels.person,
      enabled: true,
      helper: null,
      pick: (v: string) => withCorrectionPerson(values, v),
    },
    {
      label: 'Month',
      placeholder: selects.month.placeholder,
      options: picks.months,
      value: correction.month ?? '',
      locked: picks.labels.month,
      enabled: correction.personId !== null,
      helper: null,
      pick: (v: string) => withCorrectionMonth(values, v),
    },
    {
      label: 'Charge',
      placeholder: selects.charge.placeholder,
      options: picks.charges,
      value: correction.chargeId ?? '',
      locked: picks.labels.charge,
      enabled: correction.month !== null,
      helper: preview.corrections,
      pick: (v: string) => withCorrectionCharge(values, v),
    },
  ];

  return (
    <>
      {pickers.map((p) => (
        <FormField key={p.label} label={p.label} required disabled={disabled} helper={p.helper ?? undefined}>
          {selects.locked ? (
            <LockedField accessibilityLabel={p.label} value={p.locked} />
          ) : (
            <BareSelectField
              accessibilityLabel={p.label}
              options={p.options}
              placeholder={p.placeholder}
              value={p.value}
              onChange={(v) => onChange(p.pick(v), true)}
              disabled={disabled || !p.enabled}
            />
          )}
        </FormField>
      ))}
      <FormField label="New amount (SGD)" required disabled={disabled || !preview.amountEnabled}>
        <MoneyInput
          accessibilityLabel="New amount (SGD)"
          placeholder="Enter amount"
          value={correction.amountCents}
          onChange={(amountCents) => onChange({ ...values, correction: { ...correction, amountCents } }, false)}
          disabled={disabled || !preview.amountEnabled}
        />
      </FormField>
      {preview.outcome ? <Alert variant="info" message={preview.outcome} /> : null}
      <FormField label="Due date" required disabled={disabled || !preview.dueDateEnabled}>
        <BareDateField
          accessibilityLabel="Due date"
          placeholder="Select date"
          value={correction.dueDate ?? ''}
          onChange={(key) => onChange({ ...values, correction: { ...correction, dueDate: key === '' ? null : key } }, true)}
          disabled={disabled || !preview.dueDateEnabled}
        />
      </FormField>
    </>
  );
}
