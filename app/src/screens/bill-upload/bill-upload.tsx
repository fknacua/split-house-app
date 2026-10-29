import { zodResolver } from '@hookform/resolvers/zod';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { FileText, Trash2, TriangleAlert } from 'lucide-react-native';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { BackHandler, KeyboardAvoidingView, ScrollView } from 'react-native';

import { Button, ConfirmDialog, Screen, SubpageHeader } from '@/components';
import {
  useCheckBill,
  useCheckBillNow,
  useDebouncedValue,
  useDiscardBillDraft,
  useLoadBillDraft,
  useSaveBill,
  useUploadBillDraft,
} from '@/hooks';
import { RequestCancelledError, ServerUnreachableError } from '@/lib/api';
import {
  formatMonthLabel,
  formatMonthName,
  type BillDraftResponse,
  type SaveBillRequest,
} from '@splithouse/shared';
import { FailedStep } from './components/failed-step';
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

/**
 * The message to show for a failed request, or null for an unreachable server (the app's own prompt
 * covers that) or a request the user cancelled.
 */
function messageOf(error: Error | null): string | null {
  return error && !(error instanceof ServerUnreachableError) && !(error instanceof RequestCancelledError)
    ? error.message
    : null;
}

/**
 * Bill upload, opened from Home for one month: choose the PDF, wait while the server reads it,
 * then check the values and save. Saving creates the month's utilities charges and returns to
 * Home, which then shows the month as `unsent`. Opened with `draft=stored` (Home's Continue), it
 * starts on Review bill with the month's stored draft. A file the server could not read asks
 * "Is this the right bill?" first: Yes opens Review bill empty, No discards it. Leaving Review bill
 * asks "Discard this bill?", and Discard deletes the draft.
 */
export function BillUpload() {
  const { month, draft: draftParam } = useLocalSearchParams<{ month: string; draft?: string }>();
  const router = useRouter();
  const continuing = draftParam === 'stored';
  const [step, setStep] = useState<UploadStep>(continuing ? 'review' : 'pick');
  // Null until the name is known: a stored draft brings its own.
  const [filename, setFilename] = useState<string | null>(null);
  const [draft, setDraft] = useState<BillDraftResponse | null>(null);
  const [problem, setProblem] = useState<PickedPdfProblem | null>(null);
  // Home's Continue: true until the stored draft has loaded, or failed to.
  const [loadingStored, setLoadingStored] = useState(continuing);
  const [storedError, setStoredError] = useState<string | null>(null);
  const [discarding, setDiscarding] = useState(false);
  // Cancel while the server reads the file makes the pending upload's answer stale, so it is ignored.
  const uploadId = useRef(0);
  const uploadAbort = useRef<AbortController | null>(null);
  // Review bill is on screen but the server has not answered yet: the form shows as a skeleton.
  const reading = step === 'review' && draft === null;

  const upload = useUploadBillDraft(month);
  const loadDraft = useLoadBillDraft(month);
  const discard = useDiscardBillDraft();
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
  const check = useCheckBill(month, checkRequest, step === 'review' && draft !== null).data;
  const blockers = check?.blockers ?? [];

  /** Shows Review bill filled from the draft (empty for one the server could not read). */
  const openReview = useCallback(
    (read: BillDraftResponse) => {
      reset(toReviewFormValues(read.fields));
      // Fields are only checked once they change, so check what the bill left empty straight away.
      // A bill typed in by hand starts empty on purpose, so its fields wait until they are edited.
      if (read.readOk) void trigger();
      setStep('review');
    },
    [reset, trigger],
  );

  /**
   * Shows a draft the server has answered with, uploaded now or stored before: Review bill when it
   * was read, "Is this the right bill?" when nothing could be read.
   */
  const fillForm = useCallback(
    (read: BillDraftResponse) => {
      setFilename(read.file.filename);
      setDraft(read);
      if (read.readOk) openReview(read);
      else setStep('failed');
    },
    [openReview],
  );

  const leave = useCallback(() => {
    if (router.canGoBack()) router.back();
    else router.replace('/');
  }, [router]);

  // Home's Continue: load the stored draft once, then fill the form. An unreachable server (after
  // the read's retries) raises the app's prompt and returns to Home, where Continue is still there;
  // any other failure, such as a draft discarded meanwhile, goes to choosing a PDF with the message.
  useEffect(() => {
    if (!continuing) return;
    let active = true;
    loadDraft()
      .then((read) => {
        if (!active) return;
        setLoadingStored(false);
        fillForm(read);
      })
      .catch((error: Error) => {
        if (!active) return;
        setLoadingStored(false);
        if (error instanceof ServerUnreachableError) {
          leave();
          return;
        }
        setStoredError(error.message);
        setStep('pick');
      });
    return () => {
      active = false;
    };
  }, [continuing, loadDraft, fillForm, leave]);

  const choosePdf = async () => {
    const picked = await pickBillPdf();
    if (!picked) return;
    if (picked.problem) {
      setProblem(picked.problem);
      setStep('pick');
      return;
    }
    setProblem(null);
    setStoredError(null);
    save.reset();
    const id = ++uploadId.current;
    const controller = new AbortController();
    uploadAbort.current = controller;
    setFilename(picked.file.name);
    setDraft(null);
    setStep('review');
    upload.mutate(
      { file: picked.file, signal: controller.signal },
      {
        onSuccess: (read) => {
          if (id === uploadId.current) fillForm(read);
        },
        onError: () => {
          if (id === uploadId.current) setStep('pick');
        },
      },
    );
  };

  const cancelReading = () => {
    uploadId.current += 1;
    uploadAbort.current?.abort();
    upload.reset();
    // The server may have stored the file before the cancel reached it.
    discard.mutate(month);
    setStep('pick');
  };

  /** "No, choose another file" and Back on "Is this the right bill?": discards the draft and returns to choosing a PDF. */
  const rejectUnread = () => {
    // Fire and forget, as Cancel while reading does: a draft left behind is replaced by the next upload.
    discard.mutate(month);
    setDraft(null);
    setStep('pick');
  };

  const openDiscard = () => {
    discard.reset();
    setDiscarding(true);
  };

  const closeDiscard = () => {
    setDiscarding(false);
    discard.reset();
  };

  const discardAndLeave = () => discard.mutate(month, { onSuccess: leave });

  /**
   * Back in the header, Cancel in the footer and the Android back gesture. While a stored draft
   * loads, leaving keeps it; while a picked file is read, Cancel stops the upload and returns to
   * choosing a PDF; on "Is this the right bill?" it does what No does; on Review bill it asks
   * "Discard this bill?".
   *
   * @returns False on the pick step, where leaving needs no question.
   */
  const goBack = (): boolean => {
    if (loadingStored) leave();
    else if (reading) cancelReading();
    else if (step === 'failed') rejectUnread();
    else if (step === 'review') openDiscard();
    else return false;
    return true;
  };

  // The back gesture runs the latest goBack, so the listener is added once per focus.
  const goBackRef = useRef(goBack);
  useEffect(() => {
    goBackRef.current = goBack;
  });
  useFocusEffect(
    useCallback(() => {
      const subscription = BackHandler.addEventListener('hardwareBackPress', () => goBackRef.current());
      return () => subscription.remove();
    }, []),
  );

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
        onBack={step === 'pick' ? undefined : goBack}
      />
      {/* Edge-to-edge Android does not resize for the keyboard, so the padding keeps the focused field in view. */}
      <KeyboardAvoidingView behavior="padding" className="flex-1">
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerClassName="gap-4 px-4 pb-5 pt-2">
          {step === 'pick' ? (
            <PickStep
              monthName={formatMonthName(month)}
              problem={problem}
              error={messageOf(upload.error) ?? storedError}
            />
          ) : null}
          {step === 'failed' && draft ? <FailedStep draft={draft} /> : null}
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
        {step === 'failed' && draft ? (
          <>
            <Button label="Yes, it’s the right bill" onPress={() => openReview(draft)} />
            <Button label="No, choose another file" variant="outline" onPress={rejectUnread} />
          </>
        ) : null}
        {reading ? <Button label="Cancel" variant="outline" onPress={goBack} /> : null}
        {step === 'review' && draft ? (
          <>
            <Button
              label={save.isPending ? 'Saving' : 'Save bill'}
              loading={save.isPending || isSubmitting}
              disabled={!isValid || blockers.length > 0 || isSubmitting}
              onPress={onSave}
            />
            <Button label="Cancel" variant="ghost" size="small" onPress={goBack} />
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
      <ConfirmDialog
        open={discarding}
        icon={Trash2}
        title="Discard this bill?"
        body="Nothing has been saved yet. If you leave now, the file and the values you reviewed will be lost."
        cancelLabel="Keep editing"
        onCancel={closeDiscard}
        confirmLabel="Discard"
        onConfirm={discardAndLeave}
        loading={discard.isPending}
        error={messageOf(discard.error) ?? undefined}
      />
    </Screen>
  );
}
