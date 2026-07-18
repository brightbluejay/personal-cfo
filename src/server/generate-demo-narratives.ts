import { getCfoWorkspace } from "@/src/db/cfo-query";
import {
  NARRATIVE_PROMPT_VERSION,
  NARRATIVE_SCHEMA_VERSION,
  NarrativeValidationError,
  type NarrativeType,
} from "@/src/domain/cfo/narrative-output";
import { writeCachedNarrative } from "./narrative-cache";
import { narrativeCacheKey } from "./narrative-cache";
import {
  configuredOpenAiModel,
  generateNarrative,
  hasOpenAiKey,
  NarrativeGenerationError,
} from "./openai/client";

function safeFailureCategory(error: unknown) {
  if (error instanceof NarrativeValidationError) {
    return "structured_validation";
  }
  if (error instanceof NarrativeGenerationError) {
    const value = error.category.toLowerCase();
    if (value.includes("timeout")) return "timeout";
    if (value.includes("rate") || value.includes("429")) return "rate_limit";
    if (value.includes("401") || value.includes("auth"))
      return "authentication";
    if (value.includes("unavailable") || value.includes("503")) {
      return "model_unavailable";
    }
    if (value.includes("tls") || value.includes("certificate")) {
      return "tls_failure";
    }
    if (value.includes("dns") || value.includes("resolve")) {
      return "dns_network_resolution";
    }
    if (value.includes("reset")) return "connection_reset";
    return "provider_transport_error";
  }
  const details =
    typeof error === "object" && error !== null
      ? (error as { name?: string; message?: string })
      : {};
  const message = details.message?.toLowerCase() ?? "";
  if (
    details.name === "ZodError" ||
    /narrative|fact id|action id|quantified|banned|pennies|natural language|structured|schema/.test(
      message,
    )
  ) {
    return "structured_validation";
  }
  return "unknown_transport_error";
}

async function main() {
  if (!hasOpenAiKey()) {
    throw new Error(
      "OPENAI_API_KEY is not configured. The deterministic fallback remains available; no model request was made.",
    );
  }

  const workspace = getCfoWorkspace();
  if (!workspace) {
    throw new Error("The demo ledger is empty. Run npm run demo:reset first.");
  }

  const types: NarrativeType[] = ["cfo_brief", "action_plan"];
  const model = configuredOpenAiModel();
  const completedNarratives: NarrativeType[] = [];
  console.log(
    JSON.stringify({
      event: "generation_start",
      model,
      promptVersion: NARRATIVE_PROMPT_VERSION,
      schemaVersion: NARRATIVE_SCHEMA_VERSION,
      factPackageHash: workspace.narrativeFacts.metadata.packageHash,
      narratives: types.map((type) => ({
        type,
        cacheKey: narrativeCacheKey({
          factPackageHash: workspace.narrativeFacts.metadata.packageHash,
          narrativeType: type,
          model,
        }),
      })),
    }),
  );
  for (const type of types) {
    const startedAt = Date.now();
    let generated: Awaited<ReturnType<typeof generateNarrative>> | null = null;
    try {
      generated = await generateNarrative({
        type,
        packageValue: workspace.narrativeFacts,
      });
      const cached = writeCachedNarrative({
        packageValue: workspace.narrativeFacts,
        narrativeType: type,
        model: generated.model,
        response: generated.response,
      });
      completedNarratives.push(type);
      console.log(
        JSON.stringify({
          event: "generation_complete",
          type,
          cachedAt: cached.generatedAt,
          model: generated.model,
          cacheKey: cached.key,
          apiCalls: generated.apiCalls,
          retryOccurred: generated.retryOccurred,
          rejectedResponses: 0,
          usage: generated.usage,
          response: generated.response,
        }),
      );
    } catch (error) {
      const transport =
        error instanceof NarrativeGenerationError ? error : null;
      const details =
        typeof error === "object" && error !== null
          ? (error as { name?: string; status?: number })
          : {};
      console.error(
        JSON.stringify({
          event: "generation_failed",
          category: safeFailureCategory(error),
          failedNarrative: type,
          completedNarratives,
          elapsedMs: Date.now() - startedAt,
          sdkErrorClass: details.name ?? "Error",
          status: details.status ?? null,
          apiCalls: generated?.apiCalls ?? transport?.apiCalls ?? null,
          retryOccurred:
            generated?.retryOccurred ?? transport?.retryOccurred ?? null,
          requestReachedApi: Boolean(
            (generated?.apiCalls ?? transport?.apiCalls ?? 0) > 0,
          ),
          validationIssues:
            error instanceof NarrativeValidationError ? error.issues : [],
        }),
      );
      process.exitCode = 1;
      return;
    }
  }

  console.log(
    `Fact package ${workspace.narrativeFacts.metadata.packageHash}; prompt ${NARRATIVE_PROMPT_VERSION}; schema ${NARRATIVE_SCHEMA_VERSION}; model ${configuredOpenAiModel()}.`,
  );
}

main().catch((error: unknown) => {
  const details =
    typeof error === "object" && error !== null
      ? (error as {
          name?: string;
          code?: string;
          status?: number;
          category?: string;
          apiCalls?: number;
          retryOccurred?: boolean;
        })
      : {};
  console.error(
    JSON.stringify({
      event: "generation_failed",
      category:
        details.category ?? details.code ?? details.name ?? "unknown_error",
      status: details.status ?? null,
      apiCalls: details.apiCalls ?? null,
      retryOccurred: details.retryOccurred ?? null,
    }),
  );
  process.exitCode = 1;
});
