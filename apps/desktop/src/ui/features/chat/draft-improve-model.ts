import type {
  DesignSystemCheckResult,
  DesignSystemCheckRule,
  RunLevel,
  RunRequest,
} from "@design-studio/contracts";

import type { RunView } from "./run-state-model.js";

const IMPROVE_PROMPT = "Improve this design system.";
const MAX_FOCUS_LENGTH = 500;
const CHECK_LINE_MARKER = "to-do line:";
const NOTE_MARKER = "to do:";

const improveRequest = (
  focus: string,
  defaultLevel: RunLevel | undefined
): RunRequest => {
  const trimmed = focus.trim();

  let level: RunLevel = "prototype";

  if (defaultLevel && defaultLevel !== "wireframe") {
    level = defaultLevel;
  }

  let prompt = IMPROVE_PROMPT;

  if (trimmed) {
    prompt = `${IMPROVE_PROMPT}\n\nFocus: ${trimmed}`;
  }

  const mode = "edit";
  const task = "design-system";

  return { level, mode, prompt, task };
};

const lastImproveRun = (runs: readonly RunView[]): RunView | null =>
  [...runs].toReversed().find((run) => run.request?.task === "design-system") ??
  null;

const improvePassed = (run: RunView | null): boolean =>
  run?.summary?.status === "completed" &&
  run.summary.designSystemCheck?.passed === true;

const runNote = (run: RunView | null): string | null => {
  const summary = run?.summary;

  if (!summary || summary.status === "running") {
    return null;
  }

  if (
    summary.status === "failed" &&
    summary.designSystemCheck &&
    !summary.designSystemCheck.passed
  ) {
    return `The last AI run stopped: the check still failed after ${summary.designSystemCheck.rounds} fix round(s).`;
  }

  if (summary.status === "failed" || summary.status === "budget_exceeded") {
    return `The last AI run did not finish: ${summary.error ?? summary.status}`;
  }

  return null;
};

const RULE_LABEL: Record<DesignSystemCheckRule, string> = {
  contrast: "Contrast",
  "design-md": "DESIGN.md sections to write",
  fonts: "Fonts",
  "kit-colors": "Kit page colors",
  tokens: "Tokens",
};

const RULE_ORDER: DesignSystemCheckRule[] = [
  "contrast",
  "tokens",
  "fonts",
  "kit-colors",
  "design-md",
];

const MORE = /^(?<count>\d+) more .+ not listed\.?$/u;

const toNoteText = (message: string): string | null => {
  const lower = message.toLowerCase();
  const line = lower.indexOf(CHECK_LINE_MARKER);

  if (line === -1) {
    return null;
  }

  const note = lower.indexOf(NOTE_MARKER, line);

  if (note === -1) {
    return null;
  }

  let text = message.slice(note + NOTE_MARKER.length).trim();

  if (text.endsWith("_")) {
    text = text.slice(0, -1).trim();
  }

  if (text.length === 0) {
    return null;
  }

  return text.replace(/\.$/u, "");
};

const problemText = (rule: DesignSystemCheckRule, message: string): string => {
  const more = MORE.exec(message)?.[1];

  if (more) {
    return `And ${more} more`;
  }

  if (rule !== "design-md") {
    return message;
  }

  const found = toNoteText(message);

  if (!found) {
    return message;
  }

  return found.charAt(0).toUpperCase() + found.slice(1);
};

interface ProblemItem {
  readonly key: string;
  readonly text: string;
}

interface ProblemGroup {
  readonly items: ProblemItem[];
  readonly rule: DesignSystemCheckRule;
}

const groupProblems = (
  problems: DesignSystemCheckResult["problems"]
): ProblemGroup[] => {
  const groups: ProblemGroup[] = [];

  for (const rule of RULE_ORDER) {
    const items: ProblemItem[] = [];

    for (const problem of problems) {
      if (problem.rule === rule) {
        const text = problemText(rule, problem.message);
        items.push({ key: `${rule}:${items.length}:${text}`, text });
      }
    }

    if (items.length > 0) {
      groups.push({ items, rule });
    }
  }

  return groups;
};

export {
  IMPROVE_PROMPT,
  MAX_FOCUS_LENGTH,
  RULE_LABEL,
  groupProblems,
  improvePassed,
  improveRequest,
  lastImproveRun,
  runNote,
};

export type { ProblemGroup, ProblemItem };
