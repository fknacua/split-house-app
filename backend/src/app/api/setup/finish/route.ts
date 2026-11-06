import { setupFinishRequestSchema } from "@splithouse/shared";
import { parseBody, requireSession, route } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { finishSetup } from "@/services/setup/setup.service";

/** Finishes First run: opens the start month and says where to go next. */
export const POST = route(async (request) => {
  await requireSession(request);
  const body = await parseBody(request, setupFinishRequestSchema);
  return Response.json(await finishSetup(prisma, body));
});
