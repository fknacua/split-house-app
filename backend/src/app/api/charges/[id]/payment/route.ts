import { savePaymentRequestSchema } from "@splithouse/shared";
import { parseBody, requireSession, route } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { getChargePayment } from "@/services/payments/charge-payment.service";
import { savePayment } from "@/services/payments/save-payment.service";

type Context = { params: Promise<{ id: string }> };

/** The Mark paid sheet for one charge: expected amount, due date, and the amount and day filled in. */
export const GET = route<Context>(async (request, { params }) => {
  await requireSession(request);
  return Response.json(await getChargePayment(prisma, (await params).id));
});

/** Records what was received for one charge and when, replacing a stored payment. */
export const POST = route<Context>(async (request, { params }) => {
  await requireSession(request);
  const { id } = await params;
  const values = await parseBody(request, savePaymentRequestSchema);
  return Response.json(await savePayment(prisma, id, values));
});
