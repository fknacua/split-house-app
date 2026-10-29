import { checkBillRequestSchema, monthKey } from "@splithouse/shared";
import { ApiError, parseBody, requireSession, route } from "@/lib/api";
import { checkBillDraft } from "@/services/bill/check-bill.service";

/** Checks the Review bill values as they are typed, and says what stops Save. Nothing is stored. */
export const POST = route<{ params: Promise<{ month: string }> }>(async (request, { params }) => {
  await requireSession(request);
  const month = monthKey.safeParse((await params).month);
  if (!month.success) throw new ApiError(400, "invalid_request", "Month must be YYYY-MM.");
  const fields = await parseBody(request, checkBillRequestSchema);
  return Response.json(await checkBillDraft(month.data, fields));
});
