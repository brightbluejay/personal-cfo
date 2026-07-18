import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getCfoWorkspace } from "@/src/db/cfo-query";
import { withPurchaseScenario } from "@/src/domain/cfo/narrative-facts";
import {
  buildFallbackNarrative,
  NARRATIVE_PROMPT_VERSION,
  NARRATIVE_SCHEMA_VERSION,
  narrativeTypeSchema,
  validateNarrativeResponse,
} from "@/src/domain/cfo/narrative-output";
import { simulatePurchase } from "@/src/domain/cfo/scenario";
import {
  configuredOpenAiModel,
  generateNarrative,
  hasOpenAiKey,
} from "@/src/server/openai/client";
import {
  readCachedNarrative,
  writeCachedNarrative,
} from "@/src/server/narrative-cache";

const requestSchema = z
  .object({
    type: narrativeTypeSchema.default("cfo_brief"),
    refresh: z.boolean().default(false),
    amountMinor: z.number().int().positive().optional(),
    date: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .optional(),
  })
  .strict()
  .refine(
    (value) => Boolean(value.amountMinor) === Boolean(value.date),
    "A scenario requires both amountMinor and date.",
  )
  .refine(
    (value) =>
      value.type === "cfo_brief" || (!value.amountMinor && !value.date),
    "Purchase scenarios apply only to the CFO Brief.",
  );

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON request." },
      { status: 400 },
    );
  }
  const parsedRequest = requestSchema.safeParse(body);
  if (!parsedRequest.success) {
    return NextResponse.json(
      { error: "The narrative request is invalid." },
      { status: 400 },
    );
  }
  const cfo = getCfoWorkspace();
  if (!cfo) {
    return NextResponse.json(
      { error: "The fictional demo has not been seeded." },
      { status: 409 },
    );
  }
  let packageValue = cfo.narrativeFacts;
  if (parsedRequest.data.amountMinor && parsedRequest.data.date) {
    try {
      const scenario = simulatePurchase({
        beforeAction: cfo.forecast,
        afterAction: cfo.forecastAfterAction,
        amountMinor: parsedRequest.data.amountMinor,
        date: parsedRequest.data.date,
      });
      packageValue = withPurchaseScenario(packageValue, scenario);
    } catch {
      return NextResponse.json(
        { error: "The purchase scenario is outside the current forecast." },
        { status: 400 },
      );
    }
  }
  const type = parsedRequest.data.type;
  const model = configuredOpenAiModel();
  const scenarioHash = packageValue.purchaseScenario.length
    ? createHash("sha256")
        .update(JSON.stringify(packageValue.purchaseScenario))
        .digest("hex")
    : "none";
  let cached: ReturnType<typeof readCachedNarrative> = null;
  try {
    cached = readCachedNarrative({
      packageValue,
      narrativeType: type,
      scenarioHash,
      model,
    });
  } catch {
    cached = null;
  }
  const responseMeta = {
    model,
    promptVersion: NARRATIVE_PROMPT_VERSION,
    schemaVersion: NARRATIVE_SCHEMA_VERSION,
    factPackageHash: packageValue.metadata.packageHash,
  };
  const labels =
    type === "action_plan"
      ? {
          gpt: "GPT-5.6 coaching",
          cached: "Cached GPT-5.6 coaching",
          fallback: "Basic coaching — AI interpretation is unavailable.",
        }
      : {
          gpt: "GPT-5.6 brief",
          cached: "Cached GPT-5.6 brief",
          fallback: "Basic brief — AI interpretation is unavailable.",
        };
  if (cached) {
    return NextResponse.json({
      status: "cached_gpt" as const,
      label: labels.cached,
      narrative: cached.response,
      generatedAt: cached.generatedAt,
      warning: null,
      ...responseMeta,
    });
  }
  if (!hasOpenAiKey()) {
    return NextResponse.json({
      status: "fallback" as const,
      label: labels.fallback,
      narrative: buildFallbackNarrative(packageValue, type),
      generatedAt: null,
      warning: null,
      ...responseMeta,
    });
  }
  try {
    const generated = await generateNarrative({ type, packageValue });
    const narrative = validateNarrativeResponse({
      packageValue,
      type,
      response: generated.response,
    });
    const stored = writeCachedNarrative({
      packageValue,
      narrativeType: type,
      scenarioHash,
      model: generated.model,
      response: narrative,
    });
    return NextResponse.json({
      status: "gpt" as const,
      label: labels.gpt,
      narrative,
      generatedAt: stored.generatedAt,
      warning: null,
      ...responseMeta,
      model: generated.model,
    });
  } catch {
    return NextResponse.json({
      status: "fallback" as const,
      label: labels.fallback,
      narrative: buildFallbackNarrative(packageValue, type),
      generatedAt: null,
      warning: "The live interpretation was unavailable.",
      ...responseMeta,
    });
  }
}
