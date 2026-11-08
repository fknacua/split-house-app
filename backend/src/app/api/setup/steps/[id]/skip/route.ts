import { setupSkippableStepSchema } from "@splithouse/shared";
import { parsePathParam, requireSession, route } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { skipSetupStep } from "@/services/setup/setup.service";

type Context = { params: Promise<{ id: string }> };

/** Skips Custom messages with `Not now`: it counts as done, and Welcome moves to the next step. */
export const POST = route<Context>(async (request, { params }) => {
  await requireSession(request);
  const step = parsePathParam((await params).id, setupSkippableStepSchema, "Step must be messages.");
  return Response.json(await skipSetupStep(prisma, step));
});
