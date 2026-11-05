import { requireSession, route } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { getHouseholdHomeForm } from "@/services/household/household-form.service";

/** The Landlord & rooms screen, with the latest saved values. */
export const GET = route(async (request) => {
  await requireSession(request);
  return Response.json(await getHouseholdHomeForm(prisma));
});
