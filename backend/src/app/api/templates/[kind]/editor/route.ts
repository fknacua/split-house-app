import { templateKindSchema, templatePersonQuerySchema } from "@splithouse/shared";
import { parsePathParam, parseQuery, requireSession, route } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { getTemplateEditor } from "@/services/templates/templates.service";

type Context = { params: Promise<{ kind: string }> };

/** The template editor for the Default, or `?personId=`'s custom template, saved or new. */
export const GET = route<Context>(async (request, { params }) => {
  await requireSession(request);
  const kind = parsePathParam((await params).kind, templateKindSchema, "Template must be MONTHLY or NUDGE.");
  const query = parseQuery(request, templatePersonQuerySchema);
  return Response.json(await getTemplateEditor(prisma, kind, query));
});
