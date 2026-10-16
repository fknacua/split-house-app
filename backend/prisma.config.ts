import "dotenv/config";
import { defineConfig } from "prisma/config";

// The CLI (migrate, db pull, studio) always talks to Neon's direct,
// non-pooled connection. The app's runtime client uses DATABASE_URL
// (pooled) instead — see src/lib/prisma.ts.
export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: process.env["DIRECT_URL"],
  },
});
