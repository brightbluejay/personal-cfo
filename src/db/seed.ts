import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";
import { parse } from "csv-parse/sync";
import type { BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import * as schema from "./schema";

export type CsvRow = Record<string, string>;

export function readFixture(dataDirectory: string, filename: string): CsvRow[] {
  return parse(readFileSync(path.join(dataDirectory, filename), "utf8"), {
    bom: true,
    columns: true,
    skip_empty_lines: true,
    trim: true,
  }) as CsvRow[];
}

function pick(row: CsvRow, keys: string[]) {
  for (const key of keys) {
    const value = row[key];
    if (value !== undefined && value.trim() !== "") return value.trim();
  }
  return "";
}

function requireField(
  row: CsvRow,
  keys: string[],
  filename: string,
  label: string,
) {
  const value = pick(row, keys);
  if (!value)
    throw new Error(`${filename} is missing a required ${label} value.`);
  return value;
}

export function moneyToMinor(value: string) {
  const normalized = value.replace(/[£,\s]/g, "");
  const match = normalized.match(/^(-?)(\d+)(?:\.(\d{1,2}))?$/);
  if (!match)
    throw new Error("A fictional fixture contains an invalid money value.");
  const [, sign, pounds, pence = ""] = match;
  const minor =
    Number.parseInt(pounds, 10) * 100 +
    Number.parseInt(pence.padEnd(2, "0") || "0", 10);
  return sign === "-" ? -minor : minor;
}

function percentToBasisPoints(value: string) {
  if (!value) return null;
  return moneyToMinor(value);
}

function slugify(value: string) {
  return (
    value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "uncategorised"
  );
}

export function normalizeDescription(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function stableId(scope: string, value: string, index: number) {
  const digest = createHash("sha256")
    .update(`${scope}:${value}:${index}`)
    .digest("hex")
    .slice(0, 12);
  return `${scope}-${digest}`;
}

function isYes(value: string) {
  return ["yes", "true", "1"].includes(value.toLowerCase());
}

function confidence(value: string) {
  if (!value) return 100;
  const numeric = Number(value);
  if (Number.isFinite(numeric))
    return Math.max(
      0,
      Math.min(100, Math.round(numeric <= 1 ? numeric * 100 : numeric)),
    );
  if (value.toLowerCase() === "high") return 100;
  if (value.toLowerCase() === "medium") return 70;
  return 40;
}

export type SeedCounts = Record<string, number>;

export function seedDatabase(
  db: BetterSQLite3Database<typeof schema>,
  dataDirectory: string,
): SeedCounts {
  const profileRows = readFixture(dataDirectory, "profile.csv");
  const transactionRows = readFixture(dataDirectory, "transactions.csv");
  const debtRows = readFixture(dataDirectory, "debts.csv");
  const incomeRows = readFixture(dataDirectory, "income.csv");
  const commitmentRows = readFixture(dataDirectory, "essential-expenses.csv");
  const upcomingRows = readFixture(dataDirectory, "upcoming-expenses.csv");
  const sinkingRows = readFixture(dataDirectory, "sinking-funds.csv");

  const profile = new Map(
    profileRows.map((row) => [
      requireField(row, ["key"], "profile.csv", "key"),
      requireField(row, ["value"], "profile.csv", "value"),
    ]),
  );
  const planningDate = profile.get("planning_date");
  const openingCash = profile.get("current_bank_balance");
  const protectedBuffer = profile.get("minimum_cash_buffer");
  if (!planningDate || !openingCash || !protectedBuffer) {
    throw new Error("profile.csv is missing a required planning setting.");
  }
  const timestamp = `${planningDate}T00:00:00.000Z`;
  const accountId = "account-fictional-current";

  const essentialCategoryNames = new Set(
    commitmentRows.map((row) => pick(row, ["category"])).filter(Boolean),
  );
  const categoryNames = new Set([
    ...transactionRows.map((row) =>
      requireField(row, ["category"], "transactions.csv", "category"),
    ),
    ...essentialCategoryNames,
  ]);
  const usedSlugs = new Set<string>();
  const categoryRecords = [...categoryNames].sort().map((name, index) => {
    const base = slugify(name);
    let slug = base;
    let suffix = 2;
    while (usedSlugs.has(slug)) slug = `${base}-${suffix++}`;
    usedSlugs.add(slug);
    return {
      id: stableId("category", name, index),
      name,
      slug,
      kind: "expense",
      isEssential: essentialCategoryNames.has(name),
      createdAt: timestamp,
      updatedAt: timestamp,
    };
  });
  const categoryIdByName = new Map(
    categoryRecords.map((record) => [record.name, record.id]),
  );

  const transactionRecords = transactionRows.map((row, index) => {
    const description = requireField(
      row,
      ["description", "merchant", "name"],
      "transactions.csv",
      "description",
    );
    const categoryName = requireField(
      row,
      ["category"],
      "transactions.csv",
      "category",
    );
    return {
      id: stableId(
        "transaction",
        `${pick(row, ["date", "booked_date"])}:${description}`,
        index,
      ),
      accountId,
      categoryId: categoryIdByName.get(categoryName) ?? null,
      bookedDate: requireField(
        row,
        ["date", "booked_date"],
        "transactions.csv",
        "date",
      ),
      description,
      normalizedDescription: normalizeDescription(description),
      amountMinor: moneyToMinor(
        requireField(row, ["amount"], "transactions.csv", "amount"),
      ),
      categoryProvenance:
        pick(row, ["category_provenance", "provenance", "category_source"]) ||
        "fixture",
      categoryConfidence: confidence(
        pick(row, ["category_confidence", "confidence"]),
      ),
      notes: pick(row, ["notes", "note"]) || null,
      createdAt: timestamp,
      updatedAt: timestamp,
    };
  });

  const seenRules = new Set<string>();
  const ruleRecords = transactionRecords.flatMap((transaction, index) => {
    const key = transaction.normalizedDescription;
    if (!transaction.categoryId || seenRules.has(key)) return [];
    seenRules.add(key);
    return [
      {
        id: stableId("rule", key, index),
        matchType: "exact_normalized",
        pattern: key,
        categoryId: transaction.categoryId,
        priority: 100,
        source: "fixture",
        createdAt: timestamp,
        updatedAt: timestamp,
      },
    ];
  });

  const debtRecords = debtRows.map((row, index) => ({
    id: stableId(
      "debt",
      requireField(row, ["name"], "debts.csv", "name"),
      index,
    ),
    name: requireField(row, ["name"], "debts.csv", "name"),
    type: requireField(row, ["type"], "debts.csv", "type"),
    balanceMinor: moneyToMinor(
      requireField(row, ["balance"], "debts.csv", "balance"),
    ),
    aprBasisPoints:
      percentToBasisPoints(
        requireField(row, ["apr_percent", "apr"], "debts.csv", "APR"),
      ) ?? 0,
    minimumPaymentMinor: moneyToMinor(
      requireField(row, ["minimum_payment"], "debts.csv", "minimum payment"),
    ),
    promotionalAprBasisPoints: percentToBasisPoints(
      pick(row, ["promo_apr_percent", "promotional_apr_percent"]),
    ),
    promotionalEndDate:
      pick(row, ["promo_end_date", "promotional_end_date"]) || null,
    contractualPaymentDay:
      Number.parseInt(
        pick(row, ["payment_day", "contractual_payment_day"]),
        10,
      ) || null,
    notes: pick(row, ["notes", "note"]) || null,
    createdAt: timestamp,
    updatedAt: timestamp,
  }));

  const incomeRecords = incomeRows.map((row, index) => {
    const source = requireField(
      row,
      ["source", "name", "description"],
      "income.csv",
      "source",
    );
    return {
      id: stableId("income", source, index),
      accountId,
      source,
      amountMinor: moneyToMinor(
        requireField(row, ["amount"], "income.csv", "amount"),
      ),
      expectedDate: pick(row, ["date", "expected_date", "pay_date"]) || null,
      frequency: pick(row, ["frequency"]) || null,
      certainty: requireField(row, ["certainty"], "income.csv", "certainty"),
      createdAt: timestamp,
      updatedAt: timestamp,
    };
  });

  const commitmentRecords = commitmentRows.map((row, index) => {
    const name = requireField(
      row,
      ["description", "name", "expense"],
      "essential-expenses.csv",
      "description",
    );
    const categoryName = pick(row, ["category"]);
    return {
      id: stableId("commitment", name, index),
      name,
      categoryId: categoryIdByName.get(categoryName) ?? null,
      amountMinor: moneyToMinor(
        requireField(row, ["amount"], "essential-expenses.csv", "amount"),
      ),
      frequency: pick(row, ["frequency"]) || "monthly",
      nextDueDate: pick(row, ["date", "due_date", "next_due_date"]) || null,
      certainty: requireField(
        row,
        ["certainty"],
        "essential-expenses.csv",
        "certainty",
      ),
      isPaid: isYes(pick(row, ["paid", "is_paid"])),
      isEssential: !["no", "false", "0"].includes(
        pick(row, ["essential", "is_essential"]).toLowerCase(),
      ),
      notes: pick(row, ["notes", "note"]) || null,
      createdAt: timestamp,
      updatedAt: timestamp,
    };
  });

  const upcomingRecords = upcomingRows.map((row, index) => {
    const description = requireField(
      row,
      ["description", "name"],
      "upcoming-expenses.csv",
      "description",
    );
    return {
      id: stableId("upcoming", description, index),
      dueDate: requireField(
        row,
        ["date", "due_date"],
        "upcoming-expenses.csv",
        "date",
      ),
      event: requireField(
        row,
        ["event", "type"],
        "upcoming-expenses.csv",
        "event",
      ),
      description,
      amountMinor: moneyToMinor(
        requireField(row, ["amount"], "upcoming-expenses.csv", "amount"),
      ),
      certainty: requireField(
        row,
        ["certainty"],
        "upcoming-expenses.csv",
        "certainty",
      ),
      isEssential: isYes(pick(row, ["essential", "is_essential"])),
      notes: pick(row, ["notes", "note"]) || null,
      createdAt: timestamp,
      updatedAt: timestamp,
    };
  });

  const sinkingRecords = sinkingRows.map((row, index) => {
    const name = requireField(
      row,
      ["name", "fund", "category"],
      "sinking-funds.csv",
      "name",
    );
    return {
      id: stableId("sinking", name, index),
      name,
      targetMinor: moneyToMinor(
        requireField(
          row,
          ["target_amount", "target"],
          "sinking-funds.csv",
          "target",
        ),
      ),
      savedMinor: moneyToMinor(
        pick(row, ["saved_amount", "current_amount", "current_balance"]) || "0",
      ),
      monthlyContributionMinor: moneyToMinor(
        requireField(
          row,
          ["monthly_contribution"],
          "sinking-funds.csv",
          "monthly contribution",
        ),
      ),
      targetDate: pick(row, ["target_date", "due_date"]) || null,
      certainty: pick(row, ["certainty"]) || "confirmed",
      createdAt: timestamp,
      updatedAt: timestamp,
    };
  });

  const confirmedIncome = incomeRecords
    .filter((item) => item.certainty.toLowerCase() === "confirmed")
    .reduce((sum, item) => sum + item.amountMinor, 0);
  const unpaidCommitments = commitmentRecords
    .filter(
      (item) => item.certainty.toLowerCase() === "confirmed" && !item.isPaid,
    )
    .reduce((sum, item) => sum + item.amountMinor, 0);
  const confirmedUpcoming = upcomingRecords
    .filter((item) => item.certainty.toLowerCase() === "confirmed")
    .reduce((sum, item) => sum + item.amountMinor, 0);
  const debtMinimums = debtRecords.reduce(
    (sum, item) => sum + item.minimumPaymentMinor,
    0,
  );
  const sinkingContributions = sinkingRecords.reduce(
    (sum, item) => sum + item.monthlyContributionMinor,
    0,
  );
  const openingCashMinor = moneyToMinor(openingCash);
  const bufferMinor = moneyToMinor(protectedBuffer);
  const committedCostsMinor =
    unpaidCommitments + confirmedUpcoming + sinkingContributions;
  const projectedCash =
    openingCashMinor + confirmedIncome - committedCostsMinor - debtMinimums;
  const safeToSpendMinor = Math.max(0, projectedCash - bufferMinor);
  const monthlyPlanRecord = {
    id: `plan-${planningDate.slice(0, 7)}`,
    month: planningDate.slice(0, 7),
    openingCashMinor,
    expectedIncomeMinor: confirmedIncome,
    committedCostsMinor,
    debtMinimumsMinor: debtMinimums,
    protectedBufferMinor: bufferMinor,
    safeToSpendMinor,
    status:
      projectedCash >= bufferMinor ? "buffer_preserved" : "buffer_at_risk",
    assumptionsJson: JSON.stringify({
      dataQuality: "confirmed rows only for income and upcoming costs",
      debtMinimums: "all contractual minimums included",
      sinkingFunds: "all monthly contributions included",
    }),
    createdAt: timestamp,
    updatedAt: timestamp,
  };

  db.transaction((tx) => {
    tx.delete(schema.aiReviews).run();
    tx.delete(schema.syncConnections).run();
    tx.delete(schema.categoryRules).run();
    tx.delete(schema.transactions).run();
    tx.delete(schema.recurringCommitments).run();
    tx.delete(schema.upcomingExpenses).run();
    tx.delete(schema.sinkingFunds).run();
    tx.delete(schema.income).run();
    tx.delete(schema.debts).run();
    tx.delete(schema.monthlyPlans).run();
    tx.delete(schema.categories).run();
    tx.delete(schema.accounts).run();

    tx.insert(schema.accounts)
      .values({
        id: accountId,
        name: "Fictional current account",
        type: "current_account",
        currency: "GBP",
        balanceMinor: openingCashMinor,
        isDemo: true,
        createdAt: timestamp,
        updatedAt: timestamp,
      })
      .run();
    if (categoryRecords.length)
      tx.insert(schema.categories).values(categoryRecords).run();
    if (transactionRecords.length)
      tx.insert(schema.transactions).values(transactionRecords).run();
    if (ruleRecords.length)
      tx.insert(schema.categoryRules).values(ruleRecords).run();
    if (debtRecords.length) tx.insert(schema.debts).values(debtRecords).run();
    if (incomeRecords.length)
      tx.insert(schema.income).values(incomeRecords).run();
    if (commitmentRecords.length)
      tx.insert(schema.recurringCommitments).values(commitmentRecords).run();
    if (upcomingRecords.length)
      tx.insert(schema.upcomingExpenses).values(upcomingRecords).run();
    if (sinkingRecords.length)
      tx.insert(schema.sinkingFunds).values(sinkingRecords).run();
    tx.insert(schema.monthlyPlans).values(monthlyPlanRecord).run();
  });

  return {
    accounts: 1,
    transactions: transactionRecords.length,
    categories: categoryRecords.length,
    categoryRules: ruleRecords.length,
    debts: debtRecords.length,
    income: incomeRecords.length,
    recurringCommitments: commitmentRecords.length,
    upcomingExpenses: upcomingRecords.length,
    sinkingFunds: sinkingRecords.length,
    monthlyPlans: 1,
    aiReviews: 0,
    syncConnections: 0,
  };
}
