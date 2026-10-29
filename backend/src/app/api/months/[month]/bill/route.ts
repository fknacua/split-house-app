import { monthKey, saveBillRequestSchema } from "@splithouse/shared";
import { ApiError, parseBody, requireSession, route } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { saveBill } from "@/services/bill/save-bill.service";

/** Saves the month's bill from its draft with the reviewed values, and creates the utilities charges. */
export const POST = route<{ params: Promise<{ month: string }> }>(async (request, { params }) => {
  await requireSession(request);
  const month = monthKey.safeParse((await params).month);
  if (!month.success) throw new ApiError(400, "invalid_request", "Month must be YYYY-MM.");
  const values = await parseBody(request, saveBillRequestSchema);
  return Response.json(await saveBill(prisma, month.data, values));
});
