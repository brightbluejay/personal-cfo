export const accountOwnerships = ["owned", "external", "unknown"] as const;
export type AccountOwnership = (typeof accountOwnerships)[number];

export const accountRoles = [
  "primary",
  "spending",
  "bills",
  "savings",
  "emergency_fund",
  "debt",
  "investment",
  "other",
] as const;
export type AccountRole = (typeof accountRoles)[number];

export const movementTypes = [
  "income",
  "expense",
  "internal_transfer",
  "savings_transfer",
  "debt_payment",
  "refund",
  "adjustment",
  "unknown",
] as const;
export type MovementType = (typeof movementTypes)[number];

export const spendingContexts = [
  "routine",
  "one_off_unavoidable",
  "one_off_discretionary",
] as const;
export type SpendingContext = (typeof spendingContexts)[number];

export const transferStatuses = [
  "matched",
  "suggested",
  "unmatched",
  "rejected",
] as const;
export type TransferStatus = (typeof transferStatuses)[number];

export const confidenceLevels = ["high", "medium", "low"] as const;
export type ConfidenceLevel = (typeof confidenceLevels)[number];

export const flexibilityLevels = ["protected", "limited", "flexible"] as const;
export type Flexibility = (typeof flexibilityLevels)[number];

export interface CfoAccount {
  id: string;
  name: string;
  ownership: AccountOwnership;
  role: AccountRole;
  purpose: string | null;
  balanceMinor: number;
  envelopeCategorySlugs: string[];
}

export interface CfoCategory {
  id: string;
  name: string;
  slug: string;
  isEssential: boolean;
  flexibility: Flexibility;
}

export interface CfoTransaction {
  id: string;
  accountId: string;
  categoryId: string | null;
  categorySlug: string | null;
  bookedDate: string;
  description: string;
  normalizedDescription: string;
  amountMinor: number;
  movementType: MovementType;
  spendingContext: SpendingContext;
  forecastBaselineEligible?: boolean;
  counterpartyAccountId: string | null;
  externalReference: string | null;
}

export interface TransferEvidence {
  id: string;
  transactionId: string;
  role: "outgoing" | "incoming";
}

export interface TransferGroup {
  id: string;
  movementType: Extract<
    MovementType,
    "internal_transfer" | "savings_transfer" | "debt_payment"
  >;
  status: TransferStatus;
  confidence: ConfidenceLevel;
  evidence: TransferEvidence[];
  transactionIds: string[];
  accountIds: string[];
  explanation: string;
}

export interface ReconciliationRelationship {
  fromAccountId: string;
  toAccountId: string;
  status: "confirmed" | "rejected";
}

export interface ReconciliationResult {
  groups: TransferGroup[];
  effectiveMovementTypes: Record<string, MovementType>;
  unresolvedTransactionIds: string[];
}

export function evidenceIdForTransaction(transactionId: string) {
  return `transaction:${transactionId}`;
}

export function isOwned(account: CfoAccount | undefined) {
  return account?.ownership === "owned";
}

export function isConsumption(movementType: MovementType) {
  return movementType === "expense";
}
