import { householdEditSchema } from "@splithouse/shared";
import { parseBody, requireSession, route } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { saveHouseholdEdit } from "@/services/household/save-edit.service";

/** Saves one typed household edit. */
export const POST = route(async (request) => {
  await requireSession(request);
  const edit = await parseBody(request, householdEditSchema);
  return Response.json(await saveHouseholdEdit(prisma, edit));
});
