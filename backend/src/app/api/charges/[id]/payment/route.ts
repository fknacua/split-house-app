import { editPaymentRequestSchema } from "@splithouse/shared";
import { parseBody, requireSession, route } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { getEditPayment, removePayment, updatePaymentDate } from "@/services/payments/edit-payment.service";

type Context = { params: Promise<{ id: string }> };

/** The Edit payment sheet for one paid charge. */
export const GET = route<Context>(async (request, { params }) => {
  await requireSession(request);
  return Response.json(await getEditPayment(prisma, (await params).id));
});

/** Changes a paid charge's Received on: `{ paidOn }`. */
export const PATCH = route<Context>(async (request, { params }) => {
  await requireSession(request);
  const values = await parseBody(request, editPaymentRequestSchema);
  return Response.json(await updatePaymentDate(prisma, (await params).id, values));
});

/** Removes a charge's payment, so it shows as unpaid again. */
export const DELETE = route<Context>(async (request, { params }) => {
  await requireSession(request);
  return Response.json(await removePayment(prisma, (await params).id));
});
