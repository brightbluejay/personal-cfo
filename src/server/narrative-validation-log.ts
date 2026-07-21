import "server-only";
import type {
  NarrativeType,
  NarrativeValidationError,
} from "@/src/domain/cfo/narrative-output";

export function sanitisedNarrativeValidationLog(input: {
  route: string;
  narrativeType: NarrativeType;
  error: NarrativeValidationError;
}) {
  return {
    event: "narrative_validation_failed",
    route: input.route,
    narrativeType: input.narrativeType,
    issues: input.error.issues.map((issue) => ({
      field: issue.field,
      validationStage: issue.validationStage,
      validationCategory: issue.classification,
    })),
  };
}
