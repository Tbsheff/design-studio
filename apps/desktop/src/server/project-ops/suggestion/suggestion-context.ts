import type { RunSummary } from "@design-studio/contracts";

import type {
  SuggestionContext,
  SuggestionFinding,
} from "./suggestion-model.js";

const FILE_LIMIT = 8;

const toChangedFiles = (summary: RunSummary): readonly string[] => {
  const all = summary.toolCalls.flatMap((call) => {
    const single = call.diff ?? null;
    const paths = (call.diffs ?? []).map((diff) => diff.path);

    if (single === null) {
      return paths;
    }

    return [single.path, ...paths];
  });

  return [...new Set(all)].slice(0, FILE_LIMIT);
};

const toSuggestionContext = (
  summary: RunSummary,
  designMd: string | null,
  findings: readonly SuggestionFinding[]
): SuggestionContext => {
  const files = toChangedFiles(summary);
  const { finalText } = summary;
  const { prompt } = summary.request;
  const route = summary.request.canvas?.path ?? null;

  return { designMd, files, finalText, findings, prompt, route };
};

export { toSuggestionContext };
