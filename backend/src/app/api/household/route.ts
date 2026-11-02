import { householdViewQuerySchema } from "@splithouse/shared";
import { parseQuery, requireSession, route } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { getHouseholdView } from "@/services/household/household-view.service";

/** The Household screen for one month: `?month=` or the active month. */
export const GET = route(async (request) => {
  await requireSession(request);
  const { month } = parseQuery(request, householdViewQuerySchema);
  return Response.json(await getHouseholdView(prisma, month));
});
