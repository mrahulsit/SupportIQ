import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx --conditions=react-server prisma/seed.ts",
  },
  datasource: {
    // Migrations need a direct (non-pooled) connection. Read it lazily via
    // process.env rather than env(): env() throws when the variable is unset,
    // which breaks `prisma generate` (postinstall) in CI/Vercel builds that
    // don't need a database connection at all.
    url: process.env.DIRECT_URL,
  },
});
