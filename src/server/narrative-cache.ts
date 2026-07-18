import "server-only";
import { createHash } from "node:crypto";
import { eq } from "drizzle-orm";
import type { CfoNarrativeFactPackage } from "@/src/domain/cfo/narrative-facts";
import {
  NARRATIVE_PROMPT_VERSION,
  NARRATIVE_SCHEMA_VERSION,
  type NarrativeResponse,
  type NarrativeType,
  validateNarrativeResponse,
} from "@/src/domain/cfo/narrative-output";
import { openDatabase } from "@/src/db/connection";
import * as schema from "@/src/db/schema";

export function narrativeCacheKey(input: {
  factPackageHash: string;
  narrativeType: NarrativeType;
  scenarioHash?: string;
  model: string;
  promptVersion?: string;
  schemaVersion?: string;
}) {
  const scenarioHash = input.scenarioHash ?? "none";
  const promptVersion = input.promptVersion ?? NARRATIVE_PROMPT_VERSION;
  const schemaVersion = input.schemaVersion ?? NARRATIVE_SCHEMA_VERSION;
  return createHash("sha256")
    .update(
      JSON.stringify({
        factPackageHash: input.factPackageHash,
        narrativeType: input.narrativeType,
        scenarioHash,
        model: input.model,
        promptVersion,
        schemaVersion,
      }),
    )
    .digest("hex");
}

export function readCachedNarrative(input: {
  packageValue: CfoNarrativeFactPackage;
  narrativeType: NarrativeType;
  scenarioHash?: string;
  model: string;
}) {
  const key = narrativeCacheKey({
    factPackageHash: input.packageValue.metadata.packageHash,
    narrativeType: input.narrativeType,
    scenarioHash: input.scenarioHash,
    model: input.model,
  });
  const { db, sqlite } = openDatabase();
  try {
    const row = db
      .select()
      .from(schema.narrativeCache)
      .where(eq(schema.narrativeCache.key, key))
      .get();
    if (!row) return null;
    try {
      const response = validateNarrativeResponse({
        packageValue: input.packageValue,
        type: input.narrativeType,
        response: JSON.parse(row.responseJson),
      });
      return { response, generatedAt: row.generatedAt, model: row.model, key };
    } catch {
      db.delete(schema.narrativeCache)
        .where(eq(schema.narrativeCache.key, key))
        .run();
      return null;
    }
  } finally {
    sqlite.close();
  }
}

export function writeCachedNarrative(input: {
  packageValue: CfoNarrativeFactPackage;
  narrativeType: NarrativeType;
  scenarioHash?: string;
  model: string;
  response: NarrativeResponse;
}) {
  const validated = validateNarrativeResponse({
    packageValue: input.packageValue,
    type: input.narrativeType,
    response: input.response,
  });
  const scenarioHash = input.scenarioHash ?? "none";
  const key = narrativeCacheKey({
    factPackageHash: input.packageValue.metadata.packageHash,
    narrativeType: input.narrativeType,
    scenarioHash,
    model: input.model,
  });
  const generatedAt = new Date().toISOString();
  const { db, sqlite } = openDatabase();
  try {
    db.insert(schema.narrativeCache)
      .values({
        key,
        factPackageHash: input.packageValue.metadata.packageHash,
        narrativeType: input.narrativeType,
        scenarioHash,
        model: input.model,
        promptVersion: NARRATIVE_PROMPT_VERSION,
        schemaVersion: NARRATIVE_SCHEMA_VERSION,
        responseJson: JSON.stringify(validated),
        generatedAt,
      })
      .onConflictDoUpdate({
        target: schema.narrativeCache.key,
        set: { responseJson: JSON.stringify(validated), generatedAt },
      })
      .run();
    return { key, generatedAt };
  } finally {
    sqlite.close();
  }
}
