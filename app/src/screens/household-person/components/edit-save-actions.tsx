import { Alert, Button, DEFAULT_FAILED_MESSAGE } from '@/components';
import { requestMessage } from '../use-edit-flow';
import type { EditSaveActionsProps } from '../types';

/** The top of a Household form's footer: what stops the save, then Save changes, which reads Retry after a failure. */
export function EditSaveActions({ flow, disabled }: EditSaveActionsProps) {
  return (
    <>
      {flow.noticeError ? <Alert variant="danger" message={flow.noticeError} className="mb-1.5" /> : null}
      {flow.failed ? (
        <Alert
          variant="danger"
          message={requestMessage(flow.saveError) ?? DEFAULT_FAILED_MESSAGE}
          className="mb-1.5"
        />
      ) : null}
      <Button
        label={flow.saving ? 'Saving' : flow.failed ? 'Retry' : 'Save changes'}
        loading={flow.saving}
        // The save's refetch changes the loaded values, so the checks only count before it starts.
        disabled={!flow.saving && (disabled || !flow.canSave)}
        onPress={flow.onSave}
      />
    </>
  );
}
