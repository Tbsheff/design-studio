import type { BriefContext } from "../brief-model.js";

const DESIGN_MD_CHARS = 3000;

const NAME_LIMIT = 40;

const BRIEF_SYSTEM =
  "You expand a short product prompt into a design brief. Reply with 5 to 10 plain lines. Start the lines with these labels: Goal, Screens, Content, States, Style. Use the project facts when they are given. Name only routes and components from the facts. No markdown, no preamble.";

const toNameLine = (label: string, names: readonly string[]): string | null => {
  if (names.length === 0) {
    return null;
  }

  return `${label}: ${names.slice(0, NAME_LIMIT).join(", ")}`;
};

const toDesignLine = (designMd: string | null): string | null => {
  if (designMd === null) {
    return null;
  }

  return `DESIGN.md:\n${designMd.slice(0, DESIGN_MD_CHARS)}`;
};

const toBriefPrompt = (prompt: string, context: BriefContext): string => {
  const facts = [
    toNameLine("Routes", context.routes),
    toNameLine("Kit components", context.kit),
    toDesignLine(context.designMd),
  ].filter((line): line is string => line !== null);

  return [`Prompt: ${prompt}`, ...facts].join("\n\n");
};

export { BRIEF_SYSTEM, toBriefPrompt };
