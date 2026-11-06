import { requireSession, route } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { getSetup } from "@/services/setup/setup.service";

/** Welcome: First run's steps, progress and footer buttons. */
export const GET = route(async (request) => {
  await requireSession(request);
  return Response.json(await getSetup(prisma));
});
