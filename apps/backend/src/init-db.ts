import { db } from "./db";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { seedDatabase } from "./db/seed";

async function initializeDatabase() {
  try {
    console.log("🚀 Initializing Stashcord database...");

    console.log("📝 Running database migrations...");
    await migrate(db, { migrationsFolder: "./drizzle" });
    console.log("✅ Database migrations completed successfully!");

    console.log("🌱 Seeding initial data...");
    await seedDatabase();
    console.log("✅ Database seeding completed successfully!");

    console.log("🎉 Database initialization completed successfully!");
  } catch (error) {
    console.error("❌ Database initialization failed:", error);
    process.exit(1);
  }
}

if (require.main === module) {
  initializeDatabase()
    .then(() => {
      console.log("Database ready!");
      process.exit(0);
    })
    .catch((error) => {
      console.error("Failed to initialize database:", error);
      process.exit(1);
    });
}

export { initializeDatabase };
