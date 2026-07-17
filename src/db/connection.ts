import BetterSqlite3 from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { mkdirSync } from "node:fs";
import path from "node:path";
import * as schema from "./schema";

const DEFAULT_DATABASE_URL = "file:./data/personal-cfo.db";

export function resolveDatabasePath(
  databaseUrl = process.env.DATABASE_URL ?? DEFAULT_DATABASE_URL,
) {
  const rawPath = databaseUrl.startsWith("file:")
    ? databaseUrl.slice(5)
    : databaseUrl;
  const resolved = path.resolve(
    /* turbopackIgnore: true */ process.cwd(),
    rawPath,
  );
  const dataDirectory = path.resolve(
    /* turbopackIgnore: true */ process.cwd(),
    "data",
  );
  const relative = path.relative(dataDirectory, resolved);

  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new Error(
      "The local database must be stored inside the repository data directory.",
    );
  }
  if (!/\.(db|sqlite|sqlite3)$/i.test(resolved)) {
    throw new Error(
      "The local database path must use a SQLite file extension.",
    );
  }

  return resolved;
}

export function openDatabase(databasePath = resolveDatabasePath()) {
  mkdirSync(path.dirname(databasePath), { recursive: true });
  const sqlite = new BetterSqlite3(databasePath);
  sqlite.pragma("foreign_keys = ON");
  sqlite.pragma("journal_mode = WAL");
  return {
    sqlite,
    db: drizzle(sqlite, { schema }),
  };
}
