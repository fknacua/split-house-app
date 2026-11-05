import { templateSaveRequestSchema } from "@splithouse/shared";
import { parseBody, requireSession, route } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { saveTemplate } from "@/services/templates/templates.service";

/** Saves a template and the line labels, which apply immediately. */
export const POST = route(async (request) => {
  await requireSession(request);
  const save = await parseBody(request, templateSaveRequestSchema);
  return Response.json(await saveTemplate(prisma, save));
});
