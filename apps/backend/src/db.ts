import { drizzle as drizzlePg } from "drizzle-orm/node-postgres";
import { drizzle as drizzleSqlite } from "drizzle-orm/better-sqlite3";
import { Pool } from "pg";
import * as schema from "./db/schema";
import dotenv from "dotenv";
import Database from "better-sqlite3";

dotenv.config();

let db;

if (process.env.NODE_ENV === "production") {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
      rejectUnauthorized: false,
    },
  });
  db = drizzlePg(pool, { schema });
} else {
  const sqlite = new Database("local.db");
  db = drizzleSqlite(sqlite, { schema });
}

export { db };
