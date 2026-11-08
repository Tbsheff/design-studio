import type { RunLevel } from "@design-studio/contracts";
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

export { ANSWERS_HEAD, CONTEXT_WARN, ERROR_HINTS, runLevel };

export type { ClarifyAnswer, RunUndoAction, UserMessageSlots };
