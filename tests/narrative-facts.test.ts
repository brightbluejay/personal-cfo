import BetterSqlite3 from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { existsSync, rmSync } from "node:fs";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { getCfoWorkspace } from "../src/db/cfo-query";
import { seedDatabase } from "../src/db/seed";
import * as schema from "../src/db/schema";
import {
  auditNarrativeResponse,
  buildFallbackNarrative,
  NARRATIVE_PROMPT_VERSION,
  NARRATIVE_SCHEMA_VERSION,
  validateNarrativeResponse,
} from "../src/domain/cfo/narrative-output";
import type {
  CfoNarrativeFactPackage,
  NarrativeFact,
} from "../src/domain/cfo/narrative-facts";
import {
  narrativeCacheKey,
  readCachedNarrative,
  writeCachedNarrative,
} from "../src/server/narrative-cache";

const databaseRelativePath = "./data/narrative-facts-test.db";
const databasePath = path.resolve(process.cwd(), databaseRelativePath);
const migrationsDirectory = path.resolve(process.cwd(), "drizzle");
const fixtureDirectory = path.resolve(process.cwd(), "data");
let db: ReturnType<typeof drizzle<typeof schema>>;
let sqlite: BetterSqlite3.Database;

function withSyntheticFact(
  fact: NarrativeFact,
  views: Array<"overviewFacts" | "actionPlanFacts"> = [
    "overviewFacts",
    "actionPlanFacts",
  ],
) {
  const packageValue = structuredClone(
    getCfoWorkspace()!.narrativeFacts,
  ) as CfoNarrativeFactPackage;
  if (fact.type === "selected_recurring_change") {
    packageValue.recoveryPlan.push(fact);
  } else {
    packageValue.financialPosition.push(fact);
  }
  packageValue.evidenceIndex["calculation:validator-test"] =
    "Synthetic validator evidence";
  for (const view of views) packageValue.views[view].push(fact.id);
  return packageValue;
}

function syntheticFact(input: {
  id: string;
  values: NarrativeFact["values"];
  type?: string;
}): NarrativeFact {
  return {
    id: input.id,
    type: input.type ?? "validator_test",
    label: "Synthetic validator fact",
    values: input.values,
    evidenceIds: ["calculation:validator-test"],
    confidence: "high",
    recommendationEligible: true,
  };
}

function responseWithHeadline(
  packageValue: CfoNarrativeFactPackage,
  type: "cfo_brief" | "action_plan",
  text: string,
  factIds: string[],
) {
  const response = buildFallbackNarrative(packageValue, type);
  response.headline = { text, factIds };
  return response;
}

function naturalDate(isoDate: string) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${isoDate}T00:00:00Z`));
}

beforeAll(() => {
  process.env.DATABASE_URL = `file:${databaseRelativePath}`;
  sqlite = new BetterSqlite3(databasePath);
  sqlite.pragma("foreign_keys = ON");
  db = drizzle(sqlite, { schema });
  migrate(db, { migrationsFolder: migrationsDirectory });
  seedDatabase(db, fixtureDirectory);
});

afterAll(() => {
  sqlite.close();
  delete process.env.DATABASE_URL;
  for (const candidate of [
    databasePath,
    `${databasePath}-wal`,
    `${databasePath}-shm`,
  ]) {
    if (existsSync(candidate)) rmSync(candidate);
  }
});

describe("canonical narrative fact package", () => {
  it("is identical after a second deterministic seed", () => {
    const first = getCfoWorkspace()!;
    seedDatabase(db, fixtureDirectory);
    const second = getCfoWorkspace()!;
    expect(second.narrativeFacts).toEqual(first.narrativeFacts);
    expect(second.forecast).toEqual(first.forecast);
  });

  it("uses exactly three complete comparison months and preserves the approved forecast", () => {
    const workspace = getCfoWorkspace()!;
    expect(workspace.narrativeFacts.metadata.comparisonMonths).toEqual([
      "2026-04",
      "2026-05",
      "2026-06",
    ]);
    expect(workspace.forecast.lowestProjectedBalanceMinor).toBe(-134_800);
    expect(workspace.forecast.projectedMonthEndBalanceMinor).toBe(158_200);
    expect(workspace.forecast.safeToSpendNowMinor).toBe(0);
  });

  it("derives cautious category, unexpected-cost, subscription, and transfer facts", () => {
    const facts = getCfoWorkspace()!.narrativeFacts;
    const fuel = facts.categoryVariances.find(
      (fact) => fact.id === "category.fuel",
    )!;
    const unexpected = facts.unexpectedCosts.find(
      (fact) => fact.id === "unexpected.monthly",
    )!;
    const subscriptions = facts.subscriptions.filter(
      (fact) => fact.type === "subscription",
    );
    const subscriptionSummary = facts.subscriptions.find(
      (fact) => fact.id === "subscription.summary",
    )!;
    const transfers = facts.transfersAndSavings.find(
      (fact) => fact.id === "transfers.reconciled",
    )!;

    expect(fuel.values.direction).toBe("rising");
    expect(unexpected.values.averageMonthlyMinor).toBe(20_500);
    expect(unexpected.values.medianMonthlyMinor).toBe(19_000);
    expect(unexpected.values.suggestedSinkingFundMinor).toBe(20_500);
    expect(unexpected.values.currentSinkingFundContributionMinor).toBe(0);
    expect(subscriptions.length).toBeGreaterThanOrEqual(3);
    for (const subscription of subscriptions) {
      expect(subscription.values.annualisedCostMinor).toBe(
        Number(subscription.values.monthlyCostMinor) * 12,
      );
    }
    expect(subscriptionSummary.values.annualisedCostMinor).toBe(
      Number(subscriptionSummary.values.monthlyCostMinor) * 12,
    );
    expect(Number(transfers.values.matchedGroups)).toBeGreaterThan(0);
  });
});

describe("narrative validation and caching", () => {
  it("accepts the fallback and rejects unsupported facts, actions, and a sixth Action Plan action", () => {
    const facts = getCfoWorkspace()!.narrativeFacts;
    const valid = buildFallbackNarrative(facts, "action_plan");
    expect(
      validateNarrativeResponse({
        packageValue: facts,
        type: "action_plan",
        response: valid,
      }),
    ).toEqual(valid);

    const unsupportedFact = structuredClone(valid);
    unsupportedFact.headline.factIds = ["fact.not.supplied"];
    expect(() =>
      validateNarrativeResponse({
        packageValue: facts,
        type: "action_plan",
        response: unsupportedFact,
      }),
    ).toThrow(/Unknown or disallowed fact ID/);

    const unsupportedAction = structuredClone(valid);
    unsupportedAction.actions[0].actionId = "action-not-offered";
    expect(() =>
      validateNarrativeResponse({
        packageValue: facts,
        type: "action_plan",
        response: unsupportedAction,
      }),
    ).toThrow(/Unknown deterministic action ID/);

    const tooManyActions = structuredClone(valid);
    tooManyActions.actions.push(structuredClone(valid.actions[0]));
    expect(() =>
      validateNarrativeResponse({
        packageValue: facts,
        type: "action_plan",
        response: tooManyActions,
      }),
    ).toThrow();

    const overview = buildFallbackNarrative(facts, "cfo_brief");
    const thirdOverviewAction = structuredClone(overview);
    while (thirdOverviewAction.actions.length < 3) {
      thirdOverviewAction.actions.push(structuredClone(overview.actions[0]));
    }
    expect(() =>
      validateNarrativeResponse({
        packageValue: facts,
        type: "cfo_brief",
        response: thirdOverviewAction,
      }),
    ).toThrow();

    const bannedWording = structuredClone(valid);
    bannedWording.headline.text = "The cash-flow result needs attention.";
    expect(() =>
      validateNarrativeResponse({
        packageValue: facts,
        type: "action_plan",
        response: bannedWording,
      }),
    ).toThrow(/Banned narrative wording/);

    const inventedAmount = structuredClone(valid);
    inventedAmount.headline.text = "You have £999.00 available.";
    expect(() =>
      validateNarrativeResponse({
        packageValue: facts,
        type: "action_plan",
        response: inventedAmount,
      }),
    ).toThrow(/Unsupported monetary narrative claim/);
  });

  it("enforces the kitchen-table-v7 human-language contract", () => {
    expect(NARRATIVE_PROMPT_VERSION).toBe("kitchen-table-v7");
    expect(NARRATIVE_SCHEMA_VERSION).toBe("cfo-narrative-v7");
    const facts = getCfoWorkspace()!.narrativeFacts;
    const valid = buildFallbackNarrative(facts, "action_plan");
    expect(valid.connectingObservation.factIds.length).toBeGreaterThan(0);
    expect(valid.actions).toHaveLength(6);
    expect(
      valid.actions.find((action) => action.title.includes("PUREGYM"))
        ?.explanation,
    ).toContain("£24.99");
    expect(
      validateNarrativeResponse({
        packageValue: facts,
        type: "action_plan",
        response: valid,
      }),
    ).toEqual(valid);

    const internalLanguage = structuredClone(valid);
    internalLanguage.headline.text = "The backlog needs attention.";
    expect(() =>
      validateNarrativeResponse({
        packageValue: facts,
        type: "action_plan",
        response: internalLanguage,
      }),
    ).toThrow(/Banned narrative wording/);

    const isoDate = structuredClone(valid);
    isoDate.nextMilestone.text = "If these changes hold: 2029-05-31.";
    expect(() =>
      validateNarrativeResponse({
        packageValue: facts,
        type: "action_plan",
        response: isoDate,
      }),
    ).toThrow(/natural language/);

    const fakeIntimacy = structuredClone(valid);
    fakeIntimacy.headline.text = "Mate, this needs attention.";
    expect(() =>
      validateNarrativeResponse({
        packageValue: facts,
        type: "action_plan",
        response: fakeIntimacy,
      }),
    ).toThrow(/Banned narrative wording/);

    const secondObservation = {
      ...structuredClone(valid),
      connectingObservationTwo: structuredClone(valid.connectingObservation),
    };
    expect(() =>
      validateNarrativeResponse({
        packageValue: facts,
        type: "action_plan",
        response: secondObservation,
      }),
    ).toThrow();

    const permanentRedirect = structuredClone(valid);
    const redirect = permanentRedirect.actions.find(
      (action) =>
        action.actionId === "redirect-recurring-savings-during-overdraft-cycle",
    )!;
    redirect.explanation =
      "Permanently use the £200 monthly transfer for these costs.";
    expect(() =>
      validateNarrativeResponse({
        packageValue: facts,
        type: "action_plan",
        response: permanentRedirect,
      }),
    ).toThrow(/cannot be permanent/);

    const newIncome = structuredClone(valid);
    newIncome.summaryParagraphs[1].text =
      "Treat the £200 as new income and use it for surprises.";
    expect(() =>
      validateNarrativeResponse({
        packageValue: facts,
        type: "action_plan",
        response: newIncome,
      }),
    ).toThrow(/cannot be permanent, new income/);
  });

  it("accepts exact and half-up whole-pound currency but rejects nearby inventions", () => {
    const fact = syntheticFact({
      id: "test.money.69022",
      values: { amountMinor: 69_022 },
    });
    const facts = withSyntheticFact(fact);
    for (const text of ["The amount is £690.22.", "The amount is £690."]) {
      const response = responseWithHeadline(facts, "cfo_brief", text, [
        fact.id,
      ]);
      expect(
        validateNarrativeResponse({
          packageValue: facts,
          type: "cfo_brief",
          response,
        }),
      ).toEqual(response);
    }
    for (const text of ["The amount is £691.", "The amount is £690.50."]) {
      const response = responseWithHeadline(facts, "cfo_brief", text, [
        fact.id,
      ]);
      expect(() =>
        validateNarrativeResponse({
          packageValue: facts,
          type: "cfo_brief",
          response,
        }),
      ).toThrow(/Unsupported monetary narrative claim/);
    }
  });

  it("preserves the sign of negative facts and accepts explicit overdrawn phrasing", () => {
    const fact = syntheticFact({
      id: "test.money.negative",
      values: { amountMinor: -134_800 },
    });
    const facts = withSyntheticFact(fact);
    for (const text of [
      "The balance is -£1,348.00.",
      "The balance is -£1,348.",
      "The account is £1,348 overdrawn.",
    ]) {
      const response = responseWithHeadline(facts, "cfo_brief", text, [
        fact.id,
      ]);
      expect(
        validateNarrativeResponse({
          packageValue: facts,
          type: "cfo_brief",
          response,
        }),
      ).toEqual(response);
    }
    const signChanged = responseWithHeadline(
      facts,
      "cfo_brief",
      "There is £1,348 remaining.",
      [fact.id],
    );
    expect(() =>
      validateNarrativeResponse({
        packageValue: facts,
        type: "cfo_brief",
        response: signChanged,
      }),
    ).toThrow(/Unsupported monetary narrative claim/);
  });

  it("requires exact pennies for named subscriptions", () => {
    const facts = getCfoWorkspace()!.narrativeFacts;
    const subscription = facts.subscriptions.find(
      (fact) => fact.values.monthlyCostMinor === 1_299,
    )!;
    const exact = responseWithHeadline(
      facts,
      "cfo_brief",
      "Netflix costs £12.99 a month.",
      [subscription.id],
    );
    expect(
      validateNarrativeResponse({
        packageValue: facts,
        type: "cfo_brief",
        response: exact,
      }),
    ).toEqual(exact);
    for (const text of [
      "Netflix costs £13 a month.",
      "Netflix costs £13.50.",
    ]) {
      const invalid = responseWithHeadline(facts, "cfo_brief", text, [
        subscription.id,
      ]);
      expect(() =>
        validateNarrativeResponse({
          packageValue: facts,
          type: "cfo_brief",
          response: invalid,
        }),
      ).toThrow();
    }
  });

  it("requires the correct monetary fact and rejects combining referenced facts", () => {
    const first = syntheticFact({
      id: "test.money.first",
      values: { amountMinor: 10_000 },
    });
    const facts = withSyntheticFact(first);
    const second = syntheticFact({
      id: "test.money.second",
      values: { amountMinor: 20_000 },
    });
    facts.financialPosition.push(second);
    facts.views.overviewFacts.push(second.id);
    const wrongReference = responseWithHeadline(
      facts,
      "cfo_brief",
      "The amount is £100.",
      [second.id],
    );
    const combined = responseWithHeadline(
      facts,
      "cfo_brief",
      "The combined amount is £300.",
      [first.id, second.id],
    );
    for (const response of [wrongReference, combined]) {
      expect(() =>
        validateNarrativeResponse({
          packageValue: facts,
          type: "cfo_brief",
          response,
        }),
      ).toThrow(/Unsupported monetary narrative claim/);
    }
  });

  it("resolves referenced natural dates and rejects wrong or unreferenced dates", () => {
    const fact = syntheticFact({
      id: "test.date.july",
      values: { date: "2026-07-31" },
    });
    const facts = withSyntheticFact(fact);
    for (const text of ["The date is 31 July 2026.", "The date is 31 July."]) {
      const response = responseWithHeadline(facts, "cfo_brief", text, [
        fact.id,
      ]);
      expect(
        validateNarrativeResponse({
          packageValue: facts,
          type: "cfo_brief",
          response,
        }),
      ).toEqual(response);
    }
    for (const text of [
      "The date is 30 July 2026.",
      "The date is 31 August 2026.",
    ]) {
      const response = responseWithHeadline(facts, "cfo_brief", text, [
        fact.id,
      ]);
      expect(() =>
        validateNarrativeResponse({
          packageValue: facts,
          type: "cfo_brief",
          response,
        }),
      ).toThrow(/does not resolve unambiguously/);
    }
    const unreferenced = responseWithHeadline(
      facts,
      "cfo_brief",
      "The date is 31 July 2026.",
      ["position.health"],
    );
    expect(() =>
      validateNarrativeResponse({
        packageValue: facts,
        type: "cfo_brief",
        response: unreferenced,
      }),
    ).toThrow(/does not resolve unambiguously/);
  });

  it("resolves every recovery milestone date and enforces view scopes", () => {
    const facts = getCfoWorkspace()!.narrativeFacts;
    const datedRecoveryFacts = facts.recoveryPlan.filter(
      (fact) =>
        fact.type === "recovery_plan_milestone" ||
        fact.id === "recovery.debt_effect",
    );
    for (const fact of datedRecoveryFacts) {
      const value =
        fact.values.estimatedDate ?? fact.values.revisedDebtFreeDate;
      expect(typeof value).toBe("string");
      const response = buildFallbackNarrative(facts, "action_plan");
      response.nextMilestone = {
        text: `If these changes hold, the date is ${naturalDate(String(value))}.`,
        factIds: [fact.id],
      };
      expect(
        validateNarrativeResponse({
          packageValue: facts,
          type: "action_plan",
          response,
        }),
      ).toEqual(response);
    }

    const firstMilestone = facts.recoveryPlan.find(
      (fact) => fact.id === "recovery.milestone.finish_above_zero",
    )!;
    const overviewAllowed = responseWithHeadline(
      facts,
      "cfo_brief",
      `The date is ${naturalDate(String(firstMilestone.values.estimatedDate))}.`,
      [firstMilestone.id],
    );
    expect(
      validateNarrativeResponse({
        packageValue: facts,
        type: "cfo_brief",
        response: overviewAllowed,
      }),
    ).toEqual(overviewAllowed);

    const cushion = facts.recoveryPlan.find(
      (fact) => fact.id === "recovery.milestone.restore_cushion",
    )!;
    const overviewDisallowed = responseWithHeadline(
      facts,
      "cfo_brief",
      `The date is ${naturalDate(String(cushion.values.estimatedDate))}.`,
      [cushion.id],
    );
    expect(() =>
      validateNarrativeResponse({
        packageValue: facts,
        type: "cfo_brief",
        response: overviewDisallowed,
      }),
    ).toThrow(/Unknown or disallowed fact ID/);
  });

  it("uses bounded banned-term matching only on visible prose", () => {
    const facts = getCfoWorkspace()!.narrativeFacts;
    const substring = responseWithHeadline(
      facts,
      "cfo_brief",
      "Livestock costs need attention.",
      ["position.health"],
    );
    expect(
      validateNarrativeResponse({
        packageValue: facts,
        type: "cfo_brief",
        response: substring,
      }),
    ).toEqual(substring);

    const permittedStatus = responseWithHeadline(
      facts,
      "cfo_brief",
      "This is an overdraft cycle.",
      ["position.health"],
    );
    expect(
      validateNarrativeResponse({
        packageValue: facts,
        type: "cfo_brief",
        response: permittedStatus,
      }),
    ).toEqual(permittedStatus);

    const packageWithBannedIds = withSyntheticFact(
      syntheticFact({
        id: "test.fact.backlog",
        type: "selected_recurring_change",
        values: { actionId: "stock-action", kind: "category_trim" },
      }),
      ["actionPlanFacts"],
    );
    const identifiersOnly = buildFallbackNarrative(
      packageWithBannedIds,
      "action_plan",
    );
    identifiersOnly.actions[5] = {
      title: "Review this choice",
      explanation: "Decide whether it still helps.",
      factIds: ["test.fact.backlog"],
      actionId: "stock-action",
    };
    expect(
      validateNarrativeResponse({
        packageValue: packageWithBannedIds,
        type: "action_plan",
        response: identifiersOnly,
      }),
    ).toEqual(identifiersOnly);
  });

  it("returns every sanitised validation failure with bounded snippets", () => {
    const fact = syntheticFact({
      id: "test.diagnostic",
      values: { amountMinor: 69_022, date: "2026-07-31" },
    });
    const facts = withSyntheticFact(fact);
    const fakeKey = ["sk", "example-secret-value"].join("-");
    const response = responseWithHeadline(
      facts,
      "cfo_brief",
      `Authorization: Bearer ${fakeKey}. The recurring gap and backlog are £999 on 32 July.`,
      [fact.id],
    );
    const audit = auditNarrativeResponse({
      packageValue: facts,
      type: "cfo_brief",
      response,
    });
    expect(audit.valid).toBe(false);
    if (audit.valid) throw new Error("Expected a failed diagnostic audit.");
    expect(audit.issues.length).toBeGreaterThanOrEqual(4);
    expect(
      audit.issues.filter(
        (issue) => issue.classification === "banned-word hit",
      ),
    ).toHaveLength(2);
    expect(
      audit.issues.some(
        (issue) => issue.classification === "exact monetary mismatch",
      ),
    ).toBe(true);
    expect(
      audit.issues.some(
        (issue) =>
          issue.classification === "natural-language date not resolved",
      ),
    ).toBe(true);
    expect(JSON.stringify(audit.issues)).not.toContain(fakeKey);
    expect(JSON.stringify(audit.issues).toLowerCase()).not.toContain("bearer");
    for (const issue of audit.issues) {
      expect(issue.narrativeType).toBe("cfo_brief");
      expect(issue.rejectedTextSnippet.length).toBeLessThanOrEqual(182);
      expect(issue.rejectionReason.length).toBeGreaterThan(0);
    }
  });

  it("returns stable fact, action, and action-count diagnostics", () => {
    const facts = getCfoWorkspace()!.narrativeFacts;
    const response = buildFallbackNarrative(facts, "action_plan");
    response.headline.factIds = ["fact.not.supplied"];
    response.actions[0].actionId = "action-not-offered";
    const referenceAudit = auditNarrativeResponse({
      packageValue: facts,
      type: "action_plan",
      response,
    });
    expect(referenceAudit.valid).toBe(false);
    if (referenceAudit.valid) throw new Error("Expected reference failures.");
    expect(
      referenceAudit.issues.some(
        (issue) =>
          issue.classification === "unknown fact ID" &&
          issue.actionFactReferenceErrors.length === 1,
      ),
    ).toBe(true);
    expect(
      referenceAudit.issues.some(
        (issue) =>
          issue.classification === "unknown action ID" &&
          issue.actionFactReferenceErrors.length === 1,
      ),
    ).toBe(true);

    const tooMany = buildFallbackNarrative(facts, "action_plan");
    tooMany.actions.push(structuredClone(tooMany.actions[0]));
    const schemaAudit = auditNarrativeResponse({
      packageValue: facts,
      type: "action_plan",
      response: tooMany,
    });
    expect(schemaAudit.valid).toBe(false);
    if (schemaAudit.valid) throw new Error("Expected an action-count failure.");
    expect(schemaAudit.issues.map((issue) => issue.classification)).toContain(
      "action-count violation",
    );
  });

  it("keys cache entries by facts, type, scenario, model, prompt, and schema", () => {
    const base = {
      factPackageHash: "a".repeat(64),
      narrativeType: "cfo_brief" as const,
      model: "gpt-5.6-sol",
    };
    const key = narrativeCacheKey(base);
    expect(
      narrativeCacheKey({ ...base, factPackageHash: "b".repeat(64) }),
    ).not.toBe(key);
    expect(
      narrativeCacheKey({ ...base, narrativeType: "action_plan" }),
    ).not.toBe(key);
    expect(narrativeCacheKey({ ...base, scenarioHash: "scenario" })).not.toBe(
      key,
    );
    expect(narrativeCacheKey({ ...base, model: "another-model" })).not.toBe(
      key,
    );
    expect(
      narrativeCacheKey({ ...base, promptVersion: "next-prompt" }),
    ).not.toBe(key);
    expect(
      narrativeCacheKey({ ...base, schemaVersion: "next-schema" }),
    ).not.toBe(key);
  });

  it("round-trips only a validated narrative through SQLite", () => {
    const facts = getCfoWorkspace()!.narrativeFacts;
    const response = buildFallbackNarrative(facts, "cfo_brief");
    const written = writeCachedNarrative({
      packageValue: facts,
      narrativeType: "cfo_brief",
      model: "test-model",
      response,
    });
    const cached = readCachedNarrative({
      packageValue: facts,
      narrativeType: "cfo_brief",
      model: "test-model",
    });
    expect(cached?.key).toBe(written.key);
    expect(cached?.response).toEqual(response);
  });
});
