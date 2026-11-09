import type { SuggestionContext } from "../suggestion-model.js";

const DESIGN_MD_CHARS = 2000;

const TEXT_CHARS = 1200;

const PROMPT_CHARS = 600;

const FINDING_LIMIT = 5;

const SUGGESTION_SYSTEM =
  "You suggest the next 3 prompts a designer sends after an AI design run. Reply with exactly 3 lines in this form: kind: prompt. The kind is one of refine, state, responsive, review. Use each kind at most once. Each prompt is 80 characters or less, in the imperative, plain and specific to the facts. Use review only when review findings are given. No markdown, no numbering, no preamble.";

const toFindingLines = (context: SuggestionContext): string | null => {
  if (context.findings.length === 0) {
    return null;
  }

  const lines = context.findings
    .slice(0, FINDING_LIMIT)
    .map((finding) => `- ${finding.severity}: ${finding.message}`);

  return `Open review findings:\n${lines.join("\n")}`;
};

const toFileLine = (context: SuggestionContext): string | null => {
  if (context.files.length === 0) {
    return null;
  }

  return `Changed files: ${context.files.join(", ")}`;
};

const toRouteLine = (context: SuggestionContext): string | null => {
  if (context.route === null) {
    return null;
  }

  return `Frame route: ${context.route}`;
};

const toDesignLine = (context: SuggestionContext): string | null => {
  if (context.designMd === null) {
    return null;
  }

  return `DESIGN.md:\n${context.designMd.slice(0, DESIGN_MD_CHARS)}`;
};

const toSuggestionPrompt = (context: SuggestionContext): string =>
  [
    `Run prompt: ${context.prompt.slice(0, PROMPT_CHARS)}`,
    `Final message: ${context.finalText.slice(0, TEXT_CHARS)}`,
    toFileLine(context),
    toRouteLine(context),
    toFindingLines(context),
    toDesignLine(context),
  ]
    .filter((line): line is string => line !== null)
    .join("\n\n");

export { SUGGESTION_SYSTEM, toSuggestionPrompt };
