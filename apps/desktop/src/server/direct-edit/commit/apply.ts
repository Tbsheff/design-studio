import type {
  Direction,
  DirectEditRequest,
  DirectEditResult,
  Project,
  Version,
} from "@design-studio/contracts";

import { domPatchOf } from "../../events/index.js";
import type { DirectEditDeps, ResolvedSource } from "../../events/index.js";
import { runFileLockGuard } from "../../platform/path-lock/index.js";
import type { PatchResult } from "../engine/errors.js";
import { knownTokenVars } from "../engine/tokens.js";
import { parseDirectEditRequest } from "../engine/validate.js";
import { writeAndCommitAll } from "./batch.js";
import { planDirectEdit } from "./edit-plan.js";
import { writeAtomic } from "./edit-source.js";
import { editSummary, editTitle } from "./edit-title.js";
import { toNextFontFiles, toNextFontPlan } from "./next-font-plan.js";
import type { LayoutFile, NextFontPlan } from "./next-font-plan.js";
import {
  announceWhile,
  assertCanEdit,
  publishVersion,
  saveDeferred,
} from "./publish.js";

async function unchangedResult(
  deps: DirectEditDeps,
  project: Project,
  headVersionId: string,
  relative: string,
  patch: PatchResult
): Promise<DirectEditResult> {
  const version = await deps.versions.get(project, headVersionId);

  return {
    file: relative,
    version,
    applied: patch.applied,
    ...(patch.tailwind ? { tailwind: patch.tailwind } : {}),
  };
}

async function writeAndCommit(
  deps: DirectEditDeps,
  project: Project,
  direction: Direction,
  target: ResolvedSource,
  patch: PatchResult,
  request: DirectEditRequest
): Promise<Version> {
  await runFileLockGuard(project.id, direction.id, [target.relative]);
  await announceWhile(
    project,
    direction,
    () => [domPatchOf(request, patch)],
    () => writeAtomic(target.file, patch.code)
  );

  return saveDeferred(
    deps,
    project,
    direction,
    [target.relative],
    editTitle(patch.tag, patch.applied, request),
    { kind: "manual", prompt: editSummary(request) },
    new Map([[target.relative, patch.code]])
  );
}

interface CommitScope {
  readonly deps: DirectEditDeps;
  readonly direction: Direction;
  readonly fontPlan: NextFontPlan;
  readonly project: Project;
}

const applyFiles = (
  scope: CommitScope,
  files: LayoutFile[],
  patch: PatchResult,
  request: DirectEditRequest
): Promise<Version> => {
  const { deps, direction, project } = scope;
  const [first] = files;

  if (scope.fontPlan.layouts.length === 0 && files.length === 1 && first) {
    return writeAndCommit(
      deps,
      project,
      direction,
      first.target,
      patch,
      request
    );
  }

  return announceWhile(
    project,
    direction,
    () => [domPatchOf(request, patch)],
    () =>
      writeAndCommitAll(
        deps,
        project,
        direction,
        files,
        editTitle(patch.tag, patch.applied, request),
        { kind: "manual", prompt: editSummary(request) }
      )
  );
};

function previewOriginFor(
  deps: DirectEditDeps,
  project: Project,
  direction: Direction
): { previewOrigin?: () => Promise<string | null> } {
  const origin = deps.previewOrigin;

  return origin ? { previewOrigin: () => origin(project, direction) } : {};
}

export async function commitDirectEdit(
  deps: DirectEditDeps,
  project: Project,
  direction: Direction,
  raw: unknown
): Promise<DirectEditResult> {
  const parsed = parseDirectEditRequest(raw);
  const headVersionId = assertCanEdit(deps, project, direction);

  const fontPlan = await toNextFontPlan(
    direction.workTree,
    [parsed],
    await knownTokenVars(direction.workTree)
  );

  const [request = parsed] = fontPlan.requests;

  const plan = await planDirectEdit(
    direction.workTree,
    request,
    fontPlan.known,
    {
      projectKind: project.kind,
      ...previewOriginFor(deps, project, direction),
    }
  );

  const { target, original, patch } = plan;

  const files = toNextFontFiles(fontPlan, [
    { code: patch.code, original, target },
  ]);

  if (patch.code === original) {
    return unchangedResult(
      deps,
      project,
      headVersionId,
      target.relative,
      patch
    );
  }

  const version = await applyFiles(
    { deps, direction, fontPlan, project },
    files,
    patch,
    request
  );

  deps.history?.record({
    projectId: project.id,
    directionId: direction.id,
    label: version.title,
    versionId: version.id,
    files: files.map((file) => ({
      file: file.target.file,
      relative: file.target.relative,
      before: file.original,
      after: file.code,
    })),
  });
  await publishVersion(deps, project, direction, version);

  return {
    file: target.relative,
    version,
    applied: patch.applied,
    ...movedLoc(request.source.file, patch),
    ...(patch.tailwind ? { tailwind: patch.tailwind } : {}),
    ...(patch.textSource ? { textSource: patch.textSource } : {}),
  };
}

function movedLoc(
  file: string,
  patch: PatchResult
): Pick<DirectEditResult, "moved"> {
  return patch.moved
    ? { moved: { file, line: patch.moved.line, col: patch.moved.col } }
    : {};
}
