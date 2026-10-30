import { monthKey } from "@splithouse/shared";
import { ApiError, requireSession, route } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { getRecipient } from "@/services/recipient/recipient.service";

/**
 * Recipient: one person's amount, message preview and actions for the month. `?chargeId=` chooses
 * the overdue charge to nudge (Home's Nudge).
 */
export const GET = route<{ params: Promise<{ month: string; personId: string }> }>(async (request, { params }) => {
  await requireSession(request);
  const { month: rawMonth, personId } = await params;
  const month = monthKey.safeParse(rawMonth);
  if (!month.success) throw new ApiError(400, "invalid_request", "Month must be YYYY-MM.");
  const chargeId = new URL(request.url).searchParams.get("chargeId");
  return Response.json(await getRecipient(prisma, month.data, personId, chargeId));
});
