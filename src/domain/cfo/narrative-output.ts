import { z } from "zod";
import type { CfoNarrativeFactPackage, NarrativeFact } from "./narrative-facts";
import { factsForView } from "./narrative-facts";

export const NARRATIVE_PROMPT_VERSION = "kitchen-table-v7";
export const NARRATIVE_SCHEMA_VERSION = "cfo-narrative-v7";

const bannedNarrativePhrases = [
  "cashflow",
  "cash-flow",
  "classified as",
  "deterministic",
  "recorded",
  "pressure driver",
  "baseline signal",
  "fact package",
  "recovery candidate",
  "financial position is classified",
  "according to the data provided",
  "fact id",
  "evidence id",
  "response schema",
  "system prompt",
  "database",
  "backlog",
  "one-off backlog",
  "provision",
  "funded provision",
  "recurring flow",
  "recurring gap",
  "funded",
  "allocation",
  "normalised",
  "stock",
  "recovery stock",
  "coverage",
  "coverage percentage",
  "counted once",
  "structurally balanced",
  "monthly reduction capacity",
  "plan status",
  "selected candidate",
  "deterministic action",
  "mate",
  "pal",
  "great job",
  "you've got this",
  "you’ve got this",
];

const monthNames =
  "January|February|March|April|May|June|July|August|September|October|November|December";
const quantifiedClaimPattern = new RegExp(
  [
    "-?£\\s?\\d[\\d,]*(?:\\.\\d{1,2})?",
    "\\b\\d+(?:\\.\\d+)?%",
    `\\b\\d{1,2}(?:st|nd|rd|th)?\\s+(?:${monthNames})(?:\\s+\\d{4})?`,
    `\\b(?:${monthNames})\\s+\\d{1,2}(?:st|nd|rd|th)?(?:,?\\s+\\d{4})?`,
    "\\b\\d{4}-\\d{2}-\\d{2}\\b",
    "\\b\\d{1,2}(?:st|nd|rd|th)\\b",
    "\\b\\d+(?:\\.\\d+)?\\b",
  ].join("|"),
  "gi",
);

export const narrativeTypeSchema = z.enum(["cfo_brief", "action_plan"]);
export type NarrativeType = z.infer<typeof narrativeTypeSchema>;

const referencedTextSchema = z
  .object({
    text: z.string().min(1).max(700),
    factIds: z.array(z.string().min(1)).min(1).max(10),
  })
  .strict();

const narrativeActionSchema = z
  .object({
    title: z.string().min(1).max(120),
    explanation: z.string().min(1).max(500),
    factIds: z.array(z.string().min(1)).min(1).max(10),
    actionId: z.string().min(1).nullable(),
  })
  .strict();

function buildNarrativeResponseSchema(maxActions: number) {
  return z
    .object({
      headline: referencedTextSchema,
      summaryParagraphs: z.array(referencedTextSchema).min(1).max(3),
      connectingObservation: referencedTextSchema,
      actions: z.array(narrativeActionSchema).max(maxActions),
      questionsToConsider: z.array(referencedTextSchema).max(3),
      nextMilestone: referencedTextSchema,
      caution: referencedTextSchema.nullable(),
    })
    .strict();
}

export const cfoBriefNarrativeResponseSchema = buildNarrativeResponseSchema(2);
export const actionPlanNarrativeResponseSchema =
  buildNarrativeResponseSchema(6);
export const narrativeResponseSchema = cfoBriefNarrativeResponseSchema;

export function narrativeResponseSchemaForType(type: NarrativeType) {
  return type === "action_plan"
    ? actionPlanNarrativeResponseSchema
    : cfoBriefNarrativeResponseSchema;
}

export type NarrativeResponse = z.infer<
  typeof actionPlanNarrativeResponseSchema
>;

export type NarrativeValidationClassification =
  | "exact monetary mismatch"
  | "rounded monetary value not accepted"
  | "natural-language date not resolved"
  | "milestone fact missing from validator fact index"
  | "unknown fact ID"
  | "unsupported numeric claim"
  | "banned-word hit"
  | "response-schema violation"
  | "action-count violation"
  | "unknown action ID"
  | "unsupported markup"
  | "other validation defect";

export interface NarrativeBannedWordHit {
  term: string;
  snippet: string;
  rule: "internal-taxonomy" | "fake-intimacy";
  matchType: "word" | "phrase";
}

export interface NarrativeValidationIssue {
  narrativeType: NarrativeType;
  validationStage:
    | "response_schema"
    | "fact_reference"
    | "action_reference"
    | "currency_claim"
    | "percentage_claim"
    | "date_claim"
    | "numeric_claim"
    | "banned_word"
    | "visible_prose"
    | "semantic_language";
  field: string;
  claimType: string;
  referencedFactIds: string[];
  rejectedTextSnippet: string;
  extractedMonetaryValues: string[];
  extractedDates: string[];
  expectedMatchingFacts: string[];
  bannedWordHits: NarrativeBannedWordHit[];
  actionFactReferenceErrors: string[];
  rejectionReason: string;
  classification: NarrativeValidationClassification;
}

export class NarrativeValidationError extends Error {
  constructor(readonly issues: NarrativeValidationIssue[]) {
    super(
      `Narrative validation failed: ${issues.map((issue) => issue.rejectionReason).join("; ")}`,
    );
    this.name = "NarrativeValidationError";
  }
}

export type NarrativeValidationAudit =
  | { valid: true; response: NarrativeResponse; issues: [] }
  | { valid: false; response: null; issues: NarrativeValidationIssue[] };

export const narrativeResponseJsonSchema = z.toJSONSchema(
  narrativeResponseSchema,
  { target: "draft-7", unrepresentable: "throw" },
);

function money(value: number) {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
    maximumFractionDigits: 0,
  }).format(value / 100);
}

function exactMoney(value: number) {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value / 100);
}

function date(value: string) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "long",
    timeZone: "UTC",
  }).format(new Date(`${value}T00:00:00Z`));
}

function findFact(packageValue: CfoNarrativeFactPackage, id: string) {
  const all = [
    ...packageValue.financialPosition,
    ...packageValue.incomeJourney,
    ...packageValue.forecast,
    ...packageValue.spending,
    ...packageValue.categoryVariances,
    ...packageValue.unexpectedCosts,
    ...packageValue.subscriptions,
    ...packageValue.transfersAndSavings,
    ...packageValue.actions,
    ...packageValue.milestones,
    ...packageValue.debtPlan,
    ...packageValue.recoveryPlan,
    ...packageValue.purchaseScenario,
  ];
  const result = all.find((item) => item.id === id);
  if (!result) throw new Error(`Missing narrative fact: ${id}`);
  return result;
}

function amount(fact: NarrativeFact, key: string) {
  const value = fact.values[key];
  if (typeof value !== "number") throw new Error(`Missing numeric ${key}`);
  return value;
}

function valueText(fact: NarrativeFact, key: string) {
  const value = fact.values[key];
  if (typeof value !== "string") throw new Error(`Missing text ${key}`);
  return value;
}

function normaliseClaim(value: string) {
  return value
    .toLowerCase()
    .replaceAll(",", "")
    .replace(/(\d)(st|nd|rd|th)\b/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
}

const fakeIntimacyPhrases = new Set([
  "mate",
  "pal",
  "great job",
  "you've got this",
  "you’ve got this",
]);

const monthNumber = new Map(
  [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ].map((month, index) => [month.toLowerCase(), index + 1]),
);

function normalWholePoundsMinor(valueMinor: number) {
  const sign = valueMinor < 0 ? -1 : 1;
  return sign * Math.floor((Math.abs(valueMinor) + 50) / 100) * 100;
}

function formatMinor(valueMinor: number, exact: boolean) {
  const sign = valueMinor < 0 ? "-" : "";
  const absolute = Math.abs(valueMinor);
  const pounds = Math.floor(absolute / 100).toLocaleString("en-GB");
  const pennies = String(absolute % 100).padStart(2, "0");
  return exact ? `${sign}£${pounds}.${pennies}` : `${sign}£${pounds}`;
}

function parseCurrencyMinor(value: string) {
  const match = value.match(/^(-)?£\s?([\d,]+)(?:\.(\d{1,2}))?$/);
  if (!match) return null;
  const whole = Number(match[2].replaceAll(",", ""));
  const pennies = Number((match[3] ?? "").padEnd(2, "0") || "0");
  const amountMinor = whole * 100 + pennies;
  return match[1] ? -amountMinor : amountMinor;
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function sanitiseDiagnosticText(value: string) {
  return value
    .replace(/sk-[A-Za-z0-9_-]{12,}/g, "[redacted-key]")
    .replace(/\bbearer\s+(?:\[redacted-key\]|[^\s,;]+)/gi, "[redacted]")
    .replace(
      /authorization\s*[:=]\s*(?:bearer\s+)?[^\s,;]+/gi,
      "Authorization: [redacted]",
    );
}

function boundedSnippet(text: string, index = 0, length = text.length) {
  const maximumLength = 180;
  const radius = Math.floor((maximumLength - length) / 2);
  const start = Math.max(0, index - Math.max(24, radius));
  const end = Math.min(
    text.length,
    Math.max(index + length + 24, start + maximumLength),
  );
  const snippet = text.slice(start, end).replace(/\s+/g, " ").trim();
  return sanitiseDiagnosticText(
    `${start > 0 ? "…" : ""}${snippet}${end < text.length ? "…" : ""}`,
  );
}

function findBannedWordHits(text: string): NarrativeBannedWordHit[] {
  const hits: NarrativeBannedWordHit[] = [];
  for (const term of bannedNarrativePhrases) {
    const phrasePattern = term
      .split(/\s+/)
      .map((part) => escapeRegExp(part))
      .join("\\s+");
    const expression = new RegExp(
      `(?<![\\p{L}\\p{N}])${phrasePattern}(?![\\p{L}\\p{N}])`,
      "giu",
    );
    for (const match of text.matchAll(expression)) {
      hits.push({
        term,
        snippet: boundedSnippet(text, match.index ?? 0, match[0].length),
        rule: fakeIntimacyPhrases.has(term)
          ? "fake-intimacy"
          : "internal-taxonomy",
        matchType: /[\s-]/.test(term) ? "phrase" : "word",
      });
    }
  }
  return hits;
}

function monetaryFacts(facts: NarrativeFact[]) {
  return facts.flatMap((fact) =>
    Object.entries(fact.values).flatMap(([key, raw]) =>
      typeof raw === "number" && key.toLowerCase().includes("minor")
        ? [
            {
              fact,
              key,
              valueMinor: raw,
              roundedMinor: normalWholePoundsMinor(raw),
              exact: formatMinor(raw, true),
              rounded: formatMinor(normalWholePoundsMinor(raw), false),
              exactPenniesRequired:
                fact.type === "subscription" ||
                (fact.type === "selected_recurring_change" &&
                  fact.values.kind === "subscription"),
            },
          ]
        : [],
    ),
  );
}

function dateFacts(facts: NarrativeFact[]) {
  return facts.flatMap((fact) =>
    Object.entries(fact.values).flatMap(([key, raw]) => {
      const values = Array.isArray(raw) ? raw : [raw];
      return values.flatMap((value) =>
        typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)
          ? [{ fact, key, value }]
          : [],
      );
    }),
  );
}

function expectedMoneyFacts(facts: NarrativeFact[]) {
  return monetaryFacts(facts).map(
    ({ fact, key, exact, rounded }) =>
      `${fact.id}.values.${key}: exact ${exact}; rounded ${rounded}`,
  );
}

function expectedDateFacts(facts: NarrativeFact[]) {
  return dateFacts(facts).map(
    ({ fact, key, value }) => `${fact.id}.values.${key}: ${value}`,
  );
}

function parseNaturalDate(value: string) {
  const normalised = value
    .replace(/(\d)(st|nd|rd|th)\b/gi, "$1")
    .replace(",", "")
    .trim();
  const dayFirst = normalised.match(
    new RegExp(`^(\\d{1,2})\\s+(${monthNames})(?:\\s+(\\d{4}))?$`, "i"),
  );
  const monthFirst = normalised.match(
    new RegExp(`^(${monthNames})\\s+(\\d{1,2})(?:\\s+(\\d{4}))?$`, "i"),
  );
  const day = Number(dayFirst?.[1] ?? monthFirst?.[2]);
  const monthName = dayFirst?.[2] ?? monthFirst?.[1];
  const month = monthName ? monthNumber.get(monthName.toLowerCase()) : null;
  const yearText = dayFirst?.[3] ?? monthFirst?.[3];
  if (!day || !month) return null;
  const year = yearText ? Number(yearText) : null;
  if (year) {
    const parsed = new Date(Date.UTC(year, month - 1, day));
    if (
      parsed.getUTCFullYear() !== year ||
      parsed.getUTCMonth() !== month - 1 ||
      parsed.getUTCDate() !== day
    ) {
      return null;
    }
  } else if (day > new Date(Date.UTC(2024, month, 0)).getUTCDate()) {
    return null;
  }
  return { day, month, year };
}

function addNumberClaims(claims: Set<string>, key: string, value: number) {
  const lowerKey = key.toLowerCase();
  if (lowerKey.includes("minor")) {
    claims.add(normaliseClaim(formatMinor(value, true)));
    claims.add(
      normaliseClaim(formatMinor(normalWholePoundsMinor(value), false)),
    );
    return;
  }
  if (lowerKey.includes("basispoints")) {
    claims.add(normaliseClaim(`${value / 100}%`));
    claims.add(normaliseClaim(`${Math.round(value / 100)}%`));
    return;
  }
  claims.add(normaliseClaim(String(value)));
  claims.add(normaliseClaim(value.toLocaleString("en-GB")));
}

function allowedClaimsForFacts(facts: NarrativeFact[]) {
  const claims = new Set<string>();
  for (const fact of facts) {
    for (const [key, raw] of Object.entries(fact.values)) {
      const values = Array.isArray(raw) ? raw : [raw];
      for (const value of values) {
        if (typeof value === "number") addNumberClaims(claims, key, value);
      }
    }
  }
  return claims;
}

function validationIssue(input: {
  narrativeType: NarrativeType;
  validationStage: NarrativeValidationIssue["validationStage"];
  field: string;
  claimType: string;
  factIds?: string[];
  snippet?: string;
  money?: string[];
  dates?: string[];
  expected?: string[];
  banned?: NarrativeBannedWordHit[];
  referenceErrors?: string[];
  reason: string;
  classification: NarrativeValidationClassification;
}): NarrativeValidationIssue {
  return {
    narrativeType: input.narrativeType,
    validationStage: input.validationStage,
    field: input.field,
    claimType: input.claimType,
    referencedFactIds: input.factIds ?? [],
    rejectedTextSnippet: sanitiseDiagnosticText(input.snippet ?? ""),
    extractedMonetaryValues: input.money ?? [],
    extractedDates: input.dates ?? [],
    expectedMatchingFacts: input.expected ?? [],
    bannedWordHits: input.banned ?? [],
    actionFactReferenceErrors: input.referenceErrors ?? [],
    rejectionReason: input.reason,
    classification: input.classification,
  };
}

function inspectNarrativeText(input: {
  narrativeType: NarrativeType;
  field: string;
  text: string;
  factIds: string[];
  facts: NarrativeFact[];
}) {
  const issues: NarrativeValidationIssue[] = [];
  const banned = findBannedWordHits(input.text);
  for (const hit of banned) {
    issues.push(
      validationIssue({
        narrativeType: input.narrativeType,
        validationStage: "banned_word",
        field: input.field,
        claimType: "visible prose",
        factIds: input.factIds,
        snippet: hit.snippet,
        banned: [hit],
        reason: `Banned narrative wording: ${hit.term}`,
        classification: "banned-word hit",
      }),
    );
  }
  if (/<[^>]+>/.test(input.text) || /(^|\n)\s*\|.+\|/m.test(input.text)) {
    issues.push(
      validationIssue({
        narrativeType: input.narrativeType,
        validationStage: "visible_prose",
        field: input.field,
        claimType: "markup",
        factIds: input.factIds,
        snippet: boundedSnippet(input.text),
        reason: "Narrative output contains unsupported markup.",
        classification: "unsupported markup",
      }),
    );
  }
  const allowed = allowedClaimsForFacts(input.facts);
  for (const match of input.text.matchAll(quantifiedClaimPattern)) {
    const raw = match[0];
    const claim = normaliseClaim(raw);
    const index = match.index ?? 0;
    if (raw.includes("£")) {
      const parsed = parseCurrencyMinor(raw);
      if (parsed === null) continue;
      const negativeContext =
        parsed >= 0 &&
        /\b(?:overdrawn|below zero|in the red)\b/i.test(
          input.text.slice(index, index + raw.length + 48),
        );
      const semanticValue = negativeContext ? -parsed : parsed;
      const possibleFacts = monetaryFacts(input.facts);
      const exactMatches = possibleFacts.filter(
        (candidate) => candidate.valueMinor === semanticValue,
      );
      const roundedMatches = possibleFacts.filter(
        (candidate) => candidate.roundedMinor === semanticValue,
      );
      const acceptedRoundedMatches = roundedMatches.filter(
        (candidate) => !candidate.exactPenniesRequired,
      );
      if (!exactMatches.length && !acceptedRoundedMatches.length) {
        const subscriptionRoundedOnly = roundedMatches.some(
          (candidate) => candidate.exactPenniesRequired,
        );
        issues.push(
          validationIssue({
            narrativeType: input.narrativeType,
            validationStage: "currency_claim",
            field: input.field,
            claimType: negativeContext
              ? "negative currency phrasing"
              : "currency",
            factIds: input.factIds,
            snippet: boundedSnippet(input.text, index, raw.length),
            money: [raw],
            expected: expectedMoneyFacts(input.facts),
            reason: subscriptionRoundedOnly
              ? `Named subscription prices must retain exact pennies: ${raw}`
              : `Unsupported monetary narrative claim: ${raw}`,
            classification: subscriptionRoundedOnly
              ? "rounded monetary value not accepted"
              : "exact monetary mismatch",
          }),
        );
      }
      continue;
    }
    if (raw.includes("%")) {
      if (!allowed.has(claim)) {
        issues.push(
          validationIssue({
            narrativeType: input.narrativeType,
            validationStage: "percentage_claim",
            field: input.field,
            claimType: "percentage",
            factIds: input.factIds,
            snippet: boundedSnippet(input.text, index, raw.length),
            reason: `Unsupported percentage narrative claim: ${claim}`,
            classification: "unsupported numeric claim",
          }),
        );
      }
      continue;
    }
    const isIsoDate = /^\d{4}-\d{2}-\d{2}$/.test(raw);
    const looksLikeNaturalDate = new RegExp(
      `^(?:\\d{1,2}(?:st|nd|rd|th)?\\s+(?:${monthNames})|(?:${monthNames})\\s+\\d{1,2}(?:st|nd|rd|th)?)(?:,?\\s+\\d{4})?$`,
      "i",
    ).test(raw);
    const naturalDate = parseNaturalDate(raw);
    if (isIsoDate || looksLikeNaturalDate) {
      const candidates = dateFacts(input.facts);
      let resolved = false;
      if (!isIsoDate && naturalDate) {
        const matches = candidates.filter(({ value }) => {
          const [year, month, day] = value.split("-").map(Number);
          return (
            day === naturalDate.day &&
            month === naturalDate.month &&
            (naturalDate.year === null || year === naturalDate.year)
          );
        });
        resolved =
          naturalDate.year !== null
            ? matches.length > 0
            : new Set(matches.map((candidate) => candidate.value)).size === 1;
      }
      if (!resolved) {
        issues.push(
          validationIssue({
            narrativeType: input.narrativeType,
            validationStage: "date_claim",
            field: input.field,
            claimType: isIsoDate ? "ISO date in prose" : "natural date",
            factIds: input.factIds,
            snippet: boundedSnippet(input.text, index, raw.length),
            dates: [raw],
            expected: expectedDateFacts(input.facts),
            reason: isIsoDate
              ? "Narrative dates must use natural language, not ISO format."
              : `Natural-language date does not resolve unambiguously to a referenced fact: ${raw}`,
            classification: "natural-language date not resolved",
          }),
        );
      }
      continue;
    }
    if (!allowed.has(claim)) {
      issues.push(
        validationIssue({
          narrativeType: input.narrativeType,
          validationStage: "numeric_claim",
          field: input.field,
          claimType: "number",
          factIds: input.factIds,
          snippet: boundedSnippet(input.text, index, raw.length),
          reason: `Unsupported quantified narrative claim: ${claim}`,
          classification: "unsupported numeric claim",
        }),
      );
    }
  }
  for (const match of input.text.matchAll(
    /\b(?:next|this)\s+(?:Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)\b/gi,
  )) {
    issues.push(
      validationIssue({
        narrativeType: input.narrativeType,
        validationStage: "date_claim",
        field: input.field,
        claimType: "relative date",
        factIds: input.factIds,
        snippet: boundedSnippet(input.text, match.index ?? 0, match[0].length),
        dates: [match[0]],
        expected: expectedDateFacts(input.facts),
        reason: `Relative date is not supported by a referenced deterministic fact: ${match[0]}`,
        classification: "natural-language date not resolved",
      }),
    );
  }
  return issues;
}

function validateScenarioLanguage(
  packageValue: CfoNarrativeFactPackage,
  factIds: string[],
  text: string,
) {
  if (!factIds.includes("scenario.purchase")) return;
  const scenario = packageValue.purchaseScenario.find(
    (fact) => fact.id === "scenario.purchase",
  );
  const result = scenario?.values.result;
  if (result !== "safe" && result !== "risky" && result !== "unsafe") return;
  const normalised = text.toLowerCase().replaceAll("not safe", "unsafe");
  const statuses = normalised.match(/\b(?:safe|risky|unsafe)\b/g) ?? [];
  if (statuses.some((status) => status !== result)) {
    throw new Error("Narrative contradicts the deterministic scenario result.");
  }
}

function validateRecoveryLanguage(factIds: string[], text: string) {
  const normalised = text.toLowerCase();
  const hasMonthlyFlowSupport = factIds.some((factId) =>
    [
      "recovery.flow.status",
      "recovery.actions.summary",
      "recovery.milestone.finish_above_zero",
      "recovery.milestone.restore_cushion",
      "recovery.milestone.healthy_cycle",
    ].includes(factId),
  );
  if (
    factIds.includes("recovery.backlog") &&
    !hasMonthlyFlowSupport &&
    /\b(?:monthly deficit|monthly shortfall|monthly gap|per month|a month)\b/.test(
      normalised,
    )
  ) {
    throw new Error(
      "Narrative describes the one-off backlog as a monthly flow.",
    );
  }
  if (
    factIds.includes("recovery.irregular_cost_fund") &&
    /\b(?:provision|irregular-cost allocation|irregular cost allocation)\s+(?:is|becomes|counts as)\s+(?:a\s+)?(?:saving|savings)\b/.test(
      normalised,
    )
  ) {
    throw new Error("Narrative describes the funded provision as a saving.");
  }
  if (
    factIds.includes("recovery.flow.status") &&
    factIds.includes("recovery.irregular_cost_fund") &&
    /\b(?:includes|included)\b/.test(normalised)
  ) {
    throw new Error(
      "Narrative double counts the newly funded provision in the pre-plan gap.",
    );
  }
}

function validateSavingsRedirectNarrative(response: NarrativeResponse) {
  const items = [
    response.headline,
    ...response.summaryParagraphs,
    response.connectingObservation,
    ...response.actions,
    ...response.questionsToConsider,
    response.nextMilestone,
    ...(response.caution ? [response.caution] : []),
  ];
  const redirectItems = items.filter(
    (item) =>
      item.factIds.includes(
        "recovery.action.selected.redirect-recurring-savings-during-overdraft-cycle",
      ) ||
      ("actionId" in item &&
        item.actionId === "redirect-recurring-savings-during-overdraft-cycle"),
  );
  if (!redirectItems.length) return;
  const text = redirectItems
    .map((item) =>
      "text" in item ? item.text : `${item.title} ${item.explanation}`,
    )
    .join(" ")
    .toLowerCase();
  if (!/\btemporar(?:y|ily)\b/.test(text)) {
    throw new Error("The savings redirect must be described as temporary.");
  }
  if (
    /\b(?:is|becomes|will be)\s+permanent\b|\bpermanently\b/.test(text) ||
    /\b(?:new|extra)\s+income\b/.test(text) ||
    /\bsav(?:e|es|ing)\s+£\s?200(?:\.00)?\b/.test(text) ||
    /\b£\s?200(?:\.00)?\s+(?:saving|savings)\b/.test(text)
  ) {
    throw new Error(
      "The savings redirect cannot be permanent, new income, or a £200 saving.",
    );
  }
}

function optionalFact(
  packageValue: CfoNarrativeFactPackage,
  predicate: (fact: NarrativeFact) => boolean,
) {
  return [
    ...packageValue.categoryVariances,
    ...packageValue.unexpectedCosts,
    ...packageValue.subscriptions,
  ].find(predicate);
}

export function buildFallbackNarrative(
  packageValue: CfoNarrativeFactPackage,
  type: NarrativeType,
): NarrativeResponse {
  const lowest = findFact(packageValue, "forecast.lowest");
  const monthEnd = findFact(packageValue, "forecast.month_end");
  const income = findFact(packageValue, "income.next");
  const firstAction = packageValue.actions[0];
  const rising =
    packageValue.categoryVariances.find(
      (fact) =>
        fact.id === "category.fuel" && fact.values.direction === "rising",
    ) ??
    optionalFact(
      packageValue,
      (fact) =>
        fact.type === "category_variance" && fact.values.direction === "rising",
    );
  const subscriptions = packageValue.subscriptions.filter(
    (fact) => fact.type === "subscription",
  );
  const incomeType = valueText(income, "incomeType");
  const incomeLabel = incomeType === "salary" ? "salary" : "income";
  const flowOutgoings = findFact(packageValue, "recovery.flow.outgoings");
  const summary = findFact(packageValue, "recovery.actions.summary");
  const backlog = findFact(packageValue, "recovery.backlog");
  const selectedRedirect = findFact(
    packageValue,
    "recovery.action.selected.redirect-recurring-savings-during-overdraft-cycle",
  );
  const firstMilestone = findFact(
    packageValue,
    "recovery.milestone.finish_above_zero",
  );

  if (type === "action_plan") {
    const flowIncome = findFact(packageValue, "recovery.flow.income");
    const irregular = findFact(packageValue, "recovery.irregular_cost_fund");
    const selected = packageValue.recoveryPlan.filter(
      (item) => item.type === "selected_recurring_change",
    );
    return actionPlanNarrativeResponseSchema.parse({
      headline: {
        text: `If you make the five choices below, a normal month can finish about ${money(amount(summary, "balanceAfterPlanMinor"))} ahead.`,
        factIds: [summary.id],
      },
      summaryParagraphs: [
        {
          text: `A normal month has about ${money(amount(flowIncome, "normalisedMonthlyIncomeMinor"))} coming in and ${money(amount(flowOutgoings, "totalNormalisedMonthlyOutgoingsMinor"))} going out once there is money for the surprises that keep cropping up. That is about ${money(amount(flowOutgoings, "fullyFundedRecurringGapBeforePlanMinor"))} more going out than coming in.`,
          factIds: [flowIncome.id, flowOutgoings.id],
        },
        {
          text: `The plan temporarily gives the ${money(amount(summary, "redirectedExistingAllocationMinor"))} you already send to savings a more urgent job. It covers nearly all of the surprise-cost pot, so only ${money(amount(summary, "newlyFundedAllocationsMinor"))} needs new room; the other choices stop or reduce about ${money(amount(summary, "grossMonthlyReductionsMinor"))} of spending.`,
          factIds: [summary.id, selectedRedirect.id, irregular.id],
        },
        {
          text: `After the immediate July decisions, there is about ${money(amount(backlog, "remainingBacklogMinor"))} left to climb out of once. The plan gives you about ${money(amount(backlog, "monthlyReductionCapacityMinor"))} each month to repair it.`,
          factIds: [backlog.id],
        },
      ],
      connectingObservation: {
        text: "One thing jumps out: money is going to ordinary savings while the account is still dropping into overdraft and required debt payments need protecting.",
        factIds: [selectedRedirect.id, "position.health", flowOutgoings.id],
      },
      actions: selected.slice(0, 6).map((item) => {
        const kind = item.values.kind;
        return {
          title: item.label,
          explanation:
            kind === "savings_redirect"
              ? `Temporarily use the ${money(amount(item, "selectedValueMinor"))} already being saved each month for the costs that keep catching you out. This is your choice, not a permanent end to saving.`
              : kind === "subscription"
                ? `Decide whether this is still worth ${exactMoney(amount(item, "selectedValueMinor"))} each month.`
                : `Bring this down by about ${money(amount(item, "selectedMonthlyReductionMinor"))} a month while keeping the protected household floor intact.`,
          factIds: [item.id],
          actionId: valueText(item, "actionId"),
        };
      }),
      questionsToConsider: [
        {
          text: "Are the savings accessible, unrestricted and not needed for an essential purpose?",
          factIds: [selectedRedirect.id],
        },
        ...(rising
          ? [
              {
                text: `${rising.label} has risen across the three complete months. Is that the new normal, or is there a temporary reason for it?`,
                factIds: [rising.id],
              },
            ]
          : []),
        ...(subscriptions.length
          ? [
              {
                text: "Which of the confirmed subscriptions are still earning their place?",
                factIds: subscriptions.map((item) => item.id),
              },
            ]
          : []),
      ].slice(0, 3),
      nextMilestone: {
        text: `If these changes hold, the first month expected to finish back above zero is ${date(valueText(firstMilestone, "estimatedDate"))}.`,
        factIds: [firstMilestone.id],
      },
      caution: {
        text: "This route depends on the five choices holding, no new borrowing or unplanned expenses, and every required debt payment staying protected.",
        factIds: ["spending.comparison_scope", summary.id],
      },
    });
  }

  return cfoBriefNarrativeResponseSchema.parse({
    headline: {
      text: `You’re heading to ${money(Math.abs(amount(lowest, "amountMinor")))} overdrawn before your next ${incomeLabel}.`,
      factIds: [lowest.id, income.id],
    },
    summaryParagraphs: [
      {
        text: `The positive month-end figure is not the whole story: the account falls below zero first, then ${money(amount(income, "clearsNegativeMinor"))} of the next ${incomeLabel} is used getting back to zero.`,
        factIds: [lowest.id, income.id, monthEnd.id],
      },
      {
        text: `There is also a monthly problem: once you make room for the surprises that keep happening, about ${money(amount(flowOutgoings, "fullyFundedRecurringGapBeforePlanMinor"))} more goes out than comes in.`,
        factIds: [flowOutgoings.id],
      },
      {
        text: `The encouraging part is that the corrected plan can leave about ${money(amount(summary, "balanceAfterPlanMinor"))} spare in a normal month. It does that by temporarily giving the ${money(amount(summary, "redirectedExistingAllocationMinor"))} already going to savings a more urgent job, then making four other choices.`,
        factIds: [summary.id, selectedRedirect.id],
      },
    ],
    connectingObservation: {
      text: "One thing jumps out: continuing the ordinary savings transfer while repeatedly falling into overdraft makes the same money work against you.",
      factIds: [selectedRedirect.id, "position.health"],
    },
    actions: [
      ...(firstAction
        ? [
            {
              title: firstAction.label,
              explanation: valueText(firstAction, "explanation"),
              factIds: [firstAction.id],
              actionId: valueText(firstAction, "actionId"),
            },
          ]
        : []),
      {
        title: "Temporarily give ordinary savings a more urgent job",
        explanation: `Choose whether the ${money(amount(selectedRedirect, "selectedValueMinor"))} monthly transfer can cover the costs that keep catching you out until a complete healthy month is restored.`,
        factIds: [selectedRedirect.id],
        actionId: valueText(selectedRedirect, "actionId"),
      },
    ].slice(0, 2),
    questionsToConsider: [
      {
        text: "Are those savings accessible, unrestricted and safe to redirect temporarily?",
        factIds: [selectedRedirect.id],
      },
    ],
    nextMilestone: {
      text: `First get to ${date(valueText(income, "date"))} without making the overdraft deeper. If the full plan then holds, the first month expected to finish back above zero is ${date(valueText(firstMilestone, "estimatedDate"))}.`,
      factIds: [income.id, firstMilestone.id],
    },
    caution: {
      text: "Redirecting the monthly transfer is temporary and optional. Do not use restricted savings or miss a required debt payment.",
      factIds: [selectedRedirect.id, flowOutgoings.id],
    },
  });
}

function valueAtPath(value: unknown, path: PropertyKey[]) {
  let current = value;
  for (const part of path) {
    if (typeof current !== "object" || current === null) return null;
    current = (current as Record<PropertyKey, unknown>)[part];
  }
  return current;
}

function visibleNarrativeFields(response: NarrativeResponse) {
  return [
    {
      field: "headline.text",
      text: response.headline.text,
      factIds: response.headline.factIds,
    },
    ...response.summaryParagraphs.map((item, index) => ({
      field: `summaryParagraphs.${index}.text`,
      text: item.text,
      factIds: item.factIds,
    })),
    {
      field: "connectingObservation.text",
      text: response.connectingObservation.text,
      factIds: response.connectingObservation.factIds,
    },
    ...response.actions.flatMap((item, index) => [
      {
        field: `actions.${index}.title`,
        text: item.title,
        factIds: item.factIds,
      },
      {
        field: `actions.${index}.explanation`,
        text: item.explanation,
        factIds: item.factIds,
      },
    ]),
    ...response.questionsToConsider.map((item, index) => ({
      field: `questionsToConsider.${index}.text`,
      text: item.text,
      factIds: item.factIds,
    })),
    {
      field: "nextMilestone.text",
      text: response.nextMilestone.text,
      factIds: response.nextMilestone.factIds,
    },
    ...(response.caution
      ? [
          {
            field: "caution.text",
            text: response.caution.text,
            factIds: response.caution.factIds,
          },
        ]
      : []),
  ];
}

export function auditNarrativeResponse(input: {
  packageValue: CfoNarrativeFactPackage;
  type: NarrativeType;
  response: unknown;
}): NarrativeValidationAudit {
  const schemaResult = narrativeResponseSchemaForType(input.type).safeParse(
    input.response,
  );
  if (!schemaResult.success) {
    return {
      valid: false,
      response: null,
      issues: schemaResult.error.issues.map((schemaIssue) => {
        const field = schemaIssue.path.join(".") || "response";
        const rejected = valueAtPath(input.response, schemaIssue.path);
        const actionCountViolation =
          schemaIssue.path[0] === "actions" && schemaIssue.code === "too_big";
        return validationIssue({
          narrativeType: input.type,
          validationStage: "response_schema",
          field,
          claimType: actionCountViolation ? "action count" : "schema field",
          snippet:
            typeof rejected === "string"
              ? boundedSnippet(rejected)
              : "[non-text schema value]",
          reason: schemaIssue.message,
          classification: actionCountViolation
            ? "action-count violation"
            : "response-schema violation",
        });
      }),
    };
  }
  const response = schemaResult.data;
  const issues: NarrativeValidationIssue[] = [];
  const view = input.type === "cfo_brief" ? "overviewFacts" : "actionPlanFacts";
  const allFacts = factsForView(input.packageValue, view);
  const allowedFactIds = new Set(allFacts.map((fact) => fact.id));
  const configuredFactIds = new Set(input.packageValue.views[view]);
  const factsById = new Map(allFacts.map((fact) => [fact.id, fact]));
  const allowedActionIds = new Set(
    (input.type === "action_plan"
      ? input.packageValue.recoveryPlan.filter(
          (action) => action.type === "selected_recurring_change",
        )
      : [
          ...input.packageValue.actions,
          ...input.packageValue.recoveryPlan.filter(
            (action) =>
              action.type === "selected_recurring_change" &&
              action.values.kind === "savings_redirect",
          ),
        ]
    ).map((action) => valueText(action, "actionId")),
  );
  for (const field of visibleNarrativeFields(response)) {
    for (const factId of field.factIds) {
      if (!allowedFactIds.has(factId)) {
        const missingConfiguredMilestone =
          factId.startsWith("recovery.milestone.") &&
          configuredFactIds.has(factId) &&
          !factsById.has(factId);
        issues.push(
          validationIssue({
            narrativeType: input.type,
            validationStage: "fact_reference",
            field: field.field,
            claimType: "fact reference",
            factIds: field.factIds,
            snippet: boundedSnippet(field.text),
            referenceErrors: [`Unknown or disallowed fact ID: ${factId}`],
            reason: missingConfiguredMilestone
              ? `Milestone fact is configured for the view but missing from the validator fact index: ${factId}`
              : `Unknown or disallowed fact ID: ${factId}`,
            classification: missingConfiguredMilestone
              ? "milestone fact missing from validator fact index"
              : "unknown fact ID",
          }),
        );
      }
    }
    const supportingFacts = field.factIds.flatMap((factId) => {
      const fact = factsById.get(factId);
      return fact ? [fact] : [];
    });
    issues.push(
      ...inspectNarrativeText({
        narrativeType: input.type,
        field: field.field,
        text: field.text,
        factIds: field.factIds,
        facts: supportingFacts,
      }),
    );
    for (const semanticValidator of [
      () =>
        validateScenarioLanguage(input.packageValue, field.factIds, field.text),
      () => validateRecoveryLanguage(field.factIds, field.text),
    ]) {
      try {
        semanticValidator();
      } catch (error) {
        issues.push(
          validationIssue({
            narrativeType: input.type,
            validationStage: "semantic_language",
            field: field.field,
            claimType: "semantic statement",
            factIds: field.factIds,
            snippet: boundedSnippet(field.text),
            reason:
              error instanceof Error
                ? error.message
                : "Narrative semantic validation failed.",
            classification: "other validation defect",
          }),
        );
      }
    }
  }
  for (const [index, action] of response.actions.entries()) {
    if (action.actionId && !allowedActionIds.has(action.actionId)) {
      const message = `Unknown deterministic action ID: ${action.actionId}`;
      issues.push(
        validationIssue({
          narrativeType: input.type,
          validationStage: "action_reference",
          field: `actions.${index}.actionId`,
          claimType: "action reference",
          factIds: action.factIds,
          snippet: boundedSnippet(`${action.title} ${action.explanation}`),
          referenceErrors: [message],
          reason: message,
          classification: "unknown action ID",
        }),
      );
    }
  }
  try {
    validateSavingsRedirectNarrative(response);
  } catch (error) {
    issues.push(
      validationIssue({
        narrativeType: input.type,
        validationStage: "semantic_language",
        field: "savings_redirect",
        claimType: "savings redirect wording",
        factIds: response.actions.flatMap((action) => action.factIds),
        snippet: boundedSnippet(
          response.actions
            .map((action) => `${action.title} ${action.explanation}`)
            .join(" "),
        ),
        reason:
          error instanceof Error
            ? error.message
            : "Savings redirect validation failed.",
        classification: "other validation defect",
      }),
    );
  }
  return issues.length
    ? { valid: false, response: null, issues }
    : { valid: true, response, issues: [] };
}

export function validateNarrativeResponse(input: {
  packageValue: CfoNarrativeFactPackage;
  type: NarrativeType;
  response: unknown;
}) {
  const audit = auditNarrativeResponse(input);
  if (!audit.valid) throw new NarrativeValidationError(audit.issues);
  return audit.response;
}
