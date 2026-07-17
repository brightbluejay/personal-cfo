import { existsSync, rmSync } from "node:fs";
import path from "node:path";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { openDatabase, resolveDatabasePath } from "./connection";
import { seedDatabase } from "./seed";

const databasePath = resolveDatabasePath();
for (const candidate of [
  databasePath,
  `${databasePath}-wal`,
  `${databasePath}-shm`,
]) {
  if (existsSync(candidate)) rmSync(candidate);
}

const { db, sqlite } = openDatabase(databasePath);
try {
  migrate(db, { migrationsFolder: path.resolve(process.cwd(), "drizzle") });
  const counts = seedDatabase(db, path.resolve(process.cwd(), "data"));
  const totalRows = Object.values(counts).reduce(
    (sum, count) => sum + count,
    0,
  );
  console.log(
    `Demo database reset and seeded across ${Object.keys(counts).length} tables (${totalRows} rows).`,
  );
} finally {
  sqlite.close();
}
