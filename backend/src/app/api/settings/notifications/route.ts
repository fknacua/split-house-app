import { settingsNotificationSaveRequestSchema } from "@splithouse/shared";
import { parseBody, requireSession, route } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { saveNotificationToggle } from "@/services/settings/settings.service";

/** Turns one notification toggle on or off, answering with the Settings screen. */
export const PUT = route(async (request) => {
  const { user } = await requireSession(request);
  const save = await parseBody(request, settingsNotificationSaveRequestSchema);
  return Response.json(await saveNotificationToggle(prisma, user.email, save));
});
