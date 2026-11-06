import { templateKindSchema } from "@splithouse/shared";
import { parsePathParam, requireSession, route } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { restoreTemplate } from "@/services/templates/templates.service";

type Context = { params: Promise<{ kind: string }> };

/** Saves the built-in text as the Default of `MONTHLY` or `NUDGE`. */
export const POST = route<Context>(async (request, { params }) => {
  await requireSession(request);
  const kind = parsePathParam((await params).kind, templateKindSchema, "Template must be MONTHLY or NUDGE.");
  return Response.json(await restoreTemplate(prisma, kind));
});
