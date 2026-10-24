import { monthKey } from "@splithouse/shared";
import { ApiError, requireSession, route } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { getHistoryMonth } from "@/services/history/history-month.service";

/** One past month: its bill card and a row per charge. */
export const GET = route<{ params: Promise<{ month: string }> }>(async (request, { params }) => {
  await requireSession(request);
  const month = monthKey.safeParse((await params).month);
  if (!month.success) throw new ApiError(400, "invalid_request", "Month must be YYYY-MM.");
  return Response.json(await getHistoryMonth(prisma, month.data));
});
