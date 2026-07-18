import { asc, desc, eq } from "drizzle-orm";
import { openDatabase } from "./connection";
import * as schema from "./schema";

export function getDashboardData() {
  const { db, sqlite } = openDatabase();
  try {
    const accountRows = db.select().from(schema.accounts).all();
    const transactionRows = db
      .select({
        id: schema.transactions.id,
        bookedDate: schema.transactions.bookedDate,
        description: schema.transactions.description,
        amountMinor: schema.transactions.amountMinor,
        movementType: schema.transactions.movementType,
        categoryName: schema.categories.name,
        categoryProvenance: schema.transactions.categoryProvenance,
        categoryConfidence: schema.transactions.categoryConfidence,
      })
      .from(schema.transactions)
      .leftJoin(
        schema.categories,
        eq(schema.transactions.categoryId, schema.categories.id),
      )
      .orderBy(desc(schema.transactions.bookedDate))
      .all();
    const debtRows = db
      .select()
      .from(schema.debts)
      .orderBy(desc(schema.debts.aprBasisPoints))
      .all();
    const incomeRows = db
      .select()
      .from(schema.income)
      .orderBy(asc(schema.income.expectedDate))
      .all();
    const commitmentRows = db
      .select()
      .from(schema.recurringCommitments)
      .orderBy(asc(schema.recurringCommitments.nextDueDate))
      .all();
    const upcomingRows = db
      .select()
      .from(schema.upcomingExpenses)
      .orderBy(asc(schema.upcomingExpenses.dueDate))
      .all();
    const sinkingRows = db
      .select()
      .from(schema.sinkingFunds)
      .orderBy(asc(schema.sinkingFunds.targetDate))
      .all();
    const plan = db
      .select()
      .from(schema.monthlyPlans)
      .orderBy(desc(schema.monthlyPlans.month))
      .get();

    const spending = new Map<string, number>();
    for (const transaction of transactionRows) {
      if (
        transaction.amountMinor >= 0 ||
        transaction.movementType !== "expense"
      )
        continue;
      const category = transaction.categoryName ?? "Uncategorised";
      spending.set(
        category,
        (spending.get(category) ?? 0) + Math.abs(transaction.amountMinor),
      );
    }

    return {
      accounts: accountRows,
      transactions: transactionRows,
      debts: debtRows,
      income: incomeRows,
      commitments: commitmentRows,
      upcoming: upcomingRows,
      sinkingFunds: sinkingRows,
      plan,
      spendingByCategory: [...spending.entries()]
        .map(([category, amountMinor]) => ({ category, amountMinor }))
        .sort((a, b) => b.amountMinor - a.amountMinor),
      totals: {
        cashMinor: accountRows.reduce(
          (sum, account) => sum + account.balanceMinor,
          0,
        ),
        debtMinor: debtRows.reduce((sum, debt) => sum + debt.balanceMinor, 0),
        debtMinimumMinor: debtRows.reduce(
          (sum, debt) => sum + debt.minimumPaymentMinor,
          0,
        ),
        confirmedIncomeMinor: incomeRows
          .filter((item) => item.certainty === "confirmed")
          .reduce((sum, item) => sum + item.amountMinor, 0),
        unpaidCommitmentsMinor: commitmentRows
          .filter((item) => !item.isPaid && item.certainty === "confirmed")
          .reduce((sum, item) => sum + item.amountMinor, 0),
      },
    };
  } finally {
    sqlite.close();
  }
}
