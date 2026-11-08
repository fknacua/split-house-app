import { requireSession, route } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { finishSetup } from "@/services/setup/setup.service";

/** Finishes First run: opens the start month. The app then goes to Home. */
export const POST = route(async (request) => {
  await requireSession(request);
  return Response.json(await finishSetup(prisma));
});
