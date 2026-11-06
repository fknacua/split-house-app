import { templatePreviewRequestSchema } from "@splithouse/shared";
import { parseBody, requireSession, route } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { previewTemplate } from "@/services/templates/templates.service";

/** A draft template rendered on its person, else the Default's, dated the active month. Nothing is stored. */
export const POST = route(async (request) => {
  await requireSession(request);
  const draft = await parseBody(request, templatePreviewRequestSchema);
  return Response.json(await previewTemplate(prisma, draft));
});
