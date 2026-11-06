import { householdEditSchema } from "@splithouse/shared";
import { parseBody, requireSession, route } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { saveHouseholdEdit } from "@/services/household/save-edit.service";

/** Saves one typed household edit. The first Rent & rooms save names the owner after the signed-in user. */
export const POST = route(async (request) => {
  const session = await requireSession(request);
  const edit = await parseBody(request, householdEditSchema);
  return Response.json(await saveHouseholdEdit(prisma, edit, session.user.name));
});
