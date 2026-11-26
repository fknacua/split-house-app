import { notificationAcknowledgeRequestSchema } from "@splithouse/shared";
import { parseBody, requireSession, route } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { acknowledgeNotifications } from "@/services/notifications/notification-events.service";

/** Records the event FYIs the phone scheduled, each at the time it gave: `{ events: [{ id, at }] }`. */
export const POST = route(async (request) => {
  await requireSession(request);
  const values = await parseBody(request, notificationAcknowledgeRequestSchema);
  return Response.json(await acknowledgeNotifications(prisma, values));
});
