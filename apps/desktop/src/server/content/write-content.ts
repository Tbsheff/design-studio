import { readFile } from "node:fs/promises";

import type { Direction, Project, VersionMeta } from "@design-studio/contracts";

import {
  announceWhile,
  assertCanEdit,
  publishVersion,
  resolveSource,
  writeAndCommitAll,
} from "../direct-edit/index.js";
import type { ContentRuntime } from "./content-runtime.js";
import { applyContentEdits } from "./engine/index.js";
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

interface ContentRefused {
  readonly refused: string;
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

interface ContentEdit {
  readonly compute: (original: string) => ContentComputed;
  readonly file: string;
  readonly prompt: string;
  readonly title: string;
}

type ContentComputed =
  | ContentRefused
  | {
      readonly code: string;
      readonly replaced: number;
      readonly rows: number;
    };

const toApplyEdit =
  (command: ContentCommand) =>
  (original: string): ContentComputed => {
    const result = applyContentEdits(original, command);

    if (!result.ok) {
      return { refused: FAILURE_TEXT[result.code] };
    }

    return result.value;
  };

const writeContent = async (
  runtime: ContentRuntime,
  project: Project,
  direction: Direction,
  edit: ContentEdit
): Promise<ContentRefused | ContentWritten> => {
  const headVersionId = assertCanEdit(runtime.editDeps, project, direction);

  const target = await resolveSource(direction.workTree, edit.file);
  const original = await readFile(target.file, "utf-8");
  const result = edit.compute(original);

  if ("refused" in result) {
    return result;
  }

  const meta: VersionMeta = { kind: "manual", prompt: edit.prompt };
  const changed = [{ code: result.code, original, target }];

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
        edit.title,
        meta
      )
  );

  runtime.editDeps.history?.record({
    directionId: direction.id,
    files: [
      {
        after: result.code,
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
    replaced: result.replaced,
    rows: result.rows,
    versionId: version.id,
  };
};

const runContent = (
  runtime: ContentRuntime,
  command: ContentCommand
): Promise<ContentRefused | ContentWritten> =>
  runtime.withDirection(
    command.projectId,
    command.directionId,
    (project, direction) =>
      writeContent(runtime, project, direction, {
        compute: toApplyEdit(command),
        file: command.file,
        prompt: promptOf(command),
        title: TITLE,
      })
  );

const runEdit = (
  runtime: ContentRuntime,
  target: { readonly directionId: string; readonly projectId: string },
  edit: ContentEdit
): Promise<ContentRefused | ContentWritten> =>
  runtime.withDirection(
    target.projectId,
    target.directionId,
    (project, direction) => writeContent(runtime, project, direction, edit)
  );

export { runContent, runEdit };

export type {
  ContentCommand,
  ContentComputed,
  ContentEdit,
  ContentRefused,
  ContentWritten,
};
