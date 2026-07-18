import {
  evidenceIdForTransaction,
  isOwned,
  type CfoAccount,
  type CfoTransaction,
  type MovementType,
  type ReconciliationRelationship,
  type ReconciliationResult,
  type TransferGroup,
} from "./types";

const TRANSFER_WINDOW_DAYS = 3;

function dayDistance(left: string, right: string) {
  const leftMs = Date.parse(`${left}T00:00:00Z`);
  const rightMs = Date.parse(`${right}T00:00:00Z`);
  return Math.abs(leftMs - rightMs) / 86_400_000;
}

function stableGroupId(transactionIds: string[]) {
  let hash = 2_166_136_261;
  for (const character of transactionIds.sort().join("|")) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 16_777_619);
  }
  return `transfer-${(hash >>> 0).toString(36)}`;
}

function normalizeReference(value: string | null) {
  return (value ?? "").toLowerCase().replace(/[^a-z0-9]/g, "");
}

function transferMovementType(
  left: CfoAccount,
  right: CfoAccount,
): Extract<
  MovementType,
  "internal_transfer" | "savings_transfer" | "debt_payment"
> {
  if (
    [left.role, right.role].includes("savings") ||
    [left.role, right.role].includes("emergency_fund")
  ) {
    return "savings_transfer";
  }
  if ([left.role, right.role].includes("debt")) return "debt_payment";
  return "internal_transfer";
}

function hasTransferSignal(transaction: CfoTransaction) {
  return (
    transaction.counterpartyAccountId !== null ||
    ["internal_transfer", "savings_transfer", "debt_payment"].includes(
      transaction.movementType,
    )
  );
}

interface Candidate {
  outgoing: CfoTransaction;
  incoming: CfoTransaction;
  score: number;
  recurring: boolean;
}

function subsetWithAmount(
  transactions: CfoTransaction[],
  targetMinor: number,
): CfoTransaction[] | null {
  const search = (
    index: number,
    selected: CfoTransaction[],
    total: number,
  ): CfoTransaction[] | null => {
    if (total === targetMinor && selected.length >= 2) return selected;
    if (total >= targetMinor || index >= transactions.length) return null;
    for (let cursor = index; cursor < transactions.length; cursor += 1) {
      const result = search(
        cursor + 1,
        [...selected, transactions[cursor]],
        total + Math.abs(transactions[cursor].amountMinor),
      );
      if (result) return result;
    }
    return null;
  };
  return search(0, [], 0);
}

export function reconcileTransfers(
  accounts: CfoAccount[],
  transactions: CfoTransaction[],
  relationships: ReconciliationRelationship[] = [],
): ReconciliationResult {
  const accountsById = new Map(
    accounts.map((account) => [account.id, account]),
  );
  const effectiveMovementTypes = Object.fromEntries(
    transactions.map((transaction) => [
      transaction.id,
      transaction.movementType,
    ]),
  ) as Record<string, MovementType>;
  const rejectedPairs = new Set(
    relationships
      .filter((relationship) => relationship.status === "rejected")
      .flatMap((relationship) => [
        `${relationship.fromAccountId}:${relationship.toAccountId}`,
        `${relationship.toAccountId}:${relationship.fromAccountId}`,
      ]),
  );
  const confirmedPairs = new Set(
    relationships
      .filter((relationship) => relationship.status === "confirmed")
      .flatMap((relationship) => [
        `${relationship.fromAccountId}:${relationship.toAccountId}`,
        `${relationship.toAccountId}:${relationship.fromAccountId}`,
      ]),
  );

  const recurringCounts = new Map<string, number>();
  for (const transaction of transactions) {
    if (!hasTransferSignal(transaction)) continue;
    const key = [
      transaction.accountId,
      transaction.counterpartyAccountId ?? "",
      Math.abs(transaction.amountMinor),
      normalizeReference(transaction.externalReference) ||
        transaction.normalizedDescription,
    ].join(":");
    recurringCounts.set(key, (recurringCounts.get(key) ?? 0) + 1);
  }

  const candidates: Candidate[] = [];
  for (const outgoing of transactions.filter(
    (transaction) => transaction.amountMinor < 0,
  )) {
    const outgoingAccount = accountsById.get(outgoing.accountId);
    if (!isOwned(outgoingAccount)) continue;
    for (const incoming of transactions.filter(
      (transaction) => transaction.amountMinor > 0,
    )) {
      if (Math.abs(outgoing.amountMinor) !== incoming.amountMinor) continue;
      if (outgoing.accountId === incoming.accountId) continue;
      if (
        dayDistance(outgoing.bookedDate, incoming.bookedDate) >
        TRANSFER_WINDOW_DAYS
      )
        continue;
      const incomingAccount = accountsById.get(incoming.accountId);
      if (!isOwned(incomingAccount)) continue;
      if (!outgoingAccount || !incomingAccount) continue;
      if (rejectedPairs.has(`${outgoing.accountId}:${incoming.accountId}`))
        continue;

      const directCounterparty =
        outgoing.counterpartyAccountId === incoming.accountId ||
        incoming.counterpartyAccountId === outgoing.accountId;
      const sameReference =
        normalizeReference(outgoing.externalReference) !== "" &&
        normalizeReference(outgoing.externalReference) ===
          normalizeReference(incoming.externalReference);
      const sameDescription =
        outgoing.normalizedDescription === incoming.normalizedDescription;
      const mentionsAccount =
        outgoing.normalizedDescription.includes(
          incomingAccount.name.toLowerCase(),
        ) ||
        incoming.normalizedDescription.includes(
          outgoingAccount.name.toLowerCase(),
        );
      const relationshipKey = `${outgoing.accountId}:${incoming.accountId}`;
      const recurrenceKey = [
        outgoing.accountId,
        incoming.accountId,
        incoming.amountMinor,
        normalizeReference(outgoing.externalReference) ||
          outgoing.normalizedDescription,
      ].join(":");
      const recurring = (recurringCounts.get(recurrenceKey) ?? 0) > 1;

      if (!(
        directCounterparty ||
        sameReference ||
        sameDescription ||
        mentionsAccount ||
        confirmedPairs.has(relationshipKey)
      )) {
        continue;
      }

      const distance = dayDistance(outgoing.bookedDate, incoming.bookedDate);
      let score = 30;
      score += distance === 0 ? 20 : distance <= 1 ? 15 : 8;
      if (directCounterparty) score += 25;
      if (sameReference) score += 15;
      if (sameDescription) score += 10;
      if (mentionsAccount) score += 10;
      if (recurring) score += 10;
      if (confirmedPairs.has(relationshipKey)) score += 20;
      candidates.push({ outgoing, incoming, score, recurring });
    }
  }

  const groups: TransferGroup[] = [];
  const usedTransactionIds = new Set<string>();
  for (const candidate of candidates.sort(
    (left, right) => right.score - left.score,
  )) {
    if (
      usedTransactionIds.has(candidate.outgoing.id) ||
      usedTransactionIds.has(candidate.incoming.id)
    )
      continue;
    const outgoingAccount = accountsById.get(candidate.outgoing.accountId);
    const incomingAccount = accountsById.get(candidate.incoming.accountId);
    if (!outgoingAccount || !incomingAccount) continue;
    const confidence =
      candidate.score >= 70 ? "high" : candidate.score >= 50 ? "medium" : "low";
    const status =
      confidence === "high"
        ? "matched"
        : confidence === "medium"
          ? "suggested"
          : "unmatched";
    const movementType = transferMovementType(outgoingAccount, incomingAccount);
    const transactionIds = [candidate.outgoing.id, candidate.incoming.id];
    groups.push({
      id: stableGroupId(transactionIds),
      movementType,
      status,
      confidence,
      transactionIds,
      accountIds: [outgoingAccount.id, incomingAccount.id],
      evidence: [
        {
          id: evidenceIdForTransaction(candidate.outgoing.id),
          transactionId: candidate.outgoing.id,
          role: "outgoing",
        },
        {
          id: evidenceIdForTransaction(candidate.incoming.id),
          transactionId: candidate.incoming.id,
          role: "incoming",
        },
      ],
      explanation: candidate.recurring
        ? "Equal and opposite recurring owned-account movement."
        : "Equal and opposite owned-account movement.",
    });
    if (status === "matched") {
      usedTransactionIds.add(candidate.outgoing.id);
      usedTransactionIds.add(candidate.incoming.id);
      effectiveMovementTypes[candidate.outgoing.id] = movementType;
      effectiveMovementTypes[candidate.incoming.id] = movementType;
    }
  }

  // Some automated savings sweeps consolidate multiple debit-side drips into
  // a single owned receiving entry. Match only exact, explicitly linked sums.
  for (const incoming of transactions.filter(
    (transaction) =>
      transaction.amountMinor > 0 && !usedTransactionIds.has(transaction.id),
  )) {
    const receivingAccount = accountsById.get(incoming.accountId);
    if (!isOwned(receivingAccount) || !receivingAccount) continue;
    const outgoing = transactions.filter((transaction) => {
      if (
        transaction.amountMinor >= 0 ||
        usedTransactionIds.has(transaction.id)
      )
        return false;
      if (!isOwned(accountsById.get(transaction.accountId))) return false;
      if (
        dayDistance(transaction.bookedDate, incoming.bookedDate) >
        TRANSFER_WINDOW_DAYS
      )
        return false;
      return (
        transaction.counterpartyAccountId === incoming.accountId ||
        incoming.counterpartyAccountId === transaction.accountId ||
        (normalizeReference(transaction.externalReference) !== "" &&
          normalizeReference(transaction.externalReference) ===
            normalizeReference(incoming.externalReference))
      );
    });
    const drips = subsetWithAmount(outgoing.slice(0, 8), incoming.amountMinor);
    if (!drips) continue;
    const sourceAccounts = drips
      .map((transaction) => accountsById.get(transaction.accountId))
      .filter((account): account is CfoAccount => Boolean(account));
    const movementType =
      receivingAccount.role === "savings" ||
      receivingAccount.role === "emergency_fund" ||
      sourceAccounts.some(
        (account) =>
          account.role === "savings" || account.role === "emergency_fund",
      )
        ? "savings_transfer"
        : "internal_transfer";
    const transactionIds = [
      ...drips.map((transaction) => transaction.id),
      incoming.id,
    ];
    groups.push({
      id: stableGroupId(transactionIds),
      movementType,
      status: "matched",
      confidence: "high",
      transactionIds,
      accountIds: [
        ...new Set([
          ...sourceAccounts.map((account) => account.id),
          receivingAccount.id,
        ]),
      ],
      evidence: [
        ...drips.map((transaction) => ({
          id: evidenceIdForTransaction(transaction.id),
          transactionId: transaction.id,
          role: "outgoing" as const,
        })),
        {
          id: evidenceIdForTransaction(incoming.id),
          transactionId: incoming.id,
          role: "incoming",
        },
      ],
      explanation:
        "Several exact-total owned-account movements were matched to one receiving entry.",
    });
    for (const transactionId of transactionIds) {
      usedTransactionIds.add(transactionId);
      effectiveMovementTypes[transactionId] = movementType;
    }
  }

  const groupedTransactionIds = new Set(
    groups
      .filter((group) => group.status === "matched")
      .flatMap((group) => group.transactionIds),
  );
  for (const transaction of transactions) {
    if (groupedTransactionIds.has(transaction.id)) continue;
    const sourceAccount = accountsById.get(transaction.accountId);
    const counterparty = transaction.counterpartyAccountId
      ? accountsById.get(transaction.counterpartyAccountId)
      : undefined;
    if (!isOwned(sourceAccount) || !hasTransferSignal(transaction)) continue;
    const isSavings =
      transaction.movementType === "savings_transfer" ||
      counterparty?.role === "savings" ||
      counterparty?.role === "emergency_fund";
    const probableType = isSavings ? "savings_transfer" : "internal_transfer";
    const status =
      transaction.movementType === "unknown" ? "unmatched" : "suggested";
    const confidence =
      transaction.movementType === "unknown" ? "low" : "medium";
    groups.push({
      id: stableGroupId([
        transaction.id,
        transaction.counterpartyAccountId ?? "missing",
      ]),
      movementType: probableType,
      status,
      confidence,
      transactionIds: [transaction.id],
      accountIds: [
        transaction.accountId,
        ...(transaction.counterpartyAccountId
          ? [transaction.counterpartyAccountId]
          : []),
      ],
      evidence: [
        {
          id: evidenceIdForTransaction(transaction.id),
          transactionId: transaction.id,
          role: transaction.amountMinor < 0 ? "outgoing" : "incoming",
        },
      ],
      explanation: isSavings
        ? "One-sided probable transfer to owned savings; receiving evidence is unavailable."
        : "One-sided owned-account movement remains unresolved.",
    });
  }

  return {
    groups,
    effectiveMovementTypes,
    unresolvedTransactionIds: groups
      .filter((group) => group.status !== "matched")
      .flatMap((group) => group.transactionIds),
  };
}
