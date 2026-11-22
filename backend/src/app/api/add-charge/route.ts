import { addChargeRequestSchema } from "@splithouse/shared";
import { parseBody, requireSession, route } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { getAddChargeSheet } from "@/services/add-charge/add-charge.service";
import { saveAddCharge } from "@/services/add-charge/save-add-charge.service";

/** The Add charge sheet for the newest opened month, as it opens. */
export const GET = route(async (request) => {
  await requireSession(request);
  return Response.json(await getAddChargeSheet(prisma));
});

/** Saves an Add charge charge in the newest opened month, in one transaction. A repeated idempotency key answers the same. */
export const POST = route(async (request) => {
  await requireSession(request);
  const values = await parseBody(request, addChargeRequestSchema);
  return Response.json(await saveAddCharge(prisma, values));
});
