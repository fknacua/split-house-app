import { addChargePreviewRequestSchema } from "@splithouse/shared";
import { parseBody, requireSession, route } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { previewAddCharge } from "@/services/add-charge/add-charge.service";

/** The Add charge sheet's preview for the fields as they stand: the split, Save and the confirm dialog. Nothing is stored. */
export const POST = route(async (request) => {
  await requireSession(request);
  const values = await parseBody(request, addChargePreviewRequestSchema);
  return Response.json(await previewAddCharge(prisma, values));
});
