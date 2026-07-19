"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type {
  NarrativeResponse,
  NarrativeType,
} from "@/src/domain/cfo/narrative-output";

type NarrativeApiResponse = {
  status: "gpt" | "cached_gpt" | "fallback";
  label: string;
  narrative: NarrativeResponse;
  generatedAt: string | null;
  model: string;
  warning: string | null;
};

export function CfoBrief({
  type,
  initialNarrative,
}: {
  type: NarrativeType;
  initialNarrative: NarrativeResponse;
}) {
  const [response, setResponse] = useState<NarrativeApiResponse>({
    status: "fallback",
    label:
      type === "action_plan"
        ? "Basic coaching — AI interpretation is unavailable."
        : "Basic brief — AI interpretation is unavailable.",
    narrative: initialNarrative,
    generatedAt: null,
    model: "gpt-5.6-sol",
    warning: null,
  });
  const [scenario, setScenario] = useState<{
    amountMinor: number;
    date: string;
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const loaded = useRef(false);

  const loadNarrative = useCallback(
    async (nextScenario: typeof scenario, refresh = false) => {
      setLoading(true);
      try {
        const apiResponse = await fetch("/api/cfo-brief", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type,
            refresh,
            ...(nextScenario ?? {}),
          }),
        });
        if (!apiResponse.ok) throw new Error("Narrative request failed");
        setResponse((await apiResponse.json()) as NarrativeApiResponse);
      } catch {
        setResponse((current) => ({
          ...current,
          status: "fallback",
          label:
            type === "action_plan"
              ? "Basic coaching — AI interpretation is unavailable."
              : "Basic brief — AI interpretation is unavailable.",
          warning:
            "The interpretation service could not be reached. The basic brief remains available.",
        }));
      } finally {
        setLoading(false);
      }
    },
    [type],
  );

  useEffect(() => {
    if (loaded.current) return;
    loaded.current = true;
    void loadNarrative(null);
  }, [loadNarrative]);

  useEffect(() => {
    if (type !== "cfo_brief") return;
    const onScenario = (event: Event) => {
      const detail = (
        event as CustomEvent<{ amountMinor: number; date: string }>
      ).detail;
      setScenario(detail);
      void loadNarrative(detail);
    };
    window.addEventListener("personal-cfo:scenario", onScenario);
    return () =>
      window.removeEventListener("personal-cfo:scenario", onScenario);
  }, [loadNarrative, type]);

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--line)] px-5 py-3">
        <div>
          <p className="text-xs font-semibold text-[var(--muted)]">
            {response.label}
          </p>
          <p className="mt-1 text-[10px] text-[var(--faint)]">
            {response.generatedAt
              ? `Generated ${new Date(response.generatedAt).toLocaleString("en-GB")} · ${response.model}`
              : "The financial cards above remain the source of truth."}
          </p>
        </div>
        <button
          type="button"
          onClick={() => void loadNarrative(scenario, true)}
          disabled={loading}
          className="rounded-lg bg-[var(--ink)] px-3 py-2 text-xs font-semibold text-white disabled:opacity-50"
        >
          {loading
            ? "Preparing…"
            : type === "action_plan"
              ? "Refresh coaching"
              : "Refresh CFO Brief"}
        </button>
      </div>
      {response.warning ? (
        <p className="bg-[var(--panel)] px-5 py-3 text-xs text-[var(--muted)]">
          {response.warning}
        </p>
      ) : null}
      <div className="p-5 sm:p-6">
        <h3 className="text-xl font-semibold tracking-[-0.025em] sm:text-2xl">
          {response.narrative.headline.text}
        </h3>
        <div className="mt-4 max-w-3xl space-y-3 text-sm leading-6 text-[var(--muted)]">
          {response.narrative.summaryParagraphs.map((paragraph, index) => (
            <p key={index}>{paragraph.text}</p>
          ))}
        </div>
        {response.narrative.actions.length ? (
          <div className="mt-6 grid gap-3 md:grid-cols-2">
            {response.narrative.actions.map((action) => (
              <article
                key={`${action.actionId ?? "question"}:${action.title}`}
                className="rounded-xl bg-[var(--sage-soft)] p-4"
              >
                <p className="text-sm font-semibold">{action.title}</p>
                <p className="mt-2 text-xs leading-5 text-[var(--muted)]">
                  {action.explanation}
                </p>
              </article>
            ))}
          </div>
        ) : null}
        {response.narrative.questionsToConsider.length ? (
          <div className="mt-6 border-t border-[var(--line)] pt-5">
            <p className="text-xs font-semibold uppercase tracking-[0.1em] text-[var(--faint)]">
              Questions worth considering
            </p>
            <ul className="mt-3 space-y-2 text-sm leading-6">
              {response.narrative.questionsToConsider.map((question, index) => (
                <li key={index}>• {question.text}</li>
              ))}
            </ul>
          </div>
        ) : null}
        <div className="mt-6 rounded-xl bg-[var(--canvas)] p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.1em] text-[var(--faint)]">
            Next milestone
          </p>
          <p className="mt-2 text-sm leading-6">
            {response.narrative.nextMilestone.text}
          </p>
        </div>
        {response.narrative.caution ? (
          <p className="mt-4 text-xs leading-5 text-[var(--muted)]">
            {response.narrative.caution.text}
          </p>
        ) : null}
      </div>
    </div>
  );
}
