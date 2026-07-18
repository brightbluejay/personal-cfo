import {
  index,
  integer,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";

const timestamps = {
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
};

export const accounts = sqliteTable("accounts", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  type: text("type").notNull(),
  currency: text("currency").notNull().default("GBP"),
  balanceMinor: integer("balance_minor").notNull(),
  isDemo: integer("is_demo", { mode: "boolean" }).notNull().default(true),
  ownership: text("ownership").notNull().default("unknown"),
  role: text("role").notNull().default("other"),
  purpose: text("purpose"),
  envelopeCategoriesJson: text("envelope_categories_json")
    .notNull()
    .default("[]"),
  ...timestamps,
});

export const categories = sqliteTable(
  "categories",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    kind: text("kind").notNull().default("expense"),
    isEssential: integer("is_essential", { mode: "boolean" })
      .notNull()
      .default(false),
    flexibility: text("flexibility").notNull().default("limited"),
    ...timestamps,
  },
  (table) => [uniqueIndex("categories_slug_unique").on(table.slug)],
);

export const transactions = sqliteTable(
  "transactions",
  {
    id: text("id").primaryKey(),
    accountId: text("account_id")
      .notNull()
      .references(() => accounts.id, { onDelete: "cascade" }),
    categoryId: text("category_id").references(() => categories.id, {
      onDelete: "set null",
    }),
    bookedDate: text("booked_date").notNull(),
    description: text("description").notNull(),
    normalizedDescription: text("normalized_description").notNull(),
    amountMinor: integer("amount_minor").notNull(),
    movementType: text("movement_type").notNull().default("unknown"),
    spendingContext: text("spending_context").notNull().default("routine"),
    forecastBaselineEligible: integer("forecast_baseline_eligible", {
      mode: "boolean",
    })
      .notNull()
      .default(true),
    counterpartyAccountId: text("counterparty_account_id").references(
      () => accounts.id,
      { onDelete: "set null" },
    ),
    externalReference: text("external_reference"),
    categoryProvenance: text("category_provenance")
      .notNull()
      .default("fixture"),
    categoryConfidence: integer("category_confidence").notNull().default(100),
    notes: text("notes"),
    ...timestamps,
  },
  (table) => [
    index("transactions_date_idx").on(table.bookedDate),
    index("transactions_category_idx").on(table.categoryId),
  ],
);

export const categoryRules = sqliteTable(
  "category_rules",
  {
    id: text("id").primaryKey(),
    matchType: text("match_type").notNull(),
    pattern: text("pattern").notNull(),
    categoryId: text("category_id")
      .notNull()
      .references(() => categories.id, { onDelete: "cascade" }),
    priority: integer("priority").notNull().default(100),
    source: text("source").notNull().default("fixture"),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("category_rules_match_unique").on(
      table.matchType,
      table.pattern,
    ),
  ],
);

export const debts = sqliteTable("debts", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  type: text("type").notNull(),
  balanceMinor: integer("balance_minor").notNull(),
  aprBasisPoints: integer("apr_basis_points").notNull(),
  minimumPaymentMinor: integer("minimum_payment_minor").notNull(),
  promotionalAprBasisPoints: integer("promotional_apr_basis_points"),
  promotionalEndDate: text("promotional_end_date"),
  postPromotionalAprBasisPoints: integer("post_promotional_apr_basis_points"),
  contractualPaymentDay: integer("contractual_payment_day"),
  notes: text("notes"),
  ...timestamps,
});

export const debtSnapshots = sqliteTable(
  "debt_snapshots",
  {
    id: text("id").primaryKey(),
    debtId: text("debt_id")
      .notNull()
      .references(() => debts.id, { onDelete: "cascade" }),
    snapshotDate: text("snapshot_date").notNull(),
    balanceMinor: integer("balance_minor").notNull(),
    paymentsMinor: integer("payments_minor").notNull().default(0),
    interestChargedMinor: integer("interest_charged_minor")
      .notNull()
      .default(0),
    newBorrowingMinor: integer("new_borrowing_minor").notNull().default(0),
    source: text("source").notNull().default("fixture"),
    ...timestamps,
  },
  (table) => [index("debt_snapshots_date_idx").on(table.snapshotDate)],
);

export const income = sqliteTable("income", {
  id: text("id").primaryKey(),
  accountId: text("account_id").references(() => accounts.id, {
    onDelete: "set null",
  }),
  source: text("source").notNull(),
  kind: text("kind").notNull().default("other"),
  amountMinor: integer("amount_minor").notNull(),
  expectedDate: text("expected_date"),
  frequency: text("frequency"),
  certainty: text("certainty").notNull(),
  ...timestamps,
});

export const recurringCommitments = sqliteTable("recurring_commitments", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  categoryId: text("category_id").references(() => categories.id, {
    onDelete: "set null",
  }),
  amountMinor: integer("amount_minor").notNull(),
  frequency: text("frequency").notNull(),
  nextDueDate: text("next_due_date"),
  certainty: text("certainty").notNull(),
  isPaid: integer("is_paid", { mode: "boolean" }).notNull().default(false),
  isEssential: integer("is_essential", { mode: "boolean" })
    .notNull()
    .default(true),
  notes: text("notes"),
  ...timestamps,
});

export const upcomingExpenses = sqliteTable(
  "upcoming_expenses",
  {
    id: text("id").primaryKey(),
    dueDate: text("due_date").notNull(),
    event: text("event").notNull(),
    description: text("description").notNull(),
    amountMinor: integer("amount_minor").notNull(),
    certainty: text("certainty").notNull(),
    isEssential: integer("is_essential", { mode: "boolean" })
      .notNull()
      .default(false),
    notes: text("notes"),
    ...timestamps,
  },
  (table) => [index("upcoming_expenses_date_idx").on(table.dueDate)],
);

export const sinkingFunds = sqliteTable("sinking_funds", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  targetMinor: integer("target_minor").notNull(),
  savedMinor: integer("saved_minor").notNull().default(0),
  monthlyContributionMinor: integer("monthly_contribution_minor").notNull(),
  targetDate: text("target_date"),
  certainty: text("certainty").notNull().default("confirmed"),
  ...timestamps,
});

export const monthlyPlans = sqliteTable(
  "monthly_plans",
  {
    id: text("id").primaryKey(),
    month: text("month").notNull(),
    asOfDate: text("as_of_date").notNull(),
    openingCashMinor: integer("opening_cash_minor").notNull(),
    expectedIncomeMinor: integer("expected_income_minor").notNull(),
    committedCostsMinor: integer("committed_costs_minor").notNull(),
    debtMinimumsMinor: integer("debt_minimums_minor").notNull(),
    protectedBufferMinor: integer("protected_buffer_minor").notNull(),
    safeToSpendMinor: integer("safe_to_spend_minor").notNull(),
    status: text("status").notNull(),
    assumptionsJson: text("assumptions_json").notNull(),
    ...timestamps,
  },
  (table) => [uniqueIndex("monthly_plans_month_unique").on(table.month)],
);

export const aiReviews = sqliteTable("ai_reviews", {
  id: text("id").primaryKey(),
  monthlyPlanId: text("monthly_plan_id").references(() => monthlyPlans.id, {
    onDelete: "set null",
  }),
  model: text("model").notNull(),
  status: text("status").notNull(),
  summary: text("summary"),
  actionsJson: text("actions_json").notNull().default("[]"),
  warning: text("warning"),
  sourceFactsJson: text("source_facts_json").notNull().default("{}"),
  createdAt: text("created_at").notNull(),
});

export const syncConnections = sqliteTable("sync_connections", {
  id: text("id").primaryKey(),
  provider: text("provider").notNull(),
  mode: text("mode").notNull(),
  status: text("status").notNull(),
  lastSyncedAt: text("last_synced_at"),
  errorMessage: text("error_message"),
  metadataJson: text("metadata_json").notNull().default("{}"),
  ...timestamps,
});

export const narrativeCache = sqliteTable("narrative_cache", {
  key: text("key").primaryKey(),
  factPackageHash: text("fact_package_hash").notNull(),
  narrativeType: text("narrative_type").notNull(),
  scenarioHash: text("scenario_hash").notNull(),
  model: text("model").notNull(),
  promptVersion: text("prompt_version").notNull(),
  schemaVersion: text("schema_version").notNull(),
  responseJson: text("response_json").notNull(),
  generatedAt: text("generated_at").notNull(),
});
