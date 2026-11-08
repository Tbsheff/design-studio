import type { RunLevel, RunRequest } from "@design-studio/contracts";
import type { ReactNode } from "react";

import type { RunView } from "./run-state-model.js";

interface UserMessageSlots {
  title?: string | undefined;
  tools?: ReactNode;
  replaceBody?: ReactNode;
  titleSlot?: ReactNode;
  onRename?: () => void;
}

const ANSWERS_HEAD = "\n\nAnswers to your questions:\n";

interface ClarifyAnswer {
  question: string;
  answer: string;
}

const runLevel = (run: RunView): RunLevel | null =>
  run.summary?.level ?? run.request?.level ?? null;

const ERROR_HINTS: [RegExp, string][] = [
  [
    /rate.?limit|\b429\b|overloaded|\b529\b/iu,
    "The model is busy. Wait a minute, then retry.",
  ],
  [
    /\b401\b|\b403\b|auth|api key|log ?in|credential/iu,
    "Sign in again or check your API key in Settings, then retry.",
  ],
  [/credit|billing|quota/iu, "Check your plan or credits, then retry."],
  [
    /prompt is too long|context (?:window|length)|too many tokens/iu,
    "Start a new direction, or send a shorter message.",
  ],
  [
    /network|fetch failed|econn|etimedout|socket|offline/iu,
    "Check your connection, then retry.",
  ],
];

interface RunUndoAction {
  onUndo: () => void;
  tip: string | null;
}

const CONTEXT_WARN = 0.7;

interface SplitAnswers {
  readonly answers: ClarifyAnswer[];
  readonly text: string;
}

const toAnswer = (line: string): ClarifyAnswer => {
  const body = line.slice(2);
  const mark = body.indexOf("? ");

  if (mark === -1) {
    return { answer: body, question: "" };
  }

  return { answer: body.slice(mark + 2), question: body.slice(0, mark + 1) };
};

const splitAnswers = (prompt: string): SplitAnswers => {
  const at = prompt.lastIndexOf(ANSWERS_HEAD);

  if (at === -1) {
    return { answers: [], text: prompt };
  }

  const lines = prompt.slice(at + ANSWERS_HEAD.length).split("\n");
  const answers: ClarifyAnswer[] = [];

  for (const line of lines) {
    if (!line.startsWith("- ")) {
      return { answers: [], text: prompt };
    }

    answers.push(toAnswer(line));
  }

  return { answers, text: prompt.slice(0, at) };
};

const DEFAULT_ERROR_HINT =
  "Retry, or change your message and send it again. Details has the full log.";

const errorHint = (error: string): string => {
  const hit = ERROR_HINTS.find(([pattern]) => pattern.test(error));

  if (hit) {
    return hit[1];
  }

  return DEFAULT_ERROR_HINT;
};

const toModeClass = (request: RunRequest): string => {
  if (request.plan) {
    return "plan";
  }

  return request.mode;
};

const toRequestMode = (request: RunRequest): string | null => {
  if (request.mode === "critique") {
    return "Critique";
  }

  if (request.plan) {
    return "Plan";
  }

  return null;
};

export {
  ANSWERS_HEAD,
  CONTEXT_WARN,
  ERROR_HINTS,
  errorHint,
  runLevel,
  splitAnswers,
  toModeClass,
  toRequestMode,
};

export type { ClarifyAnswer, RunUndoAction, UserMessageSlots };
