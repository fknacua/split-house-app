import { auth } from "@/lib/auth";
import { redirectToJsonError } from "@/lib/api";
import { toNextJsHandler } from "better-auth/next-js";

const handler = toNextJsHandler(auth);

// Better Auth reports some failures as a redirect; the app must see them as errors.
export const GET = async (request: Request) =>
  redirectToJsonError(await handler.GET(request));
export const POST = async (request: Request) =>
  redirectToJsonError(await handler.POST(request));
