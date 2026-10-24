import { requireSession, route } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { getHistoryList } from "@/services/history/history-list.service";

/** Past months grouped by year, each with its bill total and status chips. */
export const GET = route(async (request) => {
  await requireSession(request);
  return Response.json(await getHistoryList(prisma));
});
