import { requireSession, route } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { getHouseholdAddForm } from "@/services/household/household-form.service";

/** The Add subtenant screen. */
export const GET = route(async (request) => {
  await requireSession(request);
  return Response.json(await getHouseholdAddForm(prisma));
});
