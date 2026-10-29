import { markBillPaidRequestSchema, monthKey } from "@splithouse/shared";
import { ApiError, parseBody, requireSession, route } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { markBillPaid } from "@/services/bill/mark-bill-paid.service";

/** Records that the user paid the month's utilities bill: the amount and the day. */
export const POST = route<{ params: Promise<{ month: string }> }>(async (request, { params }) => {
  await requireSession(request);
  const month = monthKey.safeParse((await params).month);
  if (!month.success) throw new ApiError(400, "invalid_request", "Month must be YYYY-MM.");
  const values = await parseBody(request, markBillPaidRequestSchema);
  return Response.json(await markBillPaid(prisma, month.data, values));
});
