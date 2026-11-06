import { templateKindSchema, templatePersonQuerySchema } from "@splithouse/shared";
import { ApiError, parsePathParam, parseQuery, requireSession, route } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { getTemplateLanding, removeTemplate } from "@/services/templates/templates.service";

type Context = { params: Promise<{ kind: string }> };

/** The landing page for `MONTHLY` or `NUDGE`: the Default, the custom templates and the For who rows. */
export const GET = route<Context>(async (request, { params }) => {
  await requireSession(request);
  const kind = parsePathParam((await params).kind, templateKindSchema, "Template must be MONTHLY or NUDGE.");
  return Response.json(await getTemplateLanding(prisma, kind));
});

/** Removes `?personId=`'s custom template, so they get the Default. */
export const DELETE = route<Context>(async (request, { params }) => {
  await requireSession(request);
  const kind = parsePathParam((await params).kind, templateKindSchema, "Template must be MONTHLY or NUDGE.");
  const { personId } = parseQuery(request, templatePersonQuerySchema);
  if (!personId) throw new ApiError(400, "invalid_request", "personId is required.");
  return Response.json(await removeTemplate(prisma, kind, personId));
});
