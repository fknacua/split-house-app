import type { CheckBillRequest, CheckBillResponse } from "@splithouse/shared";
import { checkBill } from "@/lib/bill/check-bill";

/**
 * Checks the Review bill values for a month's upload. Only the blockers so far, which need no
 * database read; the checks that compare with earlier bills add a `db` parameter here.
 *
 * @param month - `YYYY-MM`, the month the upload started from.
 * @param fields - The form's values as they are right now.
 * @returns What the server finds wrong with the values.
 */
export async function checkBillDraft(month: string, fields: CheckBillRequest): Promise<CheckBillResponse> {
  return checkBill(month, fields);
}
