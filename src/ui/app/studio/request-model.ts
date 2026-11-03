import type {
  RunCanvasRef,
  RunEffort,
  RunLevel,
  RunMention,
  RunRequest,
  SelectionContext,
} from "../../../shared/contracts";
import type { ComposerMode } from "../../components/RunSettings";
import type { RunView } from "../../runState";

interface ComposeInput {
  prompt: string;
  mode: ComposerMode;
  attachmentIds: string[];
  level: RunLevel;
  effort: RunEffort | null;
  mentions: RunMention[];
  selection: SelectionContext[];
  canvas?: RunCanvasRef;
}

const firstText = (...texts: (string | null | undefined)[]): string | null =>
  texts.find((text) => (text ?? null) !== null) ?? null;

const modeOf = (mode: ComposerMode): Pick<RunRequest, "mode" | "plan"> => {
  if (mode === "plan") {
    return { mode: "edit", plan: true };
  }

  return { mode };
};

const effortOf = (effort: RunEffort | null): Pick<RunRequest, "effort"> => {
  if (effort) {
    return { effort };
  }

  return {};
};

const composeRequest = (input: ComposeInput): RunRequest => {
  const request: RunRequest = {
    prompt: input.prompt,
    ...modeOf(input.mode),
    level: input.level,
    ...effortOf(input.effort),
  };

  if (input.mentions.length > 0) {
    request.mentions = input.mentions;
  }

  if (input.selection.length > 0) {
    request.selection = input.selection;
  }

  if (input.attachmentIds.length > 0) {
    request.attachmentIds = input.attachmentIds;
  }

  if (input.canvas) {
    request.canvas = input.canvas;
  }

  return request;
};

const withCommentIds = (
  request: RunRequest,
  commentIds: string[]
): RunRequest => {
  if (commentIds.length > 0 && request.mode === "edit") {
    return { ...request, commentIds };
  }

  return request;
};

const buildPlanRequest = (run: RunView): RunRequest => {
  const request: RunRequest = {
    mode: "edit",
    prompt: "Build the plan above.",
  };

  const level = run.request?.level;

  if (level) {
    request.level = level;
  }

  return request;
};

export {
  buildPlanRequest,
  composeRequest,
  effortOf,
  firstText,
  modeOf,
  withCommentIds,
};

export type { ComposeInput };
