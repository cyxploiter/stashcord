#!/usr/bin/env node

/**
 * Database Reset Script for Stashcord
 *
 * This script allows for safe database reset during development.
 * NEVER run this in production!
 *
 * Usage:
 *   npm run db:reset     - Reset database (development only)
 *   npm run db:init      - Initialize database without reset
 */

import { initializeDatabase } from "./init-db";

async function main() {
  const args = process.argv.slice(2);
  const forceReset = args.includes("--reset") || args.includes("--force-reset");

  if (forceReset) {
    const NODE_ENV = process.env.NODE_ENV || "development";

    if (NODE_ENV === "production") {
      console.error("❌ Database reset is not allowed in production!");
      console.error("Set NODE_ENV=development to reset database.");
      process.exit(1);
    }

    console.log("⚠️ RESETTING DATABASE - All data will be lost!");
    console.log("This operation will:");
    console.log("  - Drop all existing tables");
    console.log("  - Create fresh schema");
    console.log("  - Seed initial data");
    console.log("");

    // Ask for confirmation
    const readline = require("readline");
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    const answer = await new Promise<string>((resolve) => {
      rl.question(
        "Are you sure you want to reset the database? (yes/no): ",
        resolve
      );
    });

    rl.close();

    if (answer.toLowerCase() !== "yes") {
      console.log("❌ Database reset cancelled.");
      process.exit(0);
    }
  }

  try {
    await initializeDatabase(forceReset);
    console.log("✅ Database operation completed successfully!");
  } catch (error) {
    console.error("❌ Database operation failed:", error);
    process.exit(1);
  }
}

main();
