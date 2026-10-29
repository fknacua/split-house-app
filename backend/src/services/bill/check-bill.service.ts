import type { CheckBillRequest, CheckBillResponse } from "@splithouse/shared";
import { checkBill } from "@/lib/bill/check-bill";
import { buildUnusualBillWarning, UNUSUAL_BILL_HISTORY } from "@/lib/bill/unusual-bill";

/** The slice of the Prisma client this service uses, so tests can pass an in-memory fake. */
export interface CheckBillDb {
  bill: {
    findMany(args: {
      where: { month: { lt: string } };
      orderBy: { month: "desc" };
      take: number;
      select: { currentChargesCents: true };
    }): Promise<{ currentChargesCents: number }[]>;
  };
}

/**
 * Checks the Review bill values for a month's upload: the blockers and the lines note, which need no
 * database, and the "Save with warnings?" dialog's lines: the lines note's title and the warning that
 * compares with earlier bills (the last three saved before the month). Nothing is stored.
 *
 * @param db - The Prisma client, or a fake in tests.
 * @param month - `YYYY-MM`, the month the upload started from.
 * @param fields - The form's values as they are right now.
 * @returns What the server finds wrong with the values.
 */
export async function checkBillDraft(
  db: CheckBillDb,
  month: string,
  fields: CheckBillRequest,
): Promise<CheckBillResponse> {
  // No amount, nothing to compare, so the saved bills are not read.
  const recent =
    fields.currentChargesCents === null
      ? []
      : await db.bill.findMany({
          where: { month: { lt: month } },
          orderBy: { month: "desc" },
          take: UNUSUAL_BILL_HISTORY,
          select: { currentChargesCents: true },
        });
  const unusual = buildUnusualBillWarning(
    fields.currentChargesCents,
    recent.map((bill) => bill.currentChargesCents),
  );
  const result = checkBill(month, fields);
  // The dialog lists the lines note's title, then the warning that needs the saved bills.
  const warnings = [result.linesNote?.title, unusual].filter((line): line is string => Boolean(line));
  return { ...result, warnings };
}
