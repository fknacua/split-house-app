import { templatePreviewRequestSchema } from "@splithouse/shared";
import { parseBody, requireSession, route } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { previewTemplate } from "@/services/templates/templates.service";

/** A draft template rendered on a sample person and the active month. Nothing is stored. */
export const POST = route(async (request) => {
  await requireSession(request);
  const draft = await parseBody(request, templatePreviewRequestSchema);
  return Response.json(await previewTemplate(prisma, draft));
});
