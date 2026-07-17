import BetterSqlite3 from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { existsSync, rmSync } from "node:fs";
import path from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import DebtsPage from "../app/debts/page";
import MonthlyReviewPage from "../app/monthly-review/page";
import OverviewPage from "../app/page";
import SpendingPage from "../app/spending/page";
import TransactionsPage from "../app/transactions/page";
import { seedDatabase } from "../src/db/seed";
import * as schema from "../src/db/schema";

const databaseRelativePath = "./data/page-render-test.db";
const databasePath = path.resolve(process.cwd(), databaseRelativePath);

beforeAll(() => {
  process.env.DATABASE_URL = `file:${databaseRelativePath}`;
  const sqlite = new BetterSqlite3(databasePath);
  sqlite.pragma("foreign_keys = ON");
  const db = drizzle(sqlite, { schema });
  migrate(db, { migrationsFolder: path.resolve(process.cwd(), "drizzle") });
  seedDatabase(db, path.resolve(process.cwd(), "data"));
  sqlite.close();
});

afterAll(() => {
  delete process.env.DATABASE_URL;
  for (const candidate of [
    databasePath,
    `${databasePath}-wal`,
    `${databasePath}-shm`,
  ]) {
    if (existsSync(candidate)) rmSync(candidate);
  }
});

describe("seeded dashboard pages", () => {
  const pages = [
    ["Overview", OverviewPage],
    ["Transactions", TransactionsPage],
    ["Spending", SpendingPage],
    ["Debts", DebtsPage],
    ["Monthly Review", MonthlyReviewPage],
  ] as const;

  it.each(pages)("renders the %s page from SQLite", (heading, Page) => {
    const html = renderToStaticMarkup(<Page />);
    expect(html).toContain(`<h1`);
    expect(html).toContain(
      heading === "Overview" ? "Your money, in context." : heading,
    );
  });
});
