import {
  formatMonthName,
  parseHouseholdConfig,
  type SaveBillRequest,
  type SaveBillResponse,
} from "@splithouse/shared";
import { ApiError } from "@/lib/api";
import { checkBill } from "@/lib/bill/check-bill";
import { buildUtilitiesCharges } from "@/lib/split/engine";
import { postgresBillFileStore, type BillFileDb } from "./bill-file-store.service";
import { countPdfPages } from "./read-bill.service";

/** The slice of a Prisma transaction client saving a bill uses, so tests can pass an in-memory fake. */
export interface SaveBillTx extends BillFileDb {
  billDraft: {
    findUnique(args: {
      where: { month: string };
      select: { filename: true; bytes: true; parseOk: true };
    }): Promise<{ filename: string; bytes: Uint8Array<ArrayBuffer>; parseOk: boolean } | null>;
    deleteMany(args: { where: { month: { lte: string } } }): Promise<unknown>;
  };
  bill: {
    findUnique(args: { where: { month: string }; select: { id: true } }): Promise<{ id: string } | null>;
    create(args: {
      data: {
        month: string;
        currentChargesCents: number;
        billingPeriodStart: Date | null;
        billingPeriodEnd: Date | null;
        dueDate: Date | null;
        lines: SaveBillRequest["lines"];
        parseStatus: "PARSED" | "NOT_PARSED";
      };
      select: { id: true };
    }): Promise<{ id: string }>;
  };
  month: {
    findUnique(args: {
      where: { month: string };
      select: { householdVersionId: true; householdVersion: { select: { schemaVersion: true; config: true } } };
    }): Promise<{ householdVersionId: string; householdVersion: { schemaVersion: number; config: unknown } } | null>;
  };
  charge: {
    createMany(args: {
      data: {
        month: string;
        personId: string;
        payViaPersonId: string | null;
        category: "UTILITIES";
        label: string;
        amountCents: number;
        dueDate: Date | null;
        billId: string;
        householdVersionId: string;
      }[];
    }): Promise<unknown>;
  };
}

/** The Prisma client, or a fake in tests. */
export interface SaveBillDb {
  $transaction<T>(fn: (tx: SaveBillTx) => Promise<T>): Promise<T>;
}

function toDate(key: string | null): Date | null {
  return key ? new Date(key) : null;
}

function isUniqueViolation(err: unknown): boolean {
  return typeof err === "object" && err !== null && (err as { code?: unknown }).code === "P2002";
}

/**
 * Saves the month's bill from its draft, in one transaction: the reviewed values become the
 * `Bill`, the draft's PDF its `BillFile`, the split engine creates each person's utilities
 * charge from Current Charges and the month's pinned household version, and the draft (with any
 * left for earlier months) is deleted. The month then shows as `unsent` on Home.
 *
 * @param db - The Prisma client, or a fake in tests.
 * @param month - `YYYY-MM`, the month the upload started from.
 * @param values - The reviewed values from the Review bill form.
 * @returns The month whose bill was saved.
 * @throws {ApiError} 422 `bill_blocked` when a check stops Save (the bill is for another month),
 * 404 `no_draft` when the month has no draft to save, 409 `bill_exists` when
 * the month already has a bill (also on a second tap that loses the race), 409 `month_not_open`
 * when the month has not been opened.
 */
export async function saveBill(db: SaveBillDb, month: string, values: SaveBillRequest): Promise<SaveBillResponse> {
  // The same checks the app ran while the form was filled in. The Subtotal is not saved, and only
  // the lines note uses it, so the blockers do not need it.
  const [blocker] = checkBill(month, { ...values, subtotalCents: null }).blockers;
  if (blocker) throw new ApiError(422, "bill_blocked", blocker.message);
  try {
    return await db.$transaction(async (tx) => {
      const draft = await tx.billDraft.findUnique({
        where: { month },
        select: { filename: true, bytes: true, parseOk: true },
      });
      if (!draft) throw new ApiError(404, "no_draft", "There is no bill draft to save. Choose the PDF again.");
      if (await tx.bill.findUnique({ where: { month }, select: { id: true } })) {
        throw new ApiError(409, "bill_exists", `${formatMonthName(month)} already has a bill.`);
      }
      const opened = await tx.month.findUnique({
        where: { month },
        select: { householdVersionId: true, householdVersion: { select: { schemaVersion: true, config: true } } },
      });
      if (!opened) throw new ApiError(409, "month_not_open", `${formatMonthName(month)} is not open yet.`);

      const config = parseHouseholdConfig(opened.householdVersion.schemaVersion, opened.householdVersion.config);
      const charges = buildUtilitiesCharges(config, { month, currentChargesCents: values.currentChargesCents });

      const bill = await tx.bill.create({
        data: {
          month,
          currentChargesCents: values.currentChargesCents,
          billingPeriodStart: toDate(values.billingPeriodStart),
          billingPeriodEnd: toDate(values.billingPeriodEnd),
          dueDate: toDate(values.dueDate),
          lines: values.lines,
          parseStatus: draft.parseOk ? "PARSED" : "NOT_PARSED",
        },
        select: { id: true },
      });
      await postgresBillFileStore(tx).save(bill.id, {
        filename: draft.filename,
        mimeType: "application/pdf",
        sizeBytes: draft.bytes.byteLength,
        pageCount: await countPdfPages(draft.bytes),
        bytes: draft.bytes,
      });
      await tx.charge.createMany({
        data: charges.map((c) => ({
          month,
          personId: c.personId,
          payViaPersonId: c.payViaPersonId,
          category: "UTILITIES" as const,
          label: c.label,
          amountCents: c.amountCents,
          dueDate: toDate(c.dueDate),
          billId: bill.id,
          householdVersionId: opened.householdVersionId,
        })),
      });
      await tx.billDraft.deleteMany({ where: { month: { lte: month } } });
      return { month };
    });
  } catch (err) {
    if (isUniqueViolation(err)) {
      throw new ApiError(409, "bill_exists", `${formatMonthName(month)} already has a bill.`);
    }
    throw err;
  }
}
