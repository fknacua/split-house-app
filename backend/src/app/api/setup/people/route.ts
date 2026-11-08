import { requireSession, route } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { getSetupPeople } from "@/services/setup/setup-people.service";

/** First run's People page. */
export const GET = route(async (request) => {
  await requireSession(request);
  return Response.json(await getSetupPeople(prisma));
});
