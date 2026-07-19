import BetterSqlite3 from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { existsSync, rmSync } from "node:fs";
import path from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { POST as buildBrief } from "../app/api/cfo-brief/route";
import DebtsPage from "../app/debts/page";
import MonthlyReviewPage from "../app/monthly-review/page";
import OverviewPage from "../app/page";
import SpendingPage from "../app/spending/page";
import TransactionsPage from "../app/transactions/page";
import { seedDatabase } from "../src/db/seed";
import { getCfoWorkspace } from "../src/db/cfo-query";
import { buildFallbackNarrative } from "../src/domain/cfo/narrative-output";
import { projectDebtPayoff } from "../src/domain/cfo/debt-projection";
import { formatDate, formatMoney } from "../src/lib/format";
import { writeCachedNarrative } from "../src/server/narrative-cache";
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
    ["You will reach", OverviewPage],
    ["Transactions", TransactionsPage],
    ["Spending", SpendingPage],
    ["Debts", DebtsPage],
    ["Your Action Plan", MonthlyReviewPage],
  ] as const;

  it.each(pages)("renders the %s page from SQLite", (heading, Page) => {
    const html = renderToStaticMarkup(<Page />);
    expect(html).toContain(`<h1`);
    expect(html).toContain(heading);
  });

  it("keeps the risk-first overview and time-based action plan on the canonical forecast", () => {
    const cfo = getCfoWorkspace();
    expect(cfo).not.toBeNull();
    const monthEnd = formatMoney(cfo!.forecast.projectedMonthEndBalanceMinor);
    const safeToSpend = formatMoney(cfo!.forecast.safeToSpendNowMinor);
    const overview = renderToStaticMarkup(<OverviewPage />);
    const actionPlan = renderToStaticMarkup(<MonthlyReviewPage />);
    expect(overview).toContain(monthEnd);
    expect(overview).toContain(safeToSpend);
    expect(overview).toContain("overdraft cycle");
    expect(actionPlan).toContain("Get through this month");
    expect(actionPlan).toContain("Monthly cycle");
    expect(actionPlan).toContain("Corrected monthly plan");
    expect(actionPlan).toContain("One-off backlog");
    expect(actionPlan).toContain("Plan balances the month");
    expect(actionPlan).not.toContain(">structurally balanced<");
    expect(actionPlan).toContain("Monthly plan composition");
    expect(actionPlan).toContain(
      formatMoney(cfo!.breakCyclePlan.backlog.remainingBacklogMinor),
    );
  });

  it("returns the evidence-backed deterministic CFO brief without an API key", async () => {
    const originalKey = process.env.OPENAI_API_KEY;
    delete process.env.OPENAI_API_KEY;
    const response = await buildBrief(
      new Request("http://localhost/api/cfo-brief", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{}",
      }),
    );
    const body = (await response.json()) as {
      status: string;
      label: string;
      narrative: { headline: { factIds: string[] } };
    };
    if (originalKey === undefined) delete process.env.OPENAI_API_KEY;
    else process.env.OPENAI_API_KEY = originalKey;
    expect(response.status).toBe(200);
    expect(body.status).toBe("fallback");
    expect(body.label).toContain("AI interpretation is unavailable");
    expect(body.narrative.headline.factIds.length).toBeGreaterThan(0);
  });

  it("returns a validated cache entry even when the client requests a refresh", async () => {
    const originalKey = process.env.OPENAI_API_KEY;
    const originalFetch = global.fetch;
    const cfo = getCfoWorkspace()!;
    const model = "gpt-5.6-sol";
    const stored = writeCachedNarrative({
      packageValue: cfo.narrativeFacts,
      narrativeType: "action_plan",
      model,
      response: buildFallbackNarrative(cfo.narrativeFacts, "action_plan"),
    });
    let apiCalls = 0;
    process.env.OPENAI_API_KEY = "synthetic-test-value";
    global.fetch = async () => {
      apiCalls += 1;
      throw new Error("The cache path must not call the provider.");
    };
    try {
      const response = await buildBrief(
        new Request("http://localhost/api/cfo-brief", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ type: "action_plan", refresh: true }),
        }),
      );
      const body = (await response.json()) as {
        status: string;
        label: string;
        generatedAt: string;
      };
      expect(response.status).toBe(200);
      expect(body.status).toBe("cached_gpt");
      expect(body.label).toBe("Cached GPT-5.6 coaching");
      expect(body.generatedAt).toBe(stored.generatedAt);
      expect(apiCalls).toBe(0);
    } finally {
      global.fetch = originalFetch;
      if (originalKey === undefined) delete process.env.OPENAI_API_KEY;
      else process.env.OPENAI_API_KEY = originalKey;
    }
  });

  it("reconciles every next-income allocation bucket exactly once", () => {
    const cfo = getCfoWorkspace();
    const income = cfo!.forecast.nextIncome!;
    expect(
      income.negativeBalanceClearedMinor +
        income.commitmentsAfterIncomeMinor +
        income.protectedDebtPaymentsAfterIncomeMinor +
        income.remainingSpendingMinor +
        income.safetyCushionAllocationMinor +
        income.genuinelyUnallocatedMinor,
    ).toBe(income.amountMinor);
  });

  it("renders the delayed optional-overpayment route from canonical projections", () => {
    const cfo = getCfoWorkspace()!;
    const debtEffect = cfo.breakCyclePlan.debtEffect;
    const planProjection = projectDebtPayoff({
      debts: cfo.debtRecords,
      asOfDate: cfo.forecast.asOfDate,
      monthlyExtraPaymentMinor: debtEffect.safeOptionalPaymentMinor,
      extraPaymentStartDate: debtEffect.optionalOverpaymentStartDate,
    });
    const html = renderToStaticMarkup(<DebtsPage />);
    expect(html).toContain("What-if comparison");
    expect(html).toContain("This is not the current Action Plan route");
    expect(html).not.toContain("Once cash flow is healthy");
    expect(html).toContain(formatDate(debtEffect.currentDebtFreeDate));
    expect(html).toContain(formatDate(debtEffect.revisedDebtFreeDate));
    expect(html).toContain(
      `${cfo.debtTrajectory.currentPlan.monthsToPayoff! - planProjection.monthsToPayoff!} months`,
    );
    expect(html).toContain(
      formatMoney(
        cfo.debtTrajectory.currentPlan.totalInterestMinor -
          planProjection.totalInterestMinor,
      ),
    );
  });

  it("does not expose internal provenance or contradictory cushion language", () => {
    const html = pages
      .map(([, Page]) => renderToStaticMarkup(<Page />))
      .join("\n");
    expect(html).not.toMatch(/>\s*(seed|fixture)\s*</i);
    expect(html).not.toContain("safety cushion protected");
    expect(html).not.toContain("Fictional current account");
    expect(html).not.toContain("Fictional savings");
  });

  it("counts the future annual-cover obligation once and keeps debt minimums out of actions", () => {
    const cfo = getCfoWorkspace();
    expect(cfo).not.toBeNull();
    expect(
      cfo!.forecast.events.filter(
        (event) =>
          event.kind === "upcoming" && Math.abs(event.amountMinor) === 36_000,
      ),
    ).toHaveLength(1);
    expect(cfo!.debtAction.requiredMinimumsMinor).toBe(41_300);
    expect(cfo!.debtAction.minimumsPaidMinor).toBe(41_300);
    expect(
      cfo!.recovery.actions.flatMap((action) => action.categorySlugs),
    ).not.toContain("debt-payment");
    expect(
      cfo!.accounts.every((account) => !account.name.includes("Fictional")),
    ).toBe(true);
  });
});
