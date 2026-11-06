import { setupMarkableStepSchema } from "@splithouse/shared";
import { parsePathParam, requireSession, route } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { markSetupStep } from "@/services/setup/setup.service";

type Context = { params: Promise<{ id: string }> };

/** Marks People or Custom messages done, from its page's Save. */
export const POST = route<Context>(async (request, { params }) => {
  await requireSession(request);
  const step = parsePathParam((await params).id, setupMarkableStepSchema, "Step must be people or messages.");
  return Response.json(await markSetupStep(prisma, step));
});
