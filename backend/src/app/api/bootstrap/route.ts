import { requireSession, route } from "@/lib/api";
import { getBootstrap } from "@/services/bootstrap/bootstrap.service";
import { prisma } from "@/lib/prisma";

/** What the app needs after sign-in and on launch: household present, month, setup steps, settings. */
export const GET = route(async (request) => {
  await requireSession(request);
  return Response.json(await getBootstrap(prisma));
});
