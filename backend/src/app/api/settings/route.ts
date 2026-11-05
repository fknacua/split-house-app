import { requireSession, route } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { getSettings } from "@/services/settings/settings.service";

/** The Settings screen: the signed-in email and the Messages rows. */
export const GET = route(async (request) => {
  const { user } = await requireSession(request);
  return Response.json(await getSettings(prisma, user.email));
});
