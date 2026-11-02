import { householdEditSchema } from "@splithouse/shared";
import { parseBody, requireSession, route } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { previewHouseholdEdit } from "@/services/household/save-edit.service";

/** What one typed household edit would change. Nothing is stored. */
export const POST = route(async (request) => {
  await requireSession(request);
  const edit = await parseBody(request, householdEditSchema);
  return Response.json(await previewHouseholdEdit(prisma, edit));
});
