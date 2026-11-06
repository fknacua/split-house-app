import { requireSession, route } from "@/lib/api";
import { getBootstrap } from "@/services/bootstrap/bootstrap.service";
import { prisma } from "@/lib/prisma";

/** What the app needs after sign-in and on launch: household present, First run finished, the active month. */
export const GET = route(async (request) => {
  await requireSession(request);
  return Response.json(await getBootstrap(prisma));
});
