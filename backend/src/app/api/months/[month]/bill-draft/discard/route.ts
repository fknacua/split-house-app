import { monthKey } from "@splithouse/shared";
import { ApiError, requireSession, route } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { discardBillDraft } from "@/services/bill/bill-draft.service";

/** Discards the month's bill draft. A month with no draft answers the same, so a repeat does no harm. */
export const POST = route<{ params: Promise<{ month: string }> }>(async (request, { params }) => {
  await requireSession(request);
  const month = monthKey.safeParse((await params).month);
  if (!month.success) throw new ApiError(400, "invalid_request", "Month must be YYYY-MM.");
  return Response.json(await discardBillDraft(prisma, month.data));
});
