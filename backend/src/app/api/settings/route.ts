import { requireSession, route } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { getSettings } from "@/services/settings/settings.service";

/** The Settings screen: the signed-in email, the Messages rows and the notification switches. */
export const GET = route(async (request) => {
  const { user } = await requireSession(request);
  return Response.json(await getSettings(prisma, user.email));
});
