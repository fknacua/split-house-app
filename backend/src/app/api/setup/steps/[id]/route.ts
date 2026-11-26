import { setupMarkableStepSchema } from "@splithouse/shared";
import { parsePathParam, requireSession, route } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { markSetupStep } from "@/services/setup/setup.service";

type Context = { params: Promise<{ id: string }> };

/** Marks People, Custom messages or Reminders done, from its page's Save (Reminders: `Done`). */
export const POST = route<Context>(async (request, { params }) => {
  await requireSession(request);
  const step = parsePathParam((await params).id, setupMarkableStepSchema, "Step must be people, messages or reminders.");
  return Response.json(await markSetupStep(prisma, step));
});
