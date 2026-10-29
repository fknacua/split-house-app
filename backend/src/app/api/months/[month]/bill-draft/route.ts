import { monthKey } from "@splithouse/shared";
import { ApiError, requireSession, route } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { getBillDraft, uploadBillDraft } from "@/services/bill/bill-draft.service";

type Context = { params: Promise<{ month: string }> };

async function monthParam(params: Context["params"]): Promise<string> {
  const month = monthKey.safeParse((await params).month);
  if (!month.success) throw new ApiError(400, "invalid_request", "Month must be YYYY-MM.");
  return month.data;
}

/** Uploads the bill PDF (multipart, field `file`) as the month's draft and returns what was read from it. */
export const POST = route<Context>(async (request, { params }) => {
  await requireSession(request);
  const month = await monthParam(params);
  let file: FormDataEntryValue | null;
  try {
    file = (await request.formData()).get("file");
  } catch {
    throw new ApiError(400, "invalid_request", "Body must be multipart with a file.");
  }
  if (!(file instanceof File)) throw new ApiError(400, "invalid_request", "Attach the PDF as `file`.");
  const bytes = new Uint8Array(await file.arrayBuffer());
  return Response.json(await uploadBillDraft(prisma, month, { filename: file.name, bytes }));
});

/** The month's stored draft, as the upload returned it. */
export const GET = route<Context>(async (request, { params }) => {
  await requireSession(request);
  return Response.json(await getBillDraft(prisma, await monthParam(params)));
});
