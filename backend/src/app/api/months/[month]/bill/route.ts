import { monthKey, saveBillRequestSchema } from "@splithouse/shared";
import { ApiError, parseBody, requireSession, route } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { getBillView } from "@/services/bill/bill-view.service";
import { saveBill } from "@/services/bill/save-bill.service";

/** View bill: the month's saved bill, who has paid their share, and the footer action. */
export const GET = route<{ params: Promise<{ month: string }> }>(async (request, { params }) => {
  await requireSession(request);
  const month = monthKey.safeParse((await params).month);
  if (!month.success) throw new ApiError(400, "invalid_request", "Month must be YYYY-MM.");
  return Response.json(await getBillView(prisma, month.data));
});

/** Saves the month's bill from its draft with the reviewed values, and creates the utilities charges. */
export const POST = route<{ params: Promise<{ month: string }> }>(async (request, { params }) => {
  await requireSession(request);
  const month = monthKey.safeParse((await params).month);
  if (!month.success) throw new ApiError(400, "invalid_request", "Month must be YYYY-MM.");
  const values = await parseBody(request, saveBillRequestSchema);
  return Response.json(await saveBill(prisma, month.data, values));
});
