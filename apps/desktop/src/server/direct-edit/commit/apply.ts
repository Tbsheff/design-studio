import type {
  Direction,
  DirectEditRequest,
  DirectEditResult,
  Project,
  Version,
} from "@design-studio/contracts";

import { domPatchOf } from "../../events/index.js";
import type { DirectEditDeps, ResolvedSource } from "../../events/index.js";
import type { PatchResult } from "../engine/errors.js";
import { knownTokenVars } from "../engine/tokens.js";
import { parseDirectEditRequest } from "../engine/validate.js";
import { planDirectEdit } from "./edit-plan.js";
import { writeAtomic } from "./edit-source.js";
import { editSummary, editTitle } from "./edit-title.js";
import {
  announceWhile,
  assertCanEdit,
  publishVersion,
  saveDeferred,
} from "./publish.js";
import { savesSettled } from "./save-queue.js";

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
  await announceWhile(
    project,
    direction,
    () => [domPatchOf(request, patch)],
    async () => {
      await savesSettled(project.id);
      await writeAtomic(target.file, patch.code);
    }
  );

  return saveDeferred(
    deps,
    project,
    direction,
    [target.relative],
    editTitle(patch.tag, patch.applied, request),
    { kind: "manual", prompt: editSummary(request) }
  );
}

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
  const request = parseDirectEditRequest(raw);
  const headVersionId = assertCanEdit(deps, project, direction);

  const plan = await planDirectEdit(
    direction.workTree,
    request,
    await knownTokenVars(direction.workTree),
    {
      projectKind: project.kind,
      ...previewOriginFor(deps, project, direction),
    }
  );

  const { target, original, patch } = plan;

  if (patch.code === original) {
    return unchangedResult(
      deps,
      project,
      headVersionId,
      target.relative,
      patch
    );
  }

  const version = await writeAndCommit(
    deps,
    project,
    direction,
    target,
    patch,
    request
  );

  deps.history?.record({
    projectId: project.id,
    directionId: direction.id,
    label: version.title,
    versionId: version.id,
    files: [
      {
        file: target.file,
        relative: target.relative,
        before: original,
        after: patch.code,
      },
    ],
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
