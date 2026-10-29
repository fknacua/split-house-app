import { zodResolver } from '@hookform/resolvers/zod';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { FileText, TriangleAlert } from 'lucide-react-native';
import { useRef, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { KeyboardAvoidingView, ScrollView } from 'react-native';

import { Button, ConfirmDialog, Screen, SubpageHeader } from '@/components';
import { useCheckBill, useCheckBillNow, useDebouncedValue, useSaveBill, useUploadBillDraft } from '@/hooks';
import { ServerUnreachableError } from '@/lib/api';
import {
  formatMonthLabel,
  formatMonthName,
  type BillDraftResponse,
  type SaveBillRequest,
} from '@splithouse/shared';
import { PickStep } from './components/pick-step';
import { ReviewForm } from './components/review-form';
import { ReviewSkeleton } from './components/review-skeleton';
import { UploadFooter } from './components/upload-footer';
import {
  pickBillPdf,
  reviewFormSchema,
  toCheckBillRequest,
  toReviewFormValues,
  toSaveBillRequest,
  type PickedPdfProblem,
  type ReviewFormValues,
} from './helpers';
import type { UploadStep } from './types';

/** How long the form has to stay still before the server checks it, in milliseconds. */
const CHECK_DELAY_MS = 500;

/** The message to show for a failed request, or null for an unreachable server (the app's own prompt covers that). */
function messageOf(error: Error | null): string | null {
  return error && !(error instanceof ServerUnreachableError) ? error.message : null;
}

/**
 * Bill upload, opened from Home for one month: choose the PDF, wait while the server reads it,
 * then check the values and save. Saving creates the month's utilities charges and returns to
 * Home, which then shows the month as `unsent`.
 */
export function BillUpload() {
  const { month } = useLocalSearchParams<{ month: string }>();
  const router = useRouter();
  const [step, setStep] = useState<UploadStep>('pick');
  const [filename, setFilename] = useState('');
  const [draft, setDraft] = useState<BillDraftResponse | null>(null);
  const [problem, setProblem] = useState<PickedPdfProblem | null>(null);
  // Cancel while the server reads the file makes the pending upload's answer stale, so it is ignored.
  const uploadId = useRef(0);
  // Review bill is on screen but the server has not answered yet: the form shows as a skeleton.
  const reading = step === 'review' && draft === null;

  const upload = useUploadBillDraft(month);
  const save = useSaveBill(month);
  const checkNow = useCheckBillNow(month);
  // What "Save with warnings?" is asking about: the request to save and the warnings to list; null while closed.
  const [confirming, setConfirming] = useState<{ request: SaveBillRequest; warnings: string[] } | null>(null);
  // Checked as it changes, so clearing Current Charges turns the field red straight away.
  const {
    control,
    handleSubmit,
    reset,
    trigger,
    formState: { isValid, isSubmitting },
  } = useForm<ReviewFormValues>({
    resolver: zodResolver(reviewFormSchema),
    mode: 'onChange',
  });
  // The server's checks run once typing pauses; Save checks them again.
  const values = useWatch({ control });
  const checkRequest = useDebouncedValue(
    toCheckBillRequest(values, draft?.fields.subtotalCents ?? null),
    CHECK_DELAY_MS,
  );
  const check = useCheckBill(month, checkRequest, draft !== null).data;
  const blockers = check?.blockers ?? [];

  const choosePdf = async () => {
    const picked = await pickBillPdf();
    if (!picked) return;
    if (picked.problem) {
      setProblem(picked.problem);
      setStep('pick');
      return;
    }
    setProblem(null);
    save.reset();
    const id = ++uploadId.current;
    setFilename(picked.file.name);
    setDraft(null);
    setStep('review');
    upload.mutate(picked.file, {
      onSuccess: (read) => {
        if (id !== uploadId.current) return;
        setDraft(read);
        reset(toReviewFormValues(read.fields));
        // Fields are only checked once they change, so check what the bill left empty straight away.
        void trigger();
        setStep('review');
      },
      onError: () => {
        if (id === uploadId.current) setStep('pick');
      },
    });
  };

  const cancelReading = () => {
    uploadId.current += 1;
    upload.reset();
    setStep('pick');
  };

  const leave = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/');
  };

  const onSave = handleSubmit(async (formValues) => {
    const request = toSaveBillRequest(formValues);
    let warnings: string[] = [];
    try {
      // The check on screen can be a typing pause behind, so ask again for exactly these values.
      const fresh = await checkNow(toCheckBillRequest(formValues, draft?.fields.subtotalCents ?? null));
      // A blocker shows as an Alert once the check on screen catches up, and the server would refuse the save.
      if (fresh.blockers.length > 0) return;
      warnings = fresh.warnings;
    } catch (error) {
      // An unreachable server has the app's own prompt. Any other failure of the check must not stop
      // the save, which checks the blockers itself.
      if (error instanceof ServerUnreachableError) return;
    }
    if (warnings.length > 0) setConfirming({ request, warnings });
    else save.mutate(request, { onSuccess: leave });
  });

  const closeConfirm = () => {
    setConfirming(null);
    save.reset();
  };

  const saveAnyway = () => {
    if (confirming) save.mutate(confirming.request, { onSuccess: leave });
  };

  return (
    <Screen>
      <SubpageHeader
        title={step === 'review' ? 'Review bill' : 'Utilities bill'}
        subtitle={formatMonthLabel(month)}
        onBack={reading ? cancelReading : undefined}
      />
      {/* Edge-to-edge Android does not resize for the keyboard, so the padding keeps the focused field in view. */}
      <KeyboardAvoidingView behavior="padding" className="flex-1">
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerClassName="gap-4 px-4 pb-5 pt-2">
          {step === 'pick' ? (
            <PickStep monthName={formatMonthName(month)} problem={problem} error={messageOf(upload.error)} />
          ) : null}
          {reading ? <ReviewSkeleton filename={filename} /> : null}
          {step === 'review' && draft ? (
            <ReviewForm
              draft={draft}
              control={control}
              onChooseAnother={choosePdf}
              blockers={blockers}
              linesNote={check?.linesNote ?? null}
              saveError={messageOf(save.error)}
            />
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>
      <UploadFooter>
        {step === 'pick' ? <Button label="Choose PDF" icon={FileText} onPress={choosePdf} /> : null}
        {reading ? <Button label="Cancel" variant="outline" onPress={cancelReading} /> : null}
        {step === 'review' && draft ? (
          <>
            <Button
              label={save.isPending ? 'Saving' : 'Save bill'}
              loading={save.isPending || isSubmitting}
              disabled={!isValid || blockers.length > 0 || isSubmitting}
              onPress={onSave}
            />
            {/* Cancel asks "Discard this bill?" in 6.4; until then it does nothing. */}
            <Button label="Cancel" variant="ghost" size="small" />
          </>
        ) : null}
      </UploadFooter>
      <ConfirmDialog
        open={confirming !== null}
        tone="warning"
        icon={TriangleAlert}
        title="Save with warnings?"
        body="Check these before you continue:"
        items={confirming?.warnings}
        itemStyle="bullet"
        cancelLabel="Go back and fix"
        onCancel={closeConfirm}
        confirmLabel="Save anyway"
        onConfirm={saveAnyway}
        loading={save.isPending}
        error={messageOf(save.error) ?? undefined}
      />
    </Screen>
  );
}
