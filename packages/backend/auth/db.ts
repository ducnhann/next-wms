import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

/**
 * Create a Neon database connection for Better Auth
 * Uses the AUTH_DATABASE_URL environment variable
 */
function createDb() {
  const connectionString = process.env.AUTH_DATABASE_URL || "";

  const sql = neon(connectionString);
  return drizzle({ client: sql, schema });
}

// Export singleton instance
export const db = createDb();

// Export type for use in other modules
export type AuthDb = typeof db;
