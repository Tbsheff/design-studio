import type { BriefContext } from "../brief-model.js";

const GOAL_CHARS = 200;

const SCREEN_LIMIT = 6;

const KIT_LIMIT = 8;

const HEADING_LIMIT = 3;

const HASHES = /^#+/u;

const toHeadings = (designMd: string): readonly string[] =>
  designMd
    .split("\n")
    .flatMap((line) => {
      const trimmed = line.trim();

      if (!trimmed.startsWith("#")) {
        return [];
      }

      const text = trimmed.replace(HASHES, "").trim();

      if (text === "") {
        return [];
      }

      return [text];
    })
    .slice(0, HEADING_LIMIT);

const toStyleLine = (context: BriefContext): string => {
  if (context.designMd === null) {
    return "Style: Plain, clear and consistent. Pick one type scale and one accent color.";
  }

  const headings = toHeadings(context.designMd);

  if (headings.length === 0) {
    return "Style: Follow the project DESIGN.md.";
  }

  return `Style: Follow the project DESIGN.md (${headings.join("; ")}).`;
};

const toScreensLine = (context: BriefContext): string => {
  if (context.routes.length === 0) {
    return "Screens: One main screen with a header, the main content and a clear next step.";
  }

  return `Screens: ${context.routes.slice(0, SCREEN_LIMIT).join(", ")}.`;
};

const toKitLines = (context: BriefContext): readonly string[] => {
  if (context.kit.length === 0) {
    return [];
  }

  return [`Kit: Build with ${context.kit.slice(0, KIT_LIMIT).join(", ")}.`];
};

const toMockBrief = (prompt: string, context: BriefContext): string =>
  [
    `Goal: ${prompt.trim().slice(0, GOAL_CHARS)}`,
    toScreensLine(context),
    "Content: Use real, short copy. Show the main data first and the actions after it.",
    "States: Cover loading, empty, error and filled states for each list or form.",
    toStyleLine(context),
    ...toKitLines(context),
  ].join("\n");

export { toMockBrief };
