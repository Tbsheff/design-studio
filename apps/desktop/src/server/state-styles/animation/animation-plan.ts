import path from "node:path";

import type { AnimationWork } from "./animation-commit.js";
import {
  getCssEntry,
  getModel,
  getTextOrNull,
  listModelIds,
  toModelRelative,
  toModelText,
} from "./animation-files.js";
import type {
  AnimationScope,
  FileChange,
  RefCommand,
  TargetCommand,
} from "./animation-scope.js";
import { BadRequestError, NotFoundError } from "./deps.js";
import {
  getAnimationProblem,
  isHtmlFile,
  setCssRegion,
  setHtmlBlock,
  toAnimationCss,
  toAnimationId,
} from "./engine/index.js";
import type {
  AnimationLoop,
  AnimationModel,
  AnimationTrack,
  AnimationTrigger,
} from "./engine/index.js";

interface CreateCommand extends TargetCommand {
  readonly durationMs: number;
  readonly file: string | null;
  readonly loop: AnimationLoop;
  readonly name: string;
  readonly tracks: readonly AnimationTrack[];
  readonly trigger: AnimationTrigger;
}

interface UpdateCommand extends RefCommand {
  readonly durationMs: number | null;
  readonly loop: AnimationLoop | null;
  readonly name: string | null;
  readonly tracks: readonly AnimationTrack[] | null;
  readonly trigger: AnimationTrigger | null;
}

interface PlannedWork extends AnimationWork {
  readonly model: AnimationModel;
}

const BLOCKED_SEGMENTS = new Set([".git", "node_modules", ".studio"]);

const toSafeFile = (workTree: string, file: string): string => {
  const root = path.resolve(workTree);
  const target = path.resolve(root, file);
  const segments = path.relative(root, target).split(path.sep);

  if (
    !target.startsWith(`${root}${path.sep}`) ||
    segments.some((segment) => BLOCKED_SEGMENTS.has(segment))
  ) {
    throw new BadRequestError(`${file} is not a file inside this direction.`);
  }

  return segments.join("/");
};

const getFile = async (
  scope: AnimationScope,
  requested: string | null
): Promise<string> => {
  if (requested !== null) {
    return toSafeFile(scope.workTree, requested);
  }

  if (scope.project.kind === "html") {
    return "index.html";
  }

  const entry = await getCssEntry(scope.workTree);

  if (entry === null) {
    throw new BadRequestError(
      "No app CSS file (src/index.css, app/globals.css and kin) was found. Pass file with the CSS or HTML file to write."
    );
  }

  return entry;
};

const toStyledText = (
  before: string,
  file: string,
  id: string,
  css: string | null
): string | null => {
  if (isHtmlFile(file)) {
    return setHtmlBlock(before, id, css);
  }

  return setCssRegion(before, id, css);
};

const getStyleChange = async (
  scope: AnimationScope,
  file: string,
  id: string,
  css: string | null
): Promise<FileChange | null> => {
  const before = await getTextOrNull(path.join(scope.workTree, file));

  if (before === null) {
    if (css === null) {
      return null;
    }

    throw new NotFoundError(`${file} does not exist in this direction.`);
  }

  const after = toStyledText(before, file, id, css);

  if (after === null) {
    throw new BadRequestError(
      `${file} has no head tag, so the animation style block has no place to go.`
    );
  }

  if (after === before) {
    return null;
  }

  return { after, before, relative: file };
};

const toCheckedModel = (model: AnimationModel): AnimationModel => {
  const problem = getAnimationProblem(model);

  if (problem !== null) {
    throw new BadRequestError(problem);
  }

  return model;
};

const getCreateWork = async (
  scope: AnimationScope,
  command: CreateCommand
): Promise<PlannedWork> => {
  const taken = new Set(await listModelIds(scope.workTree));
  const file = await getFile(scope, command.file);

  const { durationMs, loop, name, tracks, trigger } = command;
  const id = toAnimationId(name, taken);

  const model = toCheckedModel({
    durationMs,
    file,
    id,
    loop,
    name,
    tracks,
    trigger,
  });

  const style = await getStyleChange(
    scope,
    file,
    model.id,
    toAnimationCss(model)
  );

  const changes: FileChange[] = [
    {
      after: toModelText(model),
      before: null,
      relative: toModelRelative(model.id),
    },
  ];

  if (style !== null) {
    changes.push(style);
  }

  return { changes, model, title: `Animation: ${model.name}` };
};

const getExisting = async (
  scope: AnimationScope,
  id: string
): Promise<AnimationModel> => {
  const model = await getModel(scope.workTree, id);

  if (model === null) {
    throw new NotFoundError(
      `No animation ${id}. Use list_animation for the ids.`
    );
  }

  return model;
};

const toMerged = (
  current: AnimationModel,
  command: UpdateCommand
): AnimationModel => ({
  ...current,
  durationMs: command.durationMs ?? current.durationMs,
  loop: command.loop ?? current.loop,
  name: command.name ?? current.name,
  tracks: command.tracks ?? current.tracks,
  trigger: command.trigger ?? current.trigger,
});

const getUpdateWork = async (
  scope: AnimationScope,
  command: UpdateCommand
): Promise<PlannedWork> => {
  const current = await getExisting(scope, command.animationId);
  const model = toCheckedModel(toMerged(current, command));
  const modelText = toModelText(model);

  const style = await getStyleChange(
    scope,
    model.file,
    model.id,
    toAnimationCss(model)
  );

  const changes: FileChange[] = [];

  if (modelText !== toModelText(current)) {
    changes.push({
      after: modelText,
      before: toModelText(current),
      relative: toModelRelative(model.id),
    });
  }

  if (style !== null) {
    changes.push(style);
  }

  if (changes.length === 0) {
    throw new BadRequestError("The animation already has these values.");
  }

  return { changes, model, title: `Animation updated: ${model.name}` };
};

const getDeleteWork = async (
  scope: AnimationScope,
  command: RefCommand
): Promise<PlannedWork> => {
  const model = await getExisting(scope, command.animationId);
  const style = await getStyleChange(scope, model.file, model.id, null);

  const changes: FileChange[] = [
    {
      after: null,
      before: toModelText(model),
      relative: toModelRelative(model.id),
    },
  ];

  if (style !== null) {
    changes.push(style);
  }

  return { changes, model, title: `Animation deleted: ${model.name}` };
};

export { getCreateWork, getDeleteWork, getExisting, getUpdateWork };

export type { CreateCommand, PlannedWork, UpdateCommand };
