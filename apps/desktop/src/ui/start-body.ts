import type { RunRequest } from "@design-studio/contracts";

type StartInput = RunRequest & { referenceUrls?: string[] };

type StartBody = Pick<
  StartInput,
  | "attachmentIds"
  | "canvas"
  | "commentIds"
  | "editScope"
  | "effort"
  | "focusPaths"
  | "lean"
  | "level"
  | "mentions"
  | "mode"
  | "plan"
  | "prompt"
  | "referenceUrls"
  | "retryOf"
  | "selection"
  | "states"
  | "task"
>;

const startBody = (req: StartInput): StartBody => ({
  attachmentIds: req.attachmentIds,
  canvas: req.canvas,
  commentIds: req.commentIds ?? req.comments?.map((comment) => comment.id),
  editScope: req.editScope,
  effort: req.effort,
  focusPaths: req.focusPaths,
  lean: req.lean,
  level: req.level,
  mentions: req.mentions,
  mode: req.mode,
  plan: req.plan,
  prompt: req.prompt,
  referenceUrls: req.referenceUrls,
  retryOf: req.retryOf,
  selection: req.selection,
  states: req.states,
  task: req.task,
});

export { startBody };
