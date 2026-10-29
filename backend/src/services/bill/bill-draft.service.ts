import {
  formatMonthName,
  MAX_BILL_PDF_BYTES,
  type BillDraftResponse,
  type DiscardBillDraftResponse,
} from "@splithouse/shared";
import { ApiError } from "@/lib/api";
import { isPdf } from "@/lib/bill/bill-file-store";
import type { ParsedBill } from "@/lib/bill/bill-parser";
import { buildBillDraftResponse } from "@/lib/bill/build-bill-draft";
import { now } from "@/lib/now";
import { countPdfPages, readBill } from "./read-bill.service";

/** Filled in on every draft but not enforced in v1 (Tech Stack: the expiry timer is shelved). */
const DRAFT_TTL_MS = 15 * 60 * 1000;

/** The draft columns the upload writes. `parsedJson` is left out (null) for an unreadable bill. */
interface DraftWrite {
  filename: string;
  bytes: Uint8Array<ArrayBuffer>;
  parsedJson: ParsedBill | undefined;
  parseOk: boolean;
  expiresAt: Date;
}

/** The slice of the Prisma client the bill draft services use, so tests can pass an in-memory fake. */
export interface BillDraftDb {
  month: {
    findUnique(args: { where: { month: string }; select: { month: true } }): Promise<{ month: string } | null>;
  };
  bill: {
    findUnique(args: { where: { month: string }; select: { id: true } }): Promise<{ id: string } | null>;
  };
  billDraft: {
    findUnique(args: {
      where: { month: string };
      select: { filename: true; bytes: true; parsedJson: true };
    }): Promise<{ filename: string; bytes: Uint8Array; parsedJson: unknown } | null>;
    create(args: { data: DraftWrite & { month: string } }): Promise<unknown>;
    deleteMany(args: { where: { month: string | { lte: string } } }): Promise<unknown>;
  };
}

/** A file picked on the phone, as the route received it. */
export interface UploadedFile {
  filename: string;
  bytes: Uint8Array<ArrayBuffer>;
}

/**
 * Throws unless the month is open and has no saved bill yet: a saved bill is never replaced
 * (a wrong bill is fixed with a correction charge).
 */
async function assertMonthTakesABill(db: BillDraftDb, month: string): Promise<void> {
  if (!(await db.month.findUnique({ where: { month }, select: { month: true } }))) {
    throw new ApiError(409, "month_not_open", `${formatMonthName(month)} is not open yet.`);
  }
  if (await db.bill.findUnique({ where: { month }, select: { id: true } })) {
    throw new ApiError(409, "bill_exists", `${formatMonthName(month)} already has a bill.`);
  }
}

/**
 * Stores an uploaded bill PDF as the month's draft and reads it. A month has one draft, so a new
 * upload replaces the old one. Drafts left behind for earlier months are purged here (lazy purge).
 * An unreadable bill is still stored, with `readOk: false`, so the app can ask whether it is the
 * right bill.
 *
 * @param db - The Prisma client, or a fake in tests.
 * @param month - `YYYY-MM`, the month the upload started from.
 * @param file - The picked file.
 * @returns The draft: the file card's text and the values read from the PDF.
 * @throws {ApiError} 413 `file_too_large` over {@link MAX_BILL_PDF_BYTES}, 415 `not_pdf` when the
 * file does not start with the PDF signature, 409 `month_not_open` or `bill_exists`.
 */
export async function uploadBillDraft(
  db: BillDraftDb,
  month: string,
  file: UploadedFile,
): Promise<BillDraftResponse> {
  if (file.bytes.byteLength > MAX_BILL_PDF_BYTES) {
    throw new ApiError(413, "file_too_large", "The file is over 4 MB.");
  }
  if (!isPdf(file.bytes)) throw new ApiError(415, "not_pdf", "The file is not a PDF.");
  await assertMonthTakesABill(db, month);

  const { pageCount, parsed } = await readBill(file.bytes);
  const draft: DraftWrite = {
    filename: file.filename,
    bytes: file.bytes,
    parsedJson: parsed ?? undefined,
    parseOk: parsed !== null,
    expiresAt: new Date(now().getTime() + DRAFT_TTL_MS),
  };
  // Replaces this month's draft and purges any left behind for earlier months.
  await db.billDraft.deleteMany({ where: { month: { lte: month } } });
  await db.billDraft.create({ data: { month, ...draft } });

  return buildBillDraftResponse({
    month,
    filename: file.filename,
    sizeBytes: file.bytes.byteLength,
    pageCount,
    parsed,
  });
}

/**
 * Reads back the month's stored draft, as the upload returned it.
 *
 * @param db - The Prisma client, or a fake in tests.
 * @param month - `YYYY-MM`.
 * @returns The draft.
 * @throws {ApiError} 404 `no_draft` when the month has no draft.
 */
export async function getBillDraft(db: BillDraftDb, month: string): Promise<BillDraftResponse> {
  const draft = await db.billDraft.findUnique({
    where: { month },
    select: { filename: true, bytes: true, parsedJson: true },
  });
  if (!draft) throw new ApiError(404, "no_draft", "There is no bill draft for this month.");

  return buildBillDraftResponse({
    month,
    filename: draft.filename,
    sizeBytes: draft.bytes.byteLength,
    pageCount: await countPdfPages(draft.bytes),
    // Written only by `uploadBillDraft` (and the seed) in the parser's shape.
    parsed: (draft.parsedJson as ParsedBill | null) ?? null,
  });
}

/**
 * Deletes the month's draft, file and all. A month with no draft answers the same, so Cancel while
 * the upload is still on its way can discard whatever the server stored.
 *
 * @param db - The Prisma client, or a fake in tests.
 * @param month - `YYYY-MM`.
 * @returns The month.
 */
export async function discardBillDraft(db: BillDraftDb, month: string): Promise<DiscardBillDraftResponse> {
  await db.billDraft.deleteMany({ where: { month } });
  return { month };
}
