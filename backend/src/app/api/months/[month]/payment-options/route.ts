import { monthKey } from "@splithouse/shared";
import { ApiError, requireSession, route } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { getPaymentOptions } from "@/services/payments/payment-options.service";

/** Record payment: who still has something to pay, and each charge with its sheet. */
export const GET = route<{ params: Promise<{ month: string }> }>(async (request, { params }) => {
  await requireSession(request);
  const month = monthKey.safeParse((await params).month);
  if (!month.success) throw new ApiError(400, "invalid_request", "Month must be YYYY-MM.");
  return Response.json(await getPaymentOptions(prisma, month.data));
});
