import { createHash } from "node:crypto";
import { readFile, realpath, stat } from "node:fs/promises";
import path from "node:path";

import type { VersionMeta } from "@design-studio/contracts";
import { cleanExportPath } from "@design-studio/contracts/export";

import {
  DirectEditError,
  assertCanEdit,
  publishVersion,
  savesSettled,
  writeAndCommitAll,
} from "../../../direct-edit/index.js";
import type { DirectEditRuntime } from "../../../direct-edit/index.js";
import type { DirectionRef } from "./direct-edit-ops.js";

interface FileUpdate {
  readonly baseHash: string;
  readonly content: string;
  readonly path: string;
}

interface FileSaved {
  readonly hash: string;
  readonly isChanged: boolean;
  readonly path: string;
  readonly versionId: string;
}

const BLOCKED_SEGMENTS = new Set(["node_modules", ".git"]);

const toTextHash = (text: string): string =>
  createHash("sha256").update(text).digest("hex");

const isInside = (root: string, target: string): boolean =>
  target.startsWith(root + path.sep);

const toInvalidPath = (message: string): DirectEditError =>
  new DirectEditError("invalid_source", message);

const toRealpathOrNull = async (candidate: string): Promise<string | null> => {
  try {
    return await realpath(candidate);
  } catch {
    return null;
  }
};

const toRealFile = async (
  workTree: string,
  relative: string
): Promise<{ readonly file: string; readonly relative: string }> => {
  const cleaned = cleanExportPath(relative);

  if (!cleaned || cleaned.includes("\0")) {
    throw toInvalidPath("The file path is not valid");
  }

  if (cleaned.split("/").some((part) => BLOCKED_SEGMENTS.has(part))) {
    throw toInvalidPath("That folder cannot be edited");
  }

  const root = await realpath(workTree);
  const candidate = path.resolve(root, ...cleaned.split("/"));

  if (!isInside(root, candidate)) {
    throw toInvalidPath("The file is outside the direction");
  }

  const real = await toRealpathOrNull(candidate);

  if (real === null) {
    throw new DirectEditError("source_not_found", "The file does not exist");
  }

  const info = await stat(real);

  if (!isInside(root, real) || !info.isFile()) {
    throw toInvalidPath("The file is outside the direction");
  }

  return { file: real, relative: cleaned };
};

const updateFileIn = (
  runtime: DirectEditRuntime,
  ref: DirectionRef,
  body: FileUpdate
): Promise<FileSaved> =>
  runtime.withDirection(
    ref.projectId,
    ref.directionId,
    async (project, direction) => {
      const { editDeps } = runtime;

      assertCanEdit(editDeps, project, direction);

      const target = await toRealFile(direction.workTree, body.path);

      await savesSettled(project.id);

      const original = await readFile(target.file, "utf-8");

      if (toTextHash(original) !== body.baseHash) {
        throw new DirectEditError("history_stale", "This file changed. Reload");
      }

      if (original === body.content) {
        return {
          hash: body.baseHash,
          isChanged: false,
          path: target.relative,
          versionId: direction.headVersionId ?? "",
        };
      }

      const meta: VersionMeta = {
        kind: "manual",
        prompt: `Edit file ${target.relative}`,
      };

      const version = await writeAndCommitAll(
        editDeps,
        project,
        direction,
        [{ code: body.content, original, target }],
        `Edit file ${target.relative}`,
        meta
      );

      editDeps.history?.record({
        directionId: direction.id,
        files: [
          {
            after: body.content,
            before: original,
            file: target.file,
            relative: target.relative,
          },
        ],
        label: version.title,
        projectId: project.id,
        versionId: version.id,
      });

      await publishVersion(editDeps, project, direction, version);

      return {
        hash: toTextHash(body.content),
        isChanged: true,
        path: target.relative,
        versionId: version.id,
      };
    }
  );

export { updateFileIn };

export type { FileSaved, FileUpdate };
