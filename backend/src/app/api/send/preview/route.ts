import { sendPreviewRequestSchema } from "@splithouse/shared";
import { parseBody, requireSession, route } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { previewNudge } from "@/services/send/send.service";

/** The nudge sheet again with a changed set of ticked charges. Nothing is stored. */
export const POST = route(async (request) => {
  await requireSession(request);
  const values = await parseBody(request, sendPreviewRequestSchema);
  return Response.json(await previewNudge(prisma, values));
});
