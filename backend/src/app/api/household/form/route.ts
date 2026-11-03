import { householdFormQuerySchema } from "@splithouse/shared";
import { parseQuery, requireSession, route } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { getHouseholdForm } from "@/services/household/household-form.service";

/** One person's Edit and View screens, with their latest saved values: `?personId=`. */
export const GET = route(async (request) => {
  await requireSession(request);
  const query = parseQuery(request, householdFormQuerySchema);
  return Response.json(await getHouseholdForm(prisma, query));
});
