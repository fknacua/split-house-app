import { requireSession, route } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { getChargeDetails } from "@/services/charge-details/charge-details.service";

type Context = { params: Promise<{ id: string }> };

/** Charge details for one charge: the amount and chip, the Details rows, the Activity and the footer. */
export const GET = route<Context>(async (request, { params }) => {
  await requireSession(request);
  return Response.json(await getChargeDetails(prisma, (await params).id));
});
