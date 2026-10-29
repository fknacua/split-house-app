import { monthKey } from "@splithouse/shared";
import { ApiError, requireSession, route } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { getBillFile } from "@/services/bill/bill-file.service";

/** The month's saved bill PDF, shown inline, for View bill's Open. */
export const GET = route<{ params: Promise<{ month: string }> }>(async (request, { params }) => {
  await requireSession(request);
  const month = monthKey.safeParse((await params).month);
  if (!month.success) throw new ApiError(400, "invalid_request", "Month must be YYYY-MM.");
  const file = await getBillFile(prisma, month.data);
  return new Response(file.bytes, {
    headers: {
      "Content-Type": file.mimeType,
      "Content-Length": String(file.sizeBytes),
      // Encoded, since a header must be ASCII and the name comes from the phone.
      "Content-Disposition": `inline; filename*=UTF-8''${encodeURIComponent(file.filename)}`,
      "Cache-Control": "private, no-store",
    },
  });
});
