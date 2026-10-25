import { requireSession, route } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { getHome } from "@/services/home/home.service";

/** The newest opened month, ready to render on Home. */
export const GET = route(async (request) => {
  await requireSession(request);
  return Response.json(await getHome(prisma));
});
