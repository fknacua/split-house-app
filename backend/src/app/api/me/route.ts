import { requireSession, route } from "@/lib/api";

/** Returns the signed-in account's email. Used to check a session end to end. */
export const GET = route(async (request) => {
  const { user } = await requireSession(request);
  return Response.json({ email: user.email });
});
