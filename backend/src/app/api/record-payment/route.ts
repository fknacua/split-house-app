import { recordPaymentQuerySchema, recordPaymentRequestSchema } from "@splithouse/shared";
import { parseBody, parseQuery, requireSession, route } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { getRecordPaymentSheet } from "@/services/payments/record-payment.service";
import { saveRecordPayment } from "@/services/payments/save-record-payment.service";

/** The Record payment sheet for the active month: `?personId=&chargeIds=a,b`, both optional. */
export const GET = route(async (request) => {
  await requireSession(request);
  const query = parseQuery(request, recordPaymentQuerySchema);
  return Response.json(await getRecordPaymentSheet(prisma, query));
});

/** Records a payment from one person for the ticked charges, each paid in full, in one transaction. */
export const POST = route(async (request) => {
  await requireSession(request);
  const values = await parseBody(request, recordPaymentRequestSchema);
  return Response.json(await saveRecordPayment(prisma, values));
});
