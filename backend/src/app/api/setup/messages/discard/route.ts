import { requireSession, route } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { discardSetupMessages } from "@/services/setup/setup-messages.service";

/** Discards every custom template from Custom messages' `skipMessages` dialog, and un-marks the step. */
export const POST = route(async (request) => {
  await requireSession(request);
  return Response.json(await discardSetupMessages(prisma));
});
