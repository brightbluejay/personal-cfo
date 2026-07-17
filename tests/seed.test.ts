import BetterSqlite3 from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { readFixture, seedDatabase, type SeedCounts } from "../src/db/seed";
import * as schema from "../src/db/schema";

const fixtureDirectory = path.resolve(process.cwd(), "data");
const migrationsDirectory = path.resolve(process.cwd(), "drizzle");

let temporaryDirectory: string;
let sqlite: BetterSqlite3.Database;
let counts: SeedCounts;

beforeEach(() => {
  temporaryDirectory = mkdtempSync(path.join(tmpdir(), "personal-cfo-seed-"));
  sqlite = new BetterSqlite3(path.join(temporaryDirectory, "test.db"));
  sqlite.pragma("foreign_keys = ON");
  const db = drizzle(sqlite, { schema });
  migrate(db, { migrationsFolder: migrationsDirectory });
  counts = seedDatabase(db, fixtureDirectory);
});

afterEach(() => {
  sqlite.close();
  rmSync(temporaryDirectory, { recursive: true, force: true });
});

describe("fictional demo seed", () => {
  it("migrates every CSV dataset into its intended table", () => {
    expect(counts.accounts).toBe(1);
    expect(counts.transactions).toBe(
      readFixture(fixtureDirectory, "transactions.csv").length,
    );
    expect(counts.debts).toBe(
      readFixture(fixtureDirectory, "debts.csv").length,
    );
    expect(counts.income).toBe(
      readFixture(fixtureDirectory, "income.csv").length,
    );
    expect(counts.recurringCommitments).toBe(
      readFixture(fixtureDirectory, "essential-expenses.csv").length,
    );
    expect(counts.upcomingExpenses).toBe(
      readFixture(fixtureDirectory, "upcoming-expenses.csv").length,
    );
    expect(counts.sinkingFunds).toBe(
      readFixture(fixtureDirectory, "sinking-funds.csv").length,
    );
    expect(counts.monthlyPlans).toBe(1);
    expect(counts.aiReviews).toBe(0);
    expect(counts.syncConnections).toBe(0);
  });

  it("creates complete deterministic category links and valid foreign keys", () => {
    const uncategorised = sqlite
      .prepare(
        "select count(*) as count from transactions where category_id is null",
      )
      .get() as { count: number };
    const foreignKeyErrors = sqlite.pragma("foreign_key_check") as unknown[];
    expect(uncategorised.count).toBe(0);
    expect(counts.categoryRules).toBeGreaterThan(0);
    expect(counts.categoryRules).toBeLessThanOrEqual(counts.transactions);
    expect(foreignKeyErrors).toHaveLength(0);
  });

  it("stores the monthly plan using the documented cash-flow equation", () => {
    const plan = sqlite
      .prepare("select * from monthly_plans limit 1")
      .get() as {
      opening_cash_minor: number;
      expected_income_minor: number;
      committed_costs_minor: number;
      debt_minimums_minor: number;
      protected_buffer_minor: number;
      safe_to_spend_minor: number;
    };
    const expected = Math.max(
      0,
      plan.opening_cash_minor +
        plan.expected_income_minor -
        plan.committed_costs_minor -
        plan.debt_minimums_minor -
        plan.protected_buffer_minor,
    );
    expect(plan.safe_to_spend_minor).toBe(expected);
  });
});
