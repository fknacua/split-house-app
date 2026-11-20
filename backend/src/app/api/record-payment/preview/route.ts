import { recordPaymentPreviewRequestSchema } from "@splithouse/shared";
import { parseBody, requireSession, route } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { previewRecordPayment } from "@/services/payments/record-payment.service";

/** The Record payment sheet again with a changed person or set of ticked charges. Nothing is stored. */
export const POST = route(async (request) => {
  await requireSession(request);
  const values = await parseBody(request, recordPaymentPreviewRequestSchema);
  return Response.json(await previewRecordPayment(prisma, values));
});
