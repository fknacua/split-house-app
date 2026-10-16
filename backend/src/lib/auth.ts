import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { nextCookies } from "better-auth/next-js";
import { expo } from "@better-auth/expo";
import { APIError } from "better-auth/api";
import { prisma } from "@/lib/prisma";

const allowedEmail = process.env.ALLOWED_EMAIL;
if (!allowedEmail) {
  throw new Error("ALLOWED_EMAIL env var is required");
}

export const auth = betterAuth({
  secret: process.env.BETTER_AUTH_SECRET,
  baseURL: process.env.BETTER_AUTH_URL,
  database: prismaAdapter(prisma, { provider: "postgresql" }),
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID as string,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
    },
  },
  // Rolling session: each use within the window extends it, like a Google
  // app rather than Slack. Cookie caching stays off so a revoked session
  // (new phone sign-in) stops working immediately instead of living on
  // until a cache expires.
  session: {
    expiresIn: 60 * 60 * 24 * 90, // 90 days
    updateAge: 60 * 60 * 24, // 1 day
  },
  databaseHooks: {
    user: {
      create: {
        before: async (user) => {
          if (user.email !== allowedEmail) {
            throw new APIError("FORBIDDEN", {
              message: "This account is not allowed to sign in.",
            });
          }
          return { data: user };
        },
      },
    },
  },
  trustedOrigins: [
    "splithouse://",
    "splithouse://*",
    ...(process.env.NODE_ENV === "development" ? ["exp://**"] : []),
  ],
  plugins: [expo(), nextCookies()],
});
