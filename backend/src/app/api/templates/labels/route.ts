import { templateLabelsSaveRequestSchema } from "@splithouse/shared";
import { parseBody, requireSession, route } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { saveTemplateLabels } from "@/services/templates/templates.service";

/** Saves the line labels and section titles, which apply immediately to every template. */
export const POST = route(async (request) => {
  await requireSession(request);
  const save = await parseBody(request, templateLabelsSaveRequestSchema);
  return Response.json(await saveTemplateLabels(prisma, save));
});
