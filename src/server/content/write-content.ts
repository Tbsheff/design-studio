import { readFile } from "node:fs/promises";

import type {
  Direction,
  Project,
  VersionMeta,
} from "../../shared/contracts.js";
import { writeAndCommitAll } from "../direct-edit/batch.js";
import { resolveSource } from "../direct-edit/commit/edit-source.js";
import {
  announceWhile,
  assertCanEdit,
  publishVersion,
} from "../direct-edit/commit/publish.js";
import { DirectEditError } from "../direct-edit/engine/errors.js";
import type { ContentRuntime } from "./content-runtime.js";
import { applyContent } from "./engine/index.js";
import type { ContentFailure, ContentMode, Preset } from "./engine/index.js";

interface ContentCommand {
  readonly col: number;
  readonly directionId: string;
  readonly file: string;
  readonly line: number;
  readonly mode: ContentMode;
  readonly preset: Preset;
  readonly projectId: string;
  readonly repeat: number;
  readonly seed: number;
}

interface ContentWritten {
  readonly files: readonly string[];
  readonly previousVersionId: string;
  readonly replaced: number;
  readonly rows: number;
  readonly versionId: string;
}

const TITLE = "Sample content";

const FAILURE_TEXT: Readonly<Record<ContentFailure, string>> = {
  element_not_found: "No element starts at that line and column.",
  invalid_request: "The content request is not valid.",
  no_text: "The layer has no plain text to replace.",
};

const promptOf = (command: ContentCommand): string =>
  `${TITLE}: ${command.mode} ${command.preset} x${command.repeat}`;

const writeContent = async (
  runtime: ContentRuntime,
  project: Project,
  direction: Direction,
  command: ContentCommand
): Promise<ContentWritten> => {
  const headVersionId = assertCanEdit(runtime.editDeps, project, direction);

  const target = await resolveSource(direction.workTree, command.file);
  const original = await readFile(target.file, "utf-8");
  const result = applyContent(original, command);

  if (!result.ok) {
    throw new DirectEditError("invalid_request", FAILURE_TEXT[result.code]);
  }

  const meta: VersionMeta = { kind: "manual", prompt: promptOf(command) };
  const changed = [{ code: result.value.code, original, target }];

  const version = await announceWhile(
    project,
    direction,
    () => [],
    () =>
      writeAndCommitAll(
        runtime.editDeps,
        project,
        direction,
        changed,
        TITLE,
        meta
      )
  );

  runtime.editDeps.history?.record({
    directionId: direction.id,
    files: [
      {
        after: result.value.code,
        before: original,
        file: target.file,
        relative: target.relative,
      },
    ],
    label: version.title,
    projectId: project.id,
    versionId: version.id,
  });

  await publishVersion(runtime.editDeps, project, direction, version);

  return {
    files: [target.relative],
    previousVersionId: headVersionId,
    replaced: result.value.replaced,
    rows: result.value.rows,
    versionId: version.id,
  };
};

const runContent = (
  runtime: ContentRuntime,
  command: ContentCommand
): Promise<ContentWritten> =>
  runtime.withDirection(
    command.projectId,
    command.directionId,
    (project, direction) => writeContent(runtime, project, direction, command)
  );

export { runContent };

export type { ContentCommand, ContentWritten };
