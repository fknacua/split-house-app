import { templateFormQuerySchema, templateKindSchema } from "@splithouse/shared";
import { ApiError, parseQuery, requireSession, route } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { getTemplateForm } from "@/services/templates/templates.service";

/** The template editor with the latest saved values, for `MONTHLY` or `NUDGE`. `?personId=` loads that person's version. */
export const GET = route<{ params: Promise<{ kind: string }> }>(async (request, { params }) => {
  await requireSession(request);
  const kind = templateKindSchema.safeParse((await params).kind);
  if (!kind.success) throw new ApiError(400, "invalid_request", "Template must be MONTHLY or NUDGE.");
  const query = parseQuery(request, templateFormQuerySchema);
  return Response.json(await getTemplateForm(prisma, kind.data, query));
});
