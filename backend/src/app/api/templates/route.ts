import { templateSaveRequestSchema } from "@splithouse/shared";
import { parseBody, requireSession, route } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { saveTemplate } from "@/services/templates/templates.service";

/** Saves the Default's text or one person's custom template, which applies immediately. */
export const POST = route(async (request) => {
  await requireSession(request);
  const save = await parseBody(request, templateSaveRequestSchema);
  return Response.json(await saveTemplate(prisma, save));
});
