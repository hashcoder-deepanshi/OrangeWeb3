import { defineConfig } from "drizzle-kit";

// Use a default connection string for Vercel's build step if DATABASE_URL is not available
const connectionString = process.env.DATABASE_URL || 
  "postgresql://neondb_owner:npg_6wyYsuj5GcnF@ep-sweet-glade-a49pding-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require";

export default defineConfig({
  out: "./migrations",
  schema: "./shared/schema.ts",
  dialect: "postgresql",
  dbCredentials: {
    url: connectionString,
  },
});