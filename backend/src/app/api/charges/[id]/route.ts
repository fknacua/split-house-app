import { requireSession, route } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { deleteCorrection } from "@/services/charge-details/delete-correction.service";

type Context = { params: Promise<{ id: string }> };

/** Deletes a correction, its payment with it. Any other charge answers 409 `not_correction`. */
export const DELETE = route<Context>(async (request, { params }) => {
  await requireSession(request);
  return Response.json(await deleteCorrection(prisma, (await params).id));
});
