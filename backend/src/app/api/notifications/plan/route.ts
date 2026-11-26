import { requireSession, route } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { getNotificationPlan } from "@/services/notifications/notification-plan.service";

/** The notifications the phone schedules for the next 14 days. */
export const GET = route(async (request) => {
  await requireSession(request);
  return Response.json(await getNotificationPlan(prisma));
});
