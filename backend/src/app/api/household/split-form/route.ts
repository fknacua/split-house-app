import { requireSession, route } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { getHouseholdSplitForm } from "@/services/household/household-form.service";

/** The Household split screen, with the latest saved values. */
export const GET = route(async (request) => {
  await requireSession(request);
  return Response.json(await getHouseholdSplitForm(prisma));
});
