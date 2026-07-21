import "server-only";
import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";
import type { CfoNarrativeFactPackage } from "@/src/domain/cfo/narrative-facts";
import { factsForView } from "@/src/domain/cfo/narrative-facts";
import {
  narrativeResponseSchemaForType,
  type NarrativeResponse,
  type NarrativeType,
} from "@/src/domain/cfo/narrative-output";
import { narrativePrompt } from "./prompt";

export const DEFAULT_OPENAI_MODEL = "gpt-5.6-sol";

export function configuredOpenAiModel() {
  return process.env.OPENAI_MODEL?.trim() || DEFAULT_OPENAI_MODEL;
}

export function hasOpenAiKey() {
  return Boolean(process.env.OPENAI_API_KEY?.trim());
}

function formatModelNumber(
  key: string,
  value: number,
  options: { preservePennies: boolean },
) {
  const normalisedKey = key.toLowerCase();
  if (normalisedKey.includes("minor")) {
    return new Intl.NumberFormat("en-GB", {
      style: "currency",
      currency: "GBP",
      minimumFractionDigits: options.preservePennies ? 2 : 0,
      maximumFractionDigits: options.preservePennies ? 2 : 0,
    }).format(value / 100);
  }
  if (normalisedKey.includes("basispoints")) {
    return `${new Intl.NumberFormat("en-GB", {
      maximumFractionDigits: 2,
    }).format(value / 100)}%`;
  }
  return value;
}

function preserveInitialCase(match: string, replacement: string) {
  return /^\p{Lu}/u.test(match)
    ? `${replacement[0].toUpperCase()}${replacement.slice(1)}`
    : replacement;
}

function sanitiseOverviewModelWording(value: string) {
  return value
    .replace(/\brecorded actions\b/giu, (match) =>
      preserveInitialCase(match, "current actions"),
    )
    .replace(/\brecorded promotional-rate expiries\b/giu, (match) =>
      preserveInitialCase(match, "known promotional-rate expiries"),
    )
    .replace(/\brecorded\b/giu, (match) => preserveInitialCase(match, "known"));
}

export function projectFactsForModel(
  packageValue: CfoNarrativeFactPackage,
  view: "overviewFacts" | "actionPlanFacts",
) {
  const sanitiseWording =
    view === "overviewFacts"
      ? sanitiseOverviewModelWording
      : (value: string) => value;
  return factsForView(packageValue, view).map((fact) => {
    const preservePennies =
      fact.type === "subscription" ||
      (fact.type === "selected_recurring_change" &&
        fact.values.kind === "subscription");
    return {
      ...fact,
      label: sanitiseWording(fact.label),
      values: Object.fromEntries(
        Object.entries(fact.values).map(([key, raw]) => [
          key,
          Array.isArray(raw)
            ? raw.map((value) =>
                typeof value === "number"
                  ? formatModelNumber(key, value, { preservePennies })
                  : typeof value === "string"
                    ? sanitiseWording(value)
                    : value,
              )
            : typeof raw === "number"
              ? formatModelNumber(key, raw, { preservePennies })
              : typeof raw === "string"
                ? sanitiseWording(raw)
                : raw,
        ]),
      ),
    };
  });
}

export class NarrativeGenerationError extends Error {
  constructor(
    readonly category: string,
    readonly apiCalls: number,
    readonly retryOccurred: boolean,
  ) {
    super("The live narrative request failed.");
    this.name = "NarrativeGenerationError";
  }
}

export async function generateNarrative(input: {
  type: NarrativeType;
  packageValue: CfoNarrativeFactPackage;
}): Promise<{
  response: NarrativeResponse;
  model: string;
  apiCalls: number;
  retryOccurred: boolean;
  usage: {
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
  } | null;
}> {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) throw new Error("OPENAI_API_KEY is not configured.");
  const model = configuredOpenAiModel();
  const view = input.type === "cfo_brief" ? "overviewFacts" : "actionPlanFacts";
  const facts = projectFactsForModel(input.packageValue, view);
  const evidenceIds = new Set(facts.flatMap((fact) => fact.evidenceIds));
  const payload = {
    metadata: {
      asOfDate: input.packageValue.metadata.asOfDate,
      householdName: input.packageValue.metadata.householdName,
      adults: input.packageValue.metadata.adults,
      children: input.packageValue.metadata.children,
      comparisonMonths: input.packageValue.metadata.comparisonMonths,
      factPackageHash: input.packageValue.metadata.packageHash,
      narrativeType: input.type,
    },
    facts,
    deterministicActionIds: (input.type === "action_plan"
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
    ).map((action) => action.values.actionId),
    evidenceIndex: Object.fromEntries(
      [...evidenceIds].map((id) => [
        id,
        input.packageValue.evidenceIndex[id] ?? "Calculated evidence",
      ]),
    ),
    dataQualityWarnings: input.packageValue.dataQualityWarnings,
  };
  let apiCalls = 0;
  const countedFetch: typeof fetch = async (request, init) => {
    apiCalls += 1;
    return fetch(request, init);
  };
  const client = new OpenAI({
    apiKey,
    timeout: 60_000,
    maxRetries: 1,
    fetch: countedFetch,
  });
  let result;
  try {
    result = await client.responses.parse({
      model,
      store: false,
      reasoning: { effort: "low" },
      instructions: narrativePrompt(input.type),
      input: JSON.stringify(payload),
      text: {
        format: zodTextFormat(
          narrativeResponseSchemaForType(input.type),
          `personal_cfo_${input.type}`,
        ),
      },
    });
  } catch (error) {
    const details: {
      name?: string;
      code?: string;
      status?: number;
      constructor?: { name?: string };
    } = typeof error === "object" && error !== null ? error : {};
    throw new NarrativeGenerationError(
      details.code ??
        (details.status ? `http_${details.status}` : undefined) ??
        details.constructor?.name ??
        details.name ??
        "api_error",
      apiCalls,
      apiCalls > 1,
    );
  }
  if (!result.output_parsed) {
    throw new Error("GPT-5.6 returned no parsed narrative.");
  }
  return {
    response: result.output_parsed,
    model,
    apiCalls,
    retryOccurred: apiCalls > 1,
    usage: result.usage
      ? {
          inputTokens: result.usage.input_tokens,
          outputTokens: result.usage.output_tokens,
          totalTokens: result.usage.total_tokens,
        }
      : null,
  };
}
