import { sendEventRequestSchema } from "@splithouse/shared";
import { parseBody, requireSession, route } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { createSendEvent } from "@/services/send/send-event.service";

/** Records that a person's monthly message or a nudge went out on WhatsApp, once Francis confirms it was sent. */
export const POST = route(async (request) => {
  await requireSession(request);
  const values = await parseBody(request, sendEventRequestSchema);
  return Response.json(await createSendEvent(prisma, values));
});
