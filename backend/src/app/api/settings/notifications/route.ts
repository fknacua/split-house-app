import { settingsNotificationSaveRequestSchema } from "@splithouse/shared";
import { parseBody, requireSession, route } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { saveNotificationSwitch } from "@/services/settings/settings.service";

/** Turns one notification switch on or off, answering with the Settings screen. */
export const PUT = route(async (request) => {
  const { user } = await requireSession(request);
  const save = await parseBody(request, settingsNotificationSaveRequestSchema);
  return Response.json(await saveNotificationSwitch(prisma, user.email, save));
});
