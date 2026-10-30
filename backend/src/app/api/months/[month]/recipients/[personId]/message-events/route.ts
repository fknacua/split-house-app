import { createMessageEventRequestSchema, monthKey } from "@splithouse/shared";
import { ApiError, parseBody, requireSession, route } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { createMessageEvent } from "@/services/recipient/message-event.service";

/** Records that a person's WhatsApp chat was opened with their monthly message or a nudge. */
export const POST = route<{ params: Promise<{ month: string; personId: string }> }>(async (request, { params }) => {
  await requireSession(request);
  const { month: rawMonth, personId } = await params;
  const month = monthKey.safeParse(rawMonth);
  if (!month.success) throw new ApiError(400, "invalid_request", "Month must be YYYY-MM.");
  const values = await parseBody(request, createMessageEventRequestSchema);
  return Response.json(await createMessageEvent(prisma, month.data, personId, values));
});
