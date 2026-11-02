import { householdFormQuerySchema } from "@splithouse/shared";
import { parseQuery, requireSession, route } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { getHouseholdForm } from "@/services/household/household-form.service";

/** One person's Edit and View screens: `?personId=`, and `?month=` or the first Starts from option. */
export const GET = route(async (request) => {
  await requireSession(request);
  const query = parseQuery(request, householdFormQuerySchema);
  return Response.json(await getHouseholdForm(prisma, query));
});
