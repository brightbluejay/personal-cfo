import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
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

function readOptionalFixture(
  dataDirectory: string,
  filename: string,
): CsvRow[] {
  return existsSync(path.join(dataDirectory, filename))
    ? readFixture(dataDirectory, filename)
    : [];
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

function addMonths(isoDate: string, monthOffset: number, day: number) {
  const [year, month] = isoDate.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1 + monthOffset, 1));
  const lastDay = new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0),
  ).getUTCDate();
  date.setUTCDate(Math.min(Math.max(1, day), lastDay));
  return date.toISOString().slice(0, 10);
}

function addDays(isoDate: string, dayOffset: number) {
  const date = new Date(`${isoDate}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + dayOffset);
  return date.toISOString().slice(0, 10);
}

function movementType(
  value: string,
  amountMinor: number,
  categoryName: string,
) {
  const allowed = new Set([
    "income",
    "expense",
    "internal_transfer",
    "savings_transfer",
    "debt_payment",
    "refund",
    "adjustment",
    "unknown",
  ]);
  if (allowed.has(value)) return value;
  if (slugify(categoryName) === "debt-payment") return "debt_payment";
  return amountMinor > 0 ? "income" : "expense";
}

function spendingContext(value: string) {
  return ["routine", "one_off_unavoidable", "one_off_discretionary"].includes(
    value,
  )
    ? value
    : "routine";
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
  const baseTransactionRows = readFixture(dataDirectory, "transactions.csv");
  const phaseTransactionRows = readOptionalFixture(
    dataDirectory,
    "phase1-transactions.csv",
  );
  const householdHistoryRows = readOptionalFixture(
    dataDirectory,
    "household-history.csv",
  );
  const debtRows = readFixture(dataDirectory, "debts.csv");
  const debtSnapshotRows = readOptionalFixture(
    dataDirectory,
    "debt-snapshots.csv",
  );
  const incomeRows = readFixture(dataDirectory, "income.csv");
  const commitmentRows = readFixture(dataDirectory, "essential-expenses.csv");
  const baseUpcomingRows = readFixture(dataDirectory, "upcoming-expenses.csv");
  const phaseUpcomingRows = readOptionalFixture(
    dataDirectory,
    "phase1-upcoming-expenses.csv",
  );
  const sinkingRows = readFixture(dataDirectory, "sinking-funds.csv");
  const additionalAccountRows = readOptionalFixture(
    dataDirectory,
    "accounts.csv",
  );
  const categoryPolicyRows = readOptionalFixture(
    dataDirectory,
    "category-policies.csv",
  );

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
  const transactionRows = [
    ...baseTransactionRows.map((row) => ({ ...row, account_ref: accountId })),
    ...phaseTransactionRows.map((row) => ({
      ...row,
      date: addMonths(
        planningDate,
        Number.parseInt(
          requireField(
            row,
            ["month_offset"],
            "phase1-transactions.csv",
            "month offset",
          ),
          10,
        ),
        Number.parseInt(
          requireField(row, ["day"], "phase1-transactions.csv", "day"),
          10,
        ),
      ),
    })),
    ...householdHistoryRows.map((row) => ({
      ...row,
      account_ref: pick(row, ["account_ref"]) || accountId,
      date: addMonths(
        planningDate,
        Number.parseInt(
          requireField(
            row,
            ["month_offset"],
            "household-history.csv",
            "month offset",
          ),
          10,
        ),
        Number.parseInt(
          requireField(row, ["day"], "household-history.csv", "day"),
          10,
        ),
      ),
    })),
  ];
  const upcomingRows = [
    ...baseUpcomingRows,
    ...phaseUpcomingRows.map((row) => ({
      ...row,
      date: addDays(
        planningDate,
        Number.parseInt(
          requireField(
            row,
            ["days_from_planning"],
            "phase1-upcoming-expenses.csv",
            "day offset",
          ),
          10,
        ),
      ),
    })),
  ];
  const flexibilityByCategory = new Map(
    categoryPolicyRows.map((row) => [
      requireField(row, ["name"], "category-policies.csv", "name"),
      requireField(
        row,
        ["flexibility"],
        "category-policies.csv",
        "flexibility",
      ),
    ]),
  );
  const accountRecords = [
    {
      id: accountId,
      name: "Current account",
      type: "current_account",
      currency: "GBP",
      balanceMinor: moneyToMinor(openingCash),
      isDemo: true,
      ownership: "owned",
      role: "primary",
      purpose: null,
      envelopeCategoriesJson: "[]",
      createdAt: timestamp,
      updatedAt: timestamp,
    },
    ...additionalAccountRows.map((row) => ({
      id: requireField(row, ["id"], "accounts.csv", "id"),
      name: requireField(row, ["name"], "accounts.csv", "name"),
      type: requireField(row, ["type"], "accounts.csv", "type"),
      currency: pick(row, ["currency"]) || "GBP",
      balanceMinor: moneyToMinor(
        requireField(row, ["balance"], "accounts.csv", "balance"),
      ),
      isDemo: true,
      ownership: pick(row, ["ownership"]) || "unknown",
      role: pick(row, ["role"]) || "other",
      purpose: pick(row, ["purpose"]) || null,
      envelopeCategoriesJson: JSON.stringify(
        (pick(row, ["envelope_categories"]) || "")
          .split("|")
          .map((value) => slugify(value))
          .filter(Boolean),
      ),
      createdAt: timestamp,
      updatedAt: timestamp,
    })),
  ];
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
      flexibility:
        flexibilityByCategory.get(name) ??
        (essentialCategoryNames.has(name) || slugify(name) === "debt-payment"
          ? "protected"
          : "limited"),
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
    const amountMinor = moneyToMinor(
      requireField(row, ["amount"], "transactions.csv", "amount"),
    );
    const transactionAccountId = pick(row, ["account_ref"]) || accountId;
    const counterpartyAccountId = pick(row, ["counterparty_account_ref"]);
    return {
      id: stableId(
        "transaction",
        `${pick(row, ["date", "booked_date"])}:${description}`,
        index,
      ),
      accountId: accountRecords.some(
        (account) => account.id === transactionAccountId,
      )
        ? transactionAccountId
        : accountId,
      categoryId: categoryIdByName.get(categoryName) ?? null,
      bookedDate: requireField(
        row,
        ["date", "booked_date"],
        "transactions.csv",
        "date",
      ),
      description,
      normalizedDescription: normalizeDescription(description),
      amountMinor,
      movementType: movementType(
        pick(row, ["movement_type"]),
        amountMinor,
        categoryName,
      ),
      spendingContext: spendingContext(pick(row, ["spending_context"])),
      forecastBaselineEligible: !["no", "false", "0"].includes(
        pick(row, ["forecast_baseline_eligible"]).toLowerCase(),
      ),
      counterpartyAccountId: accountRecords.some(
        (account) => account.id === counterpartyAccountId,
      )
        ? counterpartyAccountId
        : null,
      externalReference: pick(row, ["reference", "external_reference"]) || null,
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
    postPromotionalAprBasisPoints: percentToBasisPoints(
      pick(row, ["post_promo_apr_percent", "post_promotional_apr_percent"]),
    ),
    contractualPaymentDay:
      Number.parseInt(
        pick(row, ["payment_day", "contractual_payment_day"]),
        10,
      ) || null,
    notes: pick(row, ["notes", "note"]) || null,
    createdAt: timestamp,
    updatedAt: timestamp,
  }));

  const debtIdByName = new Map(
    debtRecords.map((record) => [record.name, record.id]),
  );
  const debtSnapshotRecords = debtSnapshotRows.map((row, index) => {
    const debtName = requireField(
      row,
      ["debt_name", "name"],
      "debt-snapshots.csv",
      "debt name",
    );
    const debtId = debtIdByName.get(debtName);
    if (!debtId) {
      throw new Error(
        "debt-snapshots.csv references a debt that is not in debts.csv.",
      );
    }
    const snapshotDate = requireField(
      row,
      ["snapshot_date", "date"],
      "debt-snapshots.csv",
      "snapshot date",
    );
    return {
      id: stableId("debt-snapshot", `${debtName}:${snapshotDate}`, index),
      debtId,
      snapshotDate,
      balanceMinor: moneyToMinor(
        requireField(row, ["balance"], "debt-snapshots.csv", "balance"),
      ),
      paymentsMinor: moneyToMinor(pick(row, ["payments"]) || "0"),
      interestChargedMinor: moneyToMinor(
        pick(row, ["interest_charged", "interest"]) || "0",
      ),
      newBorrowingMinor: moneyToMinor(
        pick(row, ["new_borrowing", "borrowing"]) || "0",
      ),
      source: "fixture",
      createdAt: timestamp,
      updatedAt: timestamp,
    };
  });

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
      kind: pick(row, ["kind", "type", "income_type"]) || "other",
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
    asOfDate: planningDate,
    openingCashMinor,
    expectedIncomeMinor: confirmedIncome,
    committedCostsMinor,
    debtMinimumsMinor: debtMinimums,
    protectedBufferMinor: bufferMinor,
    safeToSpendMinor,
    status:
      projectedCash >= bufferMinor ? "buffer_preserved" : "buffer_at_risk",
    assumptionsJson: JSON.stringify({
      household: {
        name: profile.get("household_name") || "Demo household",
        adults: Number.parseInt(profile.get("adults") || "1", 10),
        children: Number.parseInt(profile.get("children") || "0", 10),
      },
      dataQuality: "confirmed rows only for income and upcoming costs",
      debtMinimums: "all contractual minimums included",
      sinkingFunds: "all monthly contributions included",
    }),
    createdAt: timestamp,
    updatedAt: timestamp,
  };

  db.transaction((tx) => {
    tx.delete(schema.narrativeCache).run();
    tx.delete(schema.aiReviews).run();
    tx.delete(schema.syncConnections).run();
    tx.delete(schema.categoryRules).run();
    tx.delete(schema.transactions).run();
    tx.delete(schema.recurringCommitments).run();
    tx.delete(schema.upcomingExpenses).run();
    tx.delete(schema.sinkingFunds).run();
    tx.delete(schema.income).run();
    tx.delete(schema.debtSnapshots).run();
    tx.delete(schema.debts).run();
    tx.delete(schema.monthlyPlans).run();
    tx.delete(schema.categories).run();
    tx.delete(schema.accounts).run();

    tx.insert(schema.accounts).values(accountRecords).run();
    if (categoryRecords.length)
      tx.insert(schema.categories).values(categoryRecords).run();
    if (transactionRecords.length)
      tx.insert(schema.transactions).values(transactionRecords).run();
    if (ruleRecords.length)
      tx.insert(schema.categoryRules).values(ruleRecords).run();
    if (debtRecords.length) tx.insert(schema.debts).values(debtRecords).run();
    if (debtSnapshotRecords.length)
      tx.insert(schema.debtSnapshots).values(debtSnapshotRecords).run();
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
    accounts: accountRecords.length,
    transactions: transactionRecords.length,
    categories: categoryRecords.length,
    categoryRules: ruleRecords.length,
    debts: debtRecords.length,
    debtSnapshots: debtSnapshotRecords.length,
    income: incomeRecords.length,
    recurringCommitments: commitmentRecords.length,
    upcomingExpenses: upcomingRecords.length,
    sinkingFunds: sinkingRecords.length,
    monthlyPlans: 1,
    aiReviews: 0,
    syncConnections: 0,
    narrativeCache: 0,
  };
}
